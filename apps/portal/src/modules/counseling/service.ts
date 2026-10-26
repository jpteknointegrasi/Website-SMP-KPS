/**
 * M09 Bimbingan & Konseling (§13.3, §44.3) — restricted. Requests come from the student, a guardian, the homeroom
 * teacher or other teachers; counsellors take or are assigned cases; session notes are readable only by the
 * assigned counsellor and the BK coordinator (never by the school admin role). What may be shared is written as a
 * separate summary flagged for the guardian and/or the homeroom teacher. Requesters see the status of their request.
 */
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { counselingCases, counselingSessions, homerooms, persons, staffMembers, students } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, nextNumber, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { isDate, today } from '@/server/time'
import { isHomeroomTeacherOf, linkedChildren, ownStudent, placementOn } from '../scope'
import { sql } from 'drizzle-orm'

export const CATEGORIES = { pribadi: 'Pribadi', sosial: 'Sosial', belajar: 'Belajar', karier: 'Karier/studi lanjut', lainnya: 'Lainnya' } as const
export const STATUS = { new: 'Baru', assigned: 'Ditugaskan', in_progress: 'Berjalan', closed: 'Selesai' } as const
export const MODES = { tatap_muka: 'Tatap muka', daring: 'Daring', kunjungan: 'Kunjungan rumah', kelompok: 'Kelompok' } as const

const isCounselor = (ctx: Ctx) => hasPerm(ctx, 'counseling')
const isCoordinator = (ctx: Ctx) => hasPerm(ctx, 'counseling.coordinate')

/** Request by student (self), guardian (linked child), homeroom teacher or teacher (referral). */
export async function requestCase(ctx: Ctx, input: { studentId: string; category: string; urgency: string; request: string; preferredTime: string | null }) {
  if (!(input.category in CATEGORIES)) fail('Pilih kategori.')
  if (input.request.trim().length < 10) fail('Ceritakan singkat kebutuhan konseling (min. 10 karakter).')
  let source: string
  if (ctx.account) {
    const own = await ownStudent(ctx)
    if (own?.id === input.studentId) source = 'student'
    else if ((await linkedChildren(ctx)).some((c) => c.studentId === input.studentId)) source = 'guardian'
    else forbidden()
  } else {
    requireStaff(ctx)
    source = isCounselor(ctx) ? 'counselor' : (await isHomeroomTeacherOf(ctx, input.studentId)) ? 'homeroom' : hasPerm(ctx, 'teach', 'student_affairs') ? 'teacher' : ''
    if (!source) forbidden()
  }
  return command(ctx, 'counseling.request', {}, async (tx, fx) => {
    const n = await nextNumber(tx, `bk:${ctx.now.getUTCFullYear()}`)
    const ref = ctx.staff ? { type: 'staff', id: ctx.staff.id } : { type: 'account', id: ctx.account!.id }
    const [c] = await tx
      .insert(counselingCases)
      .values({ number: `BK-${ctx.now.getUTCFullYear()}-${String(n).padStart(4, '0')}`, studentId: input.studentId, source: source!, category: input.category, urgency: input.urgency === 'segera' ? 'segera' : 'normal', request: input.request.trim(), preferredTime: input.preferredTime, requestedByType: ref.type, requestedById: ref.id })
      .returning({ id: counselingCases.id })
    fx.event('counseling.requested', { caseId: c!.id, urgency: input.urgency })
    fx.audit('counseling.request', 'counseling_case', c!.id, { source: source! })
    return c!.id
  })
}

async function loadCase(db: Db, id: string) {
  const [c] = await db.select().from(counselingCases).where(eq(counselingCases.id, id))
  if (!c) notFound('Kasus')
  return c!
}
const canHandle = (ctx: Ctx, c: typeof counselingCases.$inferSelect) => isCoordinator(ctx) || (isCounselor(ctx) && c.assignedTo === ctx.staff?.id)

export async function takeCase(ctx: Ctx, id: string) {
  const s = requireStaff(ctx, 'counseling')
  await command(ctx, 'counseling.take', {}, async (tx, fx) => {
    const [c] = await tx.select().from(counselingCases).where(eq(counselingCases.id, id)).for('update')
    if (!c) notFound('Kasus')
    if (c!.assignedTo && c!.assignedTo !== s.id) fail('Kasus sudah ditangani konselor lain.')
    await tx.update(counselingCases).set({ assignedTo: s.id, status: 'assigned', version: c!.version + 1 }).where(eq(counselingCases.id, id))
    fx.audit('counseling.take', 'counseling_case', id)
  })
}

