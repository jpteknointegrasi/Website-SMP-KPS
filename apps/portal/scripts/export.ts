/**
 * Exports a school's whole App database and its stored files (portability §30 / backup):
 *
 *   npm run ekspor -w @satusekolah/portal -- --sekolah <kode> [--keluar <folder>]
 *
 * Connects through the school registry (sealed database URL, ownership checked). Writes one JSON file per table,
 * the files under berkas/, and manifest.json (school, schema version, row counts, time). Default folder:
 * ./ekspor-<kode>-<waktu>. Never prints connection strings or personal data — the export itself holds personal data:
 * keep it encrypted and delete it when no longer needed.
 */
import 'dotenv/config'
import path from 'path'
import { closeSchoolDbs, schoolPool } from '../src/db/school-db'
import { exportSchool } from '../src/server/portability'
import { getStorage } from '../src/server/storage'
import { arg, schoolBySlug } from './portability-cli'

const slug = arg('--sekolah')
if (!slug) {
  console.error('Pakai --sekolah <kode> [--keluar <folder>]')
  process.exit(1)
}
const school = await schoolBySlug(slug)
if (!school) {
  console.error(`Sekolah "${slug}" tidak ditemukan.`)
  process.exit(1)
}
const dir = path.resolve(arg('--keluar') ?? `ekspor-${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}`)
try {
  console.log(`Ekspor database App ${school.slug} → ${dir}`)
  const m = await exportSchool(await schoolPool(school), school, dir, getStorage(), console.log)
  const rows = Object.values(m.tables).reduce((n, t) => n + t.rows, 0)
  console.log(`✓ ${Object.keys(m.tables).length} tabel, ${rows} baris, ${m.files.saved}/${m.files.total} berkas. Simpan folder ini secara terenkripsi.`)
  if (m.files.missing) process.exitCode = 2
} catch (e) {
  console.error(`✗ ${(e as Error).message}`)
  process.exitCode = 1
} finally {
  await closeSchoolDbs()
}
