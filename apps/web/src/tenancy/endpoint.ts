import type { PayloadRequest } from 'payload'
import { isSuperAdmin } from '../access/roles'
import { requestTenantId } from './access'
import { isLive, tenantById, tenantByHost } from './resolve'
import { hasProduct } from '@sekolahku/core'
import { scopePayload, type TenantPayload } from './scoped'

/**
 * Payload confined to the school a custom API endpoint is serving: the signed-in staff member's school,
 * else the school of the Host header (visitors, and the Super Admin acting on a school's address).
 * Returns null when no active school applies; endpoints then answer 404.
 */
export async function endpointPayload(req: PayloadRequest): Promise<TenantPayload | null> {
  let t = await requestTenantId(req)
  if (!t && isSuperAdmin(req.user)) {
    const here = await tenantByHost(req.payload, req.headers?.get?.('host'))
    t = isLive(here) ? here.id : null
  }
  if (!t) return null
  // website endpoints (contact, interest, visits, analytics, leads export) belong to Sekolahku Web
  if (!hasProduct(await tenantById(req.payload, t), 'web')) return null
  return scopePayload(req.payload, t)
}

export const noSchool = () =>
  Response.json({ ok: false, error: 'Alamat ini tidak terhubung ke sekolah yang aktif.' }, { status: 404, headers: { 'cache-control': 'no-store' } })

/**
 * Notification address of a school (Pengaturan Sekolah → Notifikasi). Deliberately no platform-wide fallback:
 * one school's notifications must never reach another school's inbox.
 */
export async function notifyAddress(p: TenantPayload, kind: 'contact' | 'admissions') {
  const s = (await p.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as unknown as
    | { schoolName?: string; notifyContactEmail?: string | null; notifyAdmissionsEmail?: string | null }
    | null
  const own = kind === 'contact' ? s?.notifyContactEmail : s?.notifyAdmissionsEmail
  return { to: own || '', schoolName: s?.schoolName || 'Sekolah' }
}
