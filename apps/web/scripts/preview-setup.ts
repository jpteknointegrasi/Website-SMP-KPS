/**
 * PREVIEW ONLY: prepares the test copy so Sekolahku App can be tried on the Preview deployment.
 *
 *  - adds the Preview address (NEXT_PUBLIC_SERVER_URL) as a domain of the school PREVIEW_SCHOOL (default "kps");
 *  - when PREVIEW_APP_DATABASE_URL is set: gives the school an App pilot subscription and stores that App database
 *    URL sealed with PLATFORM_SECRET (same as the CMS form does).
 *
 * Runs from scripts/vercel-build.mjs only when VERCEL_ENV=preview and PREVIEW_DATABASE_IS_COPY=true. Refuses anything
 * else. Never prints connection strings.
 */
import 'dotenv/config'
import pg from 'pg'
import { randomBytes } from 'crypto'
import { spawnSync } from 'child_process'
import { sealSecret } from '@sekolahku/core'

if (process.env.VERCEL_ENV !== 'preview' || process.env.PREVIEW_DATABASE_IS_COPY !== 'true') {
  console.error('preview-setup hanya untuk Preview dengan database uji (PREVIEW_DATABASE_IS_COPY=true).')
  process.exit(1)
}
const slug = process.env.PREVIEW_SCHOOL || 'kps'
const host = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? '').host.toLowerCase()
  } catch {
    return ''
  }
})()
const appDb = process.env.PREVIEW_APP_DATABASE_URL?.trim()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL })
let t = (await pool.query<{ id: number }>('SELECT id FROM tenants WHERE slug = $1', [slug])).rows[0]
if (!t && slug === 'kps') {
  // fresh test database: create the test school (+ its first admin when PREVIEW_ADMIN_EMAIL/PASSWORD are given).
  // Content and photos are then filled from /setup/isi-data while signed in as that admin.
  const email = process.env.PREVIEW_ADMIN_EMAIL?.trim()
  const pass = process.env.PREVIEW_ADMIN_PASSWORD
  if (email && (!pass || pass.length < 12)) throw new Error('PREVIEW_ADMIN_PASSWORD minimal 12 karakter.')
  const env = { ...process.env, SCHOOL_ADMIN_PASSWORD: pass ?? '', NODE_OPTIONS: '--no-deprecation' }
  // the first account of an empty database always becomes platform Super Admin (who cannot use the school's App),
  // so the platform operator account is created first and the school admin second
  const users = Number((await pool.query<{ n: string }>('SELECT count(*) AS n FROM users')).rows[0]!.n)
  if (email && users === 0) {
    const r0 = spawnSync('npx', ['tsx', 'scripts/create-superadmin.ts', '--email', 'superadmin@sekolahku-uji.invalid'], { stdio: 'inherit', env })
    if (r0.status !== 0) process.exit(r0.status ?? 1)
  }
  const args = ['--kode', 'kps', '--nama', 'SMP Nasional KPS', '--zona', 'Asia/Makassar', '--paket', 'pro', '--app', 'pilot', '--status', 'active', ...(host ? ['--domain', host] : []), ...(email ? ['--admin', email] : [])]
  const r = spawnSync('npx', ['tsx', 'scripts/create-school.ts', ...args], { stdio: 'inherit', env })
  if (r.status !== 0) process.exit(r.status ?? 1)
  t = (await pool.query<{ id: number }>('SELECT id FROM tenants WHERE slug = $1', [slug])).rows[0]
}
if (!t) {
  console.error(`Sekolah "${slug}" tidak ada di database uji.`)
  process.exit(1)
}
if (host) {
  const has = await pool.query('SELECT 1 FROM tenants_domains WHERE _parent_id = $1 AND lower(domain) = $2', [t.id, host])
  if (!has.rowCount) {
    const order = (await pool.query<{ n: number }>('SELECT coalesce(max(_order), 0) + 1 AS n FROM tenants_domains WHERE _parent_id = $1', [t.id])).rows[0]!.n
    await pool.query('INSERT INTO tenants_domains (_order, _parent_id, id, domain, "primary") VALUES ($1, $2, $3, $4, false)', [order, t.id, randomBytes(12).toString('hex'), host])
    console.log(`✓ Alamat Preview ${host} ditambahkan ke sekolah ${slug}`)
  }
}
if (appDb) {
  if (!/^postgres(ql)?:\/\/\S+$/i.test(appDb)) throw new Error('PREVIEW_APP_DATABASE_URL harus diawali postgres:// atau postgresql://')
  if (!process.env.PLATFORM_SECRET) throw new Error('PLATFORM_SECRET wajib diisi (sama dengan proyek App).')
  await pool.query(`UPDATE tenants SET app_plan = CASE WHEN app_plan = 'none' THEN 'pilot' ELSE app_plan END, app_status = 'trial', app_database = $2 WHERE id = $1`, [t.id, sealSecret(appDb)])
  console.log(`✓ Sekolah ${slug}: langganan App uji coba + database App tersimpan (tersegel)`)
}
await pool.end()
