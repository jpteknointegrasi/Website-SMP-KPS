import type { Payload as RawPayload } from 'payload'
import type { TenantPayload } from '../tenancy/scoped'

/** Query helpers take a school-scoped Payload: a session id from one school can never touch another's. */
type Payload = TenantPayload
/** Raw counter updates only need the database handle; callers pass session ids already checked for the school. */
type Db = Pick<RawPayload, 'db'>
import { sql } from '@payloadcms/db-postgres'

/**
 * Visit-session capacity counter.
 *
 * `visit_sessions.booked_count` is changed ONLY with single conditional UPDATE statements, which are atomic in
 * PostgreSQL and SQLite: two concurrent requests for the last seat cannot both pass the `<= capacity` check.
 * `recomputeBooked()` rebuilds the counter from bookings (dashboard button / scheduled job) to repair drift.
 */

/** Statuses that hold a seat. Expired pending holds are released lazily (see releaseExpiredHolds). */
export const CONSUMING = ['pending', 'confirmed'] as const
export const consumes = (status?: string | null) => (CONSUMING as readonly string[]).includes(String(status))

/** Seats a booking uses: one per family, or the number of participants. */
export const seatsFor = (unit: string | null | undefined, participants: number | null | undefined) =>
  unit === 'people' ? Math.max(1, Math.min(20, Number(participants) || 1)) : 1

type Row = { id: number }
const isPg = (payload: Db) => payload.db.name === 'postgres'

async function exec(payload: Db, q: ReturnType<typeof sql>): Promise<Row[]> {
  const db = payload.db.drizzle as unknown as {
    execute?: (q: unknown) => Promise<{ rows: Row[] }>
    all?: (q: unknown) => Promise<Row[]>
  }
  if (isPg(payload)) return (await db.execute!(q)).rows
  return (await db.all!(q)) as Row[]
}

/** Atomically takes `seats` from a session. Returns false when it would exceed capacity. */
export async function tryReserve(payload: Db, sessionId: number, seats: number) {
  const rows = await exec(
    payload,
    sql`UPDATE visit_sessions SET booked_count = COALESCE(booked_count, 0) + ${seats}
        WHERE id = ${sessionId} AND COALESCE(booked_count, 0) + ${seats} <= capacity
        RETURNING id`,
  )
  return rows.length === 1
}

/** Gives seats back (never below zero). */
export async function release(payload: Db, sessionId: number, seats: number) {
  if (isPg(payload)) {
    await exec(payload, sql`UPDATE visit_sessions SET booked_count = GREATEST(COALESCE(booked_count, 0) - ${seats}, 0) WHERE id = ${sessionId} RETURNING id`)
  } else {
    await exec(payload, sql`UPDATE visit_sessions SET booked_count = MAX(COALESCE(booked_count, 0) - ${seats}, 0) WHERE id = ${sessionId} RETURNING id`)
  }
}

/** Rebuilds the counter from bookings that currently hold seats. */
export async function recomputeBooked(payload: Payload, sessionId: number) {
  const session = await payload.findByID({ collection: 'visit-sessions', id: sessionId, depth: 0, overrideAccess: true })
  const res = await payload.find({
    collection: 'visit-bookings',
    where: { and: [{ session: { equals: sessionId } }, { status: { in: [...CONSUMING] } }] },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const total = res.docs.reduce((n, b) => n + seatsFor(session.capacityUnit, b.participants), 0)
  await exec(payload, sql`UPDATE visit_sessions SET booked_count = ${total} WHERE id = ${sessionId} RETURNING id`)
  return total
}

/** Marks pending holds past their expiry as `expired`; the booking hook releases their seats. */
export async function releaseExpiredHolds(payload: Payload, sessionId?: number) {
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'visit-bookings',
    where: {
      and: [
        { status: { equals: 'pending' } },
        { holdExpiresAt: { less_than: now } },
        ...(sessionId ? [{ session: { equals: sessionId } }] : []),
      ],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  for (const b of res.docs) {
    await payload.update({
      collection: 'visit-bookings',
      id: b.id,
      data: { status: 'expired', statusReason: 'Batas konfirmasi terlewati (otomatis)' },
      overrideAccess: true,
      context: { systemActor: 'sistem' },
    })
  }
  return res.docs.length
}
