import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  admissionsMode,
  cookieValue,
  fetchStaff,
  hasProduct,
  normalizeHost,
  openSecret,
  portalRequestHost,
  redactUrl,
  sealSecret,
  subdomainSlug,
  type SchoolInfo,
} from '../src'

const school = (o: Partial<SchoolInfo> = {}): SchoolInfo => ({
  id: 1,
  slug: 'kps',
  name: 'SMP Nasional KPS',
  timezone: 'Asia/Makassar',
  status: 'active',
  primaryDomain: 'www.smpkps.sch.id',
  web: { plan: 'pro', status: 'active' },
  app: { plan: 'none', status: 'trial' },
  ...o,
})

describe('alamat sekolah', () => {
  it('host dinormalisasi; subdomain platform dikenali', () => {
    expect(normalizeHost('WWW.SmpKps.sch.id:443')).toBe('www.smpkps.sch.id')
    expect(normalizeHost('a.b., c')).toBe('a.b')
    expect(subdomainSlug('sman1.satusekolah.my.id', 'satusekolah.my.id')).toBe('sman1')
    expect(subdomainSlug('x.y.satusekolah.my.id', 'satusekolah.my.id')).toBeNull()
    expect(subdomainSlug('satusekolah.my.id', 'satusekolah.my.id')).toBeNull()
  })
})

describe('produk dijual terpisah', () => {
  it('hak produk: berlangganan, tidak dijeda, sekolah tidak ditangguhkan', () => {
    expect(hasProduct(school(), 'web')).toBe(true)
    expect(hasProduct(school(), 'app')).toBe(false)
    expect(hasProduct(school({ app: { plan: 'pilot', status: 'trial' } }), 'app')).toBe(true)
    expect(hasProduct(school({ web: { plan: 'pro', status: 'paused' } }), 'web')).toBe(false)
    expect(hasProduct(school({ status: 'suspended' }), 'web')).toBe(false)
    expect(hasProduct(null, 'web')).toBe(false)
  })
  it('penerimaan siswa baru di portal hanya bila Satu Sekolah App aktif', () => {
    expect(admissionsMode(school())).toBe('web')
    expect(admissionsMode(school({ app: { plan: 'standard', status: 'active' } }))).toBe('app')
    expect(admissionsMode(school({ app: { plan: 'standard', status: 'paused' } }))).toBe('web')
  })
  it('host yang diteruskan website hanya dipercaya dengan rahasia yang benar', () => {
    const h = (o: Record<string, string>) => new Headers(o)
    const secret = 'x'.repeat(32)
    expect(portalRequestHost(h({ host: 'portal.vercel.app', 'x-sekolahku-host': 'www.a.sch.id', 'x-sekolahku-proxy': secret }), secret)).toBe('www.a.sch.id')
    expect(portalRequestHost(h({ host: 'portal.vercel.app', 'x-sekolahku-host': 'www.a.sch.id', 'x-sekolahku-proxy': 'salah' }), secret)).toBe('portal.vercel.app')
    expect(portalRequestHost(h({ host: 'portal.vercel.app', 'x-sekolahku-host': 'www.a.sch.id' }), secret)).toBe('portal.vercel.app')
    expect(portalRequestHost(h({ host: 'p', 'x-sekolahku-host': 'w', 'x-sekolahku-proxy': 'pendek' }), 'pendek')).toBe('p') // too short = off
    // production: no valid pass-through → no school at all (fails closed)
    expect(portalRequestHost(h({ host: 'portal.vercel.app' }), secret, { requireProxy: true })).toBeNull()
    expect(portalRequestHost(h({ host: 'p', 'x-sekolahku-host': 'www.a.sch.id', 'x-sekolahku-proxy': secret }), secret, { requireProxy: true })).toBe('www.a.sch.id')
  })
})

describe('rahasia tersegel', () => {
  const key = 'rahasia-platform-yang-panjang-sekali'
  it('bolak-balik, acak setiap kali, gagal bila diubah atau kunci salah', () => {
    const url = 'postgres://u:pw@db.contoh:5432/app_kps'
    const a = sealSecret(url, key)
    const b = sealSecret(url, key)
    expect(a).not.toBe(b)
    expect(a).not.toContain('pw@')
    expect(openSecret(a, key)).toBe(url)
    const parts = a.split('.')
    const tampered = [parts[0], parts[1], parts[2], Buffer.from('x' + Buffer.from(parts[3]!, 'base64url').toString('latin1'), 'latin1').toString('base64url')].join('.')
    expect(() => openSecret(tampered, key)).toThrow()
    expect(() => openSecret(a, `${key}-lain`)).toThrow()
    expect(redactUrl(url)).toBe('postgres://u:****@db.contoh:5432/app_kps')
  })
})

