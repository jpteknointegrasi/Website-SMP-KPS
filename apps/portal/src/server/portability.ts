/**
 * Data portability & backup of a school's App database (Blueprint §30, addendum v2.1 §D): every table of the school's
 * own database as JSON (one file per table, one row per line), every stored file, and a manifest. The restore loads
 * such an export into an EMPTY, migrated database of the SAME school, in foreign-key order, in one transaction, then
 * resets the sequences and puts the files back into storage.
 *
 * Format (version 1):
 *   manifest.json            { format, school, schema, exportedAt, tables: { name: { rows, columns } }, files }
 *   tabel/<table>.json       JSON array, one row per line: "[\n{…},\n{…}\n]" (rows exactly as PostgreSQL's
 *                            row_to_json gives them — no number goes through JavaScript, so bigint stays exact)
 *   berkas/<storageKey>      the stored objects of the files table
 *
 * Nothing personal is logged: progress messages name tables and counts only.
 */
import { promises as fs } from 'fs'
import path from 'path'
import type pg from 'pg'
import type { SchoolInfo } from '@sekolahku/core'
import type { Storage } from './storage'

export const EXPORT_FORMAT = 1
type Log = (msg: string) => void
const q = (name: string) => `"${name.replace(/"/g, '""')}"`

export type ExportManifest = {
  format: number
  school: { id: number; slug: string; name: string }
  schema: { migrations: number; lastMigrationHash: string | null; lastMigrationAt: string | null }
  exportedAt: string
  tables: Record<string, { rows: number; columns: string[] }>
  files: { total: number; saved: number; missing: number }
}

async function tablesOf(c: pg.PoolClient | pg.Pool) {
  const r = await c.query<{ t: string }>(`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`)
  return r.rows.map((x) => x.t)
}
async function columnsOf(c: pg.PoolClient | pg.Pool) {
  const r = await c.query<{ t: string; c: string }>(`SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`)
  const out = new Map<string, string[]>()
  for (const x of r.rows) out.set(x.t, [...(out.get(x.t) ?? []), x.c])
  return out
}
async function schemaVersion(c: pg.PoolClient | pg.Pool) {
  const r = await c
    .query<{ n: string; hash: string | null; at: string | null }>(
      `SELECT count(*) AS n, (array_agg(hash ORDER BY created_at DESC))[1] AS hash, max(created_at)::text AS at FROM drizzle.__drizzle_migrations`,
    )
    .catch(() => null)
  const row = r?.rows[0]
  return { migrations: Number(row?.n ?? 0), lastMigrationHash: row?.hash ?? null, lastMigrationAt: row?.at ?? null }
}

/** Storage key → path under the export folder; never outside it. */
function filePath(dir: string, key: string) {
  const base = path.resolve(dir, 'berkas')
  const p = path.resolve(base, key)
  if (!p.startsWith(base + path.sep)) throw new Error('kunci berkas tidak sah')
  return p
}

/** Writes the full export of the school's App database (and its files) into `dir` (created; must be empty). */
export async function exportSchool(pool: pg.Pool, school: SchoolInfo, dir: string, storage: Storage, log: Log = () => {}): Promise<ExportManifest> {
  await fs.mkdir(dir, { recursive: true })
  if ((await fs.readdir(dir)).length) throw new Error(`Folder tujuan tidak kosong: ${dir}`)
  await fs.mkdir(path.join(dir, 'tabel'))
  const client = await pool.connect()
  const manifest: ExportManifest = {
    format: EXPORT_FORMAT,
    school: { id: school.id, slug: school.slug, name: school.name },
    schema: { migrations: 0, lastMigrationHash: null, lastMigrationAt: null },
    exportedAt: new Date().toISOString(),
    tables: {},
    files: { total: 0, saved: 0, missing: 0 },
  }
  let fileRows: { id: string; key: string }[] = []
  try {
    // one consistent snapshot of every table
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const [owner] = (await client.query<{ school_id: number }>('SELECT school_id FROM school_meta WHERE id = 1')).rows
    if (!owner || owner.school_id !== school.id) throw new Error('Database ini tidak bertanda milik sekolah tersebut; ekspor dibatalkan.')
    manifest.schema = await schemaVersion(client)
    const cols = await columnsOf(client)
    for (const t of await tablesOf(client)) {
      const r = await client.query<{ j: string }>(`SELECT row_to_json(x)::text AS j FROM ${q(t)} x`)
      await fs.writeFile(path.join(dir, 'tabel', `${t}.json`), r.rows.length ? `[\n${r.rows.map((x) => x.j).join(',\n')}\n]\n` : '[]\n')
      manifest.tables[t] = { rows: r.rows.length, columns: cols.get(t) ?? [] }
      log(`  ${t}: ${r.rows.length} baris`)
    }
    if (manifest.tables.files) fileRows = (await client.query<{ id: string; key: string }>('SELECT id, storage_key AS key FROM files')).rows
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
  manifest.files.total = fileRows.length
  for (const f of fileRows) {
    const body = await storage.get(f.key)
    if (!body) {
      manifest.files.missing++
      continue
    }
    const p = filePath(dir, f.key)
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, body)
    manifest.files.saved++
  }
  log(`  berkas: ${manifest.files.saved} disimpan, ${manifest.files.missing} tidak ditemukan di penyimpanan`)
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}

