/**
 * Migrates schools' own App databases (Satu Sekolah App: one database per school).
 *
 *   npm run portal:migrate -- --sekolah kps      # one school
 *   npm run portal:migrate -- --semua            # every school with Satu Sekolah App and a database
 *
 * Reads the school registry from the platform database (PLATFORM_DATABASE_URL / DATABASE_URI in .env) and each
 * school's sealed database URL (PLATFORM_SECRET). Never prints connection strings or passwords.
 */
import 'dotenv/config'
import pg from 'pg'
import { schoolById } from '@satusekolah/core/registry'
import { hasProduct } from '@satusekolah/core'
import { closeSchoolDbs, migrateSchoolDb } from '../src/db/school-db'

const args = process.argv.slice(2)
const slug = args.includes('--sekolah') ? args[args.indexOf('--sekolah') + 1] : undefined
const all = args.includes('--semua')
if (!slug && !all) {
  console.error('Pakai --sekolah <kode> atau --semua')
  process.exit(1)
}

const platform = new pg.Pool({ connectionString: process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URI || process.env.DATABASE_URL })
const ids = (
  await platform.query<{ id: number }>(
    slug ? 'SELECT id FROM tenants WHERE slug = $1' : "SELECT id FROM tenants WHERE app_database IS NOT NULL AND app_plan <> 'none'",
    slug ? [slug] : [],
  )
).rows.map((r) => r.id)
await platform.end()
if (!ids.length) {
  console.error(slug ? `Sekolah "${slug}" tidak ditemukan.` : 'Belum ada sekolah dengan database App.')
  process.exit(1)
}

let failed = 0
for (const id of ids) {
  const school = (await schoolById(id))!
  try {
    const r = await migrateSchoolDb(school)
    console.log(`✓ ${school.slug}: skema terbaru${r.stamped ? ' (database ditandai milik sekolah ini)' : ''}${hasProduct(school, 'app') ? '' : ' — catatan: langganan App belum aktif'}`)
  } catch (e) {
    failed++
    console.error(`✗ ${school.slug}: ${(e as Error).message}`)
  }
}
await closeSchoolDbs()
process.exit(failed ? 1 : 0)
