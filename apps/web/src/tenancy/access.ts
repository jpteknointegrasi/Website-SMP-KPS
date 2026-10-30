import type { Access, AccessArgs, PayloadRequest, Where } from 'payload'
import { isStaff, isSuperAdmin } from '../access/roles'
import { idOf, tenantById, tenantByHost } from './resolve'
import { hasCms, hasProduct } from '@sekolahku/core'

type MaybeUser = PayloadRequest['user'] | null | undefined

/** The school a staff account belongs to (null for the platform Super Admin and visitors). */
export const tenantOfUser = (user: MaybeUser): number | null =>
  user && (user as { collection?: string }).collection === 'users' && !isSuperAdmin(user)
    ? idOf((user as { tenant?: unknown }).tenant)
    : null

/** Tenant id explicitly chosen by server code for this call (Local API `context.tenantId`). Never client-controlled. */
export const contextTenant = (req: PayloadRequest): number | null => idOf((req.context as { tenantId?: unknown } | undefined)?.tenantId)

/**
 * The school this request may see or change. Order:
 *   1. school staff → always their own school (a context or host for another school yields "none")
 *   2. server code → `context.tenantId` (set by tenantPayload()/scopePayload())
 *   3. visitors via REST → the school owning the Host header
 * Returns null when no school applies; for anyone but the Super Admin that means "no access".
 */
export async function requestTenantId(req: PayloadRequest): Promise<number | null> {
  const ctx = contextTenant(req)
  if (isSuperAdmin(req.user)) return ctx
  if (isStaff(req.user)) {
    const own = tenantOfUser(req.user)
    if (!own) return null
    return ctx && ctx !== own ? null : own
  }
  if (ctx) return ctx
  const host = req.headers?.get?.('host')
  if (!host || !req.payload) return null
  const t = await tenantByHost(req.payload, host)
  // visitors only reach a school's content while it subscribes to Sekolahku Web
  return t && hasProduct(t, 'web') ? t.id : null
}

/** Where-constraint limiting a query to the request's school. `true` = unrestricted (Super Admin without a chosen school). */
export async function tenantScope(req: PayloadRequest, field = 'tenant'): Promise<Where | boolean> {
  const t = await requestTenantId(req)
  if (t) return { [field]: { equals: t } }
  return isSuperAdmin(req.user)
}

/** AND of two access results (boolean or Where). */
export const andAccess = (a: Where | boolean, b: Where | boolean): Where | boolean => {
  if (a === false || b === false) return false
  if (a === true) return b
  if (b === true) return a
  return { and: [a, b] }
}

/** Server code and the Super Admin always; school staff only while their school's package includes the CMS. */
export async function staffMayEdit(req: PayloadRequest) {
  if (!isStaff(req.user) || isSuperAdmin(req.user)) return true
  return hasCms(await tenantById(req.payload, tenantOfUser(req.user)))
}

const defaultAccess: Access = ({ req }) => Boolean(req.user)

export type AccessKind = 'read' | 'readVersions' | 'create' | 'update' | 'delete'

/**
 * Wraps a collection access function so that, on top of its own rule, a request only ever reaches
 * documents of its own school. This is what isolates schools in the REST API as well as in the Local API.
 */
export const withTenantAccess =
  (orig: Access | undefined, kind: AccessKind): Access =>
  async (args: AccessArgs) => {
    const scope = await tenantScope(args.req, kind === 'readVersions' ? 'version.tenant' : 'tenant')
    if (scope === false) return false
    // Staff of a school whose package has no CMS (Website Gratis after its first month) can no longer change content.
    if (kind !== 'read' && kind !== 'readVersions' && !(await staffMayEdit(args.req))) return false
    const base = await (orig ?? defaultAccess)(args)
    // create returns a boolean; the tenant of new documents is enforced by the assignTenant hook
    if (kind === 'create') return Boolean(base)
    return andAccess(base as Where | boolean, scope)
  }
