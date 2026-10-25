import { cache } from 'react'
import { DEFAULT_TIMEZONE, tzAbbr } from '../tenancy/config'

/**
 * Time zone of the school serving the current request.
 *
 * Server components: set once per request by currentTenant() (lib/payload.ts), which runs before any school
 * data is loaded — so every date that is formatted has its school's zone. Uses React's per-request cache.
 * Client components and route handlers: pass the zone explicitly (props / function argument).
 */
const store = cache(() => ({ tz: undefined as string | undefined }))

export const setRequestTimezone = (tz: string) => {
  store().tz = tz
}
export const requestTimezone = (): string => store().tz ?? DEFAULT_TIMEZONE

const LONG: Record<string, string> = { WIB: 'Waktu Indonesia Barat', WITA: 'Waktu Indonesia Tengah', WIT: 'Waktu Indonesia Timur' }
/** "WIB" / "WITA" / "WIT" of the current request's school. */
export const zone = (tz = requestTimezone()) => tzAbbr(tz)
/** "Waktu Indonesia Tengah (WITA)" */
export const zoneLong = (tz = requestTimezone()) => `${LONG[tzAbbr(tz)] ?? tz} (${tzAbbr(tz)})`
