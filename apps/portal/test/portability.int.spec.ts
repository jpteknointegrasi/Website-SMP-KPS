/**
 * POR-05: export → restore round trip of a school's App database (portability §30 / backup): every table and every
 * stored file, into a fresh migrated database of the same school; refusals for a non-empty database, another
 * school's export and an unmigrated database.
 */
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import * as academic from '@/modules/academic/service'
import * as S from '@/modules/students/service'
import { migrateSchoolDb, schoolDb, schoolPool } from '@/db/school-db'
import { exportSchool, restoreSchool, type ExportManifest } from '@/server/portability'
import type { Storage } from '@/server/storage'
import { ctxStaff, dropDatabase, harness, memoryStorage, pdf, png, quietPool, staff, type School } from './helpers'

const h = harness('t10')
let A: School, B: School
const admin = quietPool(process.env.TEST_PG_ADMIN_URL)
const extra: string[] = []
let tmp = ''
const now = new Date('2026-10-12T02:00:00Z')

const store = () => {
  const m = new Map<string, Buffer>()
  const s: Storage = { put: async (k, b) => void m.set(k, b), get: async (k) => m.get(k) ?? null, remove: async (k) => void m.delete(k) }
  return { m, s }
}
async function counts(db: School['db']) {
  const r = await db.execute<{ t: string }>(sql`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`)
  const out: Record<string, number> = {}
  for (const { t } of r.rows) out[t] = Number((await db.execute<{ n: string }>(sql.raw(`SELECT count(*) AS n FROM "${t}"`))).rows[0]!.n)
  return out
}
async function freshDb(key: string) {
  const name = `${A.dbName}_${key}`
  await admin.query(`CREATE DATABASE ${name}`)
  extra.push(name)
  return process.env.TEST_PG_ADMIN_URL!.replace(/\/[^/]+$/, `/${name}`)
}

beforeAll(async () => {
  A = await h.school('ekspor')
  B = await h.school('lain')
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sekolahku-ekspor-'))
  const adm = await staff(A, ['school_admin'])
  const k = ctxStaff(A, adm, now)
  const y = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
  await academic.activateYear(k, y)
  await academic.saveGradeLevel(k, { name: 'VII', ordinal: 7, final: false })
  const ov = await academic.academicOverview(k)
  const room = await academic.saveHomeroom(k, { yearId: y, gradeLevelId: ov.levels[0]!.id, name: 'VII A', homeroomTeacherId: null, room: null, capacity: 30 })
  const t = ctxStaff(A, adm, new Date('2026-07-13T01:00:00Z'))
  for (const [n, nis] of [['Alya', '3001'], ['Bima', '3002'], ['Citra', '3003']] as const) {
    const id = await S.createStudent(t, { fullName: n, nis }, { homeroomId: room })
    await S.addGuardian(t, id, { relation: 'ibu', fullName: `Ibu ${n}`, phone: '0812', email: null, occupation: null, education: null, nik: null, isPrimary: true })
    await S.addStudentDocument(t, id, 'akta', pdf(), 'Akta asli')
    await S.addStudentDocument(t, id, 'pasfoto', png(), null)
  }
  // a few outbox rows (bigserial ids) so the sequence reset is exercised
  for (let i = 0; i < 3; i++) await A.db.execute(sql`INSERT INTO outbox_events (type, payload) VALUES ('uji.contoh', '{}')`)
})
afterAll(async () => {
  await h.cleanup()
  for (const n of extra) await dropDatabase(admin, n)
  await admin.end()
  await fs.rm(tmp, { recursive: true, force: true })
})

describe('POR-05 ekspor & pemulihan database App sekolah', () => {
  let dir = ''
  let manifest: ExportManifest
  const before: Record<string, number> = {}

  it('ekspor: satu berkas JSON per tabel, semua berkas tersimpan, manifest dengan versi skema & jumlah baris', async () => {
    Object.assign(before, await counts(A.db))
    dir = path.join(tmp, 'a')
    const logs: string[] = []
    manifest = await exportSchool(await schoolPool(A.school), A.school, dir, memoryStorage, (m) => logs.push(m))
    expect(manifest.school).toMatchObject({ id: A.school.id, slug: A.school.slug })
    expect(manifest.schema.migrations).toBeGreaterThanOrEqual(8)
    expect(Object.fromEntries(Object.entries(manifest.tables).map(([t, x]) => [t, x.rows]))).toEqual(before)
    expect(manifest.files).toEqual({ total: 6, saved: 6, missing: 0 })
    for (const t of Object.keys(before)) await expect(fs.access(path.join(dir, 'tabel', `${t}.json`))).resolves.toBeUndefined()
    const students = JSON.parse(await fs.readFile(path.join(dir, 'tabel', 'students.json'), 'utf8')) as unknown[]
    expect(students).toHaveLength(3)
    // progress output names tables and counts only — no personal data
    expect(logs.join('\n')).not.toMatch(/Alya|Bima|Citra|3001/)
    // refuses to write into a non-empty folder
    await expect(exportSchool(await schoolPool(A.school), A.school, dir, memoryStorage)).rejects.toThrow(/tidak kosong/)
  })

  it('pemulihan ke database baru yang sudah dimigrasi: jumlah baris sama, berkas kembali, urutan nomor berlanjut', async () => {
    const url = await freshDb('pulih')
    await migrateSchoolDb(A.school, url)
    const target = store()
    const r = await restoreSchool(await schoolPool(A.school, url), A.school, dir, target.s)
    const db2 = await schoolDb(A.school, url)
    expect(await counts(db2)).toEqual(before)
    expect(r.files).toEqual({ restored: 6, missing: 0 })
    expect(target.m.size).toBe(6)
    const fileRows = (await db2.execute<{ k: string }>(sql`SELECT storage_key AS k FROM files`)).rows
    for (const f of fileRows) expect(target.m.get(f.k)?.equals((await memoryStorage.get(f.k))!)).toBe(true)
    // bigserial sequence continues after the restored ids
    const maxId = Number((await db2.execute<{ m: string }>(sql`SELECT max(id) AS m FROM outbox_events`)).rows[0]!.m)
    expect(maxId).toBeGreaterThan(0)
    const [ins] = (await db2.execute<{ id: string }>(sql`INSERT INTO outbox_events (type, payload) VALUES ('uji.setelah_pulih', '{}') RETURNING id`)).rows
    expect(Number(ins!.id)).toBeGreaterThan(maxId)
    // a second restore into the now non-empty database is refused, nothing changes
    await expect(restoreSchool(await schoolPool(A.school, url), A.school, dir, target.s)).rejects.toThrow(/tidak kosong/)
  })

  it('ditolak: ekspor sekolah lain, database belum dimigrasi', async () => {
    await expect(restoreSchool(await schoolPool(B.school), B.school, dir, store().s)).rejects.toThrow(/sekolah lain/)
    const url = await freshDb('kosong')
    const raw = quietPool(url)
    await expect(restoreSchool(raw, A.school, dir, store().s)).rejects.toThrow(/belum dimigrasikan/)
    await raw.end()
  })
})
