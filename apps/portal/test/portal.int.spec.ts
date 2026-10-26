/**
 * POR-xx: Sekolahku App foundation against a real platform database (registry contract) and two real per-school
 * App databases. Everything created here is removed afterwards.
 */
import pg from 'pg'
import { createHmac, randomBytes } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { payloadJwtKey, sealSecret, verifyStaffToken } from '@sekolahku/core'
import { appDatabaseUrl, clearRegistryCache, schoolByHost, schoolById, staffSession } from '@sekolahku/core/registry'
import { SchoolDbError, closeSchoolDbs, migrateSchoolDb, schoolDb } from '@/db/school-db'

const RUN = `p${Date.now().toString(36)}`
const platform = new pg.Pool({ connectionString: process.env.PLATFORM_DATABASE_URL })
const admin = new pg.Pool({ connectionString: process.env.TEST_PG_ADMIN_URL })
const dbUrl = (name: string) => process.env.TEST_PG_ADMIN_URL!.replace(/\/[^/]+$/, `/${name}`)
const ids: Record<string, number> = {}
const users: number[] = []

async function school(key: 'a' | 'b') {
  const db = `app_${RUN}_${key}`
  await admin.query(`CREATE DATABASE ${db}`)
  const r = await platform.query<{ id: number }>(
    `INSERT INTO tenants (name, slug, status, timezone, web_plan, web_status, app_plan, app_status, app_database)
     VALUES ($1, $2, 'active', 'Asia/Jakarta', 'none', 'active', 'pilot', 'trial', $3) RETURNING id`,
    [`Sekolah Portal ${RUN} ${key}`, `${RUN}-${key}`, sealSecret(dbUrl(db))],
  )
  const id = r.rows[0]!.id
  await platform.query(`INSERT INTO tenants_domains (_order, _parent_id, id, domain, "primary") VALUES (1, $1, $2, $3, true)`, [id, randomBytes(12).toString('hex'), `${RUN}-${key}.sekolah.test`])
  ids[key] = id
}

beforeAll(async () => {
  await school('a')
  await school('b')
  clearRegistryCache()
})

afterAll(async () => {
  await closeSchoolDbs()
  for (const u of users) await platform.query('DELETE FROM users WHERE id = $1', [u])
  for (const id of Object.values(ids)) await platform.query('DELETE FROM tenants WHERE id = $1', [id])
  for (const k of ['a', 'b']) await admin.query(`DROP DATABASE IF EXISTS app_${RUN}_${k} WITH (FORCE)`)
  await platform.end()
  await admin.end()
})

describe('POR-01 registri sekolah (kontrak tabel platform)', () => {
  it('domain → sekolah, dengan langganan per produk', async () => {
    const a = await schoolByHost(`${RUN}-a.sekolah.test:443`)
    expect(a?.id).toBe(ids.a)
    expect(a?.web.plan).toBe('none')
    expect(a?.app).toEqual({ plan: 'pilot', status: 'trial' })
    expect(await schoolByHost(`asing-${RUN}.contoh.test`)).toBeNull()
  })
  it('URL database App dibuka hanya di server, dari nilai tersegel', async () => {
    expect(await appDatabaseUrl(ids.a!)).toBe(dbUrl(`app_${RUN}_a`))
    const raw = (await platform.query('SELECT app_database FROM tenants WHERE id = $1', [ids.a])).rows[0].app_database as string
    expect(raw.startsWith('v1.')).toBe(true)
  })
})

describe('POR-02 database per sekolah', () => {
  it('migrasi menyiapkan & menandai database; dapat diulang', async () => {
    const a = (await schoolById(ids.a!))!
    expect((await migrateSchoolDb(a)).stamped).toBe(true)
    expect((await migrateSchoolDb(a)).stamped).toBe(false)
    await expect(schoolDb(a)).resolves.toBeTruthy()
  })
  it('database sekolah A tidak pernah dipakai untuk sekolah B (salah konfigurasi ditolak)', async () => {
    const b = (await schoolById(ids.b!))!
    const urlA = dbUrl(`app_${RUN}_a`)
    await expect(migrateSchoolDb(b, urlA)).rejects.toMatchObject({ code: 'wrong_school' })
    await closeSchoolDbs()
    await expect(schoolDb(b, urlA)).rejects.toBeInstanceOf(SchoolDbError)
    await expect(schoolDb(b, urlA)).rejects.toMatchObject({ code: 'wrong_school' })
  })
  it('database belum dimigrasi terdeteksi, bukan error mentah', async () => {
    const b = (await schoolById(ids.b!))!
    await closeSchoolDbs()
    await expect(schoolDb(b)).rejects.toMatchObject({ code: 'not_migrated' })
  })
})

describe('POR-03 sesi staf bersama dengan CMS sekolah', () => {
  const sign = (claims: object) => {
    const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const p = Buffer.from(JSON.stringify(claims)).toString('base64url')
    return `${h}.${p}.${createHmac('sha256', payloadJwtKey()).update(`${h}.${p}`).digest('base64url')}`
  }
  it('sesi aktif diterima; setelah logout (sesi dihapus) atau akun nonaktif ditolak', async () => {
    const u = await platform.query<{ id: number }>(
      `INSERT INTO users (name, email, role, active, tenant_id, updated_at, created_at) VALUES ('Staf ${RUN}', $1, 'admin', true, $2, now(), now()) RETURNING id`,
      [`${RUN}@test.invalid`, ids.a],
    )
    const id = u.rows[0]!.id
    users.push(id)
    const sid = randomBytes(8).toString('hex')
    await platform.query(`INSERT INTO users_sessions (_order, _parent_id, id, created_at, expires_at) VALUES (1, $1, $2, now(), now() + interval '1 hour')`, [id, sid])
    const token = verifyStaffToken(sign({ id, collection: 'users', sid, exp: Math.floor(Date.now() / 1000) + 600 }))!
    expect((await staffSession(token))?.schoolId).toBe(ids.a)
    await platform.query('DELETE FROM users_sessions WHERE id = $1', [sid])
    expect(await staffSession(token)).toBeNull()
    await platform.query(`INSERT INTO users_sessions (_order, _parent_id, id, created_at, expires_at) VALUES (1, $1, $2, now(), now() + interval '1 hour')`, [id, sid])
    await platform.query('UPDATE users SET active = false WHERE id = $1', [id])
    expect(await staffSession(token)).toBeNull()
  })
})
