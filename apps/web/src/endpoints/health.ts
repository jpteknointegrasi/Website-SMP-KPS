import type { Endpoint } from 'payload'
import { sql } from '@payloadcms/db-postgres'

/**
 * GET /api/kesehatan — uptime monitoring. Answers 200 {ok, db, time} after a trivial `SELECT 1`, 503 when the
 * database does not answer. No school data, no tenant lookup, not rate-limited, never cached.
 */
export const healthEndpoint: Endpoint = {
  path: '/kesehatan',
  method: 'get',
  handler: async (req) => {
    const headers = { 'cache-control': 'no-store' }
    const time = new Date().toISOString()
    try {
      const db = req.payload.db.drizzle as unknown as { execute: (q: unknown) => Promise<unknown> }
      await Promise.race([db.execute(sql`SELECT 1`), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))])
      return Response.json({ ok: true, db: true, time }, { status: 200, headers })
    } catch {
      return Response.json({ ok: false, db: false, time }, { status: 503, headers })
    }
  },
}
