export const TZ = 'Asia/Makassar'

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, ...opts })

export const formatDate = (iso?: string | null) => (iso ? fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : '')
export const formatDateShort = (iso?: string | null) => (iso ? fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '')
export const formatTime = (iso?: string | null) => (iso ? fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace(':', '.') : '')
export const dayParts = (iso: string) => {
  const d = new Date(iso)
  return {
    day: fmt({ day: '2-digit' }).format(d),
    month: fmt({ month: 'short' }).format(d),
    weekday: fmt({ weekday: 'long' }).format(d),
  }
}

export const formatEventWhen = (e: { startAt: string; endAt?: string | null; allDay?: boolean | null }) => {
  if (e.allDay) {
    const s = formatDate(e.startAt)
    const en = e.endAt ? formatDate(e.endAt) : ''
    return en && en !== s ? `${s} – ${en}` : `${s} (sepanjang hari)`
  }
  const sameDay = e.endAt && formatDate(e.endAt) === formatDate(e.startAt)
  if (e.endAt && sameDay) return `${formatDate(e.startAt)}, ${formatTime(e.startAt)}–${formatTime(e.endAt)} WITA`
  if (e.endAt) return `${formatDate(e.startAt)} ${formatTime(e.startAt)} – ${formatDate(e.endAt)} ${formatTime(e.endAt)} WITA`
  return `${formatDate(e.startAt)}, ${formatTime(e.startAt)} WITA`
}

export const EVENT_STATUS: Record<string, string> = {
  scheduled: 'Terjadwal',
  postponed: 'Ditunda',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href)

export const AUDIENCE: Record<string, string> = { umum: 'Umum', orang_tua: 'Orang tua', siswa: 'Siswa', alumni: 'Alumni' }
