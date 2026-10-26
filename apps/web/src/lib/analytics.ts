import type { Payload } from 'payload'
import type { TenantPayload } from '../tenancy/scoped'
import { tenantById } from '../tenancy/resolve'
import { sql } from '@payloadcms/db-postgres'

export const ANALYTIC_KINDS = ['pageview', 'cta_click', 'form_success'] as const
export type AnalyticKind = (typeof ANALYTIC_KINDS)[number]

/** Paths that may contain tokens or are not public pages are never counted. */
const SKIP = /^\/(admin|api|pratinjau|setup|kunjungan\/batal)(\/|$)/

/** Sanitises an analytics key: a public path without query/hash, or a short CTA id. Returns null if unusable. */
export const sanitizeKey = (kind: AnalyticKind, key: unknown) => {
  if (typeof key !== 'string') return null
  if (kind === 'pageview') {
    const path = key.split(/[?#]/)[0]!.toLowerCase().replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1')
    if (!/^\/[a-z0-9\-/]{0,100}$/.test(path) || SKIP.test(path)) return null
    return path
  }
  return /^[a-z0-9_-]{1,40}$/.test(key) ? key : null
}

const day = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())

/** Atomic daily counter per school (one row per school+day+kind+key). No personal data, no visitor id. */
export async function recordEvent(payload: TenantPayload, kind: AnalyticKind, key: string) {
  try {
    const school = await tenantById(payload as unknown as Payload, payload.tenantId)
    if (!school) return
    const d = day(school.timezone)
    const db = payload.db.drizzle as unknown as { execute?: (q: unknown) => Promise<unknown>; run?: (q: unknown) => Promise<unknown> }
    const q = sql`INSERT INTO analytics_daily (tenant_id, day, kind, key, count, updated_at, created_at)
      VALUES (${school.id}, ${d}, ${kind}, ${key}, 1, ${new Date().toISOString()}, ${new Date().toISOString()})
      ON CONFLICT (tenant_id, day, kind, key) DO UPDATE SET count = analytics_daily.count + 1`
    if (payload.db.name === 'postgres') await db.execute!(q)
    else await db.run!(q)
  } catch (e) {
    payload.logger.warn(`Analitik tidak tercatat: ${(e as Error).message}`)
  }
}
