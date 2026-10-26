import { describe, expect, it } from 'vitest'
import { parseMediaUrl, embedUrlFor, isUnsafeHost } from '@/lib/media-url'
import { normalizePhone, csvCell, makeReference, idempotencyKeyOf } from '@/lib/forms'
import { monthGrid, eventDayKeys, localMidnightUtc, localYmd, googleCalendarUrl } from '@/lib/calendar'
import { sanitizeKey } from '@/lib/analytics'
import { validateInterest } from '@/endpoints/interest'
import { validateBooking } from '@/endpoints/visits'
import { seatsFor, consumes } from '@/lib/capacity'
import { buildIcs } from '@/lib/ics'

const ok = (u: string) => {
  const p = parseMediaUrl(u)
  if (!p.ok) throw new Error(`${u}: ${p.error}`)
  return p
}

describe('MED-01 jenis URL dibedakan', () => {
  it('video, shorts, playlist, kanal', () => {
    expect(ok('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toMatchObject({ platform: 'youtube', contentType: 'video', providerId: 'dQw4w9WgXcQ', embeddable: true })
    expect(ok('https://youtube.com/shorts/abcdefghijk')).toMatchObject({ contentType: 'short', embeddable: true })
    expect(ok('https://www.youtube.com/playlist?list=PLabcdefghij123')).toMatchObject({ contentType: 'playlist', providerId: 'PLabcdefghij123' })
    const ch = ok('https://www.youtube.com/@kpstv')
    expect(ch).toMatchObject({ contentType: 'channel', embeddable: false })
    expect(ch.hint).toMatch(/kanal/i)
    expect(ok('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv').contentType).toBe('channel')
  })
  it('Instagram, TikTok, Facebook, artikel = kartu tautan', () => {
    expect(ok('https://www.instagram.com/reel/Cxyz12345/?igsh=abc')).toMatchObject({ platform: 'instagram', contentType: 'short', embeddable: false, normalizedUrl: 'https://www.instagram.com/reel/Cxyz12345/' })
    expect(ok('https://www.instagram.com/p/Cabc12345/')).toMatchObject({ contentType: 'social_post' })
    expect(ok('https://www.tiktok.com/@smp/video/7212345678901234567')).toMatchObject({ platform: 'tiktok', embeddable: false })
    expect(ok('https://www.facebook.com/smpnaskps')).toMatchObject({ platform: 'facebook', contentType: 'channel' })
    expect(ok('https://kaltim.example-news.co.id/berita/kps?utm_source=x')).toMatchObject({ platform: 'web', contentType: 'external_article', normalizedUrl: 'https://kaltim.example-news.co.id/berita/kps' })
  })
})

describe('MED-02 normalisasi & dedup', () => {
  it('youtu.be / watch / embed / tracking → URL baku yang sama', () => {
    const a = ok('https://youtu.be/dQw4w9WgXcQ?si=tracking')
    const b = ok('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&utm_source=wa')
    const c = ok('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    const d = ok('https://m.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(new Set([a.normalizedUrl, b.normalizedUrl, c.normalizedUrl, d.normalizedUrl]).size).toBe(1)
  })
  it('mempertahankan waktu mulai yang bermakna', () => {
    expect(ok('https://youtu.be/dQw4w9WgXcQ?t=1m30s').normalizedUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90')
  })
})

describe('MED-03 URL berbahaya ditolak', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    'https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://127.0.0.1/video',
    'https://localhost/video',
    'https://192.168.1.10/x',
    'https://[::1]/x',
    'https://intranet/x',
    'file:///etc/passwd',
    'https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ',
  ])('%s', (u) => expect(parseMediaUrl(u).ok).toBe(false))
  it('host mirip YouTube tidak dianggap YouTube', () => {
    const p = ok('https://youtube.com.evil.example.org/watch?v=dQw4w9WgXcQ')
    expect(p.platform).toBe('web')
    expect(p.embeddable).toBe(false)
    expect(embedUrlFor(p.platform, p.contentType, 'dQw4w9WgXcQ')).toBeNull()
  })
  it('embed hanya dari ID tervalidasi, domain privasi YouTube', () => {
    expect(embedUrlFor('youtube', 'video', 'dQw4w9WgXcQ')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/)
    expect(embedUrlFor('youtube', 'video', '"><script>')).toBeNull()
    expect(embedUrlFor('youtube', 'channel', '@kpstv')).toBeNull()
    expect(isUnsafeHost('10.0.0.1')).toBe(true)
  })
})

describe('Form: validasi & data minimum', () => {
  it('nomor telepon dinormalisasi ke format 62', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890')
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizePhone('12')).toBe('')
  })
  it('minat: email ATAU telepon cukup; consent wajib', () => {
    expect(Object.keys(validateInterest({ parentName: 'Ibu Ani', phone: '081234567890', interests: ['info'], consent: true }).errors)).toHaveLength(0)
    expect(validateInterest({ parentName: 'Ibu Ani', interests: ['info'], consent: true }).errors.email).toBeTruthy()
    expect(validateInterest({ parentName: 'Ibu Ani', email: 'a@b.co', interests: ['info'] }).errors.consent).toBeTruthy()
  })
  it('minat: field liar (NIK dll.) dan sumber sembarang diabaikan', () => {
    const v = validateInterest({ parentName: 'Ibu Ani', email: 'a@b.co', interests: ['info', 'hack'], consent: true, nik: '1234', source: 'evil' }).value as Record<string, unknown>
    expect(v.nik).toBeUndefined()
    expect(v.interests).toEqual(['info'])
    expect(v.source).toBe('website')
  })
  it('kunjungan: jumlah peserta dibatasi', () => {
    expect(validateBooking({ session: 1, parentName: 'Pak Budi', email: 'a@b.co', participants: 50, consent: true }).errors.participants).toBeTruthy()
  })
  it('referensi acak tanpa data pribadi; kunci idempotensi divalidasi', () => {
    expect(makeReference('MNT')).toMatch(/^MNT-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(idempotencyKeyOf('abc')).toBeNull()
    expect(idempotencyKeyOf('0b5d3f2e-1111-4222-8333-123456789abc')).toBeTruthy()
  })
  it('CSV aman dari formula injection', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"')
    expect(csvCell('+62812')).toBe('"\'+62812"')
    expect(csvCell('Ibu Ani')).toBe('"Ibu Ani"')
  })
})

