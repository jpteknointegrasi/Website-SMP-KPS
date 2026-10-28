import { scopeToDoc } from '../tenancy/scoped'
import { schoolTimezone } from '../tenancy/timezone'
import type { CollectionBeforeChangeHook, CollectionAfterChangeHook, CollectionConfig, Field } from 'payload'
import { APIError } from 'payload'
import { adminOnly, admissionsStaff, canSeeLeads, isStaff, leadsAccess, nobody } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { consumes, release, seatsFor, tryReserve } from '../lib/capacity'
import { interestSubmitEndpoint, leadsExportEndpoint } from '../endpoints/interest'
import { visitAvailabilityEndpoint, visitBookingEndpoint, visitCancelEndpoint, visitReconcileEndpoint } from '../endpoints/visits'

const actorOf = (req: Parameters<CollectionBeforeChangeHook>[0]['req']) =>
  (req.user as { email?: string } | null)?.email ?? String(req.context?.systemActor ?? 'sistem')

const historyField: Field = {
  name: 'history',
  type: 'array',
  label: 'Riwayat (otomatis)',
  admin: { readOnly: true, initCollapsed: true },
  fields: [
    { name: 'at', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'actor', type: 'text' },
    { name: 'event', type: 'text' },
  ],
}

const assigneeField: Field = {
  name: 'assignee',
  type: 'relationship',
  relationTo: 'users',
  label: 'Petugas',
  index: true,
  filterOptions: { or: [{ role: { equals: 'admissions' } }, { canAccessLeads: { equals: true } }] },
}

export const LEAD_STATUS = [
  { label: 'Baru', value: 'new' },
  { label: 'Ditugaskan', value: 'assigned' },
  { label: 'Sudah dihubungi', value: 'contacted' },
  { label: 'Tindak lanjut', value: 'follow_up' },
  { label: 'Berminat', value: 'interested' },
  { label: 'Masuk proses resmi', value: 'converted' },
  { label: 'Ditutup', value: 'closed' },
]
const label = (opts: { label: string; value: string }[], v: unknown) => opts.find((o) => o.value === v)?.label ?? String(v ?? '-')

