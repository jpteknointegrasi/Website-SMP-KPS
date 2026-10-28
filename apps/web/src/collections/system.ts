import { scopeToDoc } from '../tenancy/scoped'
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { adminOnly, isAdmin, isEditorial, hasRole, nobody, editorialOnly, anyone, admissionsStaff, isStaff } from '../access/roles'
import { defineContent } from './_factory'
import { safeUrlField } from '../fields/common'
import { contactSubmitEndpoint } from '../endpoints/contact'
import { auditAfterChange } from '../hooks/audit'

export const AdmissionsCycles = defineContent({
  slug: 'admissions-cycles',
  labels: { singular: 'Siklus Pendaftaran', plural: 'Pendaftaran (PPDB/PMB)' },
  group: 'Pendaftaran',
  useAsTitle: 'academicYear',
  defaultSort: '-academicYear',
  defaultColumns: ['academicYear', 'admissionStatus', '_status'],
  admissions: true,
  access: { create: admissionsStaff, update: admissionsStaff },
  fields: [
    {
      name: 'academicYear',
      type: 'text',
      label: 'Tahun ajaran',
      required: true,
      unique: true,
      validate: (v: unknown) => (typeof v === 'string' && /^\d{4}\/\d{4}$/.test(v) ? true : 'Format: 2026/2027'),
    },
    {
      name: 'admissionStatus',
      type: 'select',
      label: 'Status penerimaan',
      required: true,
      defaultValue: 'unconfirmed',
      options: [
        { label: 'Menunggu konfirmasi sekolah', value: 'unconfirmed' },
        { label: 'Belum dibuka', value: 'not_open' },
        { label: 'Dibuka', value: 'open' },
        { label: 'Ditutup', value: 'closed' },
      ],
      admin: { description: 'Tombol "Daftar" hanya muncul jika status Dibuka DAN URL pendaftaran valid.' },
    },
    {
      name: 'mode',
      type: 'select',
      label: 'Mode penerimaan',
      required: true,
      defaultValue: 'information_only',
      options: [
        { label: 'Informasi saja', value: 'information_only' },
        { label: 'Sistem pendaftaran eksternal (resmi)', value: 'external_system' },
        { label: 'Form minat (bukan pendaftaran resmi)', value: 'interest_form' },
        { label: 'Pendaftaran lengkap di website (P2 — belum tersedia)', value: 'full_admissions' },
      ],
      validate: (v: unknown) => (v === 'full_admissions' ? 'Mode pendaftaran lengkap belum tersedia (P2). Pilih mode lain.' : true),
      admin: { description: 'Hanya satu proses resmi: bila memakai sistem eksternal, website menjadi pusat informasi dan tombol ke sistem itu.' },
    },
    { name: 'levels', type: 'text', label: 'Jenjang yang diterima', admin: { description: 'Contoh: Kelas 7. Kosongkan bila belum dikonfirmasi.' } },
    { name: 'intro', type: 'textarea', label: 'Pengantar' },
    safeUrlField('registrationUrl', 'URL sistem pendaftaran resmi', { description: 'Harus https://. Uji tautan sebelum mengaktifkan status Dibuka.' }),
    {
      name: 'interestFormEnabled',
      type: 'checkbox',
      label: 'Tampilkan form minat ("Titipkan minat, bukan pendaftaran resmi")',
      defaultValue: false,
      admin: { description: 'Butuh fitur "Form minat" aktif di Pengaturan → Fitur Aktif. Bisa dipakai saat status belum dibuka/ditutup (minat siklus berikutnya).' },
    },
    {
      name: 'closedOffer',
      type: 'select',
      label: 'Saat ditutup, tawarkan',
      defaultValue: 'contact',
      options: [
        { label: 'Kontak sekolah', value: 'contact' },
        { label: 'Form minat untuk siklus berikutnya', value: 'interest_next' },
      ],
    },
    {
      name: 'waves',
      type: 'array',
      label: 'Gelombang & jadwal',
      fields: [
        { name: 'name', type: 'text', label: 'Nama gelombang', required: true },
        { type: 'row', fields: [
          { name: 'start', type: 'date', label: 'Mulai' },
          { name: 'end', type: 'date', label: 'Selesai' },
        ] },
        { name: 'note', type: 'text', label: 'Catatan' },
        { type: 'row', fields: [
          { name: 'capacity', type: 'number', min: 0, label: 'Kapasitas (hanya bila sudah disahkan)' },
          { name: 'waveStatus', type: 'select', label: 'Status gelombang', defaultValue: 'unconfirmed', options: [
            { label: 'Belum dikonfirmasi', value: 'unconfirmed' },
            { label: 'Belum dibuka', value: 'not_open' },
            { label: 'Dibuka', value: 'open' },
            { label: 'Ditutup', value: 'closed' },
          ] },
        ] },
      ],
    },
    { name: 'steps', type: 'array', label: 'Alur pendaftaran', fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'detail', type: 'textarea' },
    ] },
    { name: 'requirements', type: 'array', label: 'Persyaratan', fields: [{ name: 'text', type: 'text', required: true }] },
    { name: 'feesApproved', type: 'checkbox', label: 'Informasi biaya disetujui untuk publik', defaultValue: false },
    { name: 'fees', type: 'richText', label: 'Informasi biaya', admin: { condition: (_, s) => Boolean(s?.feesApproved) } },
    { name: 'faqs', type: 'array', label: 'FAQ', fields: [
      { name: 'question', type: 'text', required: true },
      { name: 'answer', type: 'textarea', required: true },
    ] },
    { name: 'contactNote', type: 'textarea', label: 'Kontak informasi pendaftaran' },
    { name: 'infoDocuments', type: 'relationship', relationTo: 'documents', hasMany: true, label: 'Dokumen informasi (brosur, panduan)' },
    { name: 'videos', type: 'relationship', relationTo: 'media-items', hasMany: true, maxRows: 2, label: 'Video profil/tur (opsional)', admin: { description: 'Hanya video yang relevan dan masih berlaku untuk siklus ini.' } },
  ],
})

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Pesan Masuk', plural: 'Pesan Masuk' },
  admin: {
    group: 'Pesan Masuk',
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'name', 'category', 'status', 'createdAt'],
    description: 'Privat. Hanya peran berwenang yang dapat membaca.',
  },
  access: {
    // Only through the validated /api/contact-messages/submit endpoint
    create: nobody,
    read: ({ req: { user } }) => {
      if (isEditorial(user)) return true
      if (hasRole(user, 'admissions')) return { category: { equals: 'pendaftaran' } }
      return false
    },
    update: ({ req: { user } }) => {
      if (isEditorial(user)) return true
      if (hasRole(user, 'admissions')) return { category: { equals: 'pendaftaran' } }
      return false
    },
    delete: adminOnly,
  },
  endpoints: [contactSubmitEndpoint],
  hooks: { afterChange: [auditAfterChange] },
  fields: [
    { name: 'reference', type: 'text', label: 'No. referensi', unique: true, index: true, admin: { readOnly: true } },
    { name: 'name', type: 'text', label: 'Nama', required: true, admin: { readOnly: true } },
    { name: 'email', type: 'email', label: 'Email', admin: { readOnly: true } },
    { name: 'phone', type: 'text', label: 'Telepon', admin: { readOnly: true } },
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      required: true,
      index: true,
      options: [
        { label: 'Informasi umum', value: 'umum' },
        { label: 'Pendaftaran', value: 'pendaftaran' },
        { label: 'Akademik', value: 'akademik' },
        { label: 'Kritik & saran', value: 'saran' },
        { label: 'Alumni', value: 'alumni' },
        { label: 'Kegiatan & ekstrakurikuler', value: 'kegiatan' },
        { label: 'Kunjungan sekolah', value: 'kunjungan' },
      ],
    },
    { name: 'topic', type: 'text', label: 'Topik (dari tautan)', admin: { readOnly: true } },
    { name: 'message', type: 'textarea', label: 'Pesan', required: true, admin: { readOnly: true } },
    { name: 'consent', type: 'checkbox', label: 'Setuju penggunaan data', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Baru', value: 'new' },
        { label: 'Diproses', value: 'in_progress' },
        { label: 'Selesai', value: 'done' },
        { label: 'Spam', value: 'spam' },
      ],
    },
    { name: 'assignedTo', type: 'relationship', relationTo: 'users', label: 'Ditugaskan ke' },
    { name: 'internalNote', type: 'textarea', label: 'Catatan privat' },
    {
      name: 'linkedLead',
      type: 'relationship',
      relationTo: 'leads',
      label: 'Hubungkan ke data minat',
      admin: { condition: (d) => d?.category === 'pendaftaran', description: 'Opsional dan manual. Hanya pesan pendaftaran yang relevan.' },
    },
    { name: 'emailNotified', type: 'checkbox', label: 'Notifikasi email terkirim', admin: { readOnly: true } },
    { name: 'anonymizedAt', type: 'date', label: 'Dianonimkan (retensi)', index: true, admin: { readOnly: true, position: 'sidebar', description: 'Data pribadi dikosongkan otomatis sesuai Pengaturan Sekolah → Privasi & Retensi.' } },
    // one per form instance: a retry or double click stores the message once (same approach as leads)
    { name: 'idempotencyKey', type: 'text', unique: true, index: true, admin: { hidden: true } },
  ],
}

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Log Audit', plural: 'Log Audit' },
  admin: {
    group: 'Audit',
    useAsTitle: 'docTitle',
    defaultColumns: ['createdAt', 'actorEmail', 'action', 'collectionSlug', 'docTitle'],
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req: { user } }) => {
      if (isAdmin(user)) return true
      if (isStaff(user)) return { actor: { equals: user!.id } }
      return false
    },
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  fields: [
    { name: 'action', type: 'text', index: true },
    { name: 'collectionSlug', type: 'text', label: 'Koleksi', index: true },
    { name: 'docId', type: 'text', index: true },
    { name: 'docTitle', type: 'text', label: 'Objek' },
    { name: 'status', type: 'text' },
    { name: 'workflowStatus', type: 'text' },
    { name: 'changedFields', type: 'text', label: 'Field yang berubah (nama saja)' },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorEmail', type: 'text', label: 'Pelaku' },
  ],
}

