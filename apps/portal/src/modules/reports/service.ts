/**
 * M08 report cards (§42.3, RPT-01): per homeroom and term. Completeness comes from the teachers' submitted results;
 * the homeroom teacher adds notes (and the promotion decision in the last term) and submits; curriculum approves,
 * which freezes a snapshot as a new version; release makes that version visible to the student and guardians.
 * Corrections re-open the card and produce a new version; earlier released versions stay in the history.
 * No ranking is computed, stored or printed.
 */
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import {
  academicYears,
  achievements,
  activities,
  activityEvaluations,
  gradeLevels,
  guardianLinks,
  guardians,
  homerooms,
  persons,
  reportCards,
  reportCardVersions,
  resultSubmissions,
  staffMembers,
  students,
  subjectResults,
  subjects,
  teachingAssignments,
  terms,
  type ReportSnapshot,
} from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { getBranding } from '@/server/settings'
import { recap } from '../attendance/service'
import { guardianAccounts, homeroomStudents, visibleStudentIds } from '../scope'
import { sql } from 'drizzle-orm'
import { today } from '@/server/time'

export const PROMOTION = { naik: 'Naik kelas', tinggal: 'Tinggal di kelas', lulus: 'Lulus' } as const

async function loadHomeroom(db: Db, id: string) {
  const [h] = await db
    .select({ h: homerooms, grade: gradeLevels, year: academicYears.name, teacher: sql<string | null>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` })
    .from(homerooms)
    .innerJoin(gradeLevels, eq(gradeLevels.id, homerooms.gradeLevelId))
    .innerJoin(academicYears, eq(academicYears.id, homerooms.yearId))
    .leftJoin(staffMembers, eq(staffMembers.id, homerooms.homeroomTeacherId))
    .where(eq(homerooms.id, id))
  if (!h) notFound('Rombel')
  return h!
}
async function loadTerm(db: Db, id: string) {
  const [t] = await db.select().from(terms).where(eq(terms.id, id))
  if (!t) notFound('Semester')
  return t!
}
const isLastTerm = async (db: Db, t: typeof terms.$inferSelect) => {
  const [n] = await db.select({ max: sql<number>`max(${terms.ordinal})`.mapWith(Number) }).from(terms).where(eq(terms.yearId, t.yearId))
  return t.ordinal === n!.max
}

function canSee(ctx: Ctx, h: { h: typeof homerooms.$inferSelect }) {
  return Boolean(ctx.staff && (h.h.homeroomTeacherId === ctx.staff.id || hasPerm(ctx, 'reports.review', 'reports.release', 'academic.manage')))
}

/** RPT-01 completeness: subjects (submission state) × students (report card state). */
export async function homeroomReport(ctx: Ctx, homeroomId: string, termId: string) {
  requireStaff(ctx)
  const h = await loadHomeroom(ctx.db, homeroomId)
  if (!canSee(ctx, h)) forbidden('Anda bukan wali kelas rombel ini.')
  const t = await loadTerm(ctx.db, termId)
  const asg = await ctx.db
    .select({ a: teachingAssignments, subject: subjects, teacher: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` })
    .from(teachingAssignments)
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(staffMembers, eq(staffMembers.id, teachingAssignments.teacherId))
    .where(and(eq(teachingAssignments.homeroomId, homeroomId), eq(teachingAssignments.termId, termId), eq(teachingAssignments.active, true)))
    .orderBy(asc(subjects.ordinal))
  const subs = asg.length ? await ctx.db.select().from(resultSubmissions).where(inArray(resultSubmissions.assignmentId, asg.map((a) => a.a.id))) : []
  const d = today(ctx.tz, ctx.now)
  const pupils = await homeroomStudents(ctx.db, homeroomId, d > t.endDate ? t.endDate : d < t.startDate ? t.startDate : d)
  const cards = pupils.length ? await ctx.db.select().from(reportCards).where(and(eq(reportCards.termId, termId), inArray(reportCards.studentId, pupils.map((p) => p.studentId)))) : []
  const subjectsState = asg.map((a) => ({ ...a, submission: subs.find((s) => s.assignmentId === a.a.id) ?? null }))
  return {
    homeroom: h,
    term: t,
    last: await isLastTerm(ctx.db, t),
    subjects: subjectsState,
    complete: subjectsState.length > 0 && subjectsState.every((s) => s.submission?.status === 'submitted'),
    students: pupils.map((p) => ({ ...p, card: cards.find((c) => c.studentId === p.studentId) ?? null })),
  }
}

