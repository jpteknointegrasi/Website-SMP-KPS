import { requestTimezone } from './tz'

type IcsEvent = {
  id: number | string
  slug: string
  title: string
  startAt: string
  endAt?: string | null
  allDay?: boolean | null
  location?: string | null
  excerpt?: string | null
  eventStatus?: string | null
  updatedAt?: string
  sequence?: number | null
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
const utcStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Calendar date in the school's zone as YYYYMMDD — all-day events must not shift across the date line. */
export const localDate = (iso: string, tz = requestTimezone()) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
  return p.replace(/-/g, '')
}
const nextDay = (yyyymmdd: string) => {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + 1))
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
const fold = (line: string) => {
  const out: string[] = []
  let rest = line
  while (Buffer.byteLength(rest) > 75) {
    let cut = 74
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--
    out.push(rest.slice(0, cut))
    rest = ' ' + rest.slice(cut)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcs(e: IcsEvent, siteUrl: string, opts: { tz?: string; schoolName?: string } = {}) {
  const tz = opts.tz ?? requestTimezone()
  const host = (() => {
    try {
      return new URL(siteUrl).host
    } catch {
      return 'sekolah.local'
    }
  })()
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${esc(opts.schoolName ?? host)}//Agenda//ID`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT']
  // event ids are unique platform-wide, so the school's host keeps UIDs unique and stable
  lines.push(`UID:event-${e.id}@${host}`)
  lines.push(`DTSTAMP:${utcStamp(e.updatedAt ?? new Date().toISOString())}`)
  // revision counter: calendar apps replace the stored copy when SEQUENCE increases
  lines.push(`SEQUENCE:${Math.max(0, Math.floor(Number(e.sequence ?? 0)))}`)
  if (e.updatedAt) lines.push(`LAST-MODIFIED:${utcStamp(e.updatedAt)}`)
  if (e.allDay) {
    const s = localDate(e.startAt, tz)
    const end = e.endAt ? localDate(e.endAt, tz) : s
    lines.push(`DTSTART;VALUE=DATE:${s}`, `DTEND;VALUE=DATE:${nextDay(end)}`)
  } else {
    lines.push(`DTSTART:${utcStamp(e.startAt)}`)
    lines.push(`DTEND:${utcStamp(e.endAt ?? new Date(new Date(e.startAt).getTime() + 3600_000).toISOString())}`)
  }
  lines.push(`SUMMARY:${esc(e.title)}`)
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`)
  if (e.excerpt) lines.push(`DESCRIPTION:${esc(e.excerpt)}`)
  if (siteUrl) lines.push(`URL:${siteUrl}/agenda/${e.slug}`)
  lines.push(`STATUS:${e.eventStatus === 'cancelled' ? 'CANCELLED' : e.eventStatus === 'postponed' ? 'TENTATIVE' : 'CONFIRMED'}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
