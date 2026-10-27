/**
 * Vercel build for Sekolahku App (portal): migrate every school's own App database, then `next build`.
 *
 * Guard (same as Sekolahku Web): a Preview build touches databases only when the Preview environment states that its
 * platform database is a COPY (PREVIEW_DATABASE_IS_COPY=true). Synthetic demo data is loaded only on Preview, only
 * with PREVIEW_DEMO_ADMIN=<CMS e-mail> set, into schools whose App database is configured (idempotent).
 */
import { spawnSync } from 'node:child_process'
import pg from 'pg'

const env = process.env.VERCEL_ENV ?? 'development'
const run = (cmd, { allowFail = false } = {}) => {
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true })
  if (r.status !== 0 && !allowFail) process.exit(r.status ?? 1)
  return r.status === 0
}

if (env === 'preview' && process.env.PREVIEW_DATABASE_IS_COPY !== 'true') {
  console.error(
    '\n✗ Build Preview dihentikan sebelum menyentuh database.\n' +
      '  PLATFORM_DATABASE_URL untuk Preview harus menunjuk database UJI, lalu tambahkan PREVIEW_DATABASE_IS_COPY=true (Preview saja).\n',
  )
  process.exit(1)
}

const platformUrl = process.env.PLATFORM_DATABASE_URL
let schools = []
if (platformUrl) {
  const pool = new pg.Pool({ connectionString: platformUrl })
  schools = (await pool.query("SELECT slug FROM tenants WHERE app_database IS NOT NULL AND app_plan <> 'none' ORDER BY slug")).rows.map((r) => r.slug)
  await pool.end()
}
if (schools.length) {
  console.log(`▶ Migrasi database App (${env}): ${schools.join(', ')}`)
  run('npx tsx scripts/migrate.ts --semua')
  const demoAdmin = process.env.PREVIEW_DEMO_ADMIN
  if (env === 'preview' && demoAdmin) {
    for (const slug of schools) {
      console.log(`▶ Data contoh (Preview) untuk ${slug}`)
      run(`npx tsx scripts/demo.ts --sekolah ${slug} --admin ${JSON.stringify(demoAdmin)} --saya-paham-ini-data-contoh`, { allowFail: true })
    }
  }
} else {
  console.log('▶ Belum ada sekolah dengan database App — migrasi dilewati.')
}
run('npx next build')
