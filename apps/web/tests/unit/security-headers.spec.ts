import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'
import { SECURITY_HEADERS } from '@/lib/security-headers'

const headersFor = async () => {
  const rules = await nextConfig.headers!()
  const all = rules.find((r) => r.source === '/:path*')!
  return Object.fromEntries(all.headers.map((h) => [h.key.toLowerCase(), h.value]))
}

describe('AUD-07 header keamanan', () => {
  it('next.config memasang semua header di semua path', async () => {
    const h = await headersFor()
    expect(Object.keys(h).sort()).toEqual(SECURITY_HEADERS.map((x) => x.key.toLowerCase()).sort())
    expect(h['strict-transport-security']).toBe('max-age=63072000; includeSubDomains')
    expect(h['strict-transport-security']).not.toMatch(/preload/)
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
  })
  it('CSP: arahan aman saja; tidak memblokir skrip Next/Payload', async () => {
    const csp = (await headersFor())['content-security-policy']
    const d = Object.fromEntries(csp.split(';').map((p) => p.trim().split(/\s+/)).map(([k, ...v]) => [k, v.join(' ')]))
    expect(d['frame-src']).toBe("'self' https://www.youtube-nocookie.com")
    expect(d['frame-ancestors']).toBe("'self'")
    expect(d['object-src']).toBe("'none'")
    expect(d['base-uri']).toBe("'self'")
    expect(d['form-action']).toBe("'self'")
    expect(d['script-src']).toBeUndefined()
    expect(d['default-src']).toBeUndefined()
    expect(d['style-src']).toBeUndefined()
  })
})