describe('Kapasitas', () => {
  it('satuan keluarga vs orang; status yang memakai kuota', () => {
    expect(seatsFor('families', 5)).toBe(1)
    expect(seatsFor('people', 5)).toBe(5)
    expect(consumes('pending') && consumes('confirmed')).toBe(true)
    expect(consumes('cancelled') || consumes('expired') || consumes('attended')).toBe(false)
  })
})

describe('CAL-01/02 kalender & zona waktu', () => {
  it('grid bulan mulai Senin, lintas tahun benar', () => {
    const g = monthGrid(2027, 1, 'Asia/Makassar') // 1 Jan 2027 = Jumat
    expect(g.cells[0]!.key).toBe('2026-12-28')
    expect(g.cells.find((c) => c.key === '2027-01-01')!.inMonth).toBe(true)
    expect(g.from).toBe('2026-12-27T16:00:00.000Z') // 28 Des 00:00 WITA
    expect(g.cells.length % 7).toBe(0)
  })
  it('acara 00:30 WITA tidak bergeser ke hari sebelumnya', () => {
    const iso = '2026-11-02T16:30:00.000Z' // 3 Nov 00:30 WITA
    expect(localYmd(iso, 'Asia/Makassar')).toBe('2026-11-03')
    expect(eventDayKeys({ startAt: iso, endAt: '2026-11-05T15:00:00.000Z' }, 'Asia/Makassar')).toEqual(['2026-11-03', '2026-11-04', '2026-11-05'])
    expect(localMidnightUtc(2026, 11, 3, 'Asia/Makassar').toISOString()).toBe('2026-11-02T16:00:00.000Z')
  })
  it('ICS: SEQUENCE, UID stabil, DTEND all-day eksklusif', () => {
    const e = { id: 7, slug: 'x', title: 'Libur; umum, sekolah', startAt: '2026-12-24T16:00:00.000Z', endAt: '2026-12-25T16:00:00.000Z', allDay: true, sequence: 3, updatedAt: '2026-10-25T00:00:00.000Z' }
    const ics = buildIcs(e, 'https://contoh.sch.id', { tz: 'Asia/Makassar' })
    // UID: event id (unique platform-wide) @ the school's host — stable while the school keeps its domain
    expect(ics).toContain('UID:event-7@contoh.sch.id')
    expect(ics).toContain('SEQUENCE:3')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261225')
    expect(ics).toContain('DTEND;VALUE=DATE:20261227')
    expect(ics).toContain('SUMMARY:Libur\\; umum\\, sekolah')
    expect(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true)
  })
  it('Google Calendar: tanggal sepanjang hari eksklusif', () => {
    const u = new URL(googleCalendarUrl({ title: 'A', startAt: '2026-12-24T16:00:00.000Z', endAt: '2026-12-25T16:00:00.000Z', allDay: true }, undefined, 'Asia/Makassar'))
    expect(u.hostname).toBe('calendar.google.com')
    expect(u.searchParams.get('dates')).toBe('20261225/20261227')
  })
})

describe('STAT-01 analitik tanpa data sensitif', () => {
  it('query string, token & area privat tidak dicatat', () => {
    expect(sanitizeKey('pageview', '/agenda?bulan=2026-11&email=a@b.co')).toBe('/agenda')
    expect(sanitizeKey('pageview', '/kunjungan/batal#t=secret')).toBeNull()
    expect(sanitizeKey('pageview', '/admin/collections/leads')).toBeNull()
    expect(sanitizeKey('pageview', '/berita/<script>')).toBeNull()
    expect(sanitizeKey('cta_click', 'cta-minat')).toBe('cta-minat')
    expect(sanitizeKey('cta_click', 'nama ibu ani')).toBeNull()
  })
})
