import { TZ } from './format'

/** YYYY-MM-DD of an instant in the school time zone. */
export const localYmd = (iso: string | Date, tz = TZ) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))

/** Offset of `tz` from UTC in minutes at a given instant (e.g. +480 for WITA). */
export const tzOffsetMinutes = (at: Date, tz = TZ) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!, +parts.second!)
  return Math.round((asUtc - at.getTime()) / 60000)
}

/** UTC instant of local midnight for a calendar date in `tz`. */
export const localMidnightUtc = (y: number, m: number, d: number, tz = TZ) => {
  const guess = new Date(Date.UTC(y, m - 1, d))
  const off = tzOffsetMinutes(guess, tz)
  const t = new Date(guess.getTime() - off * 60000)
  // second pass for DST-style transitions (no-op for WITA)
  const off2 = tzOffsetMinutes(t, tz)
  return off2 === off ? t : new Date(guess.getTime() - off2 * 60000)
}

/** Parses "YYYY-MM" (falls back to the current month in `tz`). */
export const parseMonth = (v?: string | null, tz = TZ) => {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})$/.exec(v) : null
  if (m && +m[2]! >= 1 && +m[2]! <= 12 && +m[1]! >= 2000 && +m[1]! <= 2100) return { y: +m[1]!, m: +m[2]! }
  const [y, mo] = localYmd(new Date(), tz).split('-').map(Number)
  return { y: y!, m: mo! }
}

export const ymKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`
export const shiftMonth = (y: number, m: number, delta: number) => {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }
}

/**
 * Month grid (Monday first), 5–6 weeks. Each cell: ISO date key, day number, in-month flag.
 * `from`/`to` bound the whole visible grid as UTC instants of local midnights.
 */
export const monthGrid = (y: number, m: number, tz = TZ) => {
  const first = new Date(Date.UTC(y, m - 1, 1))
  const lead = (first.getUTCDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const cells: { key: string; day: number; inMonth: boolean }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(Date.UTC(y, m - 1, 1 - lead + i))
    cells.push({ key: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === m - 1 })
  }
  const start = cells[0]!.key.split('-').map(Number)
  const endD = new Date(Date.UTC(+cells.at(-1)!.key.slice(0, 4), +cells.at(-1)!.key.slice(5, 7) - 1, +cells.at(-1)!.key.slice(8, 10) + 1))
  return {
    cells,
    from: localMidnightUtc(start[0]!, start[1]!, start[2]!, tz).toISOString(),
    to: localMidnightUtc(endD.getUTCFullYear(), endD.getUTCMonth() + 1, endD.getUTCDate(), tz).toISOString(),
  }
}

/** Local date keys an event covers (inclusive), limited to 62 days. All-day/date-only events never shift days. */
export const eventDayKeys = (e: { startAt: string; endAt?: string | null }, tz = TZ) => {
  const s = localYmd(e.startAt, tz)
  const en = e.endAt ? localYmd(e.endAt, tz) : s
  const out: string[] = []
  let d = new Date(s + 'T00:00:00Z')
  const end = new Date((en < s ? s : en) + 'T00:00:00Z')
  while (d <= end && out.length < 62) {
    out.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 864e5)
  }
  return out
}

/** Google Calendar "add event" link (opens Google's own page; no data sent by us). */
export const googleCalendarUrl = (e: { title: string; startAt: string; endAt?: string | null; allDay?: boolean | null; location?: string | null; excerpt?: string | null }, pageUrl?: string) => {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  let dates: string
  if (e.allDay) {
    const s = localYmd(e.startAt).replace(/-/g, '')
    const endKey = eventDayKeys(e).at(-1)!
    const next = new Date(new Date(endKey + 'T00:00:00Z').getTime() + 864e5).toISOString().slice(0, 10).replace(/-/g, '')
    dates = `${s}/${next}`
  } else {
    dates = `${stamp(e.startAt)}/${stamp(e.endAt ?? new Date(new Date(e.startAt).getTime() + 3600_000).toISOString())}`
  }
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, ctz: TZ })
  if (e.location) p.set('location', e.location)
  const details = [e.excerpt, pageUrl].filter(Boolean).join('\n\n')
  if (details) p.set('details', details)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}
