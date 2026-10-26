/**
 * Selection (§19.6): sessions with capacity, assessors and participants (verified applications only), attendance,
 * scores per component (draft → submitted → locked; changes after lock create a new revision with a reason).
 * Assessors only see participants and components of sessions they are assigned to; notes stay internal.
 */
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { admissionPaths, applications, persons, selectionScores, selectionSessions, sessionAssessors, sessionParticipants, staffMembers } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { loadCycle } from './config'

export async function createSession(ctx: Ctx, input: { cycleId: string; pathId: string | null; title: string; kind: string; startsAt: Date; endsAt: Date; location: string; capacity: number; instructions: string | null; assessors: string[] }) {
  const s = requireStaff(ctx, 'admissions.manage')
  if (!input.title.trim() || !input.location.trim()) fail('Isi judul dan tempat sesi.')
  if (input.endsAt <= input.startsAt) fail('Waktu selesai harus setelah waktu mulai.')
  if (!(input.capacity > 0)) fail('Kapasitas minimal 1.')
  return command(ctx, 'admissions.session_create', {}, async (tx, fx) => {
    const c = await loadCycle(tx, input.cycleId)
    if (!c) notFound('Periode')
    if (!c!.selectionEnabled) fail('Periode ini tanpa seleksi.')
    // an assessor cannot be in two overlapping sessions
    for (const st of input.assessors) await assertAssessorFree(tx, st, input.startsAt, input.endsAt, null)
    const [row] = await tx
      .insert(selectionSessions)
      .values({ cycleId: input.cycleId, pathId: input.pathId, title: input.title.trim(), kind: input.kind, startsAt: input.startsAt, endsAt: input.endsAt, location: input.location.trim(), capacity: input.capacity, instructions: input.instructions, createdBy: s.id })
      .returning({ id: selectionSessions.id })
    for (const st of new Set(input.assessors)) await tx.insert(sessionAssessors).values({ sessionId: row!.id, staffId: st })
    fx.audit('admissions.session_create', 'admission_cycle', input.cycleId, { session: row!.id })
    return row!.id
  })
}

async function assertAssessorFree(tx: Db, staffId: string, start: Date, end: Date, exceptSession: string | null) {
  const clash = await tx
    .select({ id: selectionSessions.id, title: selectionSessions.title })
    .from(sessionAssessors)
    .innerJoin(selectionSessions, eq(selectionSessions.id, sessionAssessors.sessionId))
    .where(and(eq(sessionAssessors.staffId, staffId), ne(selectionSessions.status, 'cancelled'), sql`${selectionSessions.startsAt} < ${end}`, sql`${selectionSessions.endsAt} > ${start}`, exceptSession ? ne(selectionSessions.id, exceptSession) : undefined))
  if (clash.length) fail(`Penilai sudah bertugas di sesi lain pada waktu yang sama (${clash[0]!.title}).`)
}

export async function addParticipants(ctx: Ctx, sessionId: string, applicationIds: string[]) {
  requireStaff(ctx, 'admissions.manage')
  if (!applicationIds.length) fail('Pilih pendaftar.')
  return command(ctx, 'admissions.session_participants', {}, async (tx, fx) => {
    const [s] = await tx.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId)).for('update')
    if (!s || s.status !== 'scheduled') fail('Sesi tidak aktif.')
    const apps = await tx.select().from(applications).where(and(inArray(applications.id, applicationIds), eq(applications.cycleId, s!.cycleId)))
    const [cur] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(sessionParticipants).where(and(eq(sessionParticipants.sessionId, sessionId), inArray(sessionParticipants.state, ['scheduled', 'confirmed', 'attended', 'no_show'])))
    let n = cur!.n
    let added = 0
    for (const a of apps) {
      if (a.status !== 'verified') continue
      if (s!.pathId && a.pathId !== s!.pathId) continue
      // a participant cannot be in two overlapping sessions
      const [clash] = await tx
        .select({ id: sessionParticipants.id })
        .from(sessionParticipants)
        .innerJoin(selectionSessions, eq(selectionSessions.id, sessionParticipants.sessionId))
        .where(and(eq(sessionParticipants.applicationId, a.id), inArray(sessionParticipants.state, ['scheduled', 'confirmed']), sql`${selectionSessions.startsAt} < ${s!.endsAt}`, sql`${selectionSessions.endsAt} > ${s!.startsAt}`))
      if (clash) continue
      if (n >= s!.capacity) fail(`Kapasitas sesi penuh (${s!.capacity}).`)
      const ins = await tx.insert(sessionParticipants).values({ sessionId, applicationId: a.id }).onConflictDoNothing().returning({ id: sessionParticipants.id })
      if (ins.length) {
        n++
        added++
        fx.notify({ type: 'account', id: a.ownerAccountId }, { title: `Jadwal seleksi ${a.registrationNo}`, body: 'Jadwal seleksi sudah tersedia di portal.', link: `/portal/keluarga/penerimaan/${a.id}` })
      }
    }
    fx.audit('admissions.session_participants', 'admission_cycle', s!.cycleId, { session: sessionId, added })
    return added
  })
}