/** Builds the frozen content of one report card from submitted results and records of the term. */
async function snapshot(db: Db, ctx: Ctx, termId: string, studentId: string, homeroomId: string, card: { notes: string | null; promotion: string | null }): Promise<ReportSnapshot> {
  const h = await loadHomeroom(db, homeroomId)
  const t = await loadTerm(db, termId)
  const b = await getBranding(db)
  const [st] = await db.select({ name: persons.fullName, nis: students.nis, nisn: students.nisn }).from(students).innerJoin(persons, eq(persons.id, students.personId)).where(eq(students.id, studentId))
  const rows = await db
    .select({ r: subjectResults, subject: subjects, teacher: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` })
    .from(teachingAssignments)
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(staffMembers, eq(staffMembers.id, teachingAssignments.teacherId))
    .leftJoin(subjectResults, and(eq(subjectResults.assignmentId, teachingAssignments.id), eq(subjectResults.studentId, studentId)))
    .where(and(eq(teachingAssignments.homeroomId, homeroomId), eq(teachingAssignments.termId, termId), eq(teachingAssignments.active, true)))
    .orderBy(asc(subjects.ordinal))
  const att = await recap(db, studentId, t.startDate, t.endDate)
  const acts = await db
    .select({ name: activities.name, predicate: activityEvaluations.predicate, description: activityEvaluations.description })
    .from(activityEvaluations)
    .innerJoin(activities, eq(activities.id, activityEvaluations.activityId))
    .where(and(eq(activityEvaluations.termId, termId), eq(activityEvaluations.studentId, studentId)))
  const ach = await db
    .select({ title: achievements.title, level: achievements.level, rank: achievements.rank })
    .from(achievements)
    .where(and(eq(achievements.studentId, studentId), eq(achievements.status, 'verified'), gte(achievements.date, t.startDate), lte(achievements.date, t.endDate)))
  return {
    student: st!,
    school: { name: b.shortName || ctx.school.name, city: b.city, address: b.address, principal: b.principalName, principalNip: b.principalNip },
    homeroom: h.h.name,
    grade: h.grade.name,
    year: h.year,
    term: t.name,
    homeroomTeacher: h.teacher,
    subjects: rows.map((r) => ({ code: r.subject.code, name: r.subject.name, group: r.subject.group, score: r.r?.finalScore === null || r.r?.finalScore === undefined ? null : Math.round(Number(r.r.finalScore)), description: r.r?.description ?? null, teacher: r.teacher })),
    attendance: { S: att.S, I: att.I, A: att.A },
    activities: acts,
    achievements: ach,
    notes: card.notes,
    promotion: card.promotion,
  }
}

async function cardFor(tx: Db, termId: string, studentId: string, homeroomId: string) {
  const [c] = await tx.select().from(reportCards).where(and(eq(reportCards.termId, termId), eq(reportCards.studentId, studentId))).for('update')
  if (c) return c
  const [n] = await tx.insert(reportCards).values({ termId, studentId, homeroomId }).onConflictDoNothing().returning()
  return n ?? (await tx.select().from(reportCards).where(and(eq(reportCards.termId, termId), eq(reportCards.studentId, studentId))))[0]!
}

/** Homeroom teacher's notes and (last term) promotion decision, while the card is a draft. */
export async function saveNotes(ctx: Ctx, homeroomId: string, termId: string, rows: { studentId: string; notes: string | null; promotion: string | null }[]) {
  const s = requireStaff(ctx)
  const r = await homeroomReport(ctx, homeroomId, termId)
  if (r.homeroom.h.homeroomTeacherId !== s.id && !hasPerm(ctx, 'academic.manage')) forbidden('Catatan rapor diisi wali kelas.')
  await command(ctx, 'reports.notes', {}, async (tx, fx) => {
    for (const row of rows) {
      if (!r.students.some((p) => p.studentId === row.studentId)) fail('Ada siswa yang bukan anggota rombel.')
      if (row.promotion && !(row.promotion in PROMOTION)) fail('Keputusan kenaikan tidak dikenal.')
      if (row.promotion && !r.last) fail('Keputusan kenaikan diisi pada semester terakhir.')
      if (row.promotion === 'lulus' && !r.homeroom.grade.final) fail('Kelulusan hanya untuk tingkat akhir.')
      if (row.promotion === 'naik' && r.homeroom.grade.final) fail('Tingkat akhir: pilih Lulus atau Tinggal.')
      const c = await cardFor(tx, termId, row.studentId, homeroomId)
      if (c.status !== 'draft') continue
      await tx.update(reportCards).set({ notes: row.notes?.trim() || null, promotion: row.promotion || null, version: c.version + 1 }).where(eq(reportCards.id, c.id))
    }
    fx.audit('reports.notes', 'homeroom', homeroomId, { term: termId })
  })
}

/** Homeroom teacher submits all draft cards of the class for curriculum review (all subjects submitted). */
export async function submitCards(ctx: Ctx, homeroomId: string, termId: string) {
  const s = requireStaff(ctx)
  const r = await homeroomReport(ctx, homeroomId, termId)
  if (r.homeroom.h.homeroomTeacherId !== s.id) forbidden('Rapor diajukan oleh wali kelas.')
  if (!r.complete) fail('Belum semua mata pelajaran mengirim nilai.')
  if (r.last && r.students.some((p) => !p.card?.promotion)) fail('Isi keputusan kenaikan/kelulusan semua siswa.')
  return command(ctx, 'reports.submit', {}, async (tx, fx) => {
    let n = 0
    for (const p of r.students) {
      const c = await cardFor(tx, termId, p.studentId, homeroomId)
      if (c.status !== 'draft') continue
      const snap = await snapshot(tx, ctx, termId, p.studentId, homeroomId, c)
      await tx.update(reportCards).set({ status: 'submitted', snapshot: snap, submittedBy: s.id, submittedAt: ctx.now, returnNote: null, version: c.version + 1 }).where(eq(reportCards.id, c.id))
      n++
    }
    fx.audit('reports.submit', 'homeroom', homeroomId, { term: termId, cards: n })
    return n
  })
}

/** Curriculum approves submitted cards: snapshot is rebuilt and frozen as a new version. Not by the submitter. */
export async function approveCards(ctx: Ctx, homeroomId: string, termId: string) {
  const s = requireStaff(ctx, 'reports.review')
  return command(ctx, 'reports.approve', {}, async (tx, fx) => {
    const cards = await tx.select().from(reportCards).where(and(eq(reportCards.homeroomId, homeroomId), eq(reportCards.termId, termId), eq(reportCards.status, 'submitted'))).for('update')
    if (!cards.length) fail('Tidak ada rapor yang menunggu persetujuan.')
    if (cards.some((c) => c.submittedBy === s.id)) fail('Rapor yang Anda ajukan disetujui oleh petugas lain.')
    for (const c of cards) {
      const snap = await snapshot(tx, ctx, termId, c.studentId, homeroomId, c)
      const v = c.versionNo + 1
      await tx.insert(reportCardVersions).values({ reportCardId: c.id, versionNo: v, snapshot: snap, reason: v > 1 ? (c.returnNote ?? 'Perbaikan') : null, createdBy: s.id })
      await tx.update(reportCards).set({ status: 'approved', snapshot: snap, versionNo: v, approvedBy: s.id, approvedAt: ctx.now, version: c.version + 1 }).where(eq(reportCards.id, c.id))
    }
    fx.audit('reports.approve', 'homeroom', homeroomId, { term: termId, cards: cards.length })
    return cards.length
  })
}

/** Back to the homeroom teacher (submitted/approved → draft) with a note. */
export async function returnCards(ctx: Ctx, homeroomId: string, termId: string, note: string) {
  requireStaff(ctx, 'reports.review')
  if (!note.trim()) fail('Tuliskan catatan perbaikan.')
  await command(ctx, 'reports.return', {}, async (tx, fx) => {
    const cards = await tx.select().from(reportCards).where(and(eq(reportCards.homeroomId, homeroomId), eq(reportCards.termId, termId), inArray(reportCards.status, ['submitted', 'approved'])))
    for (const c of cards) await tx.update(reportCards).set({ status: 'draft', returnNote: note.trim(), version: c.version + 1 }).where(eq(reportCards.id, c.id))
    const h = await loadHomeroom(tx, homeroomId)
    if (h.h.homeroomTeacherId) fx.notify({ type: 'staff', id: h.h.homeroomTeacherId }, { title: `Rapor ${h.h.name} dikembalikan untuk perbaikan`, body: note.trim(), link: `/portal/staf/rapor/${homeroomId}?semester=${termId}` })
    fx.audit('reports.return', 'homeroom', homeroomId, { term: termId, cards: cards.length })
  })
}

/** Release approved cards: their latest version becomes visible to the student and guardians (academic access). */
export async function releaseCards(ctx: Ctx, homeroomId: string, termId: string) {
  const s = requireStaff(ctx, 'reports.release')
  return command(ctx, 'reports.release', {}, async (tx, fx) => {
    const cards = await tx.select().from(reportCards).where(and(eq(reportCards.homeroomId, homeroomId), eq(reportCards.termId, termId), eq(reportCards.status, 'approved'))).for('update')
    if (!cards.length) fail('Tidak ada rapor yang siap dirilis.')
    for (const c of cards) {
      await tx.update(reportCardVersions).set({ released: true }).where(and(eq(reportCardVersions.reportCardId, c.id), eq(reportCardVersions.versionNo, c.versionNo)))
      await tx.update(reportCards).set({ status: 'released', releasedBy: s.id, releasedAt: ctx.now, version: c.version + 1 }).where(eq(reportCards.id, c.id))
      const [st] = await tx.select({ accountId: students.accountId }).from(students).where(eq(students.id, c.studentId))
      const title = c.versionNo > 1 ? 'Rapor diperbarui' : 'Rapor sudah dapat dilihat'
      if (st?.accountId) fx.notify({ type: 'account', id: st.accountId }, { title, link: '/portal/keluarga/rapor' })
      const gs = await guardianAccounts(tx, [c.studentId], today(ctx.tz, ctx.now), { academic: true })
      for (const g of gs) if (g.accountId) fx.notify({ type: 'account', id: g.accountId }, { title, link: `/portal/keluarga/rapor?anak=${c.studentId}` })
    }
    fx.event('reports.released', { homeroomId, termId, count: cards.length })
    fx.audit('reports.release', 'homeroom', homeroomId, { term: termId, cards: cards.length })
    return cards.length
  })
}

/** Re-opens one released card for correction (reason kept); the released version stays visible until re-release. */
export async function reopenCard(ctx: Ctx, cardId: string, reason: string) {
  requireStaff(ctx, 'reports.review')
  if (reason.trim().length < 5) fail('Tuliskan alasan perbaikan rapor.')
  await command(ctx, 'reports.reopen', {}, async (tx, fx) => {
    const [c] = await tx.select().from(reportCards).where(eq(reportCards.id, cardId)).for('update')
    if (!c) notFound('Rapor')
    if (c!.status !== 'released' && c!.status !== 'approved') fail('Hanya rapor yang sudah disetujui/dirilis yang dibuka ulang.')
    await tx.update(reportCards).set({ status: 'draft', returnNote: reason.trim(), version: c!.version + 1 }).where(eq(reportCards.id, cardId))
    fx.audit('reports.reopen', 'student', c!.studentId, { term: c!.termId, reason: reason.trim().slice(0, 200) })
  })
}

/** Reviewer queue: homerooms with cards waiting for approval or release in a term. */
export async function reviewQueue(ctx: Ctx, termId: string) {
  requireStaff(ctx, 'reports.review', 'reports.release')
  return ctx.db
    .select({ homeroomId: reportCards.homeroomId, name: homerooms.name, status: reportCards.status, n: sql<number>`count(*)`.mapWith(Number) })
    .from(reportCards)
    .innerJoin(homerooms, eq(homerooms.id, reportCards.homeroomId))
    .where(eq(reportCards.termId, termId))
    .groupBy(reportCards.homeroomId, homerooms.name, reportCards.status)
    .orderBy(asc(homerooms.name))
}

/** Released versions of a student's report cards (family view), newest term first. */
export async function releasedReports(ctx: Ctx, studentId: string) {
  if (ctx.account && !(await visibleStudentIds(ctx, 'academic')).has(studentId)) forbidden()
  if (!ctx.account) {
    requireStaff(ctx)
    if (!hasPerm(ctx, 'reports.review', 'reports.release', 'academic.manage', 'students.read')) forbidden()
  }
  const rows = await ctx.db
    .select({ v: reportCardVersions, c: reportCards, term: terms.name, termStart: terms.startDate })
    .from(reportCardVersions)
    .innerJoin(reportCards, eq(reportCards.id, reportCardVersions.reportCardId))
    .innerJoin(terms, eq(terms.id, reportCards.termId))
    .where(and(eq(reportCards.studentId, studentId), eq(reportCardVersions.released, true)))
    .orderBy(desc(terms.startDate), desc(reportCardVersions.versionNo))
  const latest = new Map<string, (typeof rows)[number]>()
  for (const r of rows) if (!latest.has(r.c.id)) latest.set(r.c.id, r)
  return { latest: [...latest.values()], all: rows }
}

/** One version for printing: family (released only, own child) or staff with access to the homeroom. */
export async function reportVersion(ctx: Ctx, versionId: string) {
  const [r] = await ctx.db.select({ v: reportCardVersions, c: reportCards }).from(reportCardVersions).innerJoin(reportCards, eq(reportCards.id, reportCardVersions.reportCardId)).where(eq(reportCardVersions.id, versionId))
  if (!r) notFound('Rapor')
  if (ctx.account) {
    if (!r!.v.released || !(await visibleStudentIds(ctx, 'academic')).has(r!.c.studentId)) notFound('Rapor')
  } else {
    const h = await loadHomeroom(ctx.db, r!.c.homeroomId)
    if (!canSee(ctx, h)) forbidden()
  }
  return r!
}

/** Card preview for staff (current snapshot, any state). */
export async function cardPreview(ctx: Ctx, cardId: string) {
  const [c] = await ctx.db.select().from(reportCards).where(eq(reportCards.id, cardId))
  if (!c) notFound('Rapor')
  const h = await loadHomeroom(ctx.db, c!.homeroomId)
  if (!canSee(ctx, h)) forbidden()
  const snap = c!.snapshot ?? (await snapshot(ctx.db, ctx, c!.termId, c!.studentId, c!.homeroomId, c!))
  const versions = await ctx.db.select().from(reportCardVersions).where(eq(reportCardVersions.reportCardId, cardId)).orderBy(desc(reportCardVersions.versionNo))
  return { card: c!, snapshot: snap, versions }
}
