import type { Payload } from 'payload'
import { isLive, normalizeHost, type SchoolInfo } from '@sekolahku/core'
import { DEFAULT_TENANT_SLUG, DEFAULT_TIMEZONE, PLATFORM_ROOT_DOMAIN, isSchoolTimezone } from './config'

/** What the rest of the app needs to know about the school serving a request (shared shape with Sekolahku App). */
export type TenantInfo = SchoolInfo
export { isLive, normalizeHost }

type TenantDoc = {
  id: number
  slug: string
  name: string
  timezone?: string | null
  status?: string | null
  web?: { plan?: string | null; status?: string | null; cmsUntil?: string | null } | null
  app?: { plan?: string | null; status?: string | null } | null
  domains?: { domain?: string | null; primary?: boolean | null }[] | null
}

const TTL_MS = 60_000
const byHost = new Map<string, { t: TenantInfo | null; at: number }>()
const byId = new Map<number, { t: TenantInfo | null; at: number }>()

const product = (p?: { plan?: string | null; status?: string | null } | null) => ({
  plan: p?.plan || 'none',
  status: (p?.status === 'paused' ? 'paused' : p?.status === 'trial' ? 'trial' : 'active') as 'active' | 'trial' | 'paused',
})

export const toInfo = (d: TenantDoc): TenantInfo => {
  const domains = (d.domains ?? []).map((x) => normalizeHost(x?.domain)).filter(Boolean)
  const primary = (d.domains ?? []).find((x) => x?.primary)?.domain
  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    timezone: isSchoolTimezone(d.timezone) ? d.timezone : DEFAULT_TIMEZONE,
    status: d.status === 'suspended' ? 'suspended' : d.status === 'trial' ? 'trial' : 'active',
    primaryDomain: primary ? normalizeHost(primary) : (domains[0] ?? (PLATFORM_ROOT_DOMAIN ? `${d.slug}.${PLATFORM_ROOT_DOMAIN}` : null)),
    web: { ...product(d.web), cmsUntil: d.web?.cmsUntil ?? null },
    app: product(d.app),
  }
}

const fresh = <V>(m: Map<V, { t: TenantInfo | null; at: number }>, k: V) => {
  const hit = m.get(k)
  return hit && Date.now() - hit.at < TTL_MS ? hit : undefined
}

async function findOne(payload: Payload, where: Record<string, unknown>): Promise<TenantInfo | null> {
  const res = await payload.find({ collection: 'tenants', where: where as never, limit: 1, depth: 0, overrideAccess: true, pagination: false })
  const d = res.docs[0] as TenantDoc | undefined
  return d ? toInfo(d) : null
}

/**
 * Which school a host name belongs to (cached ~60 s per server instance):
 *  1. a domain listed on the school (e.g. www.smpkps.sch.id)
 *  2. <slug>.PLATFORM_ROOT_DOMAIN
 *  3. DEFAULT_TENANT_SLUG (local development, preview URLs, single-school deployments)
 * Returns the school even when suspended; callers decide with isLive().
 */
export async function tenantByHost(payload: Payload, rawHost?: string | null): Promise<TenantInfo | null> {
  const host = normalizeHost(rawHost)
  if (!host) return null
  const hit = fresh(byHost, host)
  if (hit) return hit.t
  let t = await findOne(payload, { 'domains.domain': { equals: host } })
  if (!t && PLATFORM_ROOT_DOMAIN && host.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -(PLATFORM_ROOT_DOMAIN.length + 1))
    if (sub && !sub.includes('.')) t = await findOne(payload, { slug: { equals: sub } })
  }
  if (!t && DEFAULT_TENANT_SLUG) t = await findOne(payload, { slug: { equals: DEFAULT_TENANT_SLUG } })
  byHost.set(host, { t, at: Date.now() })
  if (t) byId.set(t.id, { t, at: Date.now() })
  return t
}

export async function tenantById(payload: Payload, id?: number | null): Promise<TenantInfo | null> {
  if (!id) return null
  const hit = fresh(byId, id)
  if (hit) return hit.t
  const t = await findOne(payload, { id: { equals: id } })
  byId.set(id, { t, at: Date.now() })
  return t
}

/**
 * The school that owns this host by its own address only (a listed domain or <slug>.PLATFORM_ROOT_DOMAIN), without
 * the DEFAULT_TENANT_SLUG fallback. Null means the host is a platform address (e.g. the deployment's *.vercel.app or
 * a platform domain), where the platform console and the school sign-up form live.
 */
export async function schoolOwningHost(payload: Payload, rawHost?: string | null): Promise<TenantInfo | null> {
  const host = normalizeHost(rawHost)
  if (!host) return null
  let t = await findOne(payload, { 'domains.domain': { equals: host } })
  if (!t && PLATFORM_ROOT_DOMAIN && host.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -(PLATFORM_ROOT_DOMAIN.length + 1))
    if (sub && !sub.includes('.')) t = await findOne(payload, { slug: { equals: sub } })
  }
  return t
}

/** Called after a school is created/changed/deleted. Other server instances refresh within the TTL. */
export const clearTenantCache = () => {
  byHost.clear()
  byId.clear()
}

/** Relationship value (id or populated doc) → id. */
export const idOf = (v: unknown): number | null => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  if (v && typeof v === 'object' && 'id' in v) return idOf((v as { id: unknown }).id)
  return null
}
