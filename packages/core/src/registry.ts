/**
 * Registry of schools for the portal (Sekolahku App). Read-only SQL against the platform database — the tables the
 * Web product's CMS maintains for schools, their domains, staff accounts and sessions. This file is the contract:
 * if those tables change, change it here and in its tests.
 *
 *   tenants(id, name, slug, status, timezone, web_plan, web_status, app_plan, app_status, app_database)
 *   tenants_domains(_parent_id, domain, "primary")
 *   users(id, name, email, role, active, tenant_id)      users_sessions(_parent_id, id, expires_at)
 *
 * PLATFORM_DATABASE_URL (falls back to DATABASE_URI / DATABASE_URL) points at that database.
 */
import pg from 'pg'
import { isSchoolTimezone, DEFAULT_TIMEZONE, normalizeHost, platformEnv, subdomainSlug, type SchoolInfo } from './schools'
import { isSealed, openSecret } from './crypto'
import type { StaffToken } from './session'

let pool: pg.Pool | null = null
const db = () =>
  (pool ??= new pg.Pool({
    connectionString: process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL,
    max: 4,
  }))

/** For tests and scripts: use this pool instead (or null to go back to the environment). */
export const setRegistryPool = (p: pg.Pool | null) => {
  pool = p
  cache.clear()
}

type Row = {
  id: number
  name: string
  slug: string
  status: string
  timezone: string
  web_plan: string | null
  web_status: string | null
  app_plan: string | null
  app_status: string | null
  primary_domain: string | null
  first_domain: string | null
}

const SELECT = `
  SELECT t.id, t.name, t.slug, t.status, t.timezone, t.web_plan, t.web_status, t.app_plan, t.app_status,
         (SELECT d.domain FROM tenants_domains d WHERE d._parent_id = t.id AND d."primary" ORDER BY d._order LIMIT 1) AS primary_domain,
         (SELECT d.domain FROM tenants_domains d WHERE d._parent_id = t.id ORDER BY d._order LIMIT 1) AS first_domain
  FROM tenants t`

const status = (v: string | null) => (v === 'paused' ? 'paused' : v === 'trial' ? 'trial' : 'active') as 'active' | 'trial' | 'paused'

export const toSchool = (r: Row): SchoolInfo => {
  const root = platformEnv().rootDomain
  const primary = r.primary_domain ?? r.first_domain
  return {
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    timezone: isSchoolTimezone(r.timezone) ? r.timezone : DEFAULT_TIMEZONE,
    status: r.status === 'suspended' ? 'suspended' : r.status === 'trial' ? 'trial' : 'active',
    primaryDomain: primary ? normalizeHost(primary) : root ? `${r.slug}.${root}` : null,
    web: { plan: r.web_plan ?? 'none', status: status(r.web_status) },
    app: { plan: r.app_plan ?? 'none', status: status(r.app_status) },
  }
}

const TTL = 60_000
const cache = new Map<string, { v: SchoolInfo | null; at: number }>()
const cached = async (key: string, load: () => Promise<SchoolInfo | null>) => {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.v
  const v = await load()
  cache.set(key, { v, at: Date.now() })
  return v
}
export const clearRegistryCache = () => cache.clear()

const one = async (where: string, value: unknown) => {
  const r = await db().query<Row>(`${SELECT} WHERE ${where} LIMIT 1`, [value])
  return r.rows[0] ? toSchool(r.rows[0]) : null
}

/**
 * Same rules as the website: a domain listed on the school, then <code>.PLATFORM_ROOT_DOMAIN, then
 * DEFAULT_TENANT_SLUG. Returns suspended schools too; callers decide with isLive().
 */
export const schoolByHost = (rawHost?: string | null) => {
  const host = normalizeHost(rawHost)
  if (!host) return Promise.resolve(null)
  return cached(`h:${host}`, async () => {
    const env = platformEnv()
    const byDomain = await one(`t.id IN (SELECT _parent_id FROM tenants_domains WHERE lower(domain) = $1)`, host)
    if (byDomain) return byDomain
    const sub = subdomainSlug(host, env.rootDomain)
    if (sub) {
      const s = await one('t.slug = $1', sub)
      if (s) return s
    }
    return env.defaultSlug ? one('t.slug = $1', env.defaultSlug) : null
  })
}

export const schoolById = (id: number) => cached(`i:${id}`, () => one('t.id = $1', id))

/** The school's own App database URL (sealed in tenants.app_database), or null when none is configured yet. */
export async function appDatabaseUrl(schoolId: number): Promise<string | null> {
  const r = await db().query<{ app_database: string | null }>('SELECT app_database FROM tenants WHERE id = $1', [schoolId])
  const v = r.rows[0]?.app_database
  return v && isSealed(v) ? openSecret(v) : null
}

export type StaffMember = { id: number; name: string; email: string; role: string; schoolId: number | null }

/**
 * The staff account behind a verified token, only if the session still exists (not logged out or expired) and the
 * account is active. Super Admins have no school.
 */
export async function staffSession(t: StaffToken): Promise<StaffMember | null> {
  const r = await db().query<{ id: number; name: string; email: string; role: string; tenant_id: number | null }>(
    `SELECT u.id, u.name, u.email, u.role, u.tenant_id FROM users u
     WHERE u.id = $1 AND COALESCE(u.active, true)
       AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM users_sessions s WHERE s._parent_id = u.id AND s.id = $2 AND s.expires_at > now()))`,
    [t.id, t.sid ?? null],
  )
  const u = r.rows[0]
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role, schoolId: u.tenant_id } : null
}
