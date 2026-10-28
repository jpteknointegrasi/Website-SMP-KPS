#!/usr/bin/env node
/**
 * Checks that Supabase's Data API (PostgREST: roles `anon` and `authenticated`) cannot read or write the
 * application tables. The apps connect with their own database roles; nothing legitimate uses the Data API.
 *
 *   node scripts/cek-data-api.mjs "<DATABASE_URL>"             report only (exit 1 when exposed)
 *   node scripts/cek-data-api.mjs "<DATABASE_URL>" --perbaiki  also revoke the grants (idempotent)
 *
 * Run it once per database: the platform database (website) and every App database (e.g. app_kps). Use a
 * connection as the table owner (Supabase → Connect → Session pooler, user `postgres` or the app role that
 * created the tables), otherwise the revoke of future-table defaults cannot be applied.
 *
 * Why grants and not RLS: the website's migrations disable RLS on several tables, and turning RLS on would
 * block the apps unless their roles own the tables or bypass RLS. Revoking the API roles' privileges closes the
 * Data API regardless of RLS, and turning the Data API off in the dashboard (Settings → Data API) is a second lock.
 */
import pg from 'pg'

const url = process.argv[2]
const fix = process.argv.includes('--perbaiki')
if (!url || url.startsWith('--')) {
  console.error('Pakai: node scripts/cek-data-api.mjs "<DATABASE_URL>" [--perbaiki]')
  process.exit(2)
}

const API_ROLES = ['anon', 'authenticated']
const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } })
await client.connect()

const roles = (await client.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1)', [API_ROLES])).rows.map((r) => r.rolname)
const db = (await client.query('SELECT current_database() AS d, current_user AS u')).rows[0]
console.log(`Database: ${db.d} (sebagai ${db.u})`)
if (roles.length === 0) {
  console.log('Role anon/authenticated tidak ada — bukan database Supabase atau Data API tidak dipakai. Aman.')
  await client.end()
  process.exit(0)
}

const exposedSql = `
  SELECT c.relname AS tabel, r.rolname AS peran,
         array_remove(ARRAY[
           CASE WHEN has_table_privilege(r.rolname, c.oid, 'SELECT') THEN 'SELECT' END,
           CASE WHEN has_table_privilege(r.rolname, c.oid, 'INSERT') THEN 'INSERT' END,
           CASE WHEN has_table_privilege(r.rolname, c.oid, 'UPDATE') THEN 'UPDATE' END,
           CASE WHEN has_table_privilege(r.rolname, c.oid, 'DELETE') THEN 'DELETE' END], NULL) AS hak,
         c.relrowsecurity AS rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname = ANY($1)) r
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
     AND (has_table_privilege(r.rolname, c.oid, 'SELECT') OR has_table_privilege(r.rolname, c.oid, 'INSERT')
       OR has_table_privilege(r.rolname, c.oid, 'UPDATE') OR has_table_privilege(r.rolname, c.oid, 'DELETE'))
   ORDER BY 1, 2`

async function report() {
  const rows = (await client.query(exposedSql, [roles])).rows
  // A grant on a table with RLS enabled and no policy still returns nothing; without RLS it exposes the rows.
  const open = rows.filter((r) => !r.rls)
  return { rows, open }
}

let { rows, open } = await report()
const tables = (await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'")).rows[0].n
console.log(`Tabel di skema public: ${tables}`)
console.log(`Hak peran Data API pada tabel: ${rows.length} (tanpa RLS: ${open.length})`)

if (open.length > 0 && fix) {
  console.log('Mencabut hak anon/authenticated …')
  for (const role of roles) {
    await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role}`)
    await client.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${role}`)
    await client.query(`REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM ${role}`)
    // Tables created later by this role (migrations) must not get the Supabase default grants either.
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${role}`)
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM ${role}`)
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM ${role}`)
  }
  ;({ rows, open } = await report())
  console.log(`Setelah perbaikan — hak tanpa RLS: ${open.length}`)
}

if (open.length > 0) {
  console.log('\nTERBUKA lewat Data API (contoh, maks. 20):')
  for (const r of open.slice(0, 20)) console.log(`  ${r.tabel.padEnd(40)} ${r.peran.padEnd(14)} ${r.hak.join(',')}`)
  if (!fix) console.log('\nJalankan ulang dengan --perbaiki untuk mencabut hak, lalu matikan Data API di dasbor Supabase (Settings → Data API).')
  await client.end()
  process.exit(1)
}
console.log('AMAN: peran Data API tidak dapat membaca/mengubah tabel aplikasi.')
console.log('Tetap pastikan di dasbor Supabase: Settings → Data API dimatikan atau skema public tidak diekspos.')
await client.end()