/** Attendance: attended / no_show / rescheduled / cancelled (with note). No-show never means "not accepted" by itself. */
export async function setParticipantState(ctx: Ctx, participantId: string, state: string, note: string | null) {
  const allowed = ['confirmed', 'attended', 'no_show', 'rescheduled', 'cancelled']
  if (!allowed.includes(state)) fail('Status tidak dikenal.')
  if ((state === 'rescheduled' || state === 'cancelled' || state === 'no_show') && !note?.trim()) fail('Tuliskan keterangan.')
  await command(ctx, 'admissions.participant_state', {}, async (tx, fx) => {
    const [p] = await tx.select({ p: sessionParticipants, s: selectionSessions }).from(sessionParticipants).innerJoin(selectionSessions, eq(selectionSessions.id, sessionParticipants.sessionId)).where(eq(sessionParticipants.id, participantId))
    if (!p) notFound('Peserta')
    if (!hasPerm(ctx, 'admissions.manage') && !(await isAssessor(tx, ctx, p!.s.id))) forbidden()
    await tx.update(sessionParticipants).set({ state, note: note?.trim() || p!.p.note, updatedAt: ctx.now }).where(eq(sessionParticipants.id, participantId))
    fx.audit('admissions.participant_state', 'application', p!.p.applicationId, { state })
  })
}

async function isAssessor(db: Db, ctx: Ctx, sessionId: string) {
  if (!ctx.staff) return false
  const [r] = await db.select({ id: sessionAssessors.id }).from(sessionAssessors).where(and(eq(sessionAssessors.sessionId, sessionId), eq(sessionAssessors.staffId, ctx.staff.id)))
  return Boolean(r)
}

/** Score entry by an assigned assessor for an attended participant. Locked scores cannot be overwritten. */
export async function enterScore(ctx: Ctx, input: { applicationId: string; sessionId: string; component: string; score: number; note: string | null; submit: boolean }) {
  const s = requireStaff(ctx, 'admissions.assess')
  await command(ctx, 'admissions.score', {}, async (tx, fx) => {
    if (!(await isAssessor(tx, ctx, input.sessionId))) forbidden('Anda tidak ditugaskan menilai sesi ini.')
    const [p] = await tx.select().from(sessionParticipants).where(and(eq(sessionParticipants.sessionId, input.sessionId), eq(sessionParticipants.applicationId, input.applicationId), inArray(sessionParticipants.state, ['attended', 'confirmed', 'scheduled'])))
    if (!p) fail('Pendaftar bukan peserta sesi ini.')
    if (p!.state !== 'attended') fail('Tandai peserta hadir sebelum mengisi nilai.')
    const a = (await tx.select().from(applications).where(eq(applications.id, input.applicationId)))[0]!
    const [path] = await tx.select().from(admissionPaths).where(eq(admissionPaths.id, a.pathId))
    const comp = path!.components.find((c) => c.code === input.component)
    if (!comp) fail('Komponen penilaian tidak dikenal.')
    if (!(input.score >= 0 && input.score <= comp!.max)) fail(`Nilai ${comp!.label} 0–${comp!.max}.`)
    const [cur] = await tx
      .select()
      .from(selectionScores)
      .where(and(eq(selectionScores.applicationId, input.applicationId), eq(selectionScores.component, input.component), eq(selectionScores.assessorId, s.id), ne(selectionScores.status, 'superseded')))
      .for('update')
    if (cur && cur.status === 'locked') fail('Nilai sudah dikunci. Perubahan melalui panitia.')
    const status = input.submit ? 'submitted' : 'draft'
    if (cur) await tx.update(selectionScores).set({ score: String(input.score), note: input.note, status, updatedAt: ctx.now }).where(eq(selectionScores.id, cur.id))
    else await tx.insert(selectionScores).values({ applicationId: input.applicationId, component: input.component, assessorId: s.id, score: String(input.score), note: input.note, status })
    fx.audit(input.submit ? 'admissions.score_submit' : 'admissions.score_draft', 'application', input.applicationId, { component: input.component })
  })
}

