import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { STAFF_COOKIE, fetchStaff, hasProduct, isLive, portalRequestHost, type SchoolInfo, type StaffMember } from '@satusekolah/core'
import { schoolByHost } from '@satusekolah/core/registry'
import { SchoolDbError, schoolDb } from '@/db/school-db'

/** In production the portal only answers requests passed on by the website (fails closed on misconfiguration). */
const PRODUCTION = process.env.NODE_ENV === 'production'

/** The school whose domain this portal request came in on (live schools only). */
export const portalSchool = cache(async (): Promise<SchoolInfo | null> => {
  const host = portalRequestHost(await headers(), process.env.PORTAL_PROXY_SECRET, { requireProxy: PRODUCTION })
  if (!host) return null
  // DEFAULT_TENANT_SLUG is a development convenience only: never let an unknown address fall back to a school
  const s = await schoolByHost(host, { allowDefault: !PRODUCTION })
  return isLive(s) ? s : null
})

/** The school may use Satu Sekolah App right now. */
export const portalEnabled = cache(async () => hasProduct(await portalSchool(), 'app'))

/**
 * Staff member of THIS school signed in on the school's website CMS (same domain → same cookie), as confirmed by the
 * website. The platform Super Admin is never returned here: it enters through portalOperator() in governance mode
 * (server/context.ts loadPlatformAdmin — settings, modules, staff & roles, audit, aggregates; audited), and reads the
 * student register only under a time-limited "data siswa" support grant issued by the school.
 */
export const portalStaff = cache(async (): Promise<StaffMember | null> => {
  const school = await portalSchool()
  if (!school) return null
  const m = await fetchStaff((await cookies()).get(STAFF_COOKIE)?.value)
  if (m && m.role !== 'superadmin' && m.schoolId !== school.id) {
    console.warn(`[staff-session] akun CMS ${m.id} milik sekolah ${m.schoolId}, bukan sekolah ${school.id} di alamat ini`)
  }
  return m && m.role !== 'superadmin' && m.schoolId === school.id ? m : null
})

/** Platform Super Admin signed in on the CMS: governance mode in every school's App (loadPlatformAdmin). */
export const portalOperator = cache(async (): Promise<StaffMember | null> => {
  const school = await portalSchool()
  if (!school) return null
  const m = await fetchStaff((await cookies()).get(STAFF_COOKIE)?.value)
  return m && m.role === 'superadmin' ? m : null
})

/** State of the school's own App database, for status screens (never throws). */
export const portalDbState = cache(async (): Promise<'ok' | SchoolDbError['code'] | 'unavailable'> => {
  const school = await portalSchool()
  if (!school) return 'unavailable'
  try {
    await schoolDb(school)
    return 'ok'
  } catch (e) {
    return e instanceof SchoolDbError ? e.code : 'unavailable'
  }
})
