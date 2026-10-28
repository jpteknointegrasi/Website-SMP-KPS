/**
 * Pure checks for the school sign-up form and the approval form (no database; unit-tested).
 */
import { RESERVED_SLUGS, isSchoolTimezone, normalizeHost } from '@satusekolah/core'

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/
export const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const LEVELS = ['tk', 'sd', 'smp', 'sma', 'smk', 'lainnya'] as const
type Level = (typeof LEVELS)[number]
const isLevel = (v: string): v is Level => (LEVELS as readonly string[]).includes(v)

const text = (v: FormDataEntryValue | null | undefined, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

export type ApplicationInput = {
  schoolName: string
  shortName: string
  level: Level | null
  npsn: string
  city: string
  province: string
  timezone: string
  domain: string
  wantWeb: boolean
  wantApp: boolean
  adminName: string
  adminEmail: string
  adminPhone: string
  adminPosition: string
  note: string
}

/** The public form → clean values + field errors (Indonesian, shown next to the form). */
export function readApplication(fd: FormData): { value: ApplicationInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const level = text(fd.get('level'), 20)
  const domain = normalizeHost(text(fd.get('domain'), 253).replace(/^https?:\/\//i, '').split('/')[0])
  const tz = text(fd.get('timezone'), 40)
  const value: ApplicationInput = {
    schoolName: text(fd.get('schoolName'), 160),
    shortName: text(fd.get('shortName'), 60),
    level: isLevel(level) ? level : null,
    npsn: text(fd.get('npsn'), 20).replace(/\D/g, ''),
    city: text(fd.get('city'), 80),
    province: text(fd.get('province'), 80),
    timezone: isSchoolTimezone(tz) ? tz : 'Asia/Jakarta',
    domain,
    wantWeb: fd.get('wantWeb') === 'on',
    wantApp: fd.get('wantApp') === 'on',
    adminName: text(fd.get('adminName'), 120),
    adminEmail: text(fd.get('adminEmail'), 200).toLowerCase(),
    adminPhone: text(fd.get('adminPhone'), 30),
    adminPosition: text(fd.get('adminPosition'), 80),
    note: String(fd.get('note') ?? '').trim().slice(0, 1500),
  }
  if (value.schoolName.length < 4) errors.schoolName = 'Isi nama sekolah lengkap.'
  if (!value.city) errors.city = 'Isi kota/kabupaten.'
  if (!value.province) errors.province = 'Isi provinsi.'
  if (value.npsn && value.npsn.length !== 8) errors.npsn = 'NPSN terdiri dari 8 angka.'
  if (value.domain && !DOMAIN_RE.test(value.domain)) errors.domain = 'Domain tidak valid. Contoh: www.sman1contoh.sch.id'
  if (!value.wantWeb && !value.wantApp) errors.products = 'Pilih minimal satu produk.'
  if (value.adminName.length < 3) errors.adminName = 'Isi nama pengelola.'
  if (!EMAIL_RE.test(value.adminEmail)) errors.adminEmail = 'Isi email yang valid.'
  if (fd.get('consent') !== 'on') errors.consent = 'Centang persetujuan untuk melanjutkan.'
  return { value, errors }
}

/** Suggested school code: "SMA Negeri 1 Contoh" → "sman1contoh" (operator can change it before approving). */
export function suggestSlug(shortName: string, schoolName: string, city = '') {
  const base = (shortName || schoolName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/negeri/g, 'n')
    .replace(/swasta/g, 's')
    .replace(/[^a-z0-9]+/g, '')
  const withCity = shortName ? base : `${base}${city.toLowerCase().replace(/[^a-z0-9]+/g, '')}`
  const s = withCity.slice(0, 32) || 'sekolah'
  return RESERVED_SLUGS.has(s) ? `${s}-sekolah` : s
}

export const validSlug = (s: string) => SLUG_RE.test(s) && !RESERVED_SLUGS.has(s)

const PLAN_WEB = new Set(['none', 'basic', 'pro'])
const PLAN_APP = new Set(['none', 'pilot', 'standard'])

export type ApprovalInput = {
  applicationId: number
  slug: string
  name: string
  timezone: string
  domain: string
  webPlan: string
  appPlan: string
}

/** The approval form → clean values + errors. */
export function readApproval(fd: FormData): { value: ApprovalInput; errors: string[] } {
  const errors: string[] = []
  const tz = text(fd.get('timezone'), 40)
  const value: ApprovalInput = {
    applicationId: Number(fd.get('applicationId')),
    slug: text(fd.get('slug'), 42).toLowerCase(),
    name: text(fd.get('name'), 160),
    timezone: isSchoolTimezone(tz) ? tz : '',
    domain: normalizeHost(text(fd.get('domain'), 253).replace(/^https?:\/\//i, '').split('/')[0]),
    webPlan: text(fd.get('webPlan'), 20),
    appPlan: text(fd.get('appPlan'), 20),
  }
  if (!Number.isInteger(value.applicationId) || value.applicationId <= 0) errors.push('Pendaftaran tidak dikenal.')
  if (!validSlug(value.slug)) errors.push('Kode sekolah: 1–42 karakter huruf kecil, angka, tanda hubung; bukan kata cadangan (www, admin, api, …).')
  if (value.name.length < 4) errors.push('Isi nama sekolah.')
  if (!value.timezone) errors.push('Pilih zona waktu.')
  if (value.domain && !DOMAIN_RE.test(value.domain)) errors.push('Domain tidak valid.')
  if (!PLAN_WEB.has(value.webPlan)) errors.push('Paket Satu Sekolah Web tidak dikenal.')
  if (!PLAN_APP.has(value.appPlan)) errors.push('Paket Satu Sekolah App tidak dikenal.')
  if (value.webPlan === 'none' && value.appPlan === 'none') errors.push('Pilih minimal satu produk (Web atau App).')
  return { value, errors }
}

/** Random, human-readable application number: SK-7F3K-9Q2M (no 0/O/1/I). */
export function applicationReference(rand: (n: number) => number = (n) => Math.floor(Math.random() * n)) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = () => Array.from({ length: 4 }, () => A[rand(A.length)]).join('')
  return `SK-${part()}-${part()}`
}