/** Locks all submitted scores of a session (moderation done). */
export async function lockSessionScores(ctx: Ctx, sessionId: string) {
  const s = requireStaff(ctx, 'admissions.manage')
  return command(ctx, 'admissions.scores_lock', {}, async (tx, fx) => {
    const apps = (await tx.select({ id: sessionParticipants.applicationId }).from(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId))).map((r) => r.id)
    if (!apps.length) return 0
    const assessors = (await tx.select({ id: sessionAssessors.staffId }).from(sessionAssessors).where(eq(sessionAssessors.sessionId, sessionId))).map((r) => r.id)
    const r = await tx
      .update(selectionScores)
      .set({ status: 'locked', lockedBy: s.id, lockedAt: ctx.now })
      .where(and(inArray(selectionScores.applicationId, apps), inArray(selectionScores.assessorId, assessors), eq(selectionScores.status, 'submitted')))
      .returning({ id: selectionScores.id })
    await tx.update(selectionSessions).set({ status: 'done' }).where(eq(selectionSessions.id, sessionId))
    fx.audit('admissions.scores_lock', 'selection_session', sessionId, { locked: r.length })
    return r.length
  })
}

/** Correction after lock: old score superseded, new locked revision with reason (moderator). */
export async function correctScore(ctx: Ctx, scoreId: string, score: number, reason: string) {
  const s = requireStaff(ctx, 'admissions.manage')
  if (reason.trim().length < 5) fail('Tuliskan alasan koreksi nilai.')
  await command(ctx, 'admissions.score_correct', {}, async (tx, fx) => {
    const [cur] = await tx.select().from(selectionScores).where(eq(selectionScores.id, scoreId)).for('update')
    if (!cur || cur.status !== 'locked') fail('Hanya nilai terkunci yang dikoreksi lewat jalur ini.')
    await tx.update(selectionScores).set({ status: 'superseded' }).where(eq(selectionScores.id, scoreId))
    await tx.insert(selectionScores).values({ applicationId: cur!.applicationId, component: cur!.component, assessorId: cur!.assessorId, score: String(score), note: `${cur!.note ? `${cur!.note}\n` : ''}Koreksi: ${reason.trim()}`, status: 'locked', revision: cur!.revision + 1, lockedBy: s.id, lockedAt: ctx.now })
    fx.audit('admissions.score_correct', 'application', cur!.applicationId, { component: cur!.component })
  })
}

