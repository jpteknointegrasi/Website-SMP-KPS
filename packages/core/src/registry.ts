/**
 * Registry of schools for the portal (Sekolahku App). Read-only SQL against the platform database — the tables the
 * Web product's CMS maintains for schools, their domains, staff accounts and sessions. This file is the contract:
 * if those tables change, change it here and in its tests.
 *
 *   tenants(id, name, slug, status, timezone, web_plan, web_status, app_plan, app_status, app_database)
 *   tenants_domains(_parent_id, domain, "primary")
 *
 * PLATFORM_DATABASE_URL points at that database. In production it is REQUIRED and must use a read-only role that can
 * SELECT only tenants and tenants_domains (see PANDUAN_PLATFORM.md): the full-privilege fallbacks (DATABASE_URI /
 * DATABASE_URL / POSTGRES_URL) are accepted in development, tests and during a build only. Staff accounts are not
 * read here: the website confirms them (session.ts).
 */
import pg from 'pg'
import { isSchoolTimezone, DEFAULT_TIMEZONE, normalizeHost, platformEnv, subdomainSlug, type SchoolInfo } from './schools'
import { isSealed, openSecret } from './crypto'

type Env = Record<string, string | undefined>

/** Running in production at runtime (not while `next build` collects pages). */
export const isProductionRuntime = (env: Env = process.env) => env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build'

/**
 * Connection string of the platform database for the registry. In production only PLATFORM_DATABASE_URL (the
 * read-only role) is accepted; falling back to the CMS's full-privilege DATABASE_URI/DATABASE_URL would silently
 * give the App write access to every school's record, so it is refused with a clear error instead.
 */
export function platformDatabaseUrl(env: Env = process.env): string | undefined {
  if (env.PLATFORM_DATABASE_URL) return env.PLATFORM_DATABASE_URL
  const fallback = env.DATABASE_URI || env.DATABASE_URL || env.POSTGRES_URL
  if (fallback && isProductionRuntime(env))
    throw new Error('PLATFORM_DATABASE_URL wajib diisi di produksi dengan role hanya-baca (SELECT tenants & tenants_domains). DATABASE_URI/DATABASE_URL (hak penuh) tidak dipakai sebagai cadangan.')
  return fallback
}

/**
 * Warns (once, at the first connection) when the registry's role can change the schools table: the production role
 * must be read-only. Never fails the request; the warning names no connection details.
 */
export async function warnIfWritable(p: Pick<pg.Pool, 'query'>, log: (msg: string) => void = console.warn) {
  try {
    const r = await p.query<{ w: boolean }>(`SELECT has_table_privilege(current_user, 'tenants', 'INSERT') OR has_table_privilege(current_user, 'tenants', 'UPDATE') AS w`)
    if (r.rows[0]?.w) {
      log('[registri] PERINGATAN: role database platform untuk App dapat mengubah tabel tenants. Gunakan role hanya-baca untuk PLATFORM_DATABASE_URL (PANDUAN_PLATFORM.md).')
      return true
    }
  } catch {
    // privilege check is advisory only
  }
  return false
}

let pool: pg.Pool | null = null
let checked = false
const db = () => {
  if (!pool) {
    pool = new pg.Pool({ connectionString: platformDatabaseUrl(), max: 4 })
    // an idle client dropped by the server must not crash the process
    pool.on('error', (e) => console.warn(`[registri] koneksi database platform terputus: ${(e as { code?: string }).code ?? e.message}`))
    if (!checked && process.env.NODE_ENV !== 'test') {
      checked = true
      void warnIfWritable(pool)
    }
  }
  return pool
}

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
export const schoolByHost = (rawHost?: string | null, opts: { allowDefault?: boolean } = {}) => {
  const host = normalizeHost(rawHost)
  if (!host) return Promise.resolve(null)
  const allowDefault = opts.allowDefault ?? true
  return cached(`h:${allowDefault ? 1 : 0}:${host}`, async () => {
    const env = platformEnv()
    const byDomain = await one(`t.id IN (SELECT _parent_id FROM tenants_domains WHERE lower(domain) = $1)`, host)
    if (byDomain) return byDomain
    const sub = subdomainSlug(host, env.rootDomain)
    if (sub) {
      const s = await one('t.slug = $1', sub)
      if (s) return s
    }
    return allowDefault && env.defaultSlug ? one('t.slug = $1', env.defaultSlug) : null
  })
}

export const schoolById = (id: number) => cached(`i:${id}`, () => one('t.id = $1', id))

/** The school's own App database URL (sealed in tenants.app_database), or null when none is configured yet. */
export async function appDatabaseUrl(schoolId: number): Promise<string | null> {
  const r = await db().query<{ app_database: string | null }>('SELECT app_database FROM tenants WHERE id = $1', [schoolId])
  const v = r.rows[0]?.app_database
  return v && isSealed(v) ? openSecret(v) : null
}