export async function assignCase(ctx: Ctx, id: string, counselorId: string) {
  requireStaff(ctx, 'counseling.coordinate')
  await command(ctx, 'counseling.assign', {}, async (tx, fx) => {
    const c = await loadCase(tx, id)
    if (c.status === 'closed') fail('Kasus sudah selesai.')
    const ok = await counselors(tx)
    if (!ok.some((x) => x.id === counselorId)) fail('Pilih guru BK.')
    await tx.update(counselingCases).set({ assignedTo: counselorId, status: c.status === 'new' ? 'assigned' : c.status, version: c.version + 1 }).where(eq(counselingCases.id, id))
    fx.notify({ type: 'staff', id: counselorId }, { title: `Kasus BK ${c.number} ditugaskan kepada Anda`, link: `/portal/staf/bk/${id}` })
    fx.audit('counseling.assign', 'counseling_case', id, { to: counselorId })
  })
}

/** Staff holding the BK roles (for assignment). */
export async function counselors(db: Db) {
  return db.execute<{ id: string; name: string }>(
    sql`SELECT DISTINCT s.id, coalesce(s.display_name, s.name) AS name FROM staff_members s JOIN staff_roles r ON r.staff_id = s.id AND r.revoked_at IS NULL WHERE s.active AND r.role IN ('bk', 'koordinator_bk') ORDER BY 2`,
  ).then((r) => r.rows)
}

export async function addSession(ctx: Ctx, caseId: string, input: { date: string; mode: string; notes: string | null; sharedSummary: string | null; shareWithGuardian: boolean; shareWithHomeroom: boolean; followUpOn: string | null }) {
  const s = requireStaff(ctx, 'counseling')
  if (!isDate(input.date) || input.date > today(ctx.tz, ctx.now)) fail('Tanggal sesi tidak valid.')
  if (!(input.mode in MODES)) fail('Pilih bentuk layanan.')
  if (input.followUpOn && !isDate(input.followUpOn)) fail('Tanggal tindak lanjut tidak valid.')
  if ((input.shareWithGuardian || input.shareWithHomeroom) && !input.sharedSummary?.trim()) fail('Tulis ringkasan yang boleh dibagikan.')
  await command(ctx, 'counseling.session', {}, async (tx, fx) => {
    const c = await loadCase(tx, caseId)
    if (!canHandle(ctx, c)) forbidden('Kasus ini tidak ditugaskan kepada Anda.')
    if (c.status === 'closed') fail('Kasus sudah selesai.')
    await tx.insert(counselingSessions).values({ caseId, date: input.date, mode: input.mode, notes: input.notes?.trim() || null, sharedSummary: input.sharedSummary?.trim() || null, shareWithGuardian: input.shareWithGuardian, shareWithHomeroom: input.shareWithHomeroom, followUpOn: input.followUpOn, counselorId: s.id })
    if (c.status !== 'in_progress') await tx.update(counselingCases).set({ status: 'in_progress', version: c.version + 1 }).where(eq(counselingCases.id, caseId))
    if (input.shareWithHomeroom) {
      const p = await placementOn(tx, c.studentId, input.date)
      const [h] = p ? await tx.select().from(homerooms).where(eq(homerooms.id, p.homeroomId)) : []
      if (h?.homeroomTeacherId) fx.notify({ type: 'staff', id: h.homeroomTeacherId }, { title: 'Ringkasan layanan BK untuk siswa perwalian Anda', link: `/portal/staf/bk/${caseId}` })
    }
    if (input.shareWithGuardian && c.requestedByType === 'account') fx.notify({ type: 'account', id: c.requestedById }, { title: `Pembaruan layanan BK ${c.number}`, link: '/portal/keluarga/bk' })
    // no content in audit/event: restricted
    fx.audit('counseling.session', 'counseling_case', caseId)
  })
}

export async function closeCase(ctx: Ctx, id: string, summary: string | null) {
  requireStaff(ctx, 'counseling')
  await command(ctx, 'counseling.close', {}, async (tx, fx) => {
    const c = await loadCase(tx, id)
    if (!canHandle(ctx, c)) forbidden()
    await tx.update(counselingCases).set({ status: 'closed', closedAt: ctx.now, closingSummary: summary?.trim() || null, version: c.version + 1 }).where(eq(counselingCases.id, id))
    if (c.requestedByType === 'account') fx.notify({ type: 'account', id: c.requestedById }, { title: `Layanan BK ${c.number} selesai`, link: '/portal/keluarga/bk' })
    fx.audit('counseling.close', 'counseling_case', id)
  })
}

