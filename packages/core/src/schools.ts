/**
 * Schools ("tenants") as both products see them. Pure functions and types only: each product reads schools its own
 * way (Web through Payload, App through the registry) but they share these rules so both resolve an address alike.
 */

/** Indonesian time zones a school can use. */
export const SCHOOL_TIMEZONES = [
  { label: 'WIB (Jakarta, Sumatra, Jawa, Kalbar, Kalteng)', value: 'Asia/Jakarta', abbr: 'WIB' },
  { label: 'WITA (Bali, NTB, NTT, Kalsel, Kaltim, Kaltara, Sulawesi)', value: 'Asia/Makassar', abbr: 'WITA' },
  { label: 'WIT (Maluku, Papua)', value: 'Asia/Jayapura', abbr: 'WIT' },
] as const
export type SchoolTimezone = (typeof SCHOOL_TIMEZONES)[number]['value']
export const DEFAULT_TIMEZONE: SchoolTimezone = 'Asia/Jakarta'
export const isSchoolTimezone = (v: unknown): v is SchoolTimezone => SCHOOL_TIMEZONES.some((t) => t.value === v)
/** "WIB" / "WITA" / "WIT" for a time zone (falls back to the IANA name). */
export const tzAbbr = (tz?: string | null) => SCHOOL_TIMEZONES.find((t) => t.value === tz)?.abbr ?? tz ?? 'WIB'

/** Subdomains that can never be a school code. */
export const RESERVED_SLUGS = new Set(['www', 'admin', 'api', 'app', 'portal', 'platform', 'mail', 'static', 'cdn', 'status', 'docs', 'help'])

/** Platform settings shared by both products (environment). */
export const platformEnv = () => ({
  rootDomain: (process.env.PLATFORM_ROOT_DOMAIN || '').trim().toLowerCase().replace(/^\.+|\.+$/g, ''),
  defaultSlug: (process.env.DEFAULT_TENANT_SLUG || '').trim().toLowerCase(),
  name: process.env.PLATFORM_NAME || 'Platform Website Sekolah',
})

/** Public address of the SatuSekolah landing page (footer "Didukung oleh SatuSekolah" on every school website). */
export const platformPublicUrl = () => (process.env.PLATFORM_PUBLIC_URL || 'https://www.satusekolah.my.id').replace(/\/+$/, '')

/** Host header → bare lowercase host name (no port, no trailing dot). */
export const normalizeHost = (h?: string | null) =>
  (h ?? '').split(',')[0]!.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '')

/** Subdomain code of `<code>.<rootDomain>`, else null. */
export const subdomainSlug = (host: string, rootDomain: string) => {
  if (!rootDomain || !host.endsWith(`.${rootDomain}`)) return null
  const sub = host.slice(0, -(rootDomain.length + 1))
  return sub && !sub.includes('.') ? sub : null
}

export type ProductPlan = {
  plan: string
  status: 'active' | 'trial' | 'paused'
  /** Web only: end of the CMS access period of a Website Gratis school (ISO date), if any. */
  cmsUntil?: string | null
}

/** What both products need to know about the school serving a request. */
export type SchoolInfo = {
  id: number
  slug: string
  name: string
  timezone: SchoolTimezone
  status: 'active' | 'trial' | 'suspended'
  primaryDomain: string | null
  web: ProductPlan
  app: ProductPlan
}

/**
 * Demo schools (sample data for presentations, e.g. demo.satusekolah.my.id) are left out of public school lists such
 * as "Masuk ke App". Codes from PLATFORM_DEMO_SLUGS (comma-separated), default "demo".
 */
export const demoSlugs = () =>
  new Set(
    (process.env.PLATFORM_DEMO_SLUGS ?? 'demo')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  )
export const isDemoSchool = (t: Pick<SchoolInfo, 'slug'> | null | undefined) => Boolean(t && demoSlugs().has(t.slug))

/** A suspended school is invisible to the public in both products and its staff cannot sign in. */
export const isLive = (t: SchoolInfo | null | undefined): t is SchoolInfo => Boolean(t && t.status !== 'suspended')
