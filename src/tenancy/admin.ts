import 'server-only'
import { headers } from 'next/headers'
import type { Payload } from 'payload'
import { isSuperAdmin } from '../access/roles'
import { tenantOfUser } from './access'
import { isLive, tenantByHost, tenantById, type TenantInfo } from './resolve'

/**
 * The school an admin screen works on: a staff member's own school; for the Super Admin, the school whose
 * address the admin panel was opened on (null on the platform's own address → platform overview).
 */
export async function adminSchool(payload: Payload, user: unknown): Promise<TenantInfo | null> {
  const own = tenantOfUser(user as never)
  if (own) return tenantById(payload, own)
  if (!isSuperAdmin(user as never)) return null
  let host: string | null = null
  try {
    host = (await headers()).get('host')
  } catch {
    return null
  }
  const t = await tenantByHost(payload, host)
  return isLive(t) ? t : null
}

/** School for the public-facing admin chrome (login page logo): by address only. */
export async function schoolOfAddress(payload: Payload): Promise<TenantInfo | null> {
  try {
    const t = await tenantByHost(payload, (await headers()).get('host'))
    return isLive(t) ? t : null
  } catch {
    return null
  }
}
