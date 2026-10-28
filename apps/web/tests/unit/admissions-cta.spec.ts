import { describe, expect, it } from 'vitest'
import { admissionsCta, displayedAdmissionStatus } from '@/lib/admissions'

const P = '/portal'

describe('AUD-17 / PUB-05 tombol pendaftaran resmi', () => {
  describe('Satu Sekolah Web saja (sistem eksternal)', () => {
    it('hanya muncul bila Dibuka DAN URL https valid', () => {
      expect(admissionsCta({ mode: 'web', portalPath: P, cycle: { admissionStatus: 'open', registrationUrl: 'https://ppdb.contoh.id' } })).toEqual({ kind: 'external', href: 'https://ppdb.contoh.id', label: 'Daftar melalui sistem resmi' })
      expect(admissionsCta({ mode: 'web', portalPath: P, cycle: { admissionStatus: 'open', registrationUrl: 'http://ppdb.contoh.id' } })).toBeNull()
      expect(admissionsCta({ mode: 'web', portalPath: P, cycle: { admissionStatus: 'open', registrationUrl: '' } })).toBeNull()
      expect(admissionsCta({ mode: 'web', portalPath: P, cycle: { admissionStatus: 'open', registrationUrl: 'javascript:alert(1)' } })).toBeNull()
      for (const s of ['unconfirmed', 'not_open', 'closed']) expect(admissionsCta({ mode: 'web', portalPath: P, cycle: { admissionStatus: s, registrationUrl: 'https://ppdb.contoh.id' } })).toBeNull()
      expect(admissionsCta({ mode: 'web', portalPath: P, cycle: null })).toBeNull()
    })
  })
  describe('Satu Sekolah App aktif (portal)', () => {
    it('status dari App, bukan dari siklus website', () => {
      // website cycle says closed, App says open → register in the portal
      expect(admissionsCta({ mode: 'app', portalPath: P, cycle: { admissionStatus: 'closed' }, appCycles: [{ status: 'closed' }, { status: 'open' }] })).toEqual({ kind: 'portal', href: '/portal/penerimaan', label: 'Daftar di Portal Penerimaan', open: true })
      // website cycle says open, App has nothing open → only "Masuk Portal Penerimaan"
      expect(admissionsCta({ mode: 'app', portalPath: P, cycle: { admissionStatus: 'open', registrationUrl: 'https://x.id' }, appCycles: [{ status: 'upcoming' }] })).toMatchObject({ kind: 'portal', open: false, label: 'Masuk Portal Penerimaan (cek status pendaftaran)' })
    })
    it('tombol portal tetap ada walau belum ada siklus website yang terbit / App tidak menjawab', () => {
      expect(admissionsCta({ mode: 'app', portalPath: P, cycle: null, appCycles: [{ status: 'open' }] })).toMatchObject({ kind: 'portal', open: true })
      expect(admissionsCta({ mode: 'app', portalPath: P, cycle: null, appCycles: null })).toMatchObject({ kind: 'portal', open: false, href: '/portal/penerimaan' })
    })
    it('tidak pernah menampilkan tombol sistem eksternal', () => {
      expect(admissionsCta({ mode: 'app', portalPath: P, cycle: { admissionStatus: 'open', registrationUrl: 'https://ppdb.contoh.id' }, appCycles: [] })?.kind).toBe('portal')
    })
    it('status yang ditampilkan mengikuti App', () => {
      expect(displayedAdmissionStatus('app', 'closed', [{ status: 'open' }])).toBe('open')
      expect(displayedAdmissionStatus('app', 'open', [{ status: 'upcoming' }])).toBe('not_open')
      expect(displayedAdmissionStatus('app', 'open', [{ status: 'closed' }])).toBe('closed')
      expect(displayedAdmissionStatus('app', 'not_open', [])).toBe('not_open')
      expect(displayedAdmissionStatus('web', 'open', [{ status: 'closed' }])).toBe('open')
      expect(displayedAdmissionStatus('web', null)).toBe('unconfirmed')
    })
  })
})
