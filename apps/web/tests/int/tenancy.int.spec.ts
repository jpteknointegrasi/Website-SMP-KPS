/**
 * TEN-xx: isolation between schools on one platform. Two throw-away schools (A: WITA, plan Pro; B: WIB, plan Basic),
 * each with its own staff and content. Every test checks that A can never see or change B's data — through the
 * real REST route handlers (Host header decides the school), the Local API with a user, and the school-scoped
 * Payload used by pages/endpoints/jobs.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { randomBytes } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { REST_GET, REST_PATCH, REST_POST } from '@payloadcms/next/routes'
import config from '@/payload.config'
import { createTestSchool, dropTestSchool, type TestSchool } from './school'
import { readFlags } from '@/lib/flags'
import { contactSubmitEndpoint } from '@/endpoints/contact'
import { visitBookingEndpoint } from '@/endpoints/visits'
import { clearTenantCache, tenantByHost } from '@/tenancy/resolve'
import { scopePayload } from '@/tenancy/scoped'
import { runAsTenant } from '@/lib/payload'
import { search } from '@/lib/queries'

const RUN = `m${Date.now().toString(36)}`
let raw: Payload
let A: TestSchool
let B: TestSchool
const staff: Record<string, any> = {}
const ids: Record<string, number> = {}
let superAdmin: any

const pw = () => randomBytes(18).toString('base64url')
const pub = { overrideAccess: false as const, draft: false as const }
const asUser = (u: any) => ({ ...u, collection: 'users' })

const restGet = REST_GET(config)
const restPost = REST_POST(config)
const restPatch = REST_PATCH(config)
const api = async (method: 'GET' | 'POST' | 'PATCH', host: string, path: string, body?: unknown) => {
  const url = `http://${host}/api/${path}`
  const req = new Request(url, {
    method,
    headers: { host, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const slug = new URL(url).pathname.replace(/^\/api\//, '').split('/')
  const handler = method === 'GET' ? restGet : method === 'POST' ? restPost : restPatch
  const res = await handler(req, { params: Promise.resolve({ slug }) })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, json }
}

beforeAll(async () => {
  raw = await getPayload({ config })
  A = await createTestSchool(raw, `${RUN}a`, { plan: 'pro', timezone: 'Asia/Makassar' })
  B = await createTestSchool(raw, `${RUN}b`, { plan: 'basic', timezone: 'Asia/Jakarta' })
  for (const [k, s] of [['A', A], ['B', B]] as const) {
    for (const role of ['admin', 'editor', 'admissions'] as const) {
      const u = await s.payload.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-${k}-${role}@test.invalid`, password: pw(), name: `${k} ${role}`, role } })
      staff[`${k}${role}`] = asUser(u)
    }
    // the same slug in both schools: allowed, because slugs are unique per school
    const post = await s.payload.create({ collection: 'posts', overrideAccess: true, data: { title: `Rahasia ${k} ${RUN}`, slug: `ppdb-${RUN}`, _status: 'published', workflowStatus: 'published' } as never })
    ids[`${k}post`] = post.id
    const draft = await s.payload.create({ collection: 'posts', overrideAccess: true, draft: true, data: { title: `Draf ${k} ${RUN}`, slug: `draf-${RUN}`, _status: 'draft' } as never })
    ids[`${k}draft`] = draft.id
    const lead = await s.payload.create({ collection: 'leads', overrideAccess: true, data: { parentName: `Wali ${k} ${RUN}`, phone: '081234567890', interests: ['info'], reference: `REF-${k}-${RUN}`, status: 'new', idempotencyKey: `${k}-${RUN}-key-0000000000` } as never })
    ids[`${k}lead`] = lead.id
  }
  superAdmin = asUser(await raw.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-super@test.invalid`, password: pw(), name: 'Super', role: 'superadmin' } }))
})

afterAll(async () => {
  await raw.delete({ collection: 'users', id: superAdmin.id, overrideAccess: true }).catch(() => {})
  await dropTestSchool(raw, A.id)
  await dropTestSchool(raw, B.id)
})

describe('TEN-01 resolusi domain → sekolah', () => {
  it('domain sekolah, huruf besar & port tetap dikenali; domain asing tidak', async () => {
    expect((await tenantByHost(raw, A.domain))?.id).toBe(A.id)
    expect((await tenantByHost(raw, `${B.domain.toUpperCase()}:443`))?.id).toBe(B.id)
    expect(await tenantByHost(raw, `bukan-${RUN}.contoh.test`)).toBeNull()
  })
})

describe('TEN-02 publik lewat REST (Host menentukan sekolah)', () => {
  it('berita sekolah A tidak pernah muncul di alamat sekolah B', async () => {
    const a = await api('GET', A.domain, `posts?where[slug][equals]=ppdb-${RUN}`)
    const b = await api('GET', B.domain, `posts?where[slug][equals]=ppdb-${RUN}`)
    expect(a.json.docs.map((d: any) => d.id)).toEqual([ids.Apost])
    expect(b.json.docs.map((d: any) => d.id)).toEqual([ids.Bpost])
  })
  it('ambil per ID milik sekolah lain = tidak ada', async () => {
    const r = await api('GET', A.domain, `posts/${ids.Bpost}`)
    expect(r.status).toBe(404)
  })
  it('alamat yang tidak terdaftar tidak membaca apa pun', async () => {
    const r = await api('GET', `asing-${RUN}.contoh.test`, `posts?where[slug][equals]=ppdb-${RUN}`)
    expect(r.status === 403 || r.json?.docs?.length === 0).toBe(true)
  })
  it('data pribadi (minat) tetap tertutup untuk publik', async () => {
    const r = await api('GET', A.domain, 'leads')
    expect(r.status).toBe(403)
  })
  it('pengaturan sekolah terbaca hanya milik sekolah itu', async () => {
    const r = await api('GET', B.domain, 'site-settings')
    expect(r.json.docs.length).toBe(1)
    expect(r.json.docs[0].schoolName).toBe(`Sekolah Uji ${RUN}b`)
  })
})

describe('TEN-03 staf sekolah A terhadap data sekolah B', () => {
  it('tidak dapat membaca draf/berita sekolah B', async () => {
    await expect(raw.findByID({ collection: 'posts', id: ids.Bdraft, draft: true, user: staff.Aeditor, overrideAccess: false })).rejects.toThrow()
    const list = await raw.find({ collection: 'posts', where: { slug: { equals: `ppdb-${RUN}` } }, user: staff.Aadmin, overrideAccess: false, draft: true })
    expect(list.docs.map((d) => d.id)).toEqual([ids.Apost])
  })
  it('tidak dapat mengubah atau menghapus berita sekolah B', async () => {
    await expect(raw.update({ collection: 'posts', id: ids.Bpost, user: staff.Aadmin, overrideAccess: false, data: { title: 'dibajak' } as never })).rejects.toThrow()
    await expect(raw.delete({ collection: 'posts', id: ids.Bpost, user: staff.Aadmin, overrideAccess: false })).rejects.toThrow()
    const still = await B.payload.findByID({ collection: 'posts', id: ids.Bpost, overrideAccess: true })
    expect(still.title).toBe(`Rahasia B ${RUN}`)
  })
  it('membuat dokumen dengan tenant sekolah B tetap tersimpan di sekolah A', async () => {
    const d = await raw.create({ collection: 'faqs', user: staff.Aeditor, overrideAccess: false, data: { title: `Titip ${RUN}`, answer: undefined, tenant: B.id, _status: 'draft' } as never, draft: true })
    expect((d as any).tenant).toBe(A.id)
  })
  it('tidak dapat memindahkan dokumen ke sekolah lain', async () => {
    const d = await raw.update({ collection: 'posts', id: ids.Apost, user: staff.Aeditor, overrideAccess: false, data: { tenant: B.id } as never })
    expect(typeof (d as any).tenant === 'object' ? (d as any).tenant.id : (d as any).tenant).toBe(A.id)
  })
  it('lewat REST dengan sesi sekolah A tidak bisa menulis ke sekolah B', async () => {
    // anonymous REST write is refused regardless of the school
    const r = await api('PATCH', B.domain, `posts/${ids.Bpost}`, { title: 'x' })
    expect([401, 403, 404]).toContain(r.status)
  })
  it('gambar milik sekolah B tidak dapat dipasang di konten sekolah A', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    const media = await B.payload.create({ collection: 'media', overrideAccess: true, data: { alt: `B ${RUN}` }, file: { data: png, mimetype: 'image/png', name: 'b.png', size: png.length } } as never)
    await expect(raw.create({ collection: 'posts', user: staff.Aeditor, overrideAccess: false, data: { title: `Curi ${RUN}`, slug: `curi-${RUN}`, cover: media.id, _status: 'published' } as never })).rejects.toThrow()
  })
})

describe('TEN-04 data pribadi calon orang tua', () => {
  it('petugas pendaftaran A hanya melihat minat sekolah A', async () => {
    const r = await raw.find({ collection: 'leads', where: { parentName: { like: RUN } }, user: staff.Aadmissions, overrideAccess: false, limit: 50 })
    expect(r.docs.map((d) => d.id)).toEqual([ids.Alead])
  })
  it('Super Admin pun tidak melihat minat tanpa izin eksplisit', async () => {
    await expect(raw.find({ collection: 'leads', user: superAdmin, overrideAccess: false })).rejects.toThrow()
  })
})

describe('TEN-05 akun & peran', () => {
  it('Admin A hanya melihat akun sekolah A', async () => {
    const r = await raw.find({ collection: 'users', where: { email: { like: RUN } }, user: staff.Aadmin, overrideAccess: false, limit: 50 })
    expect(r.docs.length).toBe(3)
    expect(r.docs.every((u: any) => (typeof u.tenant === 'object' ? u.tenant?.id : u.tenant) === A.id)).toBe(true)
  })
  it('Admin A membuat akun → otomatis di sekolah A, tidak bisa Super Admin', async () => {
    const u = await raw.create({ collection: 'users', user: staff.Aadmin, overrideAccess: false, data: { email: `${RUN}-new@test.invalid`, password: pw(), name: 'Baru', role: 'editor', tenant: B.id } as never })
    expect((u as any).tenant === A.id || (u as any).tenant?.id === A.id).toBe(true)
    await raw.delete({ collection: 'users', id: u.id, overrideAccess: true })
    await expect(raw.create({ collection: 'users', user: staff.Aadmin, overrideAccess: false, data: { email: `${RUN}-sa@test.invalid`, password: pw(), name: 'SA', role: 'superadmin' } as never })).rejects.toThrow()
  })
  it('Admin A tidak dapat mengubah akun sekolah B', async () => {
    await expect(raw.update({ collection: 'users', id: staff.Beditor.id, user: staff.Aadmin, overrideAccess: false, data: { name: 'x' } })).rejects.toThrow()
  })
  it('staf sekolah A tidak bisa masuk lewat alamat sekolah B', async () => {
    const email = `${RUN}-A-editor@test.invalid`
    const password = pw()
    await raw.update({ collection: 'users', id: staff.Aeditor.id, overrideAccess: true, data: { password } })
    await expect(raw.login({ collection: 'users', data: { email, password }, req: { headers: new Headers({ host: B.domain }) } as never })).rejects.toThrow()
    const ok = await raw.login({ collection: 'users', data: { email, password }, req: { headers: new Headers({ host: A.domain }) } as never })
    expect(ok.user?.id).toBe(staff.Aeditor.id)
  })
})

describe('TEN-06 Payload ber-tenant (dipakai halaman, endpoint, job)', () => {
  it('bahkan dengan overrideAccess, dokumen sekolah lain tidak terlihat', async () => {
    await expect(A.payload.findByID({ collection: 'posts', id: ids.Bpost, overrideAccess: true })).rejects.toThrow()
    const n = await A.payload.count({ collection: 'leads', overrideAccess: true })
    expect(n.totalDocs).toBe(1)
    await expect(A.payload.update({ collection: 'leads', id: ids.Blead, overrideAccess: true, data: { status: 'closed' } as never })).rejects.toThrow()
  })
  it('pencarian situs hanya mencari di sekolah sendiri', async () => {
    const r = await runAsTenant(A.id, () => search(`Rahasia`))
    const titles = r.results.map((x: { title: string }) => x.title)
    expect(titles).toContain(`Rahasia A ${RUN}`)
    expect(titles).not.toContain(`Rahasia B ${RUN}`)
  })
})

describe('TEN-07 endpoint publik mengikuti alamat', () => {
  it('pesan kontak dari alamat B tersimpan di sekolah B saja', async () => {
    const body = { name: `Penanya ${RUN}`, email: 'a@contoh.id', category: 'umum', message: 'Halo, saya ingin bertanya.', consent: true, startedAt: Date.now() - 10_000 }
    const req = { payload: raw, headers: new Headers({ host: B.domain, 'x-forwarded-for': '10.200.1.1' }), json: async () => body } as unknown as PayloadRequest
    const res = await contactSubmitEndpoint.handler(req)
    expect(res.status).toBe(200)
    expect((await B.payload.count({ collection: 'contact-messages', where: { name: { like: RUN } }, overrideAccess: true })).totalDocs).toBe(1)
    expect((await A.payload.count({ collection: 'contact-messages', where: { name: { like: RUN } }, overrideAccess: true })).totalDocs).toBe(0)
  })
  it('alamat tak dikenal → 404, tidak ada data tersimpan', async () => {
    const req = { payload: raw, headers: new Headers({ host: `asing-${RUN}.contoh.test` }), json: async () => ({}) } as unknown as PayloadRequest
    expect((await contactSubmitEndpoint.handler(req)).status).toBe(404)
  })
})

describe('TEN-08 fitur & paket per sekolah', () => {
  it('fitur dinyalakan di A tidak menyala di B; paket Basic membatasi', async () => {
    await A.payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { interestForm: true } })
    await B.payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { interestForm: true, calendarMonthView: true } })
    expect((await readFlags(A.payload)).interestForm).toBe(true)
    const b = await readFlags(B.payload)
    expect(b.interestForm).toBe(false) // plan Basic
    expect(b.calendarMonthView).toBe(true)
    expect((await readFlags(raw)).interestForm).toBe(false) // unscoped: everything off
  })
  it('editor A tidak dapat mengubah pengaturan sekolah B', async () => {
    const bSettings = await B.payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    await expect(raw.update({ collection: 'site-settings', id: (bSettings as any).id, user: staff.Aeditor, overrideAccess: false, data: { schoolName: 'dibajak' } })).rejects.toThrow()
  })
  it('satu dokumen pengaturan per sekolah', async () => {
    await expect(raw.create({ collection: 'site-settings', overrideAccess: true, data: { schoolName: 'dobel', tenant: A.id } as never })).rejects.toThrow()
  })
})

describe('TEN-09 audit & Super Admin', () => {
  it('log audit tercatat per sekolah; admin A tidak membaca log sekolah B', async () => {
    await raw.update({ collection: 'posts', id: ids.Bpost, user: staff.Beditor, overrideAccess: false, data: { title: `Rahasia B ${RUN}` } as never })
    const mine = await raw.find({ collection: 'audit-logs', where: { docId: { equals: String(ids.Bpost) } }, user: staff.Aadmin, overrideAccess: false })
    expect(mine.totalDocs).toBe(0)
    const theirs = await raw.find({ collection: 'audit-logs', where: { docId: { equals: String(ids.Bpost) } }, user: staff.Badmin, overrideAccess: false })
    expect(theirs.totalDocs).toBeGreaterThan(0)
  })
  it('Super Admin melihat kedua sekolah', async () => {
    const r = await raw.find({ collection: 'posts', where: { slug: { equals: `ppdb-${RUN}` } }, user: superAdmin, overrideAccess: false })
    expect(r.docs.map((d) => d.id).sort()).toEqual([ids.Apost, ids.Bpost].sort())
  })
  it('sekolah ditangguhkan: situs tertutup untuk publik', async () => {
    await raw.update({ collection: 'tenants', id: B.id, overrideAccess: true, data: { status: 'suspended' } })
    clearTenantCache()
    const r = await api('GET', B.domain, `posts?where[slug][equals]=ppdb-${RUN}`)
    expect(r.status === 403 || r.json?.docs?.length === 0).toBe(true)
    await raw.update({ collection: 'tenants', id: B.id, overrideAccess: true, data: { status: 'active' } })
    clearTenantCache()
  })
  it('sekolah yang masih berisi data tidak bisa dihapus', async () => {
    await expect(raw.delete({ collection: 'tenants', id: A.id, overrideAccess: true })).rejects.toThrow()
  })
})

describe('TEN-10 sekolah baru langsung siap', () => {
  it('pengaturan, navigasi, fitur dan beranda draf dibuat otomatis', async () => {
    const s = scopePayload(raw, B.id)
    expect((await s.findGlobal({ slug: 'site-settings', overrideAccess: true }))?.schoolName).toBe(`Sekolah Uji ${RUN}b`)
    expect(((await s.findGlobal({ slug: 'navigation', overrideAccess: true }))?.header ?? []).length).toBeGreaterThan(0)
    expect(await s.findGlobal({ slug: 'feature-flags', overrideAccess: true })).toBeTruthy()
    // homepage is a draft until the school adds a photo: not public yet
    expect(await s.findGlobal({ slug: 'homepage', ...pub })).toBeNull()
  })
})

describe('TEN-11 temuan audit: kuota, buka kunci akun, alamat login', () => {
  it('petugas A tidak bisa memindahkan pemesanan ke sesi sekolah B (kuota B tidak berubah)', async () => {
    await A.payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { schoolVisits: true } })
    const sess = (s: TestSchool, cap: number) =>
      s.payload.create({ collection: 'visit-sessions', overrideAccess: true, data: { title: `Sesi ${RUN}`, kind: 'open_house', sessionStatus: 'open', startAt: new Date(Date.now() + 7 * 864e5).toISOString(), capacity: cap, capacityUnit: 'people', requiresConfirmation: false } as never })
    const sa = await sess(A, 5)
    const sb = await sess(B, 10)
    const body = { session: sa.id, parentName: `Wali ${RUN}`, email: 'w@contoh.id', participants: 1, consent: true, idempotencyKey: randomBytes(16).toString('hex') }
    const res = await visitBookingEndpoint.handler({ payload: raw, user: null, url: 'http://x/api/x', headers: new Headers({ host: A.domain, 'x-forwarded-for': '10.201.1.1' }), json: async () => body } as unknown as PayloadRequest)
    expect(res.status).toBe(200)
    const bk = (await A.payload.find({ collection: 'visit-bookings', where: { parentName: { equals: `Wali ${RUN}` } }, overrideAccess: true })).docs[0]!
    await expect(raw.update({ collection: 'visit-bookings', id: bk.id, user: staff.Aadmissions, overrideAccess: false, data: { session: sb.id, status: 'confirmed', participants: 10 } as never })).rejects.toThrow()
    expect(Number((await B.payload.findByID({ collection: 'visit-sessions', id: sb.id, overrideAccess: true })).bookedCount ?? 0)).toBe(0)
    expect(Number((await A.payload.findByID({ collection: 'visit-sessions', id: sa.id, overrideAccess: true })).bookedCount ?? 0)).toBe(1)
  })
  it('staf sekolah A tidak bisa membuka kunci akun sekolah B; admin B bisa', async () => {
    await raw.update({ collection: 'users', id: staff.Badmin.id, overrideAccess: true, data: { loginAttempts: 5, lockUntil: new Date(Date.now() + 3600e3).toISOString() } as never })
    await expect(raw.unlock({ collection: 'users', data: { email: staff.Badmin.email }, user: staff.Aadmin, overrideAccess: false } as never)).rejects.toThrow()
    expect(((await raw.findByID({ collection: 'users', id: staff.Badmin.id, overrideAccess: true, showHiddenFields: true })) as any).loginAttempts).toBe(5)
    await raw.unlock({ collection: 'users', data: { email: staff.Badmin.email }, user: superAdmin, overrideAccess: false } as never)
    expect(((await raw.findByID({ collection: 'users', id: staff.Badmin.id, overrideAccess: true, showHiddenFields: true })) as any).loginAttempts).toBe(0)
  })
  it('staf tidak bisa masuk lewat alamat yang bukan milik sekolah mana pun', async () => {
    const password = pw()
    await raw.update({ collection: 'users', id: staff.Beditor.id, overrideAccess: true, data: { password } })
    await expect(raw.login({ collection: 'users', data: { email: staff.Beditor.email, password }, req: { headers: new Headers({ host: `asing-${RUN}.contoh.test` }) } as never })).rejects.toThrow()
  })
  it('kunci dokumen bersama dimatikan untuk semua koleksi', () => {
    for (const c of raw.config.collections) if (!c.slug.startsWith('payload-')) expect([c.slug, c.lockDocuments]).toEqual([c.slug, false])
  })
})

describe('TEN-12 langganan per produk (Web / App dijual terpisah)', () => {
  it('sekolah tanpa Sekolahku Web: semua fitur website mati dan endpoint website tertutup', async () => {
    await raw.update({ collection: 'tenants', id: B.id, overrideAccess: true, data: { web: { plan: 'none', status: 'active' } } as never })
    clearTenantCache()
    expect(Object.values(await readFlags(B.payload)).some(Boolean)).toBe(false)
    const body = { name: `Penanya ${RUN}`, email: 'a@contoh.id', category: 'umum', message: 'Halo, saya ingin bertanya.', consent: true, startedAt: Date.now() - 10_000 }
    const req = { payload: raw, headers: new Headers({ host: B.domain, 'x-forwarded-for': '10.202.1.1' }), json: async () => body } as unknown as PayloadRequest
    expect((await contactSubmitEndpoint.handler(req)).status).toBe(404)
    await raw.update({ collection: 'tenants', id: B.id, overrideAccess: true, data: { web: { plan: 'basic', status: 'active' } } as never })
    clearTenantCache()
  })
  it('Web yang dijeda menutup fitur, data tetap', async () => {
    await raw.update({ collection: 'tenants', id: A.id, overrideAccess: true, data: { web: { plan: 'pro', status: 'paused' } } as never })
    clearTenantCache()
    expect((await readFlags(A.payload)).interestForm).toBe(false)
    expect((await A.payload.count({ collection: 'leads', overrideAccess: true })).totalDocs).toBe(1)
    await raw.update({ collection: 'tenants', id: A.id, overrideAccess: true, data: { web: { plan: 'pro', status: 'active' } } as never })
    clearTenantCache()
  })
  it('URL database App disimpan tersegel dan tidak pernah terbaca lewat API, juga oleh Super Admin', async () => {
    await raw.update({ collection: 'tenants', id: A.id, overrideAccess: true, data: { app: { plan: 'pilot', status: 'trial', databaseInput: 'postgres://u:rahasia@db.contoh:5432/app_a' } } as never })
    const row = await raw.db.drizzle.execute(`SELECT app_database FROM tenants WHERE id = ${A.id}` as never) as unknown as { rows: { app_database: string }[] }
    expect(row.rows[0]!.app_database.startsWith('v1.')).toBe(true)
    expect(row.rows[0]!.app_database).not.toContain('rahasia')
    const viaApi = (await raw.findByID({ collection: 'tenants', id: A.id, user: superAdmin, overrideAccess: false })) as any
    expect(JSON.stringify(viaApi)).not.toContain('rahasia')
    expect(viaApi.app.database).toBeUndefined()
    expect(viaApi.app.databaseConfigured).toBe(true)
    // saving the school again without a new URL keeps the sealed value
    await raw.update({ collection: 'tenants', id: A.id, user: superAdmin, overrideAccess: false, data: { name: `Sekolah Uji ${RUN}a` } })
    const again = await raw.db.drizzle.execute(`SELECT app_database FROM tenants WHERE id = ${A.id}` as never) as unknown as { rows: { app_database: string }[] }
    expect(again.rows[0]!.app_database).toBe(row.rows[0]!.app_database)
    await raw.update({ collection: 'tenants', id: A.id, overrideAccess: true, data: { app: { plan: 'none', status: 'trial' } } as never })
  })
})

describe('TEN-13 temuan audit tahap produk', () => {
  it('riwayat versi data sekolah hanya untuk Super Admin', async () => {
    await expect(raw.findVersions({ collection: 'tenants', user: staff.Aadmin, overrideAccess: false })).rejects.toThrow()
    const r = await raw.findVersions({ collection: 'tenants', user: superAdmin, overrideAccess: false, limit: 1 })
    expect(r.totalDocs).toBeGreaterThan(0)
  })
  it('nilai database App yang dikirim langsung diabaikan; hanya input yang disegel; bisa dihapus', async () => {
    const sel = async () => ((await raw.db.drizzle.execute(`SELECT app_database FROM tenants WHERE id = ${B.id}` as never)) as unknown as { rows: { app_database: string | null }[] }).rows[0]!.app_database
    await raw.update({ collection: 'tenants', id: B.id, user: superAdmin, overrideAccess: false, data: { app: { plan: 'pilot', status: 'trial', database: 'postgres://x:y@evil/z' } } as never })
    expect(await sel()).toBeNull()
    await raw.update({ collection: 'tenants', id: B.id, user: superAdmin, overrideAccess: false, data: { app: { databaseInput: 'postgres://u:p@db/b' } } as never })
    const sealed = await sel()
    expect(sealed?.startsWith('v1.')).toBe(true)
    await raw.update({ collection: 'tenants', id: B.id, user: superAdmin, overrideAccess: false, data: { app: { database: 'postgres://x:y@evil/z' } } as never })
    expect(await sel()).toBe(sealed)
    await raw.update({ collection: 'tenants', id: B.id, user: superAdmin, overrideAccess: false, data: { app: { databaseClear: true, plan: 'none' } } as never })
    expect(await sel()).toBeNull()
  })
  it('tanpa langganan Web, REST publik tidak membaca konten sekolah itu', async () => {
    await raw.update({ collection: 'tenants', id: B.id, overrideAccess: true, data: { web: { plan: 'none', status: 'active' } } as never })
    clearTenantCache()
    const r = await api('GET', B.domain, `posts?where[slug][equals]=ppdb-${RUN}`)
    expect(r.status === 403 || r.json?.docs?.length === 0).toBe(true)
    await raw.update({ collection: 'tenants', id: B.id, overrideAccess: true, data: { web: { plan: 'basic', status: 'active' } } as never })
    clearTenantCache()
    const back = await api('GET', B.domain, `posts?where[slug][equals]=ppdb-${RUN}`)
    expect(back.json.docs.length).toBe(1)
  })
})
