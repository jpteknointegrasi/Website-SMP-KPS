/**
 * Outbox delivery: events committed with their change are handled afterwards, with retry/backoff and a dead-letter
 * state an authorised person can retry (§47.4). Consumers are idempotent (event ids are unique per event).
 */
import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm'
import type { SchoolInfo } from '@satusekolah/core'
import { mailLog, outboxEvents } from '@/db/schema'
import type { SchoolDb } from '@/db/school-db'
import { sendMail } from './mail'

export type OutboxHandler = (e: { id: number; type: string; payload: Record<string, unknown> }, env: { db: SchoolDb; school: SchoolInfo }) => Promise<void>

const handlers = new Map<string, OutboxHandler>()
export const onEvent = (type: string, h: OutboxHandler) => void handlers.set(type, h)

onEvent('mail.send', async (e, { db, school }) => {
  const p = e.payload as { to: string; subject: string; text: string; link?: string | null }
  const base = school.primaryDomain ? `https://${school.primaryDomain}` : ''
  const text = p.link && base ? p.text.replace(`Buka: ${p.link}`, `Buka: ${base}${p.link}`) : p.text
  const subject = `${p.subject} — ${school.name}`
  const r = await sendMail({ to: p.to, subject, text }, { schoolName: school.name })
  // without a mail server (development) the body is kept so it can be read on the development mailbox page
  await db.insert(mailLog).values({ to: p.to, subject, body: r.sent ? null : text, sentAt: r.sent ? new Date() : null })
})

const MAX_ATTEMPTS = 8

/** Delivers due events of one school. Safe to run concurrently (rows are claimed with SKIP LOCKED). */
export async function processOutbox(db: SchoolDb, school: SchoolInfo, limit = 25) {
  let done = 0
  for (let i = 0; i < limit; i++) {
    const handled = await db.transaction(async (tx) => {
      const [e] = await tx
        .select()
        .from(outboxEvents)
        .where(and(isNull(outboxEvents.processedAt), eq(outboxEvents.dead, false), lte(outboxEvents.availableAt, new Date())))
        .orderBy(asc(outboxEvents.id))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!e) return false
      const h = handlers.get(e.type)
      try {
        if (h) await h({ id: e.id, type: e.type, payload: e.payload }, { db, school })
        // delivered mail keeps no body (it may hold one-time links such as password resets)
        const payload = e.type === 'mail.send' && h ? { ...(e.payload as Record<string, unknown>), text: '[terkirim]', link: null } : e.payload
        await tx.update(outboxEvents).set({ processedAt: new Date(), attempts: e.attempts + 1, lastError: h ? null : 'no-consumer', payload }).where(eq(outboxEvents.id, e.id))
      } catch (err) {
        const attempts = e.attempts + 1
        const delay = Math.min(2 ** attempts * 30, 6 * 3600) * 1000
        await tx
          .update(outboxEvents)
          .set({ attempts, lastError: String((err as Error).message ?? err).slice(0, 500), dead: attempts >= MAX_ATTEMPTS, availableAt: new Date(Date.now() + delay) })
          .where(eq(outboxEvents.id, e.id))
      }
      return true
    })
    if (!handled) break
    done++
  }
  return done
}

/** Puts a dead event back in the queue (authorised retry). */
export const retryDead = (db: SchoolDb, id: number) =>
  db.update(outboxEvents).set({ dead: false, availableAt: new Date(), attempts: sql`0` }).where(eq(outboxEvents.id, id))