const caseCols = { c: counselingCases, student: persons.fullName, nis: students.nis, counselor: sql<string | null>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` }
const caseQuery = (db: Db) =>
  db.select(caseCols).from(counselingCases).innerJoin(students, eq(students.id, counselingCases.studentId)).innerJoin(persons, eq(persons.id, students.personId)).leftJoin(staffMembers, eq(staffMembers.id, counselingCases.assignedTo))

/** Counsellor queue: unassigned new cases + own cases; coordinator sees all. */
export async function caseList(ctx: Ctx, filter: { status?: string } = {}) {
  const s = requireStaff(ctx, 'counseling')
  const scope = isCoordinator(ctx) ? undefined : or(isNull(counselingCases.assignedTo), eq(counselingCases.assignedTo, s.id))
  const st = filter.status === 'closed' ? eq(counselingCases.status, 'closed') : inArray(counselingCases.status, ['new', 'assigned', 'in_progress'])
  return caseQuery(ctx.db).where(and(scope, st)).orderBy(desc(sql`${counselingCases.urgency} = 'segera'`), asc(counselingCases.createdAt))
}

/**
 * Case view by role: handler (assigned counsellor/coordinator) sees everything; other counsellors see an unassigned
 * case's request only; the homeroom teacher sees summaries shared with homeroom for own students; the staff requester
 * sees the status of their referral.
 */
export async function caseView(ctx: Ctx, id: string) {
  requireStaff(ctx)
  const [row] = await caseQuery(ctx.db).where(eq(counselingCases.id, id))
  if (!row) notFound('Kasus')
  const c = row!.c
  const handler = canHandle(ctx, c)
  const peek = isCounselor(ctx) && !c.assignedTo
  const homeroom = await isHomeroomTeacherOf(ctx, c.studentId)
  const requester = c.requestedByType === 'staff' && c.requestedById === ctx.staff!.id
  if (!handler && !peek && !homeroom && !requester) forbidden()
  const sessions = await ctx.db.select({ s: counselingSessions, counselor: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` }).from(counselingSessions).innerJoin(staffMembers, eq(staffMembers.id, counselingSessions.counselorId)).where(eq(counselingSessions.caseId, id)).orderBy(desc(counselingSessions.date))
  const visible = handler ? sessions : homeroom ? sessions.filter((x) => x.s.shareWithHomeroom).map((x) => ({ ...x, s: { ...x.s, notes: null } })) : []
  return { ...row!, handler, peek, sessions: visible, sessionCount: sessions.length }
}

/** Family view: requests made by this account, plus the child's cases with summaries shared with guardians. */
export async function familyCases(ctx: Ctx, studentId: string) {
  if (!ctx.account) fail('Silakan masuk.', 'unauthenticated')
  const own = await ownStudent(ctx)
  const isGuardian = (await linkedChildren(ctx)).some((c) => c.studentId === studentId)
  if (own?.id !== studentId && !isGuardian) forbidden()
  const rows = await ctx.db.select().from(counselingCases).where(eq(counselingCases.studentId, studentId)).orderBy(desc(counselingCases.createdAt))
  const mine = rows.filter((c) => c.requestedByType === 'account' && c.requestedById === ctx.account!.id)
  const ids = rows.map((r) => r.id)
  const shared = isGuardian && ids.length ? await ctx.db.select().from(counselingSessions).where(and(inArray(counselingSessions.caseId, ids), eq(counselingSessions.shareWithGuardian, true))).orderBy(desc(counselingSessions.date)) : []
  const list = rows.filter((c) => mine.includes(c) || shared.some((s) => s.caseId === c.id))
  return list.map((c) => ({
    id: c.id,
    number: c.number,
    category: c.category,
    status: c.status,
    createdAt: c.createdAt,
    request: mine.includes(c) ? c.request : null,
    closingSummary: c.status === 'closed' && (mine.includes(c) || isGuardian) ? c.closingSummary : null,
    summaries: shared.filter((s) => s.caseId === c.id).map((s) => ({ date: s.date, text: s.sharedSummary })),
  }))
}

/** Cases of students in the homeroom teacher's classes that carry homeroom-shared summaries (for the teacher). */
export async function homeroomShared(ctx: Ctx) {
  const s = requireStaff(ctx)
  const rows = await caseQuery(ctx.db)
    .where(or(and(eq(counselingCases.requestedByType, 'staff'), eq(counselingCases.requestedById, s.id)), sql`EXISTS (SELECT 1 FROM counseling_sessions x WHERE x.case_id = ${counselingCases.id} AND x.share_with_homeroom)`))
    .orderBy(desc(counselingCases.createdAt))
  const out = []
  for (const r of rows) if ((r.c.requestedByType === 'staff' && r.c.requestedById === s.id) || (await isHomeroomTeacherOf(ctx, r.c.studentId))) out.push(r)
  return out
}
