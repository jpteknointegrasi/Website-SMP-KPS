/** Shared bits of the export/restore scripts: arguments and finding a school (by code) through the registry. */
import pg from 'pg'
import { platformDatabaseUrl, schoolById } from '@sekolahku/core/registry'

export const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined)

export async function schoolBySlug(slug: string) {
  const platform = new pg.Pool({ connectionString: platformDatabaseUrl(), max: 1 })
  try {
    const r = await platform.query<{ id: number }>('SELECT id FROM tenants WHERE slug = $1', [slug])
    return r.rows[0] ? schoolById(r.rows[0].id) : null
  } finally {
    await platform.end()
  }
}
