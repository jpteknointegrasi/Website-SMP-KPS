/**
 * AUD-xx: fixes for the independent audit of Sekolahku Web (Oct 2026). Each describe block names its finding.
 * Runs in a throw-away school; REST calls go through Payload's real route handlers with the school's Host header.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { randomBytes } from 'crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { REST_GET } from '@payloadcms/next/routes'
import config from '@/payload.config'
import type { TenantPayload } from '@/tenancy/scoped'
import { createTestSchool, dropTestSchool, type TestSchool } from './school'
import { runAsTenant } from '@/lib/payload'

const RUN = `a${Date.now().toString(36)}`
let raw: Payload
let school: TestSchool
let payload: TenantPayload
const users: Record<string, any> = {}
let png: Buffer
const file = (data: Buffer, name: string) => ({ data, mimetype: 'image/png', name, size: data.length })

const restGet = REST_GET(config)
/** Anonymous GET /api/<path> on the school's address. */
const api = async (path: string, host = school.domain) => {
  const url = `http://${host}/api/${path}`
  const res = await restGet(new Request(url, { headers: { host } }), { params: Promise.resolve({ slug: new URL(url).pathname.replace(/^\/api\//, '').split('/') }) })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, json }
}
let ipSeq = 0
/** Minimal PayloadRequest for custom endpoint handlers; a fresh IP per call unless given. */
export const epReq = (body: unknown, opts: { ip?: string; user?: unknown; url?: string; host?: string } = {}) =>
  ({
    payload: raw,
    user: opts.user ?? null,
    url: opts.url ?? 'http://localhost/api/x',
    headers: new Headers({ host: opts.host ?? school.domain, 'x-forwarded-for': opts.ip ?? `10.55.${Math.floor(ipSeq / 250)}.${ipSeq++ % 250}` }),
    json: async () => body,
  }) as unknown as PayloadRequest

const media = async (label: string) =>
  (await payload.create({ collection: 'media', overrideAccess: true, data: { alt: `uji ${label} ${RUN}` }, file: file(png, `${label}.png`) } as never)) as unknown as { id: number }

beforeAll(async () => {
  raw = await getPayload({ config })
  school = await createTestSchool(raw, RUN)
  payload = school.payload
  for (const role of ['admin', 'editor', 'contributor', 'admissions'] as const) {
    const u = await payload.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-${role}@test.invalid`, password: randomBytes(18).toString('base64url'), name: `Audit ${role}`, role } })
    users[role] = { ...u, collection: 'users' }
  }
  png = await sharp({ create: { width: 32, height: 24, channels: 3, background: { r: Math.floor(Math.random() * 255), g: 90, b: 40 } } }).png().toBuffer()
})

afterAll(async () => {
  await dropTestSchool(raw, school.id)
})

describe('AUD-01 persetujuan publikasi album', () => {
  it('album terbit tanpa persetujuan tidak pernah publik (REST & halaman); staf tetap melihat', async () => {
    const cover = await media('album')
    const base = { cover: cover.id, _status: 'published', workflowStatus: 'published' }
    const without = await payload.create({ collection: 'albums', overrideAccess: true, data: { title: `Tanpa izin ${RUN}`, slug: `tanpa-${RUN}`, ...base } as never })
    const withC = await payload.create({ collection: 'albums', overrideAccess: true, data: { title: `Dengan izin ${RUN}`, slug: `dengan-${RUN}`, publicationConsent: true, ...base } as never })
    // REST (anonymous, school host)
    const list = await api(`albums?limit=50`)
    const ids = list.json.docs.map((d: any) => d.id)
    expect(ids).toContain(withC.id)
    expect(ids).not.toContain(without.id)
    expect((await api(`albums/${without.id}`)).status).toBe(404)
    // pages use the same access rules (overrideAccess false, no user)
    const pub = await payload.find({ collection: 'albums', where: { slug: { equals: `tanpa-${RUN}` } }, overrideAccess: false, draft: false })
    expect(pub.docs).toHaveLength(0)
    // staff
    const staffView = await payload.find({ collection: 'albums', where: { slug: { equals: `tanpa-${RUN}` } }, user: users.editor, overrideAccess: false })
    expect(staffView.docs).toHaveLength(1)
  })
})

describe('AUD-04 pembatas laju di database (bersama antar-instance)', () => {
  const contact = (ip: string) =>
    import('@/endpoints/contact').then(({ contactSubmitEndpoint }) =>
      contactSubmitEndpoint.handler(epReq({ name: `Laju ${RUN}`, email: 'laju@contoh.id', category: 'umum', message: 'Pesan uji pembatas laju.', consent: true, startedAt: Date.now() - 10_000, idempotencyKey: randomBytes(12).toString('hex') }, { ip })),
    )
  it('5 kiriman per 10 menit per IP + rute; ke-6 → 429; IP lain tidak terpengaruh', async () => {
    const ip = `198.51.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
    const codes: number[] = []
    for (let i = 0; i < 6; i++) codes.push((await contact(ip)).status)
    expect(codes.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(codes[5]).toBe(429)
    expect((await contact(`${ip}9`)).status).toBe(200)
  })
  it('hitungan tersimpan di tabel (bukan memori proses) dan kunci di-hash, tanpa IP', async () => {
    const { countHit } = await import('@/lib/rate-limit')
    const key = `uji:${RUN}:203.0.113.7`
    expect(await countHit(raw, key, 600_000)).toBe(1)
    expect(await countHit(raw, key, 600_000)).toBe(2)
    // a hit recorded "earlier" (another instance, an earlier minute) counts inside the window, not outside
    expect(await countHit(raw, key, 600_000, Date.now() - 5 * 60_000)).toBe(3)
    expect(await countHit(raw, key, 60_000, Date.now() + 3 * 60_000)).toBe(1)
    const db = raw.db.drizzle as any
    const { sql } = await import('@payloadcms/db-postgres')
    const rows = (await db.execute(sql`SELECT "key" FROM rate_limit_hits WHERE "key" LIKE ${'%203.0.113.7%'}`)).rows
    expect(rows).toHaveLength(0)
  })
  it('bila database gagal, memakai cadangan memori (tetap membatasi)', async () => {
    const { rateLimited } = await import('@/lib/rate-limit')
    const broken = { db: { name: 'postgres', drizzle: { execute: async () => { throw new Error('putus') } } }, logger: { warn: () => {} } } as never
    const key = `cadangan:${RUN}`
    const r: boolean[] = []
    for (let i = 0; i < 6; i++) r.push(await rateLimited(broken, key))
    expect(r).toEqual([false, false, false, false, false, true])
  })
  it('pendaftaran sekolah publik: 3 per jam per IP; IP lain masih bisa', async () => {
    const { createApplication, APPLICATIONS_PER_IP_PER_HOUR } = await import('@/platform/service')
    const { readApplication } = await import('@/platform/validation')
    const fd = (k: string) => {
      const f = new FormData()
      for (const [a, b] of Object.entries({ schoolName: `SMA Laju ${RUN} ${k}`, shortName: '', level: 'sma', npsn: '', city: 'Balikpapan', province: 'Kalimantan Timur', timezone: 'Asia/Makassar', domain: '', wantWeb: 'on', adminName: `Admin ${k}`, adminEmail: `${RUN}-laju-${k}@test.invalid`, consent: 'on' })) f.set(a, b)
      return readApplication(f).value
    }
    const ip = `192.0.2.${Math.floor(Math.random() * 250)}-${RUN}`
    try {
      const results = []
      for (let i = 0; i <= APPLICATIONS_PER_IP_PER_HOUR; i++) results.push(await createApplication(raw, fd(String(i)), { ip }))
      expect(results.slice(0, APPLICATIONS_PER_IP_PER_HOUR).every((r) => r.ok)).toBe(true)
      expect(results[APPLICATIONS_PER_IP_PER_HOUR]).toMatchObject({ ok: false })
      expect(await createApplication(raw, fd('lain'), { ip: `${ip}-b` })).toMatchObject({ ok: true })
    } finally {
      await raw.delete({ collection: 'school-applications', where: { adminEmail: { like: `${RUN}-laju` } }, overrideAccess: true })
    }
  })
})

describe('AUD-05 formulir kontak idempoten', () => {
  const send = async (body: Record<string, unknown>) => {
    const { contactSubmitEndpoint } = await import('@/endpoints/contact')
    const res = await contactSubmitEndpoint.handler(epReq(body))
    return { status: res.status, json: await res.json() }
  }
  const msg = (key?: string) => ({ name: `Idem ${RUN}`, email: 'idem@contoh.id', category: 'umum', message: 'Pesan yang dikirim dua kali.', consent: true, startedAt: Date.now() - 10_000, ...(key ? { idempotencyKey: key } : {}) })
  it('kunci sama → satu pesan, referensi sama; tanpa kunci valid → 400', async () => {
    const key = randomBytes(16).toString('hex')
    const a = await send(msg(key))
    const b = await send(msg(key))
    expect(a.status).toBe(200)
    expect(b.json).toMatchObject({ ok: true, reference: a.json.reference, repeated: true })
    expect((await send(msg())).status).toBe(400)
    expect((await send(msg('pendek'))).status).toBe(400)
    expect((await payload.count({ collection: 'contact-messages', where: { idempotencyKey: { equals: key } }, overrideAccess: true })).totalDocs).toBe(1)
  })
  it('kiriman ganda bersamaan dengan kunci sama → satu pesan, referensi sama', async () => {
    const key = randomBytes(16).toString('hex')
    const [a, b] = await Promise.all([send(msg(key)), send(msg(key))])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(a.json.reference).toBe(b.json.reference)
    expect((await payload.count({ collection: 'contact-messages', where: { idempotencyKey: { equals: key } }, overrideAccess: true })).totalDocs).toBe(1)
  })
  it('kunci dijaga indeks unik di database (seperti minat), bukan hanya pengecekan aplikasi', async () => {
    const key = randomBytes(16).toString('hex')
    await payload.create({ collection: 'contact-messages', overrideAccess: true, data: { name: `Idem ${RUN}`, category: 'umum', message: 'pesan pertama', reference: `PSN-${RUN}-1`, idempotencyKey: key } as never })
    await expect(payload.create({ collection: 'contact-messages', overrideAccess: true, data: { name: `Idem ${RUN}`, category: 'umum', message: 'pesan kedua', reference: `PSN-${RUN}-2`, idempotencyKey: key } as never })).rejects.toThrow()
  })
})

describe('AUD-06 REST publik: batas limit & foto staf tanpa persetujuan', () => {
  beforeAll(async () => {
    for (let i = 0; i < 53; i++) await payload.create({ collection: 'categories', overrideAccess: true, context: { skipAudit: true }, data: { title: `Kat ${i} ${RUN}`, slug: `kat-${i}-${RUN}` } })
  })
  it.each([['limit=1000'], ['limit=0'], ['pagination=false'], ['pagination=false&limit=0']])('anonim %s → maksimal 50 baris, tetap berhalaman', async (q) => {
    const r = await api(`categories?${q}`)
    expect(r.status).toBe(200)
    expect(r.json.docs.length).toBeLessThanOrEqual(50)
    expect(r.json.totalDocs).toBe(53)
    expect(r.json.hasNextPage).toBe(true)
  })
  it('limit kecil tetap dihormati; staf & kode server tidak dibatasi', async () => {
    expect((await api('categories?limit=5')).json.docs).toHaveLength(5)
    const staffRead = await payload.find({ collection: 'categories', limit: 0, pagination: false, user: users.editor, overrideAccess: false })
    expect(staffRead.docs.length).toBe(53)
    const server = await payload.find({ collection: 'categories', pagination: false, overrideAccess: false })
    expect(server.docs.length).toBe(53)
  })
  it('foto staf (relasi media) hanya keluar bila ada persetujuan publikasi; staf tetap melihat', async () => {
    const m = await media('guru')
    const base = { position: 'Guru', photo: m.id, _status: 'published', workflowStatus: 'published' }
    const no = await payload.create({ collection: 'staff', overrideAccess: true, data: { name: `Tanpa Izin ${RUN}`, slug: `guru-a-${RUN}`, ...base } as never })
    const yes = await payload.create({ collection: 'staff', overrideAccess: true, data: { name: `Dengan Izin ${RUN}`, slug: `guru-b-${RUN}`, publicationConsent: true, ...base } as never })
    const list = (await api(`staff?limit=50&depth=0`)).json.docs
    expect(list.find((d: any) => d.id === no.id)).toBeTruthy()
    expect(list.find((d: any) => d.id === no.id).photo).toBeUndefined()
    expect(list.find((d: any) => d.id === yes.id).photo).toBe(m.id)
    expect((await api(`staff/${no.id}?depth=1`)).json.photo).toBeUndefined()
    // select cannot be used to drop the consent flag and get the photo
    expect((await api(`staff/${no.id}?select[photo]=true`)).json.photo).toBeUndefined()
    const staffView = await payload.findByID({ collection: 'staff', id: no.id, user: users.editor, overrideAccess: false, depth: 0 })
    expect(staffView.photo).toBe(m.id)
  })
})

describe('AUD-08 endpoint kesehatan /api/kesehatan', () => {
  it('200 {ok, db, time} lewat route REST asli, tanpa data sekolah, no-store; juga di alamat tak dikenal', async () => {
    for (const host of [school.domain, `asing-${RUN}.contoh.test`]) {
      const url = `http://${host}/api/kesehatan`
      const res = await restGet(new Request(url, { headers: { host } }), { params: Promise.resolve({ slug: ['kesehatan'] }) })
      expect(res.status).toBe(200)
      expect(res.headers.get('cache-control')).toBe('no-store')
      const j = await res.json()
      expect(Object.keys(j).sort()).toEqual(['db', 'ok', 'time'])
      expect(j).toMatchObject({ ok: true, db: true })
      expect(Number.isNaN(Date.parse(j.time))).toBe(false)
    }
  })
  it('tidak dibatasi laju (banyak pemanggilan berturut-turut tetap 200)', async () => {
    const { healthEndpoint } = await import('@/endpoints/health')
    for (let i = 0; i < 12; i++) expect((await healthEndpoint.handler(epReq(undefined, { ip: '203.0.113.50' }))).status).toBe(200)
  })
  it('database gagal → 503 {ok:false, db:false}', async () => {
    const { healthEndpoint } = await import('@/endpoints/health')
    const req = { payload: { db: { drizzle: { execute: async () => { throw new Error('putus') } } } }, headers: new Headers() } as unknown as PayloadRequest
    const res = await healthEndpoint.handler(req)
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ ok: false, db: false })
  })
})

describe('AUD-09 retensi data (anonimisasi, bawaan mati)', () => {
  const future = new Date(Date.now() + 400 * 86400_000) // ~13 months ahead: today's records are "older than 12 months"
  let session: number
  const ids: Record<string, number> = {}
  beforeAll(async () => {
    session = (await payload.create({ collection: 'visit-sessions', overrideAccess: true, data: { title: `Sesi ${RUN}`, kind: 'open_house', sessionStatus: 'closed', startAt: new Date(Date.now() + 86400_000).toISOString(), capacity: 20, capacityUnit: 'families' } as never })).id
    const lead = (status: string, extra = {}) => payload.create({ collection: 'leads', overrideAccess: true, data: { parentName: `Wali Retensi ${RUN}`, email: 'r@contoh.id', phone: '081200000000', message: 'pesan pribadi', studentName: 'Anak', interests: ['info'], reference: `RET-${status}-${RUN}`, status, ...extra } as never })
    ids.leadClosed = (await lead('closed', { closeReason: 'other', notes: [{ text: 'catatan privat' }] })).id
    ids.leadConverted = (await lead('converted')).id
    ids.leadOpen = (await lead('contacted')).id
    const msg = (status: string) => payload.create({ collection: 'contact-messages', overrideAccess: true, data: { name: `Penanya Retensi ${RUN}`, email: 'p@contoh.id', category: 'umum', message: 'isi pesan pribadi', internalNote: 'catatan', reference: `PSN-RET-${status}-${RUN}`, status } as never })
    ids.msgDone = (await msg('done')).id
    ids.msgNew = (await msg('new')).id
    const book = (status: string) => payload.create({ collection: 'visit-bookings', overrideAccess: true, context: { capacityReserved: true }, data: { session, parentName: `Pemesan Retensi ${RUN}`, email: 'k@contoh.id', participants: 1, reference: `KJG-RET-${status}-${RUN}`, status, note: 'catatan pemesan', internalNote: 'catatan petugas' } as never })
    ids.bookAttended = (await book('attended')).id
    ids.bookConfirmed = (await book('confirmed')).id
  })
  it('pengaturan kosong (bawaan) → tidak ada yang dianonimkan', async () => {
    const { anonymizeExpired } = await import('@/lib/retention')
    expect(await anonymizeExpired(payload, future)).toEqual({ leads: 0, 'contact-messages': 0, 'visit-bookings': 0 })
  })
  it('pengaturan retensi hanya untuk Admin Teknis', async () => {
    const asEditor = (await payload.findGlobal({ slug: 'site-settings', depth: 0, user: users.editor, overrideAccess: false } as never)) as any
    expect('retensiMinatBulan' in asEditor).toBe(false)
    await payload.updateGlobal({ slug: 'site-settings', user: users.editor, overrideAccess: false, data: { retensiMinatBulan: 1 } as never })
    expect(((await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as any).retensiMinatBulan ?? null).toBeNull()
    await payload.updateGlobal({ slug: 'site-settings', user: users.admin, overrideAccess: false, data: { retensiMinatBulan: 12, retensiPesanBulan: 12, retensiKunjunganBulan: 12 } as never })
    expect(((await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as any).retensiMinatBulan).toBe(12)
  })
  it('yang selesai & lebih tua dari N bulan dianonimkan (tidak dihapus); yang masih berjalan/baru utuh; audit hanya angka', async () => {
    const { anonymizeExpired, ANONYMIZED_NAME } = await import('@/lib/retention')
    // not old enough yet
    expect(await anonymizeExpired(payload)).toEqual({ leads: 0, 'contact-messages': 0, 'visit-bookings': 0 })
    const r = await anonymizeExpired(payload, future)
    expect(r).toEqual({ leads: 2, 'contact-messages': 1, 'visit-bookings': 1 })
    const get = (c: string, id: number) => payload.findByID({ collection: c as 'leads', id, overrideAccess: true, depth: 0 }) as Promise<any>
    const l = await get('leads', ids.leadClosed)
    expect(l).toMatchObject({ parentName: ANONYMIZED_NAME, status: 'closed', reference: `RET-closed-${RUN}` })
    expect(l.email ?? null).toBeNull()
    expect(l.phone ?? null).toBeNull()
    expect(l.message ?? null).toBeNull()
    expect(l.studentName ?? null).toBeNull()
    expect(l.notes).toEqual([])
    expect(l.anonymizedAt).toBeTruthy()
    expect((await get('leads', ids.leadOpen)).parentName).toBe(`Wali Retensi ${RUN}`)
    const m = await get('contact-messages', ids.msgDone)
    expect(m.name).toBe(ANONYMIZED_NAME)
    expect(m.message).not.toContain('pribadi')
    expect(m.internalNote ?? null).toBeNull()
    expect((await get('contact-messages', ids.msgNew)).name).toBe(`Penanya Retensi ${RUN}`)
    const b = await get('visit-bookings', ids.bookAttended)
    expect(b).toMatchObject({ parentName: ANONYMIZED_NAME, status: 'attended' })
    expect(b.note ?? null).toBeNull()
    expect(b.internalNote ?? null).toBeNull()
    expect((await get('visit-bookings', ids.bookConfirmed)).parentName).toBe(`Pemesan Retensi ${RUN}`)
    // audit: one entry with counts, no names
    const logs = await payload.find({ collection: 'audit-logs', where: { action: { equals: 'retention' } }, overrideAccess: true })
    expect(logs.totalDocs).toBe(1)
    expect(logs.docs[0]!.docTitle).toBe('Anonimisasi retensi: minat 2, pesan 1, kunjungan 1')
    expect((await payload.count({ collection: 'audit-logs', where: { or: [{ docTitle: { like: `Wali Retensi ${RUN}` } }, { docTitle: { like: `Penanya Retensi ${RUN}` } }] }, overrideAccess: true })).totalDocs).toBe(0)
    // idempotent
    expect(await anonymizeExpired(payload, future)).toEqual({ leads: 0, 'contact-messages': 0, 'visit-bookings': 0 })
  })
  it('terdaftar sebagai tugas terjadwal Payload', () => {
    const task = (payload.config.jobs?.tasks ?? []).find((t) => t.slug === 'anonymizeExpiredData')
    expect(task?.schedule?.length).toBeGreaterThan(0)
  })
})

describe('AUD-10 tautan hasil pencarian halaman', () => {
  it('halaman ber-rute ditautkan ke rutenya; halaman tanpa rute tidak muncul (bukan ke /tentang)', async () => {
    const { search, pagePath } = await import('@/lib/queries')
    const word = `Cariuji${RUN}`
    const pub = { _status: 'published', workflowStatus: 'published' }
    // a routed page (slug "sejarah") in this test school, plus a page with no route of its own
    await payload.create({ collection: 'pages', overrideAccess: true, data: { title: `Sejarah ${word}`, slug: 'sejarah', ...pub } as never })
    await payload.create({ collection: 'pages', overrideAccess: true, data: { title: `Halaman lepas ${word}`, slug: `lepas-${RUN}`, ...pub } as never })
    const r = await runAsTenant(school.id, () => search(word, 'pages'))
    expect(r.results.map((x) => x.href)).toEqual(['/tentang/sejarah'])
    expect(pagePath('tidak-ada')).toBeNull()
    expect(pagePath('kebijakan-privasi')).toBe('/kebijakan-privasi')
  })
})

describe('AUD-11 API minat mengikuti aturan "ditutup → hubungi sekolah"', () => {
  it('siklus ditutup dengan tawaran kontak → POST /api/leads/submit 403; tawaran minat berikutnya → 200', async () => {
    const { interestSubmitEndpoint } = await import('@/endpoints/interest')
    await payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { interestForm: true } })
    const cycle = await payload.create({ collection: 'admissions-cycles', overrideAccess: true, data: { academicYear: '2097/2098', admissionStatus: 'closed', mode: 'interest_form', interestFormEnabled: true, closedOffer: 'contact', _status: 'published', workflowStatus: 'published' } as never })
    const body = () => ({ parentName: `Wali Tutup ${RUN}`, phone: '081234567890', interests: ['info'], consent: true, cycle: cycle.id, idempotencyKey: randomBytes(16).toString('hex') })
    const closed = await interestSubmitEndpoint.handler(epReq(body()))
    expect(closed.status).toBe(403)
    expect((await payload.count({ collection: 'leads', where: { parentName: { equals: `Wali Tutup ${RUN}` } }, overrideAccess: true })).totalDocs).toBe(0)
    await payload.update({ collection: 'admissions-cycles', id: cycle.id, overrideAccess: true, data: { closedOffer: 'interest_next' } as never })
    expect((await interestSubmitEndpoint.handler(epReq(body()))).status).toBe(200)
  })
})
