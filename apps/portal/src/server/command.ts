/**
 * The one path for every state-changing action (Blueprint §47.4, §48): permission and state guards run inside a
 * single transaction together with the change, its audit entry and its outbox events; an operation key makes a
 * repeated submit (double click, retry after a dropped connection) return the first result instead of acting twice.
 */
import { eq, sql } from 'drizzle-orm'
import { auditEvents, counters, notifications, operationKeys, outboxEvents } from '@/db/schema'
import type { SchoolDb } from '@/db/school-db'
import { actorRef, type Ctx } from './context'
import { sha256 } from './secrets'
import { conflict } from './errors'

export type Tx = Parameters<Parameters<SchoolDb['transaction']>[0]>[0]
export type Db = SchoolDb | Tx

export type Effects = {
  audit: (action: string, objectType?: string, objectId?: string | null, meta?: Record<string, string | number | boolean | null>) => void
  /** Domain event delivered after commit (outbox). Payload: ids and codes only, never sensitive content (§47.3). */
  event: (type: string, payload: Record<string, unknown>) => void
  /** In-app notice (neutral text). `email` also queues an e-mail to that address. */
  notify: (to: { type: 'account' | 'staff'; id: string }, n: { title: string; body?: string; link?: string; email?: string | null }) => void
}

export async function command<T>(
  ctx: Ctx,
  name: string,
  opts: { key?: string | null; input?: unknown },
  run: (tx: Tx, fx: Effects) => Promise<T>,
): Promise<T> {
  const audits: (typeof auditEvents.$inferInsert)[] = []
  const events: (typeof outboxEvents.$inferInsert)[] = []
  const notes: (typeof notifications.$inferInsert)[] = []
  const actor = actorRef(ctx)
  const [actorType, actorId] = actor.includes(':') ? (actor.split(':') as [string, string]) : ['system', null]
  const fx: Effects = {
    audit: (action, objectType, objectId, meta) =>
      audits.push({ actorType, actorId, action, objectType, objectId: objectId ?? null, correlationId: ctx.correlationId, meta: meta ?? null }),
    event: (type, payload) => events.push({ type, payload: { ...payload, schoolId: ctx.school.id, eventId: crypto.randomUUID(), occurredAt: ctx.now.toISOString() }, correlationId: ctx.correlationId }),
    notify: (to, n) => {
      notes.push({ recipientType: to.type, recipientId: to.id, title: n.title, body: n.body, link: n.link })
      if (n.email) events.push({ type: 'mail.send', payload: { to: n.email, subject: n.title, text: `${n.body ?? ''}${n.link ? `\n\nBuka: ${n.link}` : ''}`, link: n.link ?? null }, correlationId: ctx.correlationId })
    },
  }

  const result = await ctx.db.transaction(async (tx) => {
    let opKey: string | null = null
    if (opts.key) {
      opKey = `${actor}:${name}:${opts.key}`.slice(0, 300)
      const fingerprint = sha256(JSON.stringify(opts.input ?? null))
      const inserted = await tx.insert(operationKeys).values({ key: opKey, command: name, fingerprint }).onConflictDoNothing().returning({ key: operationKeys.key })
      if (!inserted.length) {
        const [prev] = await tx.select().from(operationKeys).where(eq(operationKeys.key, opKey))
        if (prev && prev.fingerprint !== fingerprint) conflict('Permintaan ini sudah dikirim dengan isi berbeda. Muat ulang halaman lalu coba lagi.')
        return { replay: true as const, value: (prev?.result ?? null) as T }
      }
    }
    const value = await run(tx, fx)
    if (opKey) await tx.update(operationKeys).set({ result: (value ?? null) as never }).where(eq(operationKeys.key, opKey))
    if (audits.length) await tx.insert(auditEvents).values(audits)
    if (events.length) await tx.insert(outboxEvents).values(events)
    if (notes.length) await tx.insert(notifications).values(notes)
    return { replay: false as const, value }
  })
  if (!result.replay && events.length) ctx.outboxPending = true
  return result.value
}

/** Next number of a named sequence, inside the caller's transaction (gap-free, serialised per name). */
export async function nextNumber(tx: Db, name: string) {
  const r = await tx
    .insert(counters)
    .values({ name, value: 1 })
    .onConflictDoUpdate({ target: counters.name, set: { value: sql`${counters.value} + 1` } })
    .returning({ value: counters.value })
  return r[0]!.value
}

/** Optimistic concurrency: the row's version must still be the one the form was rendered with. */
export function expectVersion(current: number, given: unknown) {
  if (given === undefined || given === null || given === '') return
  if (Number(given) !== current) conflict()
}
