/**
 * Time in the school's zone. Indonesian zones have fixed offsets (no daylight saving), so conversion is exact without
 * a time-zone library. Stored values are UTC instants; dates (YYYY-MM-DD) are school-local calendar dates.
 */
import { tzAbbr } from '@satusekolah/core'

const OFFSET: Record<string, number> = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 }
export const offsetHours = (tz: string) => OFFSET[tz] ?? 7

const pad = (n: number) => String(n).padStart(2, '0')

/** Wall-clock parts of an instant in the school's zone. */
export function localParts(d: Date, tz: string) {
  const s = new Date(d.getTime() + offsetHours(tz) * 3_600_000)
  return { y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate(), hh: s.getUTCHours(), mm: s.getUTCMinutes(), dow: s.getUTCDay() }
}

/** YYYY-MM-DD of an instant in the school's zone. */
export const localDate = (d: Date, tz: string) => {
  const p = localParts(d, tz)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}
export const today = (tz: string, now = new Date()) => localDate(now, tz)

/** "2026-07-14T08:30" (datetime-local input, school time) → instant. */
export function parseLocalDateTime(v: string | null | undefined, tz: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec((v ?? '').trim())
  if (!m) return null
  const utc = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!) - offsetHours(tz) * 3_600_000
  const d = new Date(utc)
  return Number.isNaN(d.getTime()) ? null : d
}
/** Instant → value for a datetime-local input in school time. */
export function toLocalInput(d: Date | null | undefined, tz: string) {
  if (!d) return ''
  const p = localParts(d, tz)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}`
}
/** Start of a school-local calendar day as an instant. */
export const startOfLocalDay = (date: string, tz: string) => parseLocalDateTime(`${date}T00:00`, tz)!

export const isDate = (v: string | null | undefined): v is string => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}
export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** 0 = Minggu … 6 = Sabtu, for a calendar date. */
export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

/** "14 Juli 2026" for a calendar date. */
export function fmtDate(v: string | Date | null | undefined, tz?: string, short = false) {
  if (!v) return '—'
  const s = typeof v === 'string' ? v.slice(0, 10) : localDate(v, tz ?? 'Asia/Jakarta')
  if (!isDate(s)) return '—'
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return `${d} ${(short ? MONTHS_SHORT : MONTHS)[m - 1]} ${y}`
}
/** "14 Jul 2026 08.30 WITA". */
export function fmtDateTime(v: Date | null | undefined, tz: string, opts: { zone?: boolean } = {}) {
  if (!v) return '—'
  const p = localParts(v, tz)
  return `${p.d} ${MONTHS_SHORT[p.m - 1]} ${p.y} ${pad(p.hh)}.${pad(p.mm)}${opts.zone === false ? '' : ` ${tzAbbr(tz)}`}`
}
export const fmtTime = (v: Date, tz: string) => {
  const p = localParts(v, tz)
  return `${pad(p.hh)}.${pad(p.mm)}`
}
export const fmtDayDate = (date: string) => `${DAYS[weekday(date)]}, ${fmtDate(date)}`
/** "08:30" wall clock (for comparing with time-slot strings). */
export const clock = (v: Date, tz: string) => {
  const p = localParts(v, tz)
  return `${pad(p.hh)}:${pad(p.mm)}`
}