/** Timeline entries for status/assignee/follow-up changes; stamps private notes with author & time. */
const leadTimeline: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const now = new Date().toISOString()
  const actor = actorOf(req)
  const prev = (originalDoc ?? {}) as Record<string, unknown>
  const hist = Array.isArray(prev.history) ? [...(prev.history as object[])] : []
  if (operation === 'create') {
    hist.push({ at: now, actor, event: 'Minat masuk dari website' })
  } else {
    const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id: unknown }).id : v) ?? null
    if (data.assignee !== undefined && idOf(data.assignee) !== idOf(prev.assignee)) {
      hist.push({ at: now, actor, event: data.assignee ? 'Petugas ditetapkan/diganti' : 'Petugas dilepas' })
      if (data.assignee && (data.status ?? prev.status) === 'new') data.status = 'assigned'
    }
    if (data.appLinkRef && data.appLinkRef !== prev.appLinkRef)
      hist.push({ at: now, actor, event: `Tertaut ke Portal Penerimaan atas persetujuan keluarga${data.appApplicationNo ? ` (no. ${data.appApplicationNo})` : ''}` })
    if (data.status && data.status !== prev.status) hist.push({ at: now, actor, event: `Status: ${label(LEAD_STATUS, prev.status)} → ${label(LEAD_STATUS, data.status)}` })
    if (data.nextFollowUpAt !== undefined && (data.nextFollowUpAt ?? null) !== (prev.nextFollowUpAt ?? null))
      hist.push({ at: now, actor, event: data.nextFollowUpAt ? 'Jadwal tindak lanjut diatur' : 'Jadwal tindak lanjut dihapus' })
  }
  if (data.status === 'closed' && !data.closeReason && !prev.closeReason) throw new APIError('Pilih alasan penutupan.', 400, null, true)
  if (Array.isArray(data.notes)) {
    data.notes = data.notes.map((n: { at?: string; by?: string }) => ({ ...n, at: n.at ?? now, by: n.by ?? actor }))
  }
  data.history = hist.slice(-200)
  return data
}

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Minat Calon Orang Tua', plural: 'Minat Calon Orang Tua' },
  admin: {
    group: 'Pendaftaran',
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'status', 'assignee', 'nextFollowUpAt', 'source', 'createdAt'],
    listSearchableFields: ['reference', 'parentName', 'email', 'phone'],
    description: 'PRIVAT. Hanya Petugas Pendaftaran dan akun yang diberi izin. Tindak lanjut adalah tugas internal — sistem tidak mengirim pesan otomatis.',
    hidden: ({ user }) => !canSeeLeads(user as never),
  },
  defaultSort: '-createdAt',
  access: { read: leadsAccess, update: leadsAccess, create: nobody, delete: adminOnly },
  endpoints: [interestSubmitEndpoint, leadsExportEndpoint],
  hooks: { beforeChange: [leadTimeline], afterChange: [auditAfterChange], afterDelete: [auditAfterDelete] },
  fields: [
    { name: 'reference', type: 'text', label: 'No. referensi', unique: true, index: true, admin: { readOnly: true } },
    { type: 'row', fields: [
      { name: 'parentName', type: 'text', label: 'Nama orang tua/wali', required: true },
      { name: 'email', type: 'email', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Telepon', admin: { description: 'Belum tentu nomor WhatsApp aktif.' } },
    ] },
    { name: 'phoneNormalized', type: 'text', index: true, admin: { hidden: true } },
    { type: 'row', fields: [
      { name: 'cycle', type: 'relationship', relationTo: 'admissions-cycles', label: 'Siklus', index: true },
      { name: 'targetYearLabel', type: 'text', label: 'Tahun ajaran tujuan (teks)', admin: { description: 'Mis. "Belum ditentukan".' } },
    ] },
    {
      name: 'interests',
      type: 'select',
      hasMany: true,
      label: 'Minat',
      options: [
        { label: 'Informasi penerimaan', value: 'info' },
        { label: 'Kunjungan sekolah', value: 'kunjungan' },
        { label: 'Biaya / program', value: 'biaya_program' },
        { label: 'Lainnya', value: 'lainnya' },
      ],
    },
    { type: 'row', fields: [
      { name: 'studentName', type: 'text', label: 'Nama calon siswa (opsional)' },
      { name: 'originSchool', type: 'text', label: 'Asal sekolah/kelas (opsional)' },
    ] },
    { name: 'message', type: 'textarea', label: 'Pesan', maxLength: 1000 },
    { type: 'collapsible', label: 'Tindak lanjut', fields: [
      { type: 'row', fields: [
        { name: 'status', type: 'select', label: 'Status', required: true, defaultValue: 'new', index: true, options: LEAD_STATUS },
        assigneeField,
        { name: 'nextFollowUpAt', type: 'date', label: 'Tindak lanjut berikutnya', index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
      ] },
      { type: 'row', fields: [
        {
          name: 'closeReason',
          type: 'select',
          label: 'Alasan ditutup',
          options: [
            { label: 'Tidak berminat lagi', value: 'not_interested' },
            { label: 'Memilih sekolah lain', value: 'other_school' },
            { label: 'Kontak tidak dapat dihubungi', value: 'unreachable' },
            { label: 'Duplikat', value: 'duplicate' },
            { label: 'Uji coba / spam', value: 'test_spam' },
            { label: 'Lainnya', value: 'other' },
          ],
          admin: { condition: (d) => d?.status === 'closed' },
        },
        { name: 'convertedNote', type: 'text', label: 'Keterangan proses resmi', admin: { condition: (d) => d?.status === 'converted', description: '"Masuk proses resmi" ≠ diterima sekolah.' } },
      ] },
      {
        name: 'notes',
        type: 'array',
        label: 'Catatan privat',
        fields: [
          { name: 'text', type: 'textarea', required: true },
          { name: 'at', type: 'date', admin: { readOnly: true } },
          { name: 'by', type: 'text', admin: { readOnly: true } },
        ],
      },
    ] },
    { name: 'source', type: 'select', label: 'Sumber', index: true, admin: { readOnly: true, position: 'sidebar' }, options: [
      { label: 'Website', value: 'website' },
      { label: 'Halaman pendaftaran', value: 'pendaftaran' },
      { label: 'Halaman kunjungan', value: 'kunjungan' },
      { label: 'Beranda', value: 'beranda' },
      { label: 'Kampanye brosur', value: 'brosur' },
      { label: 'Kampanye media sosial', value: 'media_sosial' },
    ] },
    { name: 'possibleDuplicateOf', type: 'relationship', relationTo: 'leads', label: 'Mungkin sama dengan', admin: { position: 'sidebar', readOnly: true, description: 'Kontak sama pada siklus sama. Bisa jadi saudara kandung — tinjau, jangan langsung tutup.' } },
    { name: 'duplicateReviewed', type: 'checkbox', label: 'Duplikat sudah ditinjau', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'appLinkRef', type: 'text', index: true, admin: { hidden: true } },
    { name: 'appApplicationNo', type: 'text', label: 'No. pendaftaran di Portal', admin: { readOnly: true, position: 'sidebar', description: 'Diisi otomatis saat keluarga menautkan pendaftarannya di Sekolahku App (dengan persetujuan).' } },
    { name: 'appLinkedAt', type: 'date', label: 'Tertaut ke Portal', admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'isTest', type: 'checkbox', label: 'Data uji (tidak dihitung)', defaultValue: false, index: true, admin: { position: 'sidebar' } },
    { name: 'marketingOptIn', type: 'checkbox', label: 'Bersedia menerima info berikutnya', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'consentVersion', type: 'text', label: 'Versi persetujuan', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'consentAt', type: 'date', label: 'Waktu persetujuan', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'anonymizedAt', type: 'date', label: 'Dianonimkan (retensi)', index: true, admin: { readOnly: true, position: 'sidebar', description: 'Data pribadi dikosongkan otomatis sesuai Pengaturan Sekolah → Privasi & Retensi.' } },
    { name: 'idempotencyKey', type: 'text', unique: true, index: true, admin: { hidden: true } },
    historyField,
  ],
}

// ---------------------------------------------------------------- visits

export const VisitSessions: CollectionConfig = {
  slug: 'visit-sessions',
  labels: { singular: 'Sesi Kunjungan', plural: 'Sesi Kunjungan' },
  admin: {
    group: 'Pendaftaran',
    useAsTitle: 'title',
    defaultColumns: ['title', 'startAt', 'kind', 'capacity', 'bookedCount', 'sessionStatus'],
    description: 'Slot kunjungan/open house. Publik hanya melihat sisa kuota — tidak pernah daftar pengunjung.',
  },
  defaultSort: 'startAt',
  access: { read: ({ req: { user } }) => isStaff(user), create: admissionsStaff, update: admissionsStaff, delete: adminOnly },
  endpoints: [visitAvailabilityEndpoint, visitReconcileEndpoint],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const booked = Number(originalDoc?.bookedCount ?? 0)
        if (data.capacity !== undefined && Number(data.capacity) < booked)
          throw new APIError(`Kapasitas tidak boleh di bawah jumlah yang sudah dipesan (${booked}). Pindahkan/batalkan pemesanan dulu.`, 400, null, true)
        // the counter is owned by lib/capacity.ts, never by the form
        if (originalDoc) data.bookedCount = originalDoc.bookedCount ?? 0
        else data.bookedCount = 0
        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Judul sesi', required: true, admin: { description: 'Contoh: Open House Sabtu Pagi' } },
    { type: 'row', fields: [
      { name: 'kind', type: 'select', label: 'Jenis', required: true, defaultValue: 'open_house', options: [
        { label: 'Open house (rombongan)', value: 'open_house' },
        { label: 'Kunjungan individual', value: 'individual' },
      ] },
      { name: 'sessionStatus', type: 'select', label: 'Status', required: true, defaultValue: 'draft', index: true, options: [
        { label: 'Draf (tidak tampil)', value: 'draft' },
        { label: 'Dibuka untuk pemesanan', value: 'open' },
        { label: 'Ditutup', value: 'closed' },
        { label: 'Dibatalkan', value: 'cancelled' },
      ] },
    ] },
    { type: 'row', fields: [
      { name: 'startAt', type: 'date', label: 'Mulai', required: true, index: true, timezone: schoolTimezone, admin: { date: { pickerAppearance: 'dayAndTime' } } },
      {
        name: 'endAt',
        type: 'date',
        label: 'Selesai',
        timezone: schoolTimezone,
        admin: { date: { pickerAppearance: 'dayAndTime' } },
        validate: (v: unknown, { siblingData }: { siblingData?: { startAt?: string } }) =>
          !v || !siblingData?.startAt || new Date(String(v)) > new Date(siblingData.startAt) ? true : 'Selesai harus sesudah mulai.',
      },
    ] },
    { name: 'location', type: 'text', label: 'Lokasi berkumpul (publik)' },
    { type: 'row', fields: [
      { name: 'capacity', type: 'number', label: 'Kapasitas', required: true, min: 1, max: 500 },
      { name: 'capacityUnit', type: 'select', label: 'Satuan', required: true, defaultValue: 'families', options: [
        { label: 'Keluarga (1 pemesanan = 1)', value: 'families' },
        { label: 'Orang (sesuai jumlah peserta)', value: 'people' },
      ] },
      { name: 'bookedCount', type: 'number', label: 'Terpakai', defaultValue: 0, admin: { readOnly: true } },
    ] },
    { type: 'row', fields: [
      { name: 'bookingDeadline', type: 'date', label: 'Batas pemesanan', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'requiresConfirmation', type: 'checkbox', label: 'Perlu dikonfirmasi petugas (status Menunggu)', defaultValue: true },
      { name: 'holdHours', type: 'number', label: 'Batas konfirmasi (jam)', defaultValue: 48, min: 1, max: 336, admin: { condition: (d) => Boolean(d?.requiresConfirmation), description: 'Pemesanan Menunggu yang tidak dikonfirmasi dalam waktu ini dilepas otomatis.' } },
    ] },
    { name: 'instructions', type: 'textarea', label: 'Petunjuk untuk pengunjung (publik)', maxLength: 600 },
    { name: 'guide', type: 'relationship', relationTo: 'users', label: 'Pemandu (internal)' },
    { name: 'cycle', type: 'relationship', relationTo: 'admissions-cycles', label: 'Siklus penerimaan' },
  ],
}

