/**
 * POR-xx: Satu Sekolah App foundation against a real platform database (registry contract) and two real per-school
 * App databases. Everything created here is removed afterwards.
 */
import { randomBytes } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sealSecret } from '@satusekolah/core'
import { appDatabaseUrl, clearRegistryCache, schoolByHost, schoolById } from '@satusekolah/core/registry'
import { SchoolDbError, closeSchoolDbs, migrateSchoolDb, schoolDb } from '@/db/school-db'
import { dropDatabase, quietPool } from './helpers'

const RUN = `p${Date.now().toString(36)}`
const platform = quietPool(process.env.PLATFORM_DATABASE_URL)
const admin = quietPool(process.env.TEST_PG_ADMIN_URL)
const dbUrl = (name: string) => process.env.TEST_PG_ADMIN_URL!.replace(/\/[^/]+$/, `/${name}`)
const ids: Record<string, number> = {}

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
  for (const id of Object.values(ids)) await platform.query('DELETE FROM tenants WHERE id = $1', [id])
  for (const k of ['a', 'b']) await dropDatabase(admin, `app_${RUN}_${k}`)
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

describe('POR-03 migrasi tidak pernah mengubah database yang bukan miliknya', () => {
  it('database tidak kosong yang belum ditandai (mis. database platform) ditolak tanpa diubah', async () => {
    const name = `app_${RUN}_c`
    await admin.query(`CREATE DATABASE ${name}`)
    const c = quietPool(dbUrl(name))
    try {
      await c.query('CREATE TABLE users (id serial primary key)')
      const a = (await schoolById(ids.a!))!
      await closeSchoolDbs()
      await expect(migrateSchoolDb(a, dbUrl(name))).rejects.toMatchObject({ code: 'wrong_school' })
      const t = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`)
      expect(t.rows.map((r) => r.table_name)).toEqual(['users']) // nothing added
    } finally {
      await c.end()
      await dropDatabase(admin, name)
    }
  })
  it('alamat tak dikenal tidak jatuh ke sekolah bawaan bila fallback dimatikan (produksi)', async () => {
    process.env.DEFAULT_TENANT_SLUG = `${RUN}-a`
    clearRegistryCache()
    expect((await schoolByHost(`acak-${RUN}.contoh.test`))?.id).toBe(ids.a)
    expect(await schoolByHost(`acak-${RUN}.contoh.test`, { allowDefault: false })).toBeNull()
    delete process.env.DEFAULT_TENANT_SLUG
    clearRegistryCache()
  })
})

describe('POR-04 koneksi idle yang diputus server tidak menjatuhkan proses', () => {
  it('pool database sekolah menangani koneksi yang dihentikan (restart/DROP … WITH FORCE) lalu tersambung lagi', async () => {
    const a = (await schoolById(ids.a!))!
    const db = await schoolDb(a)
    await db.execute('SELECT 1')
    const killed = await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [`app_${RUN}_a`])
    expect(killed.rowCount).toBeGreaterThan(0)
    await new Promise((r) => setTimeout(r, 200))
    await expect(db.execute('SELECT 1')).resolves.toBeTruthy()
  })
})
