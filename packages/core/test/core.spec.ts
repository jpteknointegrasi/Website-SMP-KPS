import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import {
  admissionsMode,
  cookieValue,
  hasProduct,
  normalizeHost,
  openSecret,
  payloadJwtKey,
  portalRequestHost,
  redactUrl,
  sealSecret,
  subdomainSlug,
  verifyStaffToken,
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
    expect(subdomainSlug('sman1.sekolahku.id', 'sekolahku.id')).toBe('sman1')
    expect(subdomainSlug('x.y.sekolahku.id', 'sekolahku.id')).toBeNull()
    expect(subdomainSlug('sekolahku.id', 'sekolahku.id')).toBeNull()
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
  it('penerimaan siswa baru di portal hanya bila Sekolahku App aktif', () => {
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

describe('sesi staf bersama', () => {
  const secret = 'payload-secret-uji'
  const sign = (claims: object, k = payloadJwtKey(secret)) => {
    const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const p = Buffer.from(JSON.stringify(claims)).toString('base64url')
    return `${h}.${p}.${createHmac('sha256', k).update(`${h}.${p}`).digest('base64url')}`
  }
  const exp = Math.floor(Date.now() / 1000) + 600
  it('token Payload yang sah diterima; palsu, kedaluwarsa atau koleksi lain ditolak', () => {
    expect(verifyStaffToken(sign({ id: 5, collection: 'users', sid: 'abc', exp }), { secret })?.id).toBe(5)
    expect(verifyStaffToken(sign({ id: 5, collection: 'users', exp }, 'kunci-lain'), { secret })).toBeNull()
    expect(verifyStaffToken(sign({ id: 5, collection: 'users', exp: exp - 1200 }), { secret })).toBeNull()
    expect(verifyStaffToken(sign({ id: 5, collection: 'applicants', exp }), { secret })).toBeNull()
    expect(verifyStaffToken('a.b', { secret })).toBeNull()
    const none = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from(JSON.stringify({ id: 1, collection: 'users', exp })).toString('base64url')}.`
    expect(verifyStaffToken(none, { secret })).toBeNull()
  })
  it('cookie dibaca dari header', () => {
    expect(cookieValue('a=1; payload-token=xyz%3D; b=2', 'payload-token')).toBe('xyz=')
    expect(cookieValue(null, 'payload-token')).toBeNull()
  })
})
