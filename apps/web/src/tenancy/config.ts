/**
 * Platform (multi-school) settings. One deployment + one database serves many schools ("tenants").
 *
 *   PLATFORM_ROOT_DOMAIN   e.g. sekolahku.id  → <slug>.sekolahku.id resolves to the school with that slug
 *   DEFAULT_TENANT_SLUG    school used for hosts that match nothing else (localhost, *.vercel.app previews,
 *                          or a single-school deployment). Leave empty in a shared production deployment.
 *   PLATFORM_NAME          shown in the CMS title for the platform operator
 */
import { DEFAULT_TIMEZONE, RESERVED_SLUGS, SCHOOL_TIMEZONES, isSchoolTimezone, platformEnv, tzAbbr, type SchoolTimezone } from '@sekolahku/core'

// Shared with Sekolahku App: see packages/core/src/schools.ts
export { DEFAULT_TIMEZONE, RESERVED_SLUGS, SCHOOL_TIMEZONES, isSchoolTimezone, tzAbbr, type SchoolTimezone }
export const PLATFORM_ROOT_DOMAIN = platformEnv().rootDomain
export const DEFAULT_TENANT_SLUG = platformEnv().defaultSlug
export const PLATFORM_NAME = platformEnv().name

/**
 * Collections owned by the platform, not by a school. Every other collection carries a `tenant`
 * field and is isolated per school (see tenancy/collection.ts). `users` has its own tenant rules.
 */
export const PLATFORM_COLLECTIONS = new Set(['tenants', 'school-applications', 'users'])

/** Former Payload globals, now one document per school. Slugs are unchanged. */
export const SINGLETON_COLLECTIONS = ['site-settings', 'homepage', 'navigation', 'feature-flags', 'alumni-page'] as const
export type SingletonSlug = (typeof SINGLETON_COLLECTIONS)[number]