export const BOOKING_STATUS = [
  { label: 'Menunggu konfirmasi', value: 'pending' },
  { label: 'Terkonfirmasi', value: 'confirmed' },
  { label: 'Dibatalkan', value: 'cancelled' },
  { label: 'Kedaluwarsa (tidak dikonfirmasi)', value: 'expired' },
  { label: 'Hadir', value: 'attended' },
  { label: 'Tidak hadir', value: 'no_show' },
]

type BookingLike = { status?: string; session?: number | { id: number } | null; participants?: number | null }
const sessionIdOf = (b?: BookingLike | null) => (b?.session && typeof b.session === 'object' ? b.session.id : (b?.session as number | undefined)) ?? null

/**
 * Keeps the session counter consistent for staff edits: confirm/cancel/attend, move to another session
 * (reschedule) or change participant count. Seats are taken BEFORE the save (fails cleanly when full)
 * and given back AFTER the save.
 */
const bookingCapacity: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  const prev = (originalDoc ?? {}) as BookingLike
  const next: BookingLike = { ...prev, ...data }
  const nextSession = sessionIdOf(next)
  const prevSession = operation === 'update' ? sessionIdOf(prev) : null
  // Everything below runs for the booking's own school only: a session id from another school is rejected
  // before any seat is counted (this hook runs before field validation).
  const school = scopeToDoc(req.payload, data, originalDoc)
  const unitOf = async (id: number) => {
    const s = await school.findByID({ collection: 'visit-sessions', id, depth: 0, overrideAccess: true, disableErrors: true } as never)
    if (!s) throw new APIError('Sesi kunjungan tidak ditemukan.', 400, null, true)
    return (s as { capacityUnit?: string }).capacityUnit
  }
  const nextSeats = nextSession ? seatsFor(await unitOf(nextSession), next.participants) : 0
  const prevSeats = prevSession ? seatsFor(await unitOf(prevSession), prev.participants) : 0
  const take = (n: number) => nextSession && n > 0 && !context.capacityReserved
  const releaseLater: { id: number; seats: number }[] = []

  const wasHolding = operation === 'update' && consumes(prev.status)
  const willHold = consumes(next.status)
  if (willHold && (!wasHolding || nextSession !== prevSession)) {
    if (take(nextSeats) && !(await tryReserve(school, nextSession!, nextSeats)))
      throw new APIError('Kuota sesi tujuan sudah penuh. Pilih sesi lain atau tambah kapasitas.', 409, null, true)
    if (wasHolding && prevSession) releaseLater.push({ id: prevSession, seats: prevSeats })
  } else if (willHold && wasHolding && nextSession === prevSession && nextSeats !== prevSeats) {
    const diff = nextSeats - prevSeats
    if (diff > 0 && !(await tryReserve(school, nextSession!, diff))) throw new APIError('Kuota sesi tidak cukup untuk jumlah peserta ini.', 409, null, true)
    if (diff < 0) releaseLater.push({ id: nextSession!, seats: -diff })
  } else if (!willHold && wasHolding && prevSession) {
    releaseLater.push({ id: prevSession, seats: prevSeats })
  }
  context.releaseLater = releaseLater

  // timeline
  const now = new Date().toISOString()
  const hist = Array.isArray((prev as { history?: object[] }).history) ? [...((prev as { history: object[] }).history)] : []
  const actor = actorOf(req)
  if (operation === 'create') hist.push({ at: now, actor, event: `Pemesanan dibuat (${label(BOOKING_STATUS, next.status)})` })
  else {
    if (next.status !== prev.status) hist.push({ at: now, actor, event: `Status: ${label(BOOKING_STATUS, prev.status)} → ${label(BOOKING_STATUS, next.status)}${data.statusReason ? ` — ${data.statusReason}` : ''}` })
    if (nextSession !== prevSession) hist.push({ at: now, actor, event: 'Dijadwalkan ulang ke sesi lain' })
  }
  data.history = hist.slice(-100)
  if (next.status !== 'pending') data.holdExpiresAt = null
  if (['cancelled', 'expired'].includes(String(next.status))) data.cancelTokenHash = null
  return data
}

