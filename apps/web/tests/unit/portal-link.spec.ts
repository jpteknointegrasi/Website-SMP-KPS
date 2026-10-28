import { describe, expect, it } from 'vitest'
import { portalLink } from '@/lib/portal-link'

describe('AUD-16 tombol portal di header', () => {
  it('App aktif → "Masuk Portal" ke /portal, URL di pengaturan tidak bisa menggantinya', () => {
    expect(portalLink({ appActive: true, portalUrl: 'https://portal-lama.contoh.sch.id' })).toEqual({ href: '/portal', label: 'Masuk Portal', external: false })
    expect(portalLink({ appActive: true, portalUrl: null })).toEqual({ href: '/portal', label: 'Masuk Portal', external: false })
  })
  it('tanpa App → URL portal sekolah dari pengaturan (eksternal di tab baru), kosong = tanpa tombol', () => {
    expect(portalLink({ appActive: false, portalUrl: 'https://portal.contoh.sch.id' })).toEqual({ href: 'https://portal.contoh.sch.id', label: 'Portal Sekolah', external: true })
    expect(portalLink({ appActive: false, portalUrl: '/layanan' })).toEqual({ href: '/layanan', label: 'Portal Sekolah', external: false })
    expect(portalLink({ appActive: false, portalUrl: '' })).toBeNull()
    expect(portalLink({ appActive: false })).toBeNull()
  })
})
