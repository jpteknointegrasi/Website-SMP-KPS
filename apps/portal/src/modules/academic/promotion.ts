/**
 * Kenaikan kelas & kelulusan (year rollover). A draft run lists every active enrolment of the closing year with a
 * decision (from the last report card when present: naik / tinggal / lulus) and a target homeroom in the next year
 * (same letter one grade up, by default). Executing it in one transaction ends the old enrolments with their
 * outcome, opens next-year enrolments & placements from the effective date, and marks graduates. Idempotent:
 * an executed run cannot run again.
 */
import { and, asc, eq, sql } from 'drizzle-orm'
import { academicYears, classPlacements, enrollments, gradeLevels, homerooms, persons, promotionRuns, reportCards, students, terms, type PromotionLine } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command } from '@/server/command'
import { fail, notFound } from '@/server/errors'
import { addDays, isDate } from '@/server/time'
import { placeInHomeroom } from '../students/service'

const suffix = (name: string) => name.trim().split(/\s+/).slice(1).join(' ')

export async function proposePromotion(ctx: Ctx, fromYearId: string, toYearId: string) {
  const s = requireStaff(ctx, 'academic.manage')
  if (fromYearId === toYearId) fail('Pilih tahun ajaran tujuan yang berbeda.')
  return command(ctx, 'promotion.propose', {}, async (tx, fx) => {
    const [draft] = await tx.select().from(promotionRuns).where(and(eq(promotionRuns.fromYearId, fromYearId), eq(promotionRuns.status, 'draft')))
    if (draft) return draft.id
    const [ex] = await tx.select().from(promotionRuns).where(and(eq(promotionRuns.fromYearId, fromYearId), eq(promotionRuns.status, 'executed')))
    if (ex) fail('Kenaikan kelas tahun ajaran ini sudah dijalankan.')
    const targets = await tx.select({ h: homerooms, g: gradeLevels }).from(homerooms).innerJoin(gradeLevels, eq(gradeLevels.id, homerooms.gradeLevelId)).where(eq(homerooms.yearId, toYearId)).orderBy(asc(homerooms.name))
    const [lastTerm] = await tx.select().from(terms).where(eq(terms.yearId, fromYearId)).orderBy(sql`${terms.ordinal} DESC`).limit(1)
    const rows = await tx
      .select({ e: enrollments, p: classPlacements, h: homerooms, g: gradeLevels, name: persons.fullName })
      .from(enrollments)
      .innerJoin(classPlacements, and(eq(classPlacements.enrollmentId, enrollments.id), sql`${classPlacements.validTo} IS NULL`))
      .innerJoin(homerooms, eq(homerooms.id, classPlacements.homeroomId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, enrollments.gradeLevelId))
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(persons, eq(persons.id, students.personId))
      .where(and(eq(enrollments.yearId, fromYearId), eq(enrollments.status, 'active'), eq(students.status, 'active')))
      .orderBy(asc(homerooms.name), asc(persons.fullName))
    const cards = lastTerm ? await tx.select().from(reportCards).where(eq(reportCards.termId, lastTerm.id)) : []
    const lines: PromotionLine[] = rows.map((r) => {
      const card = cards.find((c) => c.studentId === r.e.studentId)
      const decision = (card?.promotion as PromotionLine['decision'] | null) ?? (r.g.final ? 'lulus' : 'naik')
      const level = decision === 'naik' ? targets.find((t) => t.g.ordinal > r.g.ordinal)?.g.ordinal : decision === 'tinggal' ? r.g.ordinal : null
      const pool = level ? targets.filter((t) => t.g.ordinal === level) : []
      const to = pool.find((t) => suffix(t.h.name) === suffix(r.h.name)) ?? pool[0]
      return { studentId: r.e.studentId, name: r.name, fromHomeroom: r.h.name, decision, toHomeroomId: to?.h.id ?? null }
    })
    const [run] = await tx.insert(promotionRuns).values({ fromYearId, toYearId, lines, createdBy: s.id }).returning({ id: promotionRuns.id })
    fx.audit('promotion.propose', 'academic_year', fromYearId, { to: toYearId, students: lines.length })
    return run!.id
  })
}

