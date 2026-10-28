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
