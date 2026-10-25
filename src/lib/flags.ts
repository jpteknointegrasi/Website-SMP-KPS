import type { Payload } from 'payload'
import { FLAG_DEFAULTS, type FlagName } from '../globals/flags'

export type Flags = Record<FlagName, boolean>

/** Feature flags with safe defaults (a missing global or DB error never enables a feature). */
export async function readFlags(payload: Payload): Promise<Flags> {
  try {
    const g = (await payload.findGlobal({ slug: 'feature-flags', depth: 0, overrideAccess: true })) as Partial<Flags>
    const out = { ...FLAG_DEFAULTS } as Flags
    for (const k of Object.keys(FLAG_DEFAULTS) as FlagName[]) if (typeof g?.[k] === 'boolean') out[k] = g[k] as boolean
    // locked: not implemented in this phase
    out.socialAutoImport = false
    out.fullAdmissions = false
    return out
  } catch {
    return { ...FLAG_DEFAULTS, interestForm: false, schoolVisits: false, studentWorks: false, visitorAnalytics: false } as Flags
  }
}

export const flagOff = () => Response.json({ ok: false, error: 'Fitur ini sedang tidak aktif.' }, { status: 404, headers: { 'cache-control': 'no-store' } })