const normalizePath = (p: string) => {
  let s = p.trim()
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname
  } catch {}
  if (!s.startsWith('/')) s = '/' + s
  s = s.replace(/\/{2,}/g, '/')
  if (s.length > 1) s = s.replace(/\/+$/, '')
  return s.toLowerCase()
}

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Pengalihan', plural: 'Pengalihan URL' },
  admin: { group: 'Pengaturan', useAsTitle: 'oldPath', defaultColumns: ['oldPath', 'newPath', 'active'] },
  access: { read: anyone, create: editorialOnly, update: editorialOnly, delete: adminOnly },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.oldPath) data.oldPath = normalizePath(data.oldPath)
        if (data?.newPath && data.newPath.startsWith('/')) data.newPath = normalizePath(data.newPath)
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        // prevent loops: A→B where B→…→A
        const seen = new Set<string>([data.oldPath])
        let cursor: string | undefined = data.newPath
        for (let i = 0; i < 10 && cursor; i++) {
          if (seen.has(cursor)) throw new APIError('Pengalihan membentuk loop. Periksa tujuan.', 400, null, true)
          seen.add(cursor)
          const next = await scopeToDoc(req.payload, data, originalDoc).find({
            collection: 'redirects',
            where: { oldPath: { equals: cursor }, id: { not_equals: originalDoc?.id ?? 0 } },
            limit: 1,
            overrideAccess: true,
            req,
          })
          cursor = next.docs[0]?.newPath
        }
        return data
      },
    ],
    afterChange: [auditAfterChange],
  },
  fields: [
    { name: 'oldPath', type: 'text', label: 'Path lama', required: true, unique: true, index: true },
    {
      name: 'newPath',
      type: 'text',
      label: 'Path baru (internal)',
      required: true,
      // internal only — prevents open redirects
      validate: (v: unknown) => (typeof v === 'string' && /^\/(?!\/)[^\s]*$/.test(v) ? true : 'Tujuan harus path internal yang diawali "/".'),
    },
    { name: 'active', type: 'checkbox', label: 'Aktif', defaultValue: true },
    { name: 'note', type: 'text', label: 'Catatan' },
  ],
}
