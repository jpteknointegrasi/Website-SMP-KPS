import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

const req = (url: string) => new NextRequest(new URL(url), { headers: { host: new URL(url).host } })

describe('proxy: SatuSekolah landing on the platform domain', () => {
  it('rewrites / on satusekolah.my.id and www to /satusekolah', () => {
    for (const u of ['https://satusekolah.my.id/', 'https://www.satusekolah.my.id/']) {
      const res = proxy(req(u))
      expect(res.headers.get('x-middleware-rewrite')).toContain('/satusekolah')
    }
  })
  it('leaves school domains and other paths alone', () => {
    expect(proxy(req('https://www.smpkps.sch.id/')).headers.get('x-middleware-rewrite')).toBeNull()
    expect(proxy(req('https://satusekolah.my.id/platform')).headers.get('x-middleware-rewrite')).toBeNull()
  })
})
