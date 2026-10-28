import { describe, expect, it } from 'vitest'
import { buildIcs, localDate } from '@/lib/ics'
import { isSafeUrl } from '@/fields/common'
import { validateContact } from '@/endpoints/contact'
import { memoryLimited as rateLimited } from '@/lib/rate-limit'
import { formatEventWhen } from '@/lib/format'

describe('ICS & tanggal WITA', () => {
  it('acara seharian memakai tanggal lokal WITA (tidak bergeser)', () => {
    // 7 Nov 2026 00:00 WITA = 6 Nov 16:00 UTC
    expect(localDate('2026-11-06T16:00:00.000Z', 'Asia/Makassar')).toBe('20261107')
    const ics = buildIcs({ id: 1, slug: 'x', title: 'Latihan', startAt: '2026-11-06T16:00:00.000Z', allDay: true }, 'https://contoh.sch.id', { tz: 'Asia/Makassar' })
    expect(ics).toContain('DTSTART;VALUE=DATE:20261107')
    expect(ics).toContain('DTEND;VALUE=DATE:20261108')
  })
  it('acara berjam memakai UTC dan meng-escape teks', () => {
    const ics = buildIcs({ id: 2, slug: 'y', title: 'Rapat, orang tua; kelas 7', startAt: '2026-10-31T01:00:00.000Z', endAt: '2026-10-31T03:00:00.000Z', eventStatus: 'cancelled' }, '', { tz: 'Asia/Makassar' })
    expect(ics).toContain('DTSTART:20261031T010000Z')
    expect(ics).toContain('SUMMARY:Rapat\\, orang tua\\; kelas 7')
    expect(ics).toContain('STATUS:CANCELLED')
  })
  it('format waktu tampil dalam WITA', () => {
    expect(formatEventWhen({ startAt: '2026-10-31T01:00:00.000Z', endAt: '2026-10-31T03:00:00.000Z' }, 'Asia/Makassar')).toContain('09.00–11.00 WITA')
    // another school, another zone: same instant shown in WIB
    expect(formatEventWhen({ startAt: '2026-10-31T01:00:00.000Z', endAt: '2026-10-31T03:00:00.000Z' }, 'Asia/Jakarta')).toContain('08.00–10.00 WIB')
  })
})

describe('Validasi URL', () => {
  it.each([['https://kps.sch.id/ppdb', true], ['/pendaftaran', true], ['mailto:smp@kps.sch.id', true], ['javascript:alert(1)', false], ['http://x.id', false], ['//evil.com', false], ['data:text/html,x', false]])('%s → %s', (u, ok) => {
    expect(isSafeUrl(u)).toBe(ok)
  })
})

describe('FORM-01/02 formulir kontak', () => {
  const base = { name: 'Ibu Sari', email: 'sari@contoh.id', category: 'umum', message: 'Mohon info jadwal layanan.', consent: true }
  it('menerima isian valid', () => expect(Object.keys(validateContact(base).errors)).toHaveLength(0))
  it('menolak tanpa kanal balasan & tanpa persetujuan', () => {
    const { errors } = validateContact({ ...base, email: '', consent: false })
    expect(errors.email).toBeTruthy()
    expect(errors.consent).toBeTruthy()
  })
  it('membatasi laju pengiriman per IP (cadangan memori)', () => {
    const ip = `ip-${Math.random()}`
    const results = Array.from({ length: 7 }, () => rateLimited(ip))
    expect(results.slice(0, 5).every((r) => !r)).toBe(true)
    expect(results[6]).toBe(true)
  })
})
