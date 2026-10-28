/**
 * Decisions (§19.7, §41.2): proposals in batches (proposed → in_review → approved → released), each result a new
 * version per application; seats are reserved atomically at approval within the path quota (no overbooking); results
 * become visible only once released and the release time has passed. Offers are confirmed or declined by the family;
 * unconfirmed offers expire. Waitlist promotion is a new proposal, never a silent change.
 */
import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { accounts, admissionPaths, applications, decisionBatches, decisionVersions, persons, reenrollments, seatReservations } from '@/db/schema'
import { auditDenied, requireAccount, requireStaff, type Ctx } from '@/server/context'
import { command, expectVersion, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import type { SchoolInfo } from '@sekolahku/core'
import type { SchoolDb } from '@/db/school-db'
import { makeCtx } from '@/server/context'
import { loadCycle } from './config'
import { loadApplication, releasedDecision } from './apply'
import { scoreSummary } from './selection'
import { createInvoice } from '../finance/service'
import { scheduled } from '../jobs'

export const OUTCOMES = ['offered', 'waitlisted', 'not_selected'] as const
export type Outcome = (typeof OUTCOMES)[number]

/** Candidates for a proposal: verified applications without a live decision, with locked selection totals. */
export async function decisionCandidates(ctx: Ctx, cycleId: string) {
  requireStaff(ctx, 'admissions.manage', 'admissions.approve', 'admissions.release')
  const rows = await ctx.db
    .select({ a: applications, name: persons.fullName, path: admissionPaths.name, quota: admissionPaths.quota })
    .from(applications)
    .innerJoin(persons, eq(persons.id, applications.applicantPersonId))
    .innerJoin(admissionPaths, eq(admissionPaths.id, applications.pathId))
    .where(and(eq(applications.cycleId, cycleId), eq(applications.status, 'verified')))
  const live = new Set(
    (await ctx.db.select({ id: decisionVersions.applicationId, outcome: decisionVersions.outcome }).from(decisionVersions).where(eq(decisionVersions.superseded, false)))
      .filter((r) => r.outcome !== 'waitlisted')
      .map((r) => r.id),
  )
  const scores = await scoreSummary(ctx.db, rows.map((r) => r.a.id))
  return rows
    .filter((r) => !live.has(r.a.id))
    .map((r) => ({ ...r, score: scores.get(r.a.id)?.total ?? null, parts: scores.get(r.a.id)?.parts ?? {} }))
    .sort((x, y) => (y.score ?? -1) - (x.score ?? -1) || String(x.a.registrationNo).localeCompare(String(y.a.registrationNo)))
}

export async function proposeBatch(ctx: Ctx, input: { cycleId: string; title: string; instructions: string | null; releaseAt: Date | null; entries: { applicationId: string; outcome: Outcome; reasonCode: string | null; internalNote: string | null }[] }) {
  const s = requireStaff(ctx, 'admissions.manage')
  if (!input.title.trim()) fail('Isi judul usulan.')
  if (!input.entries.length) fail('Pilih keputusan untuk minimal satu pendaftar.')
  return command(ctx, 'admissions.batch_propose', {}, async (tx, fx) => {
    const c = await loadCycle(tx, input.cycleId)
    if (!c) notFound('Periode')
    const [b] = await tx.insert(decisionBatches).values({ cycleId: input.cycleId, title: input.title.trim(), instructions: input.instructions, releaseAt: input.releaseAt, proposedBy: s.id }).returning({ id: decisionBatches.id })
    for (const e of input.entries) {
      if (!OUTCOMES.includes(e.outcome)) fail('Keputusan tidak dikenal.')
      const a = await loadApplication(tx, e.applicationId, true)
      if (!a || a.cycleId !== input.cycleId) fail('Pendaftar tidak dikenal.')
      if (a!.status !== 'verified') fail(`Pendaftar ${a!.registrationNo} belum terverifikasi.`)
      const [{ v }] = (await tx.select({ v: sql<number>`coalesce(max(${decisionVersions.versionNo}), 0)`.mapWith(Number) }).from(decisionVersions).where(eq(decisionVersions.applicationId, e.applicationId))) as [{ v: number }]
      // an application can be in only one open (unreleased) proposal at a time
      const open = await tx
        .select({ id: decisionVersions.id })
        .from(decisionVersions)
        .innerJoin(decisionBatches, eq(decisionBatches.id, decisionVersions.batchId))
        .where(and(eq(decisionVersions.applicationId, e.applicationId), eq(decisionVersions.superseded, false), inArray(decisionBatches.status, ['proposed', 'in_review', 'approved'])))
      if (open.length) fail(`Pendaftar ${a!.registrationNo} sudah ada di usulan lain yang belum dirilis.`)
      if (c!.selectionEnabled && e.outcome !== 'not_selected') {
        const sc = (await scoreSummary(tx, [e.applicationId])).get(e.applicationId)
        if (sc?.total === null || sc?.total === undefined) fail(`Nilai seleksi ${a!.registrationNo} belum lengkap/terkunci.`)
      }
      await tx.insert(decisionVersions).values({ applicationId: e.applicationId, batchId: b!.id, versionNo: v + 1, outcome: e.outcome, reasonCode: e.reasonCode, internalNote: e.internalNote })
    }
    fx.audit('admissions.batch_propose', 'decision_batch', b!.id, { entries: input.entries.length })
    return b!.id
  })
}

async function loadBatch(tx: Db, id: string) {
  const [b] = await tx.select().from(decisionBatches).where(eq(decisionBatches.id, id)).for('update')
  return b ?? null
}

export async function submitBatch(ctx: Ctx, id: string) {
  const s = requireStaff(ctx, 'admissions.manage')
  await command(ctx, 'admissions.batch_submit', {}, async (tx, fx) => {
    const b = await loadBatch(tx, id)
    if (!b || b.status !== 'proposed') fail('Usulan tidak dalam status draf.')
    await tx.update(decisionBatches).set({ status: 'in_review', reviewedBy: s.id, version: sql`${decisionBatches.version} + 1` }).where(eq(decisionBatches.id, id))
    fx.audit('admissions.batch_submit', 'decision_batch', id)
  })
}

/**
 * Approval reserves seats for every "offered" result, atomically per path (rows locked), within the quota. The
 * approver must be someone other than the proposer.
 */
export const approveBatch = (ctx: Ctx, id: string, version: string | null) =>
  auditDenied(ctx, 'admissions.batch_approve', { type: 'decision_batch', id }, () => approveBatchGuarded(ctx, id, version))

async function approveBatchGuarded(ctx: Ctx, id: string, version: string | null) {
  const s = requireStaff(ctx, 'admissions.approve')
  await command(ctx, 'admissions.batch_approve', {}, async (tx, fx) => {
    const b = await loadBatch(tx, id)
    if (!b || b.status !== 'in_review') fail('Usulan belum diajukan untuk persetujuan.')
    expectVersion(b!.version, version)
    if (b!.proposedBy === s.id) forbidden('Usulan harus disetujui oleh pejabat selain pengusul.')
    const c = (await loadCycle(tx, b!.cycleId))!
    const vers = await tx.select({ v: decisionVersions, pathId: applications.pathId }).from(decisionVersions).innerJoin(applications, eq(applications.id, decisionVersions.applicationId)).where(eq(decisionVersions.batchId, id))
    const offered = vers.filter((x) => x.v.outcome === 'offered')
    const pathIds = [...new Set(offered.map((x) => x.pathId))]
    if (pathIds.length) {
      // lock the paths: concurrent approvals for the same path serialise here (no overbooking)
      const paths = await tx.select().from(admissionPaths).where(inArray(admissionPaths.id, pathIds)).orderBy(asc(admissionPaths.id)).for('update')
      for (const p of paths) {
        const [used] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(seatReservations).where(and(eq(seatReservations.pathId, p.id), inArray(seatReservations.state, ['reserved', 'confirmed'])))
        const want = offered.filter((x) => x.pathId === p.id && true)
        // an application that already holds a live seat (re-decision) does not need a new one
        const holding = want.length ? await tx.select({ a: seatReservations.applicationId }).from(seatReservations).where(and(inArray(seatReservations.applicationId, want.map((x) => x.v.applicationId)), inArray(seatReservations.state, ['reserved', 'confirmed']))) : []
        const need = want.filter((x) => !holding.some((h) => h.a === x.v.applicationId)).length
        if (used!.n + need > p.quota) fail(`Kuota jalur ${p.name} tidak cukup: terpakai ${used!.n}, usulan ${need}, kuota ${p.quota}.`)
      }
      const start = b!.releaseAt && b!.releaseAt > ctx.now ? b!.releaseAt : ctx.now
      for (const x of offered) {
        const [live] = await tx.select().from(seatReservations).where(and(eq(seatReservations.applicationId, x.v.applicationId), inArray(seatReservations.state, ['reserved', 'confirmed'])))
        if (live) await tx.update(seatReservations).set({ decisionVersionId: x.v.id, updatedAt: ctx.now }).where(eq(seatReservations.id, live.id))
        else await tx.insert(seatReservations).values({ applicationId: x.v.applicationId, pathId: x.pathId, decisionVersionId: x.v.id, expiresAt: new Date(start.getTime() + c.offerDays * 86_400_000) })
      }
    }
    // results that are no longer an offer release any seat held from an earlier offer
    for (const x of vers.filter((y) => y.v.outcome !== 'offered'))
      await tx.update(seatReservations).set({ state: 'released', updatedAt: ctx.now }).where(and(eq(seatReservations.applicationId, x.v.applicationId), eq(seatReservations.state, 'reserved')))
    await tx.update(decisionBatches).set({ status: 'approved', approvedBy: s.id, approvedAt: ctx.now, version: sql`${decisionBatches.version} + 1` }).where(eq(decisionBatches.id, id))
    fx.audit('admissions.batch_approve', 'decision_batch', id, { offered: offered.length })
  })
}

/**
 * Release: results become visible at `releaseAt` (or now). Earlier versions of the same applications are superseded.
 * Families get a neutral notice only when the result is actually visible (scheduled job otherwise).
 */
export const releaseBatch = (ctx: Ctx, id: string, releaseAt: Date | null) =>
  auditDenied(ctx, 'admissions.batch_release', { type: 'decision_batch', id }, () => releaseBatchGuarded(ctx, id, releaseAt))

async function releaseBatchGuarded(ctx: Ctx, id: string, releaseAt: Date | null) {
  const s = requireStaff(ctx, 'admissions.release')
  await command(ctx, 'admissions.batch_release', {}, async (tx, fx) => {
    const b = await loadBatch(tx, id)
    if (!b || b.status !== 'approved') fail('Hanya usulan yang sudah disetujui yang dapat dirilis.')
    const at = releaseAt ?? b!.releaseAt ?? ctx.now
    const vers = await tx.select().from(decisionVersions).where(eq(decisionVersions.batchId, id))
    for (const v of vers) await tx.update(decisionVersions).set({ superseded: true }).where(and(eq(decisionVersions.applicationId, v.applicationId), sql`${decisionVersions.versionNo} < ${v.versionNo}`))
    await tx.update(decisionBatches).set({ status: 'released', releasedBy: s.id, releasedAt: ctx.now, releaseAt: at, version: sql`${decisionBatches.version} + 1` }).where(eq(decisionBatches.id, id))
    // offer clocks start at release
    await tx
      .update(seatReservations)
      .set({ expiresAt: sql`${at}::timestamptz + make_interval(days => (SELECT offer_days FROM admission_cycles WHERE id = ${b!.cycleId}))` })
      .where(and(inArray(seatReservations.decisionVersionId, vers.map((v) => v.id)), eq(seatReservations.state, 'reserved')))
    fx.audit('admissions.batch_release', 'decision_batch', id, { at: at.toISOString() })
    if (at <= ctx.now) await notifyRelease(tx, id, fx.notify, ctx.now)
  })
}

async function notifyRelease(tx: Db, batchId: string, notify: Parameters<Parameters<typeof command>[3]>[1]['notify'], now: Date) {
  const rows = await tx.select({ a: applications, email: accounts.email }).from(decisionVersions).innerJoin(applications, eq(applications.id, decisionVersions.applicationId)).innerJoin(accounts, eq(accounts.id, applications.ownerAccountId)).where(eq(decisionVersions.batchId, batchId))
  // neutral text: the outcome is only shown after signing in (§19.3)
  for (const r of rows) notify({ type: 'account', id: r.a.ownerAccountId }, { title: `Hasil seleksi ${r.a.registrationNo} sudah tersedia`, body: 'Masuk ke portal untuk melihat hasil dan langkah berikutnya.', link: `/portal/keluarga/penerimaan/${r.a.id}`, email: r.email })
  await tx.update(decisionBatches).set({ notifiedAt: now }).where(eq(decisionBatches.id, batchId))
}

export async function cancelBatch(ctx: Ctx, id: string, reason: string) {
  requireStaff(ctx, 'admissions.manage')
  if (reason.trim().length < 5) fail('Tuliskan alasan pembatalan.')
  await command(ctx, 'admissions.batch_cancel', {}, async (tx, fx) => {
    const b = await loadBatch(tx, id)
    if (!b || !['proposed', 'in_review', 'approved'].includes(b.status)) fail('Usulan ini tidak dapat dibatalkan.')
    const vers = await tx.select().from(decisionVersions).where(eq(decisionVersions.batchId, id))
    if (vers.length) {
      await tx.update(seatReservations).set({ state: 'released', updatedAt: ctx.now }).where(and(inArray(seatReservations.decisionVersionId, vers.map((v) => v.id)), eq(seatReservations.state, 'reserved')))
      await tx.update(decisionVersions).set({ superseded: true }).where(eq(decisionVersions.batchId, id))
    }
    await tx.update(decisionBatches).set({ status: 'cancelled' }).where(eq(decisionBatches.id, id))
    fx.audit('admissions.batch_cancel', 'decision_batch', id, { reason: reason.slice(0, 200) })
  })
}

export async function batchesOf(ctx: Ctx, cycleId: string) {
  requireStaff(ctx, 'admissions.manage', 'admissions.approve', 'admissions.release')
  const batches = await ctx.db.select().from(decisionBatches).where(eq(decisionBatches.cycleId, cycleId)).orderBy(desc(decisionBatches.createdAt))
  const ids = batches.map((b) => b.id)
  const vers = ids.length
    ? await ctx.db
        .select({ v: decisionVersions, regNo: applications.registrationNo, name: persons.fullName, pathId: applications.pathId })
        .from(decisionVersions)
        .innerJoin(applications, eq(applications.id, decisionVersions.applicationId))
        .innerJoin(persons, eq(persons.id, applications.applicantPersonId))
        .where(inArray(decisionVersions.batchId, ids))
        .orderBy(asc(applications.registrationNo))
    : []
  const scores = await scoreSummary(ctx.db, vers.map((v) => v.v.applicationId))
  return batches.map((b) => ({ ...b, entries: vers.filter((v) => v.v.batchId === b.id).map((v) => ({ ...v, score: scores.get(v.v.applicationId)?.total ?? null })) }))
}

/** Seats: quota, reserved, confirmed per path (capacity panel PAN-03). */
export async function seatSummary(db: Db, cycleId: string) {
  const paths = await db.select().from(admissionPaths).where(eq(admissionPaths.cycleId, cycleId)).orderBy(asc(admissionPaths.ordinal))
  const rs = await db.select({ pathId: seatReservations.pathId, state: seatReservations.state, n: sql<number>`count(*)`.mapWith(Number) }).from(seatReservations).where(inArray(seatReservations.pathId, paths.length ? paths.map((p) => p.id) : ['00000000-0000-0000-0000-000000000000'])).groupBy(seatReservations.pathId, seatReservations.state)
  return paths.map((p) => {
    const get = (s: string) => rs.find((r) => r.pathId === p.id && r.state === s)?.n ?? 0
    return { path: p, reserved: get('reserved'), confirmed: get('confirmed'), free: Math.max(0, p.quota - get('reserved') - get('confirmed')) }
  })
}

// ---------- family: confirm / decline an offer ----------
export async function respondToOffer(ctx: Ctx, applicationId: string, accept: boolean, reason: string | null) {
  const acc = requireAccount(ctx)
  return command(ctx, accept ? 'admissions.offer_accept' : 'admissions.offer_decline', {}, async (tx, fx) => {
    const a = await loadApplication(tx, applicationId, true)
    if (!a || a.ownerAccountId !== acc.id) notFound('Pendaftaran')
    const d = await releasedDecision(tx, applicationId, ctx.now)
    if (!d || d.v.outcome !== 'offered') fail('Tidak ada penawaran yang dapat dijawab.')
    const [r] = await tx.select().from(seatReservations).where(and(eq(seatReservations.applicationId, applicationId), inArray(seatReservations.state, ['reserved', 'confirmed']))).for('update')
    if (!r) fail('Penawaran tempat sudah tidak berlaku. Hubungi panitia.')
    if (r!.state === 'confirmed') fail('Penawaran sudah Anda konfirmasi.')
    if (r!.expiresAt && r!.expiresAt < ctx.now) fail('Batas waktu konfirmasi sudah lewat. Hubungi panitia.')
    if (!accept) {
      await tx.update(seatReservations).set({ state: 'released', updatedAt: ctx.now }).where(eq(seatReservations.id, r!.id))
      await tx.insert(reenrollments).values({ applicationId, status: 'declined', checklist: [], note: reason }).onConflictDoUpdate({ target: reenrollments.applicationId, set: { status: 'declined', note: reason } })
      fx.audit('admissions.offer_decline', 'application', applicationId)
      return null
    }
    const c = (await loadCycle(tx, a!.cycleId))!
    const [path] = await tx.select().from(admissionPaths).where(eq(admissionPaths.id, a!.pathId))
    await tx.update(seatReservations).set({ state: 'confirmed', expiresAt: null, updatedAt: ctx.now }).where(eq(seatReservations.id, r!.id))
    const checklist = path!.checklist.map((i) => ({ ...i, state: i.kind === 'confirm' ? ('done' as const) : ('pending' as const) }))
    if (path!.reenrollFee > 0) checklist.push({ code: 'pembayaran', label: 'Pembayaran daftar ulang', kind: 'payment', state: 'pending' })
    const [re] = await tx
      .insert(reenrollments)
      .values({ applicationId, checklist, dueAt: new Date(ctx.now.getTime() + c.reenrollDays * 86_400_000) })
      .onConflictDoNothing()
      .returning({ id: reenrollments.id })
    if (path!.reenrollFee > 0 && re)
      await createInvoice(tx, ctx, { category: 'daftar_ulang', title: `Daftar ulang ${a!.registrationNo}`, items: [{ label: `Daftar ulang ${c.name} — ${path!.name}`, amount: path!.reenrollFee }], applicationId, accountId: acc.id })
    fx.audit('admissions.offer_accept', 'application', applicationId)
    return re?.id ?? null
  })
}

/** Scheduled: notify results whose release time has come; expire unanswered offers and overdue re-enrolment. */
scheduled('admissions', async (db: SchoolDb, school: SchoolInfo, now: Date) => {
  const ctx = makeCtx({ school, db, now })
  let n = 0
  const due = await db.select().from(decisionBatches).where(and(eq(decisionBatches.status, 'released'), isNull(decisionBatches.notifiedAt), lte(decisionBatches.releaseAt, now)))
  for (const b of due) {
    await command(ctx, 'admissions.release_notify', {}, async (tx, fx) => notifyRelease(tx, b.id, fx.notify, now))
    n++
  }
  // expire offers (rows locked; an offer confirmed in the same moment is not touched)
  await command(ctx, 'admissions.expire', {}, async (tx, fx) => {
    const expired = await tx
      .update(seatReservations)
      .set({ state: 'expired', updatedAt: now })
      .where(and(eq(seatReservations.state, 'reserved'), lte(seatReservations.expiresAt, now)))
      .returning({ a: seatReservations.applicationId })
    const late = await tx
      .update(reenrollments)
      .set({ status: 'expired' })
      .where(and(inArray(reenrollments.status, ['in_progress', 'needs_revision']), lte(reenrollments.dueAt, now)))
      .returning({ a: reenrollments.applicationId })
    if (late.length) await tx.update(seatReservations).set({ state: 'released', updatedAt: now }).where(and(inArray(seatReservations.applicationId, late.map((l) => l.a)), eq(seatReservations.state, 'confirmed')))
    for (const e of [...expired, ...late]) fx.audit('admissions.offer_expired', 'application', e.a)
    n += expired.length + late.length
  })
  return n
})