export async function updateLines(ctx: Ctx, runId: string, changes: { studentId: string; decision: string; toHomeroomId: string | null }[]) {
  requireStaff(ctx, 'academic.manage')
  await command(ctx, 'promotion.update', {}, async (tx, fx) => {
    const [r] = await tx.select().from(promotionRuns).where(eq(promotionRuns.id, runId)).for('update')
    if (!r) notFound('Kenaikan kelas')
    if (r!.status !== 'draft') fail('Kenaikan kelas sudah dijalankan.')
    const lines = r!.lines.map((l) => {
      const c = changes.find((x) => x.studentId === l.studentId)
      if (!c) return l
      if (!['naik', 'tinggal', 'lulus', 'keluar'].includes(c.decision)) fail('Keputusan tidak dikenal.')
      return { ...l, decision: c.decision as PromotionLine['decision'], toHomeroomId: c.decision === 'lulus' || c.decision === 'keluar' ? null : c.toHomeroomId }
    })
    await tx.update(promotionRuns).set({ lines }).where(eq(promotionRuns.id, runId))
    fx.audit('promotion.update', 'promotion', runId, { changed: changes.length })
  })
}

export async function executePromotion(ctx: Ctx, runId: string, effectiveDate: string) {
  const s = requireStaff(ctx, 'academic.manage')
  if (!isDate(effectiveDate)) fail('Tanggal berlaku tidak valid.')
  return command(ctx, 'promotion.execute', {}, async (tx, fx) => {
    const [r] = await tx.select().from(promotionRuns).where(eq(promotionRuns.id, runId)).for('update')
    if (!r) notFound('Kenaikan kelas')
    if (r!.status !== 'draft') fail('Kenaikan kelas sudah dijalankan.')
    const [to] = await tx.select().from(academicYears).where(eq(academicYears.id, r!.toYearId))
    if (effectiveDate < to!.startDate || effectiveDate > to!.endDate) fail('Tanggal berlaku harus di dalam tahun ajaran tujuan.')
    const missing = r!.lines.filter((l) => (l.decision === 'naik' || l.decision === 'tinggal') && !l.toHomeroomId)
    if (missing.length) fail(`Pilih rombel tujuan untuk ${missing.slice(0, 3).map((m) => m.name).join(', ')}${missing.length > 3 ? ` dan ${missing.length - 3} lainnya` : ''}.`)
    const end = addDays(effectiveDate, -1)
    const outcome = { naik: 'promoted', tinggal: 'retained', lulus: 'graduated', keluar: 'withdrawn' } as const
    for (const l of r!.lines) {
      const [e] = await tx.select().from(enrollments).where(and(eq(enrollments.studentId, l.studentId), eq(enrollments.yearId, r!.fromYearId), eq(enrollments.status, 'active')))
      if (!e) continue
      await tx.update(classPlacements).set({ validTo: end }).where(and(eq(classPlacements.enrollmentId, e.id), sql`${classPlacements.validTo} IS NULL`))
      await tx.update(enrollments).set({ status: 'ended', endDate: end, outcome: outcome[l.decision] }).where(eq(enrollments.id, e.id))
      if (l.toHomeroomId) await placeInHomeroom(ctx, tx, l.studentId, l.toHomeroomId, effectiveDate)
      else await tx.update(students).set({ status: l.decision === 'lulus' ? 'graduated' : 'withdrawn', exitDate: end, exitReason: l.decision === 'lulus' ? 'Lulus' : 'Keluar saat kenaikan kelas', updatedAt: ctx.now, updatedBy: s.id }).where(eq(students.id, l.studentId))
    }
    await tx.update(promotionRuns).set({ status: 'executed', executedBy: s.id, executedAt: ctx.now, effectiveDate }).where(eq(promotionRuns.id, runId))
    fx.event('academic.promotion_executed', { runId, students: r!.lines.length })
    fx.audit('promotion.execute', 'promotion', runId, { students: r!.lines.length, from: effectiveDate })
    return r!.lines.length
  })
}

export async function promotionRun(ctx: Ctx, id: string) {
  requireStaff(ctx, 'academic.manage')
  const [r] = await ctx.db.select().from(promotionRuns).where(eq(promotionRuns.id, id))
  if (!r) notFound('Kenaikan kelas')
  return r!
}
export async function listPromotionRuns(ctx: Ctx) {
  requireStaff(ctx, 'academic.manage')
  return ctx.db.select().from(promotionRuns).orderBy(sql`${promotionRuns.createdAt} DESC`)
}
