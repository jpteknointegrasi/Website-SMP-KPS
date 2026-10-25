/**
 * Platform (multi-school) settings. One deployment + one database serves many schools ("tenants").
 *
 *   PLATFORM_ROOT_DOMAIN   e.g. sekolahku.id  → <slug>.sekolahku.id resolves to the school with that slug
 *   DEFAULT_TENANT_SLUG    school used for hosts that match nothing else (localhost, *.vercel.app previews,
 *                          or a single-school deployment). Leave empty in a shared production deployment.
 *   PLATFORM_NAME          shown in the CMS title for the platform operator
 */
export const PLATFORM_ROOT_DOMAIN = (process.env.PLATFORM_ROOT_DOMAIN || '').trim().toLowerCase().replace(/^\.+|\.+$/g, '')
export const DEFAULT_TENANT_SLUG = (process.env.DEFAULT_TENANT_SLUG || '').trim().toLowerCase()
export const PLATFORM_NAME = process.env.PLATFORM_NAME || 'Platform Website Sekolah'

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

/** Subdomains that can never be a school slug. */
export const RESERVED_SLUGS = new Set(['www', 'admin', 'api', 'app', 'platform', 'mail', 'static', 'cdn', 'status', 'docs', 'help'])

/**
 * Collections owned by the platform, not by a school. Every other collection carries a `tenant`
 * field and is isolated per school (see tenancy/collection.ts). `users` has its own tenant rules.
 */
export const PLATFORM_COLLECTIONS = new Set(['tenants', 'users'])

/** Former Payload globals, now one document per school. Slugs are unchanged. */
export const SINGLETON_COLLECTIONS = ['site-settings', 'homepage', 'navigation', 'feature-flags'] as const
export type SingletonSlug = (typeof SINGLETON_COLLECTIONS)[number]