/** Tables in an order where every referenced table comes first (self-references are checked per statement). */
export async function foreignKeyOrder(c: pg.PoolClient | pg.Pool, tables: string[]) {
  const r = await c.query<{ child: string; parent: string }>(
    `SELECT cl.relname AS child, pr.relname AS parent FROM pg_constraint k
     JOIN pg_class cl ON cl.oid = k.conrelid JOIN pg_class pr ON pr.oid = k.confrelid
     JOIN pg_namespace n ON n.oid = cl.relnamespace
     WHERE k.contype = 'f' AND n.nspname = 'public'`,
  )
  const deps = new Map(tables.map((t) => [t, new Set<string>()]))
  for (const { child, parent } of r.rows) if (child !== parent && deps.has(child) && deps.has(parent)) deps.get(child)!.add(parent)
  const out: string[] = []
  const done = new Set<string>()
  while (out.length < tables.length) {
    const ready = tables.filter((t) => !done.has(t) && [...deps.get(t)!].every((p) => done.has(p)))
    if (!ready.length) throw new Error('Urutan kunci asing tidak dapat ditentukan (siklus).')
    for (const t of ready) {
      out.push(t)
      done.add(t)
    }
  }
  return out
}

/**
 * Loads an export into the school's App database. Refuses unless: the export is of this format and this school, the
 * database is stamped for the same school, it is migrated at least to the export's schema, and every data table is
 * empty. All rows go in one transaction (all or nothing); sequences are reset; files are written back afterwards.
 */
export async function restoreSchool(pool: pg.Pool, school: SchoolInfo, dir: string, storage: Storage, log: Log = () => {}) {
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')) as ExportManifest
  if (manifest.format !== EXPORT_FORMAT) throw new Error(`Format ekspor ${manifest.format} tidak dikenal.`)
  if (manifest.school.id !== school.id || manifest.school.slug !== school.slug)
    throw new Error(`Ekspor ini milik sekolah lain (${manifest.school.slug}); pemulihan ditolak.`)
  const client = await pool.connect()
  const counts: Record<string, number> = {}
  let fileRows: { key: string; mime: string }[] = []
  try {
    const [owner] = (await client.query<{ school_id: number }>('SELECT school_id FROM school_meta WHERE id = 1').catch(() => ({ rows: [] as { school_id: number }[] }))).rows
    if (!owner) throw new Error('Database tujuan belum dimigrasikan/ditandai. Jalankan migrasi App sekolah ini dahulu.')
    if (owner.school_id !== school.id) throw new Error(`Database tujuan milik sekolah lain (id ${owner.school_id}); pemulihan ditolak.`)
    const version = await schemaVersion(client)
    if (version.migrations < manifest.schema.migrations) throw new Error('Skema database tujuan lebih lama dari ekspor. Jalankan migrasi terbaru dahulu.')
    const targetCols = await columnsOf(client)
    const tables = (await tablesOf(client)).filter((t) => t !== 'school_meta')
    for (const t of Object.keys(manifest.tables)) if (t !== 'school_meta' && !tables.includes(t)) throw new Error(`Tabel ${t} dari ekspor tidak ada di database tujuan.`)
    for (const t of tables) {
      const [{ n }] = (await client.query<{ n: string }>(`SELECT count(*) AS n FROM ${q(t)}`)).rows as [{ n: string }]
      if (Number(n) > 0) throw new Error(`Database tujuan tidak kosong (tabel ${t} berisi data). Pemulihan hanya ke database App yang baru dimigrasikan.`)
    }
    const order = (await foreignKeyOrder(client, tables)).filter((t) => manifest.tables[t])
    await client.query('BEGIN')
    for (const t of order) {
      const cols = manifest.tables[t]!.columns.filter((c) => targetCols.get(t)?.includes(c))
      const lines = (await fs.readFile(path.join(dir, 'tabel', `${t}.json`), 'utf8')).split('\n').filter((l) => l.startsWith('{'))
      const list = cols.map(q).join(', ')
      for (let i = 0; i < lines.length; i += 1000) {
        const chunk = `[${lines.slice(i, i + 1000).map((l) => l.replace(/,$/, '')).join(',')}]`
        await client.query(`INSERT INTO ${q(t)} (${list}) SELECT ${list} FROM json_populate_recordset(NULL::${q(t)}, $1::json)`, [chunk])
      }
      counts[t] = lines.length
      if (lines.length !== manifest.tables[t]!.rows) throw new Error(`Jumlah baris ${t} tidak cocok dengan manifest.`)
      log(`  ${t}: ${lines.length} baris`)
    }
    // sequences continue after the restored ids
    const seqs = await client.query<{ t: string; c: string; s: string }>(
      `SELECT c.table_name AS t, c.column_name AS c, pg_get_serial_sequence(quote_ident(c.table_name), c.column_name) AS s
       FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.column_default LIKE 'nextval(%'`,
    )
    for (const x of seqs.rows)
      if (x.s) await client.query(`SELECT setval($1, coalesce((SELECT max(${q(x.c)}) FROM ${q(x.t)}), 0) + 1, false)`, [x.s])
    if (counts.files) fileRows = (await client.query<{ key: string; mime: string }>('SELECT storage_key AS key, mime FROM files')).rows
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
  let restored = 0
  let missing = 0
  for (const f of fileRows) {
    const body = await fs.readFile(filePath(dir, f.key)).catch(() => null)
    if (!body) {
      missing++
      continue
    }
    await storage.put(f.key, body, f.mime)
    restored++
  }
  log(`  berkas: ${restored} dipulihkan, ${missing} tidak ada di ekspor`)
  return { tables: counts, files: { restored, missing } }
}