describe('sesi staf bersama (dikonfirmasi website, portal tidak memegang rahasia CMS)', () => {
  let server: Server
  let origin = ''
  const seen: string[] = []
  beforeAll(async () => {
    server = createServer((req, res) => {
      seen.push(String(req.headers.authorization))
      const tok = String(req.headers.authorization ?? '').replace(/^JWT /, '')
      const users: Record<string, object> = {
        'a.b.ok': { id: 7, name: 'Bu Ani', email: 'ani@a.sch.id', role: 'admissions', tenant: 3, active: true },
        'a.b.populated': { id: 8, name: 'X', email: 'x@a', role: 'editor', tenant: { id: 4 }, active: true },
        'a.b.off': { id: 9, name: 'Y', email: 'y@a', role: 'editor', tenant: 3, active: false },
      }
      res.setHeader('content-type', 'application/json')
      if (tok === 'a.b.down') {
        res.statusCode = 500
        return res.end('{}')
      }
      res.end(JSON.stringify({ user: users[tok] ?? null }))
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()))
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  it('akun aktif dikembalikan dengan sekolahnya; token tidak sah/logout/nonaktif/gangguan = null', async () => {
    expect(await fetchStaff('a.b.ok', origin)).toEqual({ id: 7, name: 'Bu Ani', email: 'ani@a.sch.id', role: 'admissions', schoolId: 3 })
    expect((await fetchStaff('a.b.populated', origin))?.schoolId).toBe(4)
    expect(await fetchStaff('a.b.logout', origin)).toBeNull()
    expect(await fetchStaff('a.b.off', origin)).toBeNull()
    expect(await fetchStaff('a.b.down', origin)).toBeNull()
    expect(await fetchStaff('a.b.ok', 'http://127.0.0.1:1')).toBeNull() // website unreachable → fails closed
  })
  it('nilai cookie sembarang tidak pernah diteruskan', async () => {
    const before = seen.length
    expect(await fetchStaff('bukan token; injeksi', origin)).toBeNull()
    expect(await fetchStaff(null, origin)).toBeNull()
    expect(seen.length).toBe(before)
  })
  it('cookie dibaca dari header', () => {
    expect(cookieValue('a=1; payload-token=xyz%3D; b=2', 'payload-token')).toBe('xyz=')
    expect(cookieValue(null, 'payload-token')).toBeNull()
  })
})

describe('registri: role database platform', () => {
  it('produksi menolak cadangan DATABASE_URI/DATABASE_URL (hak penuh); dev, uji & build tetap jalan', async () => {
    const { platformDatabaseUrl, isProductionRuntime } = await import('../src/registry')
    expect(platformDatabaseUrl({ NODE_ENV: 'production', PLATFORM_DATABASE_URL: 'postgres://ro@h/p', DATABASE_URI: 'postgres://rw@h/p' })).toBe('postgres://ro@h/p')
    expect(() => platformDatabaseUrl({ NODE_ENV: 'production', DATABASE_URI: 'postgres://rw@h/p' })).toThrow(/PLATFORM_DATABASE_URL wajib/)
    expect(() => platformDatabaseUrl({ NODE_ENV: 'production', DATABASE_URL: 'postgres://rw@h/p' })).toThrow(/hanya-baca/)
    expect(platformDatabaseUrl({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build', DATABASE_URI: 'postgres://rw@h/p' })).toBe('postgres://rw@h/p')
    expect(platformDatabaseUrl({ NODE_ENV: 'development', DATABASE_URI: 'postgres://rw@h/p' })).toBe('postgres://rw@h/p')
    expect(platformDatabaseUrl({ NODE_ENV: 'test' })).toBeUndefined()
    expect(isProductionRuntime({ NODE_ENV: 'production' })).toBe(true)
  })
  it('peringatan bila role dapat INSERT/UPDATE tenants; tidak pernah gagal', async () => {
    const { warnIfWritable } = await import('../src/registry')
    const logs: string[] = []
    const q = (w: boolean) => ({ query: async () => ({ rows: [{ w }] }) }) as never
    expect(await warnIfWritable(q(true), (m) => logs.push(m))).toBe(true)
    expect(logs[0]).toMatch(/hanya-baca/)
    expect(await warnIfWritable(q(false), (m) => logs.push(m))).toBe(false)
    expect(await warnIfWritable({ query: async () => { throw new Error('x') } } as never, (m) => logs.push(m))).toBe(false)
    expect(logs).toHaveLength(1)
  })
})
