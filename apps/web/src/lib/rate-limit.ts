import { createHash } from 'crypto'
import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'

/**
 * Rate limiting shared by every server instance (Vercel runs many): counters live in the `rate_limit_hits` table
 * (migration 20261028_155027_rate_limit_hits), one row per key and one-minute bucket. A hit is ONE SQL statement
 * (upsert of the current bucket + sum of the window), so concurrent requests cannot both slip under the limit.
 * The key is a SHA-256 of route + IP: no IP address is stored. Old rows are removed opportunistically.
 * If the database call fails, an in-process counter is used for that request (fail-safe, never fail-open silently).
 */

export type Limit = { max: number; windowMs: number }

/** Public forms: contact, interest, visit booking, visit cancel. */
export const FORM_LIMIT: Limit = { max: 5, windowMs: 10 * 60 * 1000 }

const BUCKET_MS = 60 * 1000
/** Rows older than this are never needed (longest window is one hour). */
const KEEP_MS = 24 * 3600 * 1000

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex')

// ---------------------------------------------------------------- in-process fallback
const memory = new Map<string, number[]>()

/** In-process sliding window (fallback when the database is unavailable; also unit-tested). */
export const memoryLimited = (key: string, limit: Limit = FORM_LIMIT, now = Date.now()) => {
  const arr = (memory.get(key) ?? []).filter((t) => now - t < limit.windowMs)
  arr.push(now)
  memory.set(key, arr)
  if (memory.size > 5000) memory.clear()
  return arr.length > limit.max
}

// ---------------------------------------------------------------- database
type Db = { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }

/** Records one hit for `key` and returns the number of hits in the window (this one included). */
export async function countHit(payload: Pick<Payload, 'db'>, key: string, windowMs: number, now = Date.now()): Promise<number> {
  if (payload.db.name !== 'postgres') throw new Error('rate limit table needs PostgreSQL')
  const db = payload.db.drizzle as unknown as Db
  const k = hashKey(key)
  const bucket = new Date(Math.floor(now / BUCKET_MS) * BUCKET_MS).toISOString()
  const since = new Date(now - windowMs).toISOString()
  const res = await db.execute(sql`
    WITH up AS (
      INSERT INTO rate_limit_hits ("key", "bucket", "count") VALUES (${k}, ${bucket}, 1)
      ON CONFLICT ("key", "bucket") DO UPDATE SET "count" = rate_limit_hits."count" + 1
      RETURNING "count"
    )
    SELECT (SELECT "count" FROM up)
      + COALESCE((SELECT SUM("count") FROM rate_limit_hits WHERE "key" = ${k} AND "bucket" > ${since} AND "bucket" <> ${bucket}), 0) AS total`)
  // opportunistic cleanup, roughly once every 50 hits; failures are irrelevant
  if (Math.random() < 0.02) await db.execute(sql`DELETE FROM rate_limit_hits WHERE "bucket" < ${new Date(now - KEEP_MS).toISOString()}`).catch(() => {})
  return Number(res.rows[0]?.total ?? 1)
}

/**
 * True when `key` has gone over `limit` (this hit included). Keys name the route and the client,
 * e.g. `contact:203.0.113.9`.
 */
export async function rateLimited(payload: Pick<Payload, 'db' | 'logger'>, key: string, limit: Limit = FORM_LIMIT): Promise<boolean> {
  try {
    return (await countHit(payload, key, limit.windowMs)) > limit.max
  } catch (e) {
    payload.logger?.warn?.(`Pembatas laju memakai memori (database: ${(e as Error).message})`)
    return memoryLimited(key, limit)
  }
}

/** Client IP: first hop of x-forwarded-for (set by the Vercel edge), else x-real-ip. */
export const ipFromHeaders = (h: Pick<Headers, 'get'>) => h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
