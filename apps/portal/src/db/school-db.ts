/**
 * Connections to the schools' own App databases (one database per school). Usable from pages, routes and scripts.
 * Every connection is verified once: the database's school_meta row must name the school it is opened for.
 */
import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { eq } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath } from 'url'
import { appDatabaseUrl } from '@sekolahku/core/registry'
import type { SchoolInfo } from '@sekolahku/core'
import * as schema from './schema'

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
  await migrate(e.db, { migrationsFolder: MIGRATIONS })
  const existing = await e.db.select().from(schema.schoolMeta).where(eq(schema.schoolMeta.id, 1))
  if (existing[0] && existing[0].schoolId !== school.id)
    throw new SchoolDbError('wrong_school', `Database ini sudah milik sekolah lain (id ${existing[0].schoolId}, ${existing[0].schoolSlug}).`)
  if (!existing[0]) await e.db.insert(schema.schoolMeta).values({ id: 1, schoolId: school.id, schoolSlug: school.slug })
  e.verified = true
  return { stamped: !existing[0] }
}

/** Closes all connections (scripts and tests). */
export async function closeSchoolDbs() {
  await Promise.all([...pools.values()].map((p) => p.pool.end().catch(() => {})))
  pools.clear()
}
