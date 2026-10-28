import type { Payload } from 'payload'
import { FLAG_DEFAULTS, type FlagName } from '../globals/flags'
import { isScoped, type TenantPayload } from '../tenancy/scoped'
import { tenantById } from '../tenancy/resolve'
import { WEB_PLAN_FEATURES, hasProduct } from '@satusekolah/core'

export type Flags = Record<FlagName, boolean>

/** Features a school's Web plan allows it to switch on (packages/core). Anything else stays off whatever the school sets. */
export const PLAN_FEATURES = WEB_PLAN_FEATURES

const ALL_OFF = Object.fromEntries(Object.keys(FLAG_DEFAULTS).map((k) => [k, false])) as Flags

/**
 * Feature flags of the school `payload` is scoped to (see tenancy/scoped.ts), with safe defaults:
 * an unscoped instance, a missing document or a DB error never enables a feature.
 */
export async function readFlags(payload: Payload | TenantPayload): Promise<Flags> {
  if (!isScoped(payload)) return { ...ALL_OFF }
  try {
    const [g, tenant] = await Promise.all([
      payload.findGlobal({ slug: 'feature-flags', depth: 0, overrideAccess: true }) as Promise<Partial<Flags> | null>,
      tenantById(payload as unknown as Payload, payload.tenantId),
    ])
    // no (active) Web subscription → no website feature at all
    const allowed = new Set(hasProduct(tenant, 'web') ? (PLAN_FEATURES[tenant!.web.plan] ?? []) : [])
    const out = { ...FLAG_DEFAULTS } as Flags
    for (const k of Object.keys(FLAG_DEFAULTS) as FlagName[]) {
      if (typeof g?.[k] === 'boolean') out[k] = g[k] as boolean
      if (!allowed.has(k)) out[k] = false
    }
    // locked: not implemented in this phase
    out.socialAutoImport = false
    out.fullAdmissions = false
    return out
  } catch {
    return { ...FLAG_DEFAULTS, interestForm: false, schoolVisits: false, studentWorks: false, visitorAnalytics: false } as Flags
  }
}

export const flagOff = () => Response.json({ ok: false, error: 'Fitur ini sedang tidak aktif.' }, { status: 404, headers: { 'cache-control': 'no-store' } })
