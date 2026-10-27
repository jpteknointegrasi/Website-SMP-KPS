/**
 * Sekolahku is sold as two products that a school buys separately:
 *   web — Sekolahku Web: public website + CMS, information, interest form, school visits / open house
 *   app — Sekolahku App: portal (PWA) for applicants, students, guardians, teachers, BK, staff; full admissions
 * Each product checks its own entitlement on the server. Neither product reads the other's tables.
 */
import { timingSafeEqual } from 'crypto'
import { isLive, type SchoolInfo } from './schools'

export const PRODUCTS = ['web', 'app'] as const
export type Product = (typeof PRODUCTS)[number]

export const PLANS: Record<Product, readonly string[]> = {
  web: ['none', 'basic', 'pro'],
  app: ['none', 'pilot', 'standard'],
}
export const PLAN_LABELS: Record<string, string> = {
  none: 'Tidak berlangganan',
  basic: 'Basic',
  pro: 'Pro',
  pilot: 'Pilot',
  standard: 'Standar',
}
export const PRODUCT_STATUS = [
  { label: 'Aktif', value: 'active' },
  { label: 'Uji coba', value: 'trial' },
  { label: 'Dijeda (data tetap, layanan baru ditutup)', value: 'paused' },
] as const

/** The school may use the product right now (school live, product subscribed and not paused). */
export const hasProduct = (s: SchoolInfo | null | undefined, p: Product) =>
  isLive(s) && s[p].plan !== 'none' && s[p].status !== 'paused'

/** Website features each Web plan allows the school to switch on (anything else stays off). */
export const WEB_PLAN_FEATURES: Record<string, readonly string[]> = {
  none: [],
  basic: ['calendarMonthView', 'mediaHub'],
  pro: ['calendarMonthView', 'mediaHub', 'interestForm', 'schoolVisits', 'studentWorks', 'visitorAnalytics'],
}

/**
 * Who runs admissions (Blueprint §19.1 modes, decided by what the school bought):
 *   'app'  — full admissions (Penerimaan Siswa Baru) in the portal (/portal/penerimaan); the website links there
 *   'web'  — information (and an external link if the school sets one) on the website only
 * Interest form and school visits / open house always stay in the website (semi-public), whatever this returns.
 */
export const admissionsMode = (s: SchoolInfo | null | undefined): 'app' | 'web' => (hasProduct(s, 'app') ? 'app' : 'web')

/** Path of the portal on every school domain ("one portal": same domain as the website). */
export const PORTAL_BASE_PATH = '/portal'

/** Headers the website adds when it passes a /portal request to the portal deployment. */
export const PORTAL_HOST_HEADER = 'x-sekolahku-host'
export const PORTAL_PROXY_HEADER = 'x-sekolahku-proxy'

/**
 * Server-to-server calls from the website to the portal (sync of student works) carry this header with the shared
 * secret. The website's /portal proxy strips it from browser requests, so it can only come from the website server.
 */
export const PORTAL_SYNC_HEADER = 'x-sekolahku-sync'

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** The request is a server-to-server sync call from the website (constant-time secret check). */
export function isPortalSync(h: { get(name: string): string | null }, secret = process.env.PORTAL_PROXY_SECRET) {
  const given = h.get(PORTAL_SYNC_HEADER)
  return Boolean(given && secret && secret.length >= 16 && sameSecret(given, secret))
}

/**
 * The school host of a portal request: the forwarded school host when the request came through the website with the
 * right shared secret (PORTAL_PROXY_SECRET). Never trusts a forwarded host alone. With `requireProxy` (production) a
 * request that did not come through the website gets null — so a misconfiguration fails closed instead of showing
 * some school's portal; without it (development) the request's own Host is used.
 */
export function portalRequestHost(
  h: { get(name: string): string | null },
  secret = process.env.PORTAL_PROXY_SECRET,
  opts: { requireProxy?: boolean } = {},
) {
  const forwarded = h.get(PORTAL_HOST_HEADER)
  const given = h.get(PORTAL_PROXY_HEADER)
  if (forwarded && given && secret && secret.length >= 16 && sameSecret(given, secret)) return forwarded
  return opts.requireProxy ? null : h.get('host')
}
