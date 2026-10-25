/**
 * Addendum P0/P1 integration tests: real Payload + database, endpoints called with a minimal request object.
 * Every record is tagged with RUN and removed afterwards; feature flags are restored.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { randomBytes, randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import type { TenantPayload } from '@/tenancy/scoped'
import { createTestSchool, dropTestSchool, type TestSchool } from './school'
import { interestSubmitEndpoint, leadsExportEndpoint } from '@/endpoints/interest'
import { visitBookingEndpoint, visitCancelEndpoint, visitAvailabilityEndpoint } from '@/endpoints/visits'
import { releaseExpiredHolds } from '@/lib/capacity'

const RUN = `t${Date.now().toString(36)}`
let raw: Payload
let school: TestSchool
/** school-scoped Payload (as used by pages/endpoints) */
let payload: TenantPayload
const users: Record<string, any> = {}
const created: { collection: string; id: number }[] = []
const track = <T extends { id: number }>(collection: string, doc: T) => (created.push({ collection, id: doc.id }), doc)
let flagsBefore: Record<string, unknown> = {}
let cycleId: number
let ipSeq = 0

/** Minimal PayloadRequest for endpoint handlers. Each call gets its own IP so rate limits don't interfere. */
const req = (body: unknown, user?: unknown, url = 'http://localhost/api/x') =>
  ({
    payload: raw,
    user: user ?? null,
    url,
    headers: new Headers({ host: school.domain, 'x-forwarded-for': `10.9.${Math.floor(ipSeq / 250)}.${ipSeq++ % 250}` }),
    json: async () => body,
  }) as unknown as PayloadRequest
const call = async (ep: { handler: (r: PayloadRequest) => Promise<Response> | Response }, body?: unknown, user?: unknown, url?: string) => {
  const res = await ep.handler(req(body, user, url))
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, json, text, headers: res.headers }
}
const lead = (extra: Record<string, unknown> = {}) => ({
  parentName: `Wali ${RUN}`,
  phone: '081234567890',
  interests: ['info'],
  consent: true,
  cycle: cycleId,
  idempotencyKey: randomUUID(),
  ...extra,
})
const findLeads = (where: object) => payload.find({ collection: 'leads', where: where as never, overrideAccess: true, limit: 50 })