/** Weighted total 0–100 from LOCKED scores (average over assessors per component). Null when incomplete. */
export async function scoreSummary(db: Db, applicationIds: string[]) {
  if (!applicationIds.length) return new Map<string, { total: number | null; parts: Record<string, number> }>()
  const rows = await db
    .select({ applicationId: selectionScores.applicationId, component: selectionScores.component, avg: sql<number>`avg(${selectionScores.score})`.mapWith(Number) })
    .from(selectionScores)
    .where(and(inArray(selectionScores.applicationId, applicationIds), eq(selectionScores.status, 'locked')))
    .groupBy(selectionScores.applicationId, selectionScores.component)
  const apps = await db.select({ id: applications.id, components: admissionPaths.components }).from(applications).innerJoin(admissionPaths, eq(admissionPaths.id, applications.pathId)).where(inArray(applications.id, applicationIds))
  const out = new Map<string, { total: number | null; parts: Record<string, number> }>()
  for (const a of apps) {
    const parts: Record<string, number> = {}
    for (const r of rows.filter((x) => x.applicationId === a.id)) parts[r.component] = Math.round(r.avg * 100) / 100
    const comps = a.components
    const complete = comps.length > 0 && comps.every((c) => c.code in parts)
    const wsum = comps.reduce((x, c) => x + c.weight, 0)
    const total = complete && wsum > 0 ? Math.round((comps.reduce((x, c) => x + (parts[c.code]! / c.max) * c.weight, 0) / wsum) * 10000) / 100 : null
    out.set(a.id, { total, parts })
  }
  return out
}

export async function sessionsOf(ctx: Ctx, cycleId: string) {
  requireStaff(ctx, 'admissions.manage', 'admissions.assess', 'admissions.verify')
  const sessions = await ctx.db.select().from(selectionSessions).where(eq(selectionSessions.cycleId, cycleId)).orderBy(asc(selectionSessions.startsAt))
  const ids = sessions.map((s) => s.id)
  const assessors = ids.length
    ? await ctx.db.select({ sessionId: sessionAssessors.sessionId, staffId: sessionAssessors.staffId, name: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` }).from(sessionAssessors).innerJoin(staffMembers, eq(staffMembers.id, sessionAssessors.staffId)).where(inArray(sessionAssessors.sessionId, ids))
    : []
  const counts = ids.length
    ? await ctx.db.select({ sessionId: sessionParticipants.sessionId, n: sql<number>`count(*)`.mapWith(Number) }).from(sessionParticipants).where(and(inArray(sessionParticipants.sessionId, ids), inArray(sessionParticipants.state, ['scheduled', 'confirmed', 'attended', 'no_show']))).groupBy(sessionParticipants.sessionId)
    : []
  const visible = hasPerm(ctx, 'admissions.manage', 'admissions.verify') ? sessions : sessions.filter((s) => assessors.some((a) => a.sessionId === s.id && a.staffId === ctx.staff!.id))
  return visible.map((s) => ({ ...s, assessors: assessors.filter((a) => a.sessionId === s.id), participants: counts.find((c) => c.sessionId === s.id)?.n ?? 0 }))
}

/** Session sheet for an assessor/manager: participants with this assessor's scores (others' only for managers). */
export async function sessionSheet(ctx: Ctx, sessionId: string) {
  const [s] = await ctx.db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId))
  if (!s) notFound('Sesi')
  const manager = hasPerm(ctx, 'admissions.manage')
  if (!manager && !(await isAssessor(ctx.db, ctx, sessionId))) forbidden('Anda tidak ditugaskan pada sesi ini.')
  const people = await ctx.db
    .select({ p: sessionParticipants, regNo: applications.registrationNo, name: persons.fullName, pathId: applications.pathId })
    .from(sessionParticipants)
    .innerJoin(applications, eq(applications.id, sessionParticipants.applicationId))
    .innerJoin(persons, eq(persons.id, applications.applicantPersonId))
    .where(and(eq(sessionParticipants.sessionId, sessionId), ne(sessionParticipants.state, 'cancelled')))
    .orderBy(asc(applications.registrationNo))
  const appIds = people.map((p) => p.p.applicationId)
  const scores = appIds.length
    ? await ctx.db.select().from(selectionScores).where(and(inArray(selectionScores.applicationId, appIds), ne(selectionScores.status, 'superseded'), manager ? undefined : eq(selectionScores.assessorId, ctx.staff!.id)))
    : []
  const paths = await ctx.db.select().from(admissionPaths).where(eq(admissionPaths.cycleId, s!.cycleId))
  return { session: s!, people, scores, paths, manager }
}
