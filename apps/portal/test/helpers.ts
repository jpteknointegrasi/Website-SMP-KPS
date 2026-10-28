/**
 * Test harness: real per-school App databases (created, migrated, dropped), registered schools in the platform
 * database, and contexts for staff with given roles or for family accounts.
 */
import pg from 'pg'
import { randomBytes } from 'crypto'
import { sealSecret, type SchoolInfo } from '@sekolahku/core'
import { clearRegistryCache, schoolById } from '@sekolahku/core/registry'
import { closeSchoolDbs, migrateSchoolDb, schoolDb, type SchoolDb } from '@/db/school-db'
import { staffMembers, staffRoles } from '@/db/schema'
import { makeCtx, type AccountActor, type Ctx, type StaffActor } from '@/server/context'
import { permissionsOf } from '@/server/roles'
import { loadAccount } from '@/server/context'
import { setStorage, type Storage } from '@/server/storage'

export type School = { school: SchoolInfo; db: SchoolDb; dbName: string }

const memory = new Map<string, Buffer>()
export const memoryStorage: Storage = {
  async put(k, b) {
    memory.set(k, b)
  },
  async get(k) {
    return memory.get(k) ?? null
  },
  async remove(k) {
    memory.delete(k)
  },
}

/**
 * A pool whose idle clients may be terminated by the server (DROP DATABASE … WITH FORCE in cleanup) without raising an
 * unhandled error.
 */
export function quietPool(connectionString: string | undefined) {
  const p = new pg.Pool({ connectionString })
  p.on('error', () => {})
  return p
}

/** Drops a test database after every App pool is closed (nothing left for FORCE to terminate). */
export async function dropDatabase(admin: pg.Pool, name: string) {
  await closeSchoolDbs()
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
}

export function harness(prefix: string) {
  const RUN = `${prefix}${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
  const platform = quietPool(process.env.PLATFORM_DATABASE_URL)
  const admin = quietPool(process.env.TEST_PG_ADMIN_URL)
  const dbUrl = (name: string) => process.env.TEST_PG_ADMIN_URL!.replace(/\/[^/]+$/, `/${name}`)
  const made: { id: number; db: string }[] = []

  async function school(key: string, tz = 'Asia/Makassar'): Promise<School> {
    setStorage(memoryStorage)
    const dbName = `app_${RUN}_${key}`
    await admin.query(`CREATE DATABASE ${dbName}`)
    const r = await platform.query<{ id: number }>(
      `INSERT INTO tenants (name, slug, status, timezone, web_plan, web_status, app_plan, app_status, app_database)
       VALUES ($1, $2, 'active', $3, 'pro', 'active', 'standard', 'active', $4) RETURNING id`,
      [`Sekolah Uji ${key.toUpperCase()}`, `${RUN}-${key}`, tz, sealSecret(dbUrl(dbName))],
    )
    const id = r.rows[0]!.id
    await platform.query(`INSERT INTO tenants_domains (_order, _parent_id, id, domain, "primary") VALUES (1, $1, $2, $3, true)`, [id, randomBytes(12).toString('hex'), `${RUN}-${key}.sekolah.test`])
    made.push({ id, db: dbName })
    clearRegistryCache()
    const s = (await schoolById(id))!
    await migrateSchoolDb(s)
    return { school: s, db: await schoolDb(s), dbName }
  }

  async function cleanup() {
    await closeSchoolDbs()
    for (const m of made) {
      await platform.query('DELETE FROM tenants WHERE id = $1', [m.id])
      await dropDatabase(admin, m.db)
    }
    await platform.end()
    await admin.end()
  }
  return { RUN, school, cleanup }
}

let seq = 0
/** A staff member of the school with the given App roles. */
export async function staff(s: School, roles: string[], name = `Staf ${++seq}`): Promise<StaffActor> {
  const email = `staf${seq}_${Date.now()}@uji.test`
  const [m] = await s.db.insert(staffMembers).values({ email, name, webUserId: `w${seq}${Date.now()}`, webRole: 'contributor' }).returning()
  for (const r of roles) await s.db.insert(staffRoles).values({ staffId: m!.id, role: r })
  return { kind: 'staff', id: m!.id, webUserId: m!.webUserId!, name, email, webRole: 'contributor', roles: new Set(roles), perms: permissionsOf(roles) }
}

export const ctxStaff = (s: School, a: StaffActor, now?: Date): Ctx => makeCtx({ school: s.school, db: s.db, staff: a, now })
export const ctxAccount = (s: School, a: AccountActor | null, now?: Date): Ctx => makeCtx({ school: s.school, db: s.db, account: a, now })
export const ctxAnon = (s: School, now?: Date): Ctx => makeCtx({ school: s.school, db: s.db, now })

/** Account actor from a session token (as the request would load it). */
export const accountFromToken = (s: School, token: string) => loadAccount(s.db, token)

export const csv = (text: string) => ({ name: 'data.csv', buffer: Buffer.from(text, 'utf8') })
export const png = () => ({ name: 'foto.png', buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(64)]) })
export const pdf = () => ({ name: 'dok.pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), randomBytes(64)]) })