beforeAll(async () => {
  raw = await getPayload({ config })
  school = await createTestSchool(raw, RUN)
  payload = school.payload
  for (const role of ['admin', 'editor', 'contributor', 'admissions'] as const) {
    const u = await payload.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-${role}@test.invalid`, password: randomBytes(18).toString('base64url'), name: `Uji ${role}`, role } })
    users[role] = { ...u, collection: 'users' }
  }
  flagsBefore = (await payload.findGlobal({ slug: 'feature-flags', overrideAccess: true })) as unknown as Record<string, unknown>
  await payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { interestForm: true, schoolVisits: true, studentWorks: true, mediaHub: true } })
  const c = track(
    'admissions-cycles',
    await payload.create({ collection: 'admissions-cycles', overrideAccess: true, data: { academicYear: `2099/2100`, admissionStatus: 'not_open', mode: 'interest_form', interestFormEnabled: true, _status: 'published', workflowStatus: 'published' } as never }),
  )
  cycleId = c.id
})

afterAll(async () => {
  await payload.delete({ collection: 'visit-bookings', where: { parentName: { like: RUN } }, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'leads', where: { parentName: { like: RUN } }, overrideAccess: true }).catch(() => {})
  for (const c of created.reverse()) await payload.delete({ collection: c.collection as 'posts', id: c.id, overrideAccess: true, trash: false } as never).catch(() => {})
  for (const u of Object.values(users)) await payload.delete({ collection: 'users', id: u.id, overrideAccess: true }).catch(() => {})
  const { id: _i, globalType: _g, createdAt: _c, updatedAt: _u, ...restore } = flagsBefore as Record<string, unknown>
  await payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: restore as never })
  await dropTestSchool(raw, school.id)
})

describe('FLAG-01 fitur mati = API ditolak', () => {
  it('form minat & kunjungan menolak saat flag mati, menerima saat hidup', async () => {
    await payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { interestForm: false, schoolVisits: false } })
    expect((await call(interestSubmitEndpoint, lead())).status).toBe(404)
    expect((await call(visitAvailabilityEndpoint)).status).toBe(404)
    expect((await call(visitBookingEndpoint, {})).status).toBe(404)
    await payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { interestForm: true, schoolVisits: true } })
    expect((await call(interestSubmitEndpoint, lead())).status).toBe(200)
  })
})

describe('LEAD-01 submit valid, invalid, ganda', () => {
  it('invalid → 400 dengan pesan per field, tidak tersimpan', async () => {
    const r = await call(interestSubmitEndpoint, lead({ phone: '', email: 'bukan-email', consent: false, parentName: `X${RUN}invalid` }))
    expect(r.status).toBe(400)
    expect(r.json.errors.email).toBeTruthy()
    expect(r.json.errors.consent).toBeTruthy()
    expect((await findLeads({ parentName: { equals: `X${RUN}invalid` } })).totalDocs).toBe(0)
  })
  it('double submit bersamaan (kunci sama) → satu record, referensi sama', async () => {
    const body = lead({ parentName: `Wali ${RUN} ganda` })
    const [a, b, c] = await Promise.all([call(interestSubmitEndpoint, body), call(interestSubmitEndpoint, body), call(interestSubmitEndpoint, body)])
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200])
    expect(new Set([a.json.reference, b.json.reference, c.json.reference]).size).toBe(1)
    expect((await findLeads({ parentName: { equals: `Wali ${RUN} ganda` } })).totalDocs).toBe(1)
    expect(a.headers.get('cache-control')).toBe('no-store')
  })
  it('tersimpan dengan consent, telepon ternormalisasi, referensi tanpa PII', async () => {
    const r = await call(interestSubmitEndpoint, lead({ parentName: `Wali ${RUN} cek` }))
    const doc = (await findLeads({ reference: { equals: r.json.reference } })).docs[0]!
    expect(doc.consentVersion).toBeTruthy()
    expect(doc.consentAt).toBeTruthy()
    expect(doc.phoneNormalized).toBe('6281234567890')
    expect(doc.status).toBe('new')
    expect(r.json.reference).not.toMatch(/wali|0812/i)
    expect(Object.keys(r.json)).toEqual(['ok', 'reference']) // minimal response
  })
})

describe('LEAD-02 kontak sama', () => {
  it('saudara kandung dengan kontak wali sama → tersimpan, ditandai untuk ditinjau', async () => {
    const a = await call(interestSubmitEndpoint, lead({ parentName: `Wali ${RUN} sib`, phone: '0813 1111 2222', studentName: 'Anak A' }))
    const b = await call(interestSubmitEndpoint, lead({ parentName: `Wali ${RUN} sib`, phone: '+62 813-1111-2222', studentName: 'Anak B' }))
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    const second = (await findLeads({ reference: { equals: b.json.reference } })).docs[0]!
    const first = (await findLeads({ reference: { equals: a.json.reference } })).docs[0]!
    expect(typeof second.possibleDuplicateOf === 'object' ? (second.possibleDuplicateOf as { id: number }).id : second.possibleDuplicateOf).toBe(first.id)
  })
})

describe('LEAD-03 penugasan, status, riwayat', () => {
  it('menugaskan petugas → status Ditugaskan + riwayat; ditutup wajib alasan', async () => {
    const r = await call(interestSubmitEndpoint, lead({ parentName: `Wali ${RUN} tl` }))
    const doc = (await findLeads({ reference: { equals: r.json.reference } })).docs[0]!
    const upd = await payload.update({ collection: 'leads', id: doc.id, user: users.admissions, overrideAccess: false, data: { assignee: users.admissions.id, nextFollowUpAt: new Date(Date.now() - 3600_000).toISOString() } })
    expect(upd.status).toBe('assigned')
    expect((upd.history ?? []).map((h) => h.event).join(' | ')).toMatch(/Petugas ditetapkan.*Status: Baru → Ditugaskan.*tindak lanjut/s)
    await expect(payload.update({ collection: 'leads', id: doc.id, user: users.admissions, overrideAccess: false, data: { status: 'closed' } })).rejects.toThrow(/alasan/i)
    const closed = await payload.update({ collection: 'leads', id: doc.id, user: users.admissions, overrideAccess: false, data: { status: 'closed', closeReason: 'not_interested' } })
    expect(closed.status).toBe('closed')
  })
})

describe('PRIV-01 data calon orang tua privat', () => {
  it('publik, kontributor dan editor (tanpa izin khusus) tidak bisa membaca/mengubah', async () => {
    for (const u of [undefined, users.contributor, users.editor, users.admin]) {
      const res = await payload.find({ collection: 'leads', user: u, overrideAccess: false }).catch(() => ({ totalDocs: 0 }))
      expect(res.totalDocs).toBe(0)
    }
    await expect(payload.create({ collection: 'leads', overrideAccess: false, data: { parentName: `X${RUN}`, reference: `X-${RUN}` } as never })).rejects.toThrow()
    expect((await payload.find({ collection: 'visit-bookings', user: users.editor, overrideAccess: false }).catch(() => ({ totalDocs: 0 }))).totalDocs).toBe(0)
  })
  it('petugas pendaftaran bisa; akun yang diberi izin khusus bisa', async () => {
    expect((await payload.find({ collection: 'leads', user: users.admissions, overrideAccess: false, where: { parentName: { like: RUN } } })).totalDocs).toBeGreaterThan(0)
    const granted = { ...users.editor, canAccessLeads: true }
    expect((await payload.find({ collection: 'leads', user: granted, overrideAccess: false, where: { parentName: { like: RUN } } })).totalDocs).toBeGreaterThan(0)
  })
  it('ekspor: ditolak tanpa izin; CSV aman & tercatat audit tanpa PII', async () => {
    expect((await call(leadsExportEndpoint, undefined, users.editor)).status).toBe(403)
    expect((await call(leadsExportEndpoint, undefined, { ...users.editor, canAccessLeads: true })).status).toBe(403)
    await call(interestSubmitEndpoint, lead({ parentName: `=HYPERLINK("http://x") ${RUN}` }))
    const r = await call(leadsExportEndpoint, undefined, users.admissions)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toMatch(/text\/csv/)
    expect(r.text).toContain(`"'=HYPERLINK(""http://x"") ${RUN}"`)
    const audit = await payload.find({ collection: 'audit-logs', where: { and: [{ action: { equals: 'export' } }, { collectionSlug: { equals: 'leads' } }] }, sort: '-createdAt', limit: 1, overrideAccess: true })
    expect(audit.docs[0]?.docTitle).toMatch(/Ekspor CSV/)
    // audit entries for leads use the random reference, never names/emails
    const leadAudit = await payload.find({ collection: 'audit-logs', where: { collectionSlug: { equals: 'leads' } }, limit: 50, overrideAccess: true })
    expect(leadAudit.docs.some((d) => String(d.docTitle).includes(RUN))).toBe(false)
  })
})

describe('VIS-01/02 kapasitas kunjungan', () => {
  const session = async (title: string, capacity: number, extra: Record<string, unknown> = {}) =>
    track(
      'visit-sessions',
      await payload.create({
        collection: 'visit-sessions',
        overrideAccess: true,
        data: { title: `${title} ${RUN}`, kind: 'open_house', sessionStatus: 'open', startAt: new Date(Date.now() + 7 * 864e5).toISOString(), capacity, capacityUnit: 'families', requiresConfirmation: false, ...extra } as never,
      }),
    )
  const book = (sessionId: number, extra: Record<string, unknown> = {}) =>
    call(visitBookingEndpoint, { session: sessionId, parentName: `Wali ${RUN} kunjungan`, email: `${randomUUID().slice(0, 8)}@contoh.id`, participants: 2, consent: true, idempotencyKey: randomUUID(), ...extra })
  const booked = async (id: number) => Number((await payload.findByID({ collection: 'visit-sessions', id, overrideAccess: true })).bookedCount)

  it('5 permintaan bersamaan untuk sisa kuota 1 → hanya 1 diterima', async () => {
    const s = await session('Paralel', 1)
    const res = await Promise.all(Array.from({ length: 5 }, () => book(s.id)))
    expect(res.filter((r) => r.status === 200)).toHaveLength(1)
    expect(res.filter((r) => r.status === 409)).toHaveLength(4)
    expect(await booked(s.id)).toBe(1)
    const avail = await call(visitAvailabilityEndpoint)
    const pub = avail.json.sessions.find((x: { id: number }) => x.id === s.id)
    expect(pub).toMatchObject({ remaining: 0, full: true })
    expect(JSON.stringify(avail.json)).not.toMatch(/Wali|@contoh\.id|guide/)
  })

  it('pemesanan ganda (kunci sama, bersamaan) → satu pemesanan, satu kuota', async () => {
    const s = await session('Ganda', 5)
    const key = randomUUID()
    const res = await Promise.all([book(s.id, { idempotencyKey: key }), book(s.id, { idempotencyKey: key }), book(s.id, { idempotencyKey: key })])
    expect(res.map((r) => r.status)).toEqual([200, 200, 200])
    expect(new Set(res.map((r) => r.json.reference)).size).toBe(1)
    expect(await booked(s.id)).toBe(1)
  })

  it('batal dengan token → kuota kembali; token tidak bisa dipakai lagi; token salah = pesan umum', async () => {
    const s = await session('Batal', 1)
    const r = await book(s.id)
    expect(r.json.cancelToken).toBeTruthy()
    const info = await call(visitCancelEndpoint, { token: r.json.cancelToken })
    expect(info.json.booking.reference).toBe(r.json.reference)
    expect(JSON.stringify(info.json)).not.toMatch(/@contoh\.id|Wali/)
    expect((await call(visitCancelEndpoint, { token: r.json.cancelToken, confirm: true })).json.cancelled).toBe(true)
    expect(await booked(s.id)).toBe(0)
    const again = await call(visitCancelEndpoint, { token: r.json.cancelToken, confirm: true })
    const wrong = await call(visitCancelEndpoint, { token: 'x'.repeat(32), confirm: true })
    expect(again.status).toBe(404)
    expect(again.json.error).toBe(wrong.json.error)
    expect((await book(s.id)).status).toBe(200)
  })

  it('pending kedaluwarsa melepas kuota; jadwal ulang tidak overbook', async () => {
    const a = await session('Pending', 1, { requiresConfirmation: true, holdHours: 1 })
    const b = await session('Tujuan penuh', 1)
    const c = await session('Tujuan kosong', 2)
    const r = await book(a.id)
    expect(r.json.status).toBe('pending')
    await book(b.id) // b now full
    const bk = (await payload.find({ collection: 'visit-bookings', where: { reference: { equals: r.json.reference } }, overrideAccess: true })).docs[0]!
    await expect(payload.update({ collection: 'visit-bookings', id: bk.id, user: users.admissions, overrideAccess: false, data: { session: b.id } })).rejects.toThrow(/penuh/i)
    expect(await booked(a.id)).toBe(1)
    expect(await booked(b.id)).toBe(1)
    await payload.update({ collection: 'visit-bookings', id: bk.id, user: users.admissions, overrideAccess: false, data: { session: c.id } })
    expect(await booked(a.id)).toBe(0)
    expect(await booked(c.id)).toBe(1)
    // expire the hold
    await payload.update({ collection: 'visit-bookings', id: bk.id, overrideAccess: true, data: { holdExpiresAt: new Date(Date.now() - 1000).toISOString() } })
    await releaseExpiredHolds(payload, c.id)
    const after = await payload.findByID({ collection: 'visit-bookings', id: bk.id, overrideAccess: true })
    expect(after.status).toBe('expired')
    expect(await booked(c.id)).toBe(0)
    expect((after.history ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('kapasitas tidak bisa diturunkan di bawah jumlah terpesan', async () => {
    const s = await session('Turun', 3)
    await book(s.id)
    await book(s.id)
    await expect(payload.update({ collection: 'visit-sessions', id: s.id, user: users.admissions, overrideAccess: false, data: { capacity: 1 } })).rejects.toThrow(/Kapasitas/)
  })
})

describe('WORK-01 / MED-07 konten tanpa izin atau draf tidak publik', () => {
  it('karya tanpa persetujuan tidak tampil meski terbit', async () => {
    const w = track('student-works', await payload.create({ collection: 'student-works', overrideAccess: true, data: { title: `Karya ${RUN}`, slug: `karya-${RUN}`, category: 'seni', consentStatus: 'pending', _status: 'published', workflowStatus: 'published' } as never }))
    expect((await payload.find({ collection: 'student-works', where: { slug: { equals: w.slug } }, overrideAccess: false, draft: false })).totalDocs).toBe(0)
    await payload.update({ collection: 'student-works', id: w.id, overrideAccess: true, data: { consentStatus: 'obtained' } })
    expect((await payload.find({ collection: 'student-works', where: { slug: { equals: w.slug } }, overrideAccess: false, draft: false })).totalDocs).toBe(1)
  })
  it('media: duplikat ditolak, kanal tidak dipaksa jadi pemutar, menunggu izin tidak publik', async () => {
    const m = track('media-items', await payload.create({ collection: 'media-items', overrideAccess: true, data: { title: `Video ${RUN}`, originalUrl: `https://youtu.be/${RUN.padEnd(11, 'x').slice(0, 11)}?si=abc`, consentStatus: 'pending', _status: 'published', workflowStatus: 'published' } as never }))
    expect(m.platform).toBe('youtube')
    expect(m.normalizedUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/)
    await expect(payload.create({ collection: 'media-items', overrideAccess: true, data: { title: 'dup', originalUrl: `https://www.youtube.com/watch?v=${RUN.padEnd(11, 'x').slice(0, 11)}&utm_source=x` } as never })).rejects.toThrow(/sudah ada/)
    await expect(payload.create({ collection: 'media-items', overrideAccess: true, data: { title: 'kanal', originalUrl: 'https://www.youtube.com/@kanal-uji-' + RUN, displayMode: 'click_to_load_embed' } as never })).rejects.toThrow(/kanal/i)
    await expect(payload.create({ collection: 'media-items', overrideAccess: true, data: { title: 'xss', originalUrl: '<iframe src="https://www.youtube.com/embed/abc"></iframe>' } as never })).rejects.toThrow()
    expect((await payload.find({ collection: 'media-items', where: { id: { equals: m.id } }, overrideAccess: false, draft: false })).totalDocs).toBe(0)
  })
})

describe('CAL-02 SEQUENCE naik saat jadwal berubah', () => {
  it('sequence bertambah pada perubahan waktu/status yang terbit', async () => {
    const e = track('events', await payload.create({ collection: 'events', user: users.editor, overrideAccess: false, data: { title: `Agenda ${RUN}`, slug: `agenda-${RUN}`, startAt: new Date(Date.now() + 864e5).toISOString(), eventStatus: 'scheduled', _status: 'published' } as never }))
    expect(e.sequence).toBe(0)
    const e2 = await payload.update({ collection: 'events', id: e.id, user: users.editor, overrideAccess: false, data: { eventStatus: 'postponed', _status: 'published' } as never })
    expect(e2.sequence).toBe(1)
    const e3 = await payload.update({ collection: 'events', id: e.id, user: users.editor, overrideAccess: false, data: { organizer: 'OSIS', _status: 'published' } as never })
    expect(e3.sequence).toBe(1) // not shown in calendars → no bump
  })
})
