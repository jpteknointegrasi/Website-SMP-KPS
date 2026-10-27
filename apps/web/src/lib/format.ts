import { requestTimezone, zone } from './tz'

/**
 * Date formatting in the school's time zone. `tz` defaults to the zone of the school serving the request
 * (see lib/tz.ts); client components pass it explicitly.
 */
const fmt = (opts: Intl.DateTimeFormatOptions, tz = requestTimezone()) => new Intl.DateTimeFormat('id-ID', { timeZone: tz, ...opts })

export const formatDate = (iso?: string | null, tz?: string) => (iso ? fmt({ day: 'numeric', month: 'long', year: 'numeric' }, tz).format(new Date(iso)) : '')
export const formatDateShort = (iso?: string | null, tz?: string) => (iso ? fmt({ day: 'numeric', month: 'short', year: 'numeric' }, tz).format(new Date(iso)) : '')
export const formatTime = (iso?: string | null, tz?: string) => (iso ? fmt({ hour: '2-digit', minute: '2-digit', hour12: false }, tz).format(new Date(iso)).replace(':', '.') : '')
export const dayParts = (iso: string, tz?: string) => {
  const d = new Date(iso)
  return {
    day: fmt({ day: '2-digit' }, tz).format(d),
    month: fmt({ month: 'short' }, tz).format(d),
    weekday: fmt({ weekday: 'long' }, tz).format(d),
  }
}

export const formatEventWhen = (e: { startAt: string; endAt?: string | null; allDay?: boolean | null }, tz = requestTimezone()) => {
  if (e.allDay) {
    const s = formatDate(e.startAt, tz)
    const en = e.endAt ? formatDate(e.endAt, tz) : ''
    return en && en !== s ? `${s} – ${en}` : `${s} (sepanjang hari)`
  }
  const z = zone(tz)
  const sameDay = e.endAt && formatDate(e.endAt, tz) === formatDate(e.startAt, tz)
  if (e.endAt && sameDay) return `${formatDate(e.startAt, tz)}, ${formatTime(e.startAt, tz)}–${formatTime(e.endAt, tz)} ${z}`
  if (e.endAt) return `${formatDate(e.startAt, tz)} ${formatTime(e.startAt, tz)} – ${formatDate(e.endAt, tz)} ${formatTime(e.endAt, tz)} ${z}`
  return `${formatDate(e.startAt, tz)}, ${formatTime(e.startAt, tz)} ${z}`
}

export const EVENT_STATUS: Record<string, string> = {
  scheduled: 'Terjadwal',
  postponed: 'Ditunda',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href)

export const AUDIENCE: Record<string, string> = {
  umum: 'Umum',
  semua: 'Semua',
  orang_tua: 'Orang tua',
  siswa: 'Siswa',
  kelas_7: 'Kelas 7',
  kelas_8: 'Kelas 8',
  kelas_9: 'Kelas 9',
  calon_siswa: 'Calon siswa',
  guru: 'Guru',
  alumni: 'Alumni',
}
/** Audience filter values for the agenda (subset shown as chips). */
export const EVENT_AUDIENCE = ['kelas_7', 'kelas_8', 'kelas_9', 'orang_tua', 'calon_siswa', 'guru', 'alumni'] as const

export const WORK_CATS: Record<string, string> = { tulisan: 'Tulisan', seni: 'Seni', sains: 'Sains', teknologi: 'Teknologi', video: 'Video', proyek_sosial: 'Proyek sosial' }