const bookingRelease: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  for (const r of (context.releaseLater as { id: number; seats: number }[] | undefined) ?? []) await release(scopeToDoc(req.payload, doc), r.id, r.seats)
  return doc
}

export const VisitBookings: CollectionConfig = {
  slug: 'visit-bookings',
  labels: { singular: 'Pemesanan Kunjungan', plural: 'Pemesanan Kunjungan' },
  admin: {
    group: 'Pendaftaran',
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'session', 'status', 'participants', 'createdAt'],
    listSearchableFields: ['reference', 'parentName', 'email', 'phone'],
    description: 'PRIVAT. Konfirmasi, jadwalkan ulang (ganti sesi), batalkan, lalu tandai hadir/tidak hadir. Kuota dihitung otomatis.',
    hidden: ({ user }) => !canSeeLeads(user as never),
  },
  defaultSort: '-createdAt',
  access: { read: leadsAccess, update: leadsAccess, create: nobody, delete: adminOnly },
  endpoints: [visitBookingEndpoint, visitCancelEndpoint],
  hooks: { beforeChange: [bookingCapacity], afterChange: [bookingRelease, auditAfterChange], afterDelete: [auditAfterDelete] },
  fields: [
    { name: 'reference', type: 'text', label: 'No. referensi', unique: true, index: true, admin: { readOnly: true } },
    { type: 'row', fields: [
      { name: 'session', type: 'relationship', relationTo: 'visit-sessions', label: 'Sesi', required: true, index: true },
      { name: 'status', type: 'select', label: 'Status', required: true, defaultValue: 'pending', index: true, options: BOOKING_STATUS },
      { name: 'participants', type: 'number', label: 'Jumlah peserta', required: true, defaultValue: 1, min: 1, max: 10 },
    ] },
    { name: 'statusReason', type: 'text', label: 'Alasan perubahan (dicatat di riwayat)' },
    { type: 'row', fields: [
      { name: 'parentName', type: 'text', label: 'Nama orang tua/wali', required: true },
      { name: 'email', type: 'email', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Telepon' },
    ] },
    { name: 'phoneNormalized', type: 'text', index: true, admin: { hidden: true } },
    { name: 'targetYearLabel', type: 'text', label: 'Minat tahun ajaran' },
    { name: 'note', type: 'textarea', label: 'Catatan dari pemesan', maxLength: 500, admin: { readOnly: true } },
    { name: 'internalNote', type: 'textarea', label: 'Catatan privat petugas' },
    { name: 'lead', type: 'relationship', relationTo: 'leads', label: 'Data minat terkait', admin: { description: 'Dihubungkan otomatis bila kontak sama pada siklus yang sama; tidak membuat data minat baru.' } },
    { name: 'holdExpiresAt', type: 'date', label: 'Batas konfirmasi', admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'isTest', type: 'checkbox', label: 'Data uji (tidak dihitung)', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'consentVersion', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'consentAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    // sha256 of the self-cancel token; the token itself is shown once to the visitor and never stored
    { name: 'cancelTokenHash', type: 'text', index: true, access: { read: () => false, update: () => false }, admin: { hidden: true } },
    { name: 'cancelTokenExpiresAt', type: 'date', access: { read: ({ req: { user } }) => isStaff(user) }, admin: { hidden: true } },
    { name: 'anonymizedAt', type: 'date', label: 'Dianonimkan (retensi)', index: true, admin: { readOnly: true, position: 'sidebar', description: 'Data pribadi dikosongkan otomatis sesuai Pengaturan Sekolah → Privasi & Retensi.' } },
    { name: 'idempotencyKey', type: 'text', unique: true, index: true, admin: { hidden: true } },
    historyField,
  ],
}
