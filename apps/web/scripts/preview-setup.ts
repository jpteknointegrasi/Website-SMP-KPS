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
const t = (await pool.query<{ id: number }>('SELECT id FROM tenants WHERE slug = $1', [slug])).rows[0]
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
