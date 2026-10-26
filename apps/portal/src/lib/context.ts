import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { STAFF_COOKIE, hasProduct, isLive, portalRequestHost, verifyStaffToken, type SchoolInfo } from '@sekolahku/core'
import { schoolByHost, staffSession, type StaffMember } from '@sekolahku/core/registry'
import { SchoolDbError, schoolDb } from '@/db/school-db'

/** The school whose domain this portal request came in on (live schools only). */
export const portalSchool = cache(async (): Promise<SchoolInfo | null> => {
  const s = await schoolByHost(portalRequestHost(await headers()))
  return isLive(s) ? s : null
})

/** The school may use Sekolahku App right now. */
export const portalEnabled = cache(async () => hasProduct(await portalSchool(), 'app'))

/**
 * Staff member signed in on the school's website CMS (same domain → same cookie). Only staff of THIS school, or the
 * platform Super Admin, count; a valid session for another school is ignored here.
 */
export const portalStaff = cache(async (): Promise<StaffMember | null> => {
  const school = await portalSchool()
  if (!school) return null
  const token = verifyStaffToken((await cookies()).get(STAFF_COOKIE)?.value)
  if (!token) return null
  const m = await staffSession(token)
  if (!m) return null
  return m.role === 'superadmin' || m.schoolId === school.id ? m : null
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
