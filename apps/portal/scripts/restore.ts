/**
 * Restores an export (scripts/export.ts) into the school's App database:
 *
 *   npm run pulihkan -w @satusekolah/portal -- --sekolah <kode> --dari <folder> --ya
 *
 * Only into an EMPTY database of the same school that has been migrated (npm run migrate -- --sekolah <kode>):
 * refused if any data table holds rows or the database/export belongs to another school. Rows are loaded in
 * foreign-key order in one transaction, sequences reset, files written back to storage. --ya confirms.
 */
import 'dotenv/config'
import path from 'path'
import { closeSchoolDbs, schoolPool } from '../src/db/school-db'
import { restoreSchool } from '../src/server/portability'
import { getStorage } from '../src/server/storage'
import { arg, schoolBySlug } from './portability-cli'

const slug = arg('--sekolah')
const from = arg('--dari')
if (!slug || !from) {
  console.error('Pakai --sekolah <kode> --dari <folder> --ya')
  process.exit(1)
}
if (!process.argv.includes('--ya')) {
  console.error('Pemulihan menulis ke database App sekolah. Ulangi dengan --ya untuk melanjutkan.')
  process.exit(1)
}
const school = await schoolBySlug(slug)
if (!school) {
  console.error(`Sekolah "${slug}" tidak ditemukan.`)
  process.exit(1)
}
try {
  console.log(`Pemulihan database App ${school.slug} dari ${path.resolve(from)}`)
  const r = await restoreSchool(await schoolPool(school), school, path.resolve(from), getStorage(), console.log)
  console.log(`✓ ${Object.keys(r.tables).length} tabel, ${Object.values(r.tables).reduce((a, b) => a + b, 0)} baris, ${r.files.restored} berkas.`)
  if (r.files.missing) process.exitCode = 2
} catch (e) {
  console.error(`✗ ${(e as Error).message}`)
  process.exitCode = 1
} finally {
  await closeSchoolDbs()
}
