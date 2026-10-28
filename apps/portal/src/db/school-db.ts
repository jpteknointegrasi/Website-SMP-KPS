/**
 * Connections to the schools' own App databases (one database per school). Usable from pages, routes and scripts.
 * Every connection is verified once: the database's school_meta row must name the school it is opened for.
 */
import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { eq, getTableName, isTable } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath } from 'url'
import { appDatabaseUrl } from '@sekolahku/core/registry'
import type { SchoolInfo } from '@sekolahku/core'
import * as schema from './schema/index'

export type SchoolDb = NodePgDatabase<typeof schema>

export class SchoolDbError extends Error {
  constructor(
    public code: 'not_configured' | 'not_migrated' | 'wrong_school',
    message: string,
  ) {
    super(message)
  }
}

const pools = new Map<number, { url: string; pool: pg.Pool; db: SchoolDb; verified: boolean }>()

async function open(school: SchoolInfo, urlOverride?: string) {
  const url = urlOverride ?? (await appDatabaseUrl(school.id))
  if (!url) throw new SchoolDbError('not_configured', `Database App untuk ${school.name} belum diatur.`)
  const hit = pools.get(school.id)
  if (hit && hit.url === url) return hit
  if (hit) await hit.pool.end().catch(() => {})
  const pool = new pg.Pool({ connectionString: url, max: 5 })
  // an idle client terminated by the server (restart, failover, DROP DATABASE … WITH FORCE) must not crash the
  // process as an unhandled 'error' event; the pool replaces it on the next query
  pool.on('error', (err) => console.warn(`[db-sekolah] koneksi idle ${school.slug} terputus: ${(err as { code?: string }).code ?? err.message}`))
  const entry = { url, pool, db: drizzle(pool, { schema }), verified: false }
  pools.set(school.id, entry)
  return entry
}

/** The school's App database, checked to really belong to this school. */
export async function schoolDb(school: SchoolInfo, urlOverride?: string): Promise<SchoolDb> {
  const e = await open(school, urlOverride)
  if (!e.verified) {
    let rows: { schoolId: number }[]
    try {
      rows = await e.db.select({ schoolId: schema.schoolMeta.schoolId }).from(schema.schoolMeta).where(eq(schema.schoolMeta.id, 1))
    } catch {
      throw new SchoolDbError('not_migrated', `Database App ${school.name} belum dimigrasikan (npm run portal:migrate -- --sekolah ${school.slug}).`)
    }
    if (!rows[0]) throw new SchoolDbError('not_migrated', `Database App ${school.name} belum disiapkan.`)
    if (rows[0].schoolId !== school.id) throw new SchoolDbError('wrong_school', `Database ini milik sekolah lain (id ${rows[0].schoolId}); koneksi ditolak.`)
    e.verified = true
  }
  return e.db
}

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

/**
 * Brings a school's App database to the current schema and stamps it with the school. Refuses a database already
 * stamped for another school. Idempotent.
 */
export async function migrateSchoolDb(school: SchoolInfo, urlOverride?: string) {
  const e = await open(school, urlOverride)
  // Ownership is checked BEFORE anything is changed:
  //  - stamped for another school → refused
  //  - not stamped yet → only an EMPTY database is accepted (protects e.g. the platform database pasted by mistake)
  const owner = await e.pool.query<{ school_id: number; school_slug: string }>(
    `SELECT school_id, school_slug FROM school_meta WHERE id = 1`,
  ).catch(() => null)
  const stamped = owner?.rows[0]
  if (stamped && stamped.school_id !== school.id)
    throw new SchoolDbError('wrong_school', `Database ini sudah milik sekolah lain (id ${stamped.school_id}, ${stamped.school_slug}).`)
  if (!stamped) {
    // tables of our own schema are allowed (an earlier run stopped before stamping); anything else is not ours
    const ours = Object.values(schema).filter(isTable).map((t) => getTableName(t))
    const tables = await e.pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'drizzle') AND NOT (table_schema = 'public' AND table_name = ANY($1))`,
      [ours],
    )
    if (Number(tables.rows[0]!.n) > 0)
      throw new SchoolDbError('wrong_school', 'Database ini tidak kosong dan belum ditandai sebagai database App sekolah. Gunakan database baru yang kosong.')
  }
  await migrate(e.db, { migrationsFolder: MIGRATIONS })
  if (!stamped) await e.db.insert(schema.schoolMeta).values({ id: 1, schoolId: school.id, schoolSlug: school.slug })
  e.verified = true
  return { stamped: !stamped }
}

/** Closes all connections (scripts and tests). */
export async function closeSchoolDbs() {
  await Promise.all([...pools.values()].map((p) => p.pool.end().catch(() => {})))
  pools.clear()
}
