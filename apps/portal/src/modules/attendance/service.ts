/**
 * M07 attendance & leave (ATT-01, §42.3): daily attendance by the homeroom teacher, per-lesson attendance by the
 * teacher, leave requests from guardians (approved by the homeroom teacher, applied to the days), and corrections
 * after the edit window that need a reviewer. Every change is audited; old values are kept in the correction record.
 */
import { and, asc, between, count, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import { attendanceCorrections, dailyAttendance, homerooms, leaveRequests, lessonAttendance, lessonSessions, persons, students } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { DOCS, fileAccess, saveFile } from '@/server/files'
import { addDays, isDate, today, weekday } from '@/server/time'
import { homeroomStudents, isHomeroomTeacherOf, linkedChildren, placementOn, visibleStudentIds } from '../scope'
import { canTeach } from '../schedule/service'

export const STATUSES = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Tanpa keterangan', D: 'Dispensasi' } as const
export type AttStatus = keyof typeof STATUSES
export const EDIT_DAYS = 7

const isStatus = (s: string): s is AttStatus => s in STATUSES

async function isHomeroomTeacher(db: Db, ctx: Ctx, homeroomId: string) {
  if (!ctx.staff) return false
  const [h] = await db.select({ t: homerooms.homeroomTeacherId }).from(homerooms).where(eq(homerooms.id, homeroomId))
  return h?.t === ctx.staff.id
}

/** Students of a homeroom with their status on a date; approved leave pre-fills S/I. */
export async function homeroomDay(ctx: Ctx, homeroomId: string, date: string) {
  if (!(await isHomeroomTeacher(ctx.db, ctx, homeroomId)) && !hasPerm(ctx, 'academic.manage', 'students.read')) forbidden('Anda bukan wali kelas rombel ini.')
  const list = await homeroomStudents(ctx.db, homeroomId, date)
  const ids = list.map((s) => s.studentId)
  const rows = ids.length ? await ctx.db.select().from(dailyAttendance).where(and(eq(dailyAttendance.date, date), inArray(dailyAttendance.studentId, ids))) : []
  const leaves = ids.length ? await ctx.db.select().from(leaveRequests).where(and(inArray(leaveRequests.studentId, ids), lte(leaveRequests.fromDate, date), gte(leaveRequests.toDate, date), inArray(leaveRequests.status, ['submitted', 'approved']))) : []
  return list.map((s) => ({ ...s, record: rows.find((r) => r.studentId === s.studentId) ?? null, leave: leaves.find((l) => l.studentId === s.studentId) ?? null }))
}

/** Saves daily attendance within the edit window (homeroom teacher or curriculum staff). */
export async function saveDaily(ctx: Ctx, homeroomId: string, date: string, entries: { studentId: string; status: string; note: string | null }[]) {
  const s = requireStaff(ctx)
  if (!isDate(date)) fail('Tanggal tidak valid.')
  const d = today(ctx.tz, ctx.now)
  if (date > d) fail('Presensi tidak dapat diisi untuk tanggal mendatang.')
  const manager = hasPerm(ctx, 'academic.manage')
  if (date < addDays(d, -EDIT_DAYS) && !manager) fail(`Lewat ${EDIT_DAYS} hari: ajukan koreksi presensi.`)
  const wd = weekday(date)
  if (wd === 0) fail('Hari Minggu bukan hari sekolah.')
  return command(ctx, 'attendance.daily', {}, async (tx, fx) => {
    if (!(await isHomeroomTeacher(tx, ctx, homeroomId)) && !manager) forbidden('Anda bukan wali kelas rombel ini.')
    const allowed = new Set((await homeroomStudents(tx, homeroomId, date)).map((x) => x.studentId))
    let n = 0
    for (const e of entries) {
      if (!allowed.has(e.studentId)) continue
      if (!isStatus(e.status)) fail('Status presensi tidak dikenal.')
      const [cur] = await tx.select().from(dailyAttendance).where(and(eq(dailyAttendance.date, date), eq(dailyAttendance.studentId, e.studentId))).for('update')
      if (cur && cur.status === e.status && (cur.note ?? null) === (e.note ?? null)) continue
      if (cur) await tx.update(dailyAttendance).set({ status: e.status, note: e.note, recordedBy: s.id, recordedAt: ctx.now, version: cur.version + 1, source: 'homeroom' }).where(eq(dailyAttendance.id, cur.id))
      else await tx.insert(dailyAttendance).values({ date, studentId: e.studentId, homeroomId, status: e.status, note: e.note, recordedBy: s.id })
      n++
    }
    fx.audit('attendance.daily', 'homeroom', homeroomId, { date, changed: n })
    return n
  })
}

export async function saveLessonAttendance(ctx: Ctx, sessionId: string, entries: { studentId: string; status: string; note: string | null }[]) {
  const s = requireStaff(ctx)
  return command(ctx, 'attendance.lesson', {}, async (tx, fx) => {
    const [ls] = await tx.select().from(lessonSessions).where(eq(lessonSessions.id, sessionId))
    if (!ls) notFound('Sesi')
    if (!(await canTeach(tx, ctx, ls!.assignmentId, { date: ls!.date, homeroomId: ls!.homeroomId, entryId: ls!.entryId }))) forbidden()
    const allowed = new Set((await homeroomStudents(tx, ls!.homeroomId, ls!.date)).map((x) => x.studentId))
    for (const e of entries) {
      if (!allowed.has(e.studentId) || !isStatus(e.status)) continue
      await tx
        .insert(lessonAttendance)
        .values({ sessionId, studentId: e.studentId, status: e.status, note: e.note, recordedBy: s.id })
        .onConflictDoUpdate({ target: [lessonAttendance.sessionId, lessonAttendance.studentId], set: { status: e.status, note: e.note, recordedBy: s.id, recordedAt: ctx.now } })
    }
    fx.audit('attendance.lesson', 'lesson', sessionId, { count: entries.length })
  })
}

export async function lessonRoll(ctx: Ctx, sessionId: string) {
  const [ls] = await ctx.db.select().from(lessonSessions).where(eq(lessonSessions.id, sessionId))
  if (!ls) notFound('Sesi')
  if (!(await canTeach(ctx.db, ctx, ls!.assignmentId, { date: ls!.date, homeroomId: ls!.homeroomId, entryId: ls!.entryId }))) forbidden()
  const list = await homeroomStudents(ctx.db, ls!.homeroomId, ls!.date)
  const rows = await ctx.db.select().from(lessonAttendance).where(eq(lessonAttendance.sessionId, sessionId))
  const daily = list.length ? await ctx.db.select().from(dailyAttendance).where(and(eq(dailyAttendance.date, ls!.date), inArray(dailyAttendance.studentId, list.map((s) => s.studentId)))) : []
  return list.map((s) => ({ ...s, record: rows.find((r) => r.studentId === s.studentId) ?? null, daily: daily.find((r) => r.studentId === s.studentId)?.status ?? null }))
}

// ---------- leave ----------
fileAccess('leave', async (ctx, f) => {
  if (!f.contextId) return false
  const [l] = await ctx.db.select().from(leaveRequests).where(eq(leaveRequests.id, f.contextId))
  if (!l) return false
  if (hasPerm(ctx, 'academic.manage', 'student_affairs')) return true
  if (ctx.staff) {
    const p = await placementOn(ctx.db, l.studentId, l.fromDate)
    return Boolean(p && (await isHomeroomTeacher(ctx.db, ctx, p.homeroomId)))
  }
  return (await visibleStudentIds(ctx, 'academic')).has(l.studentId)
})

/** Guardian (linked, academic permission) asks for sick/permission leave for a child. */
export async function requestLeave(ctx: Ctx, input: { studentId: string; kind: string; fromDate: string; toDate: string; reason: string; file: { name: string; buffer: Buffer } | null }) {
  if (!ctx.account) fail('Masuk sebagai orang tua/wali.', 'unauthenticated')
  const kids = await linkedChildren(ctx)
  if (!kids.some((k) => k.studentId === input.studentId && k.canViewAcademic)) forbidden('Anda tidak dapat mengajukan izin untuk siswa ini.')
  if (!['sakit', 'izin', 'dispensasi'].includes(input.kind)) fail('Pilih jenis izin.')
  if (!isDate(input.fromDate) || !isDate(input.toDate) || input.toDate < input.fromDate) fail('Tanggal izin tidak valid.')
  if (input.reason.trim().length < 5) fail('Tuliskan keterangan.')
  const d = today(ctx.tz, ctx.now)
  if (input.fromDate < addDays(d, -EDIT_DAYS)) fail(`Izin paling lambat ${EDIT_DAYS} hari setelah tanggal tidak masuk.`)
  if (input.toDate > addDays(input.fromDate, 30)) fail('Izin maksimal 30 hari; hubungi wali kelas untuk kebutuhan lebih panjang.')
  return command(ctx, 'leave.request', {}, async (tx, fx) => {
    const id = crypto.randomUUID()
    const f = input.file ? await saveFile(ctx, tx, input.file, { allow: DOCS, maxMb: 4, classification: 'restricted', contextType: 'leave', contextId: id, label: 'Surat/bukti' }) : null
    await tx.insert(leaveRequests).values({ id, studentId: input.studentId, kind: input.kind, fromDate: input.fromDate, toDate: input.toDate, reason: input.reason.trim(), fileId: f?.id ?? null, requestedByType: 'account', requestedById: ctx.account!.id })
    const p = await placementOn(tx, input.studentId, input.fromDate)
    if (p) {
      const [h] = await tx.select().from(homerooms).where(eq(homerooms.id, p.homeroomId))
      if (h?.homeroomTeacherId) fx.notify({ type: 'staff', id: h.homeroomTeacherId }, { title: `Pengajuan ${input.kind} dari orang tua (${h.name})`, link: '/portal/staf/presensi?tab=izin' })
    }
    fx.audit('leave.request', 'student', input.studentId, { kind: input.kind })
    return id
  })
}

/** Homeroom teacher decides; approval writes S/I/D on each school day of the range (source = leave). */
export async function decideLeave(ctx: Ctx, id: string, approve: boolean, note: string | null) {
  const s = requireStaff(ctx)
  await command(ctx, 'leave.decide', {}, async (tx, fx) => {
    const [l] = await tx.select().from(leaveRequests).where(eq(leaveRequests.id, id)).for('update')
    if (!l || l.status !== 'submitted') fail('Pengajuan sudah diproses.')
    const p = await placementOn(tx, l!.studentId, l!.fromDate)
    if (!(p && (await isHomeroomTeacher(tx, ctx, p.homeroomId))) && !hasPerm(ctx, 'academic.manage')) forbidden('Hanya wali kelas yang memutuskan izin ini.')
    if (!approve && !note?.trim()) fail('Tuliskan alasan penolakan.')
    await tx.update(leaveRequests).set({ status: approve ? 'approved' : 'rejected', reviewedBy: s.id, reviewedAt: ctx.now, reviewNote: note }).where(eq(leaveRequests.id, id))
    if (approve && p) {
      const code = l!.kind === 'sakit' ? 'S' : l!.kind === 'dispensasi' ? 'D' : 'I'
      for (let d = l!.fromDate; d <= l!.toDate; d = addDays(d, 1)) {
        if (weekday(d) === 0) continue
        const [cur] = await tx.select().from(dailyAttendance).where(and(eq(dailyAttendance.date, d), eq(dailyAttendance.studentId, l!.studentId)))
        if (cur) await tx.update(dailyAttendance).set({ status: code, source: 'leave', note: `Izin ${l!.kind}`, recordedBy: s.id, recordedAt: ctx.now, version: cur.version + 1 }).where(eq(dailyAttendance.id, cur.id))
        else await tx.insert(dailyAttendance).values({ date: d, studentId: l!.studentId, homeroomId: p.homeroomId, status: code, source: 'leave', note: `Izin ${l!.kind}`, recordedBy: s.id })
      }
    }
    if (l!.requestedByType === 'account') fx.notify({ type: 'account', id: l!.requestedById }, { title: `Pengajuan ${l!.kind} ${approve ? 'disetujui' : 'ditolak'}`, body: note ?? undefined, link: '/portal/keluarga/presensi' })
    fx.audit(approve ? 'leave.approve' : 'leave.reject', 'student', l!.studentId)
  })
}

export async function pendingLeaves(ctx: Ctx) {
  requireStaff(ctx)
  const rows = await ctx.db
    .select({ l: leaveRequests, name: persons.fullName })
    .from(leaveRequests)
    .innerJoin(students, eq(students.id, leaveRequests.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(leaveRequests.status, 'submitted'))
    .orderBy(asc(leaveRequests.createdAt))
  if (hasPerm(ctx, 'academic.manage')) return rows
  const out = []
  for (const r of rows) {
    const p = await placementOn(ctx.db, r.l.studentId, r.l.fromDate)
    if (p && (await isHomeroomTeacher(ctx.db, ctx, p.homeroomId))) out.push(r)
  }
  return out
}

// ---------- corrections ----------
export async function requestCorrection(ctx: Ctx, studentId: string, date: string, toStatus: string, reason: string) {
  if (!isDate(date) || !isStatus(toStatus)) fail('Data koreksi tidak valid.')
  if (reason.trim().length < 5) fail('Tuliskan alasan koreksi.')
  if (ctx.account) {
    if (!(await visibleStudentIds(ctx, 'academic')).has(studentId)) forbidden()
  } else requireStaff(ctx)
  await command(ctx, 'attendance.correction_request', {}, async (tx, fx) => {
    const [cur] = await tx.select().from(dailyAttendance).where(and(eq(dailyAttendance.date, date), eq(dailyAttendance.studentId, studentId)))
    await tx.insert(attendanceCorrections).values({ studentId, date, fromStatus: cur?.status ?? null, toStatus, reason: reason.trim(), requestedByType: ctx.staff ? 'staff' : 'account', requestedById: ctx.staff?.id ?? ctx.account!.id })
    fx.audit('attendance.correction_request', 'student', studentId, { date })
  })
}

export async function reviewCorrection(ctx: Ctx, id: string, approve: boolean, note: string | null) {
  const s = requireStaff(ctx, 'academic.manage')
  await command(ctx, 'attendance.correction_review', {}, async (tx, fx) => {
    const [c] = await tx.select().from(attendanceCorrections).where(eq(attendanceCorrections.id, id)).for('update')
    if (!c || c.status !== 'submitted') fail('Koreksi sudah diproses.')
    if (c!.requestedByType === 'staff' && c!.requestedById === s.id) fail('Koreksi Anda sendiri ditinjau petugas lain.')
    await tx.update(attendanceCorrections).set({ status: approve ? 'approved' : 'rejected', reviewedBy: s.id, reviewedAt: ctx.now, reviewNote: note }).where(eq(attendanceCorrections.id, id))
    if (approve) {
      const p = await placementOn(tx, c!.studentId, c!.date)
      const [cur] = await tx.select().from(dailyAttendance).where(and(eq(dailyAttendance.date, c!.date), eq(dailyAttendance.studentId, c!.studentId)))
      if (cur) await tx.update(dailyAttendance).set({ status: c!.toStatus, source: 'correction', recordedBy: s.id, recordedAt: ctx.now, version: cur.version + 1 }).where(eq(dailyAttendance.id, cur.id))
      else if (p) await tx.insert(dailyAttendance).values({ date: c!.date, studentId: c!.studentId, homeroomId: p.homeroomId, status: c!.toStatus, source: 'correction', recordedBy: s.id })
      fx.event('attendance.correction_applied', { studentId: c!.studentId, date: c!.date })
    }
    fx.audit(approve ? 'attendance.correction_approved' : 'attendance.correction_rejected', 'student', c!.studentId, { date: c!.date })
  })
}

export async function pendingCorrections(ctx: Ctx) {
  requireStaff(ctx, 'academic.manage')
  return ctx.db
    .select({ c: attendanceCorrections, name: persons.fullName })
    .from(attendanceCorrections)
    .innerJoin(students, eq(students.id, attendanceCorrections.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(attendanceCorrections.status, 'submitted'))
    .orderBy(asc(attendanceCorrections.createdAt))
}

// ---------- recap ----------
/** Counts per status between two dates (school days with a record). */
export async function recap(db: Db, studentId: string, from: string, to: string) {
  const rows = await db.select({ status: dailyAttendance.status, n: count() }).from(dailyAttendance).where(and(eq(dailyAttendance.studentId, studentId), between(dailyAttendance.date, from, to))).groupBy(dailyAttendance.status)
  const c = { H: 0, S: 0, I: 0, A: 0, D: 0 } as Record<AttStatus, number>
  for (const r of rows) if (isStatus(r.status)) c[r.status] = r.n
  const total = Object.values(c).reduce((a, b) => a + b, 0)
  return { ...c, total, rate: total ? Math.round(((c.H + c.D) / total) * 1000) / 10 : null }
}

export async function homeroomRecap(ctx: Ctx, homeroomId: string, from: string, to: string) {
  if (!(await isHomeroomTeacher(ctx.db, ctx, homeroomId)) && !hasPerm(ctx, 'academic.manage', 'students.read')) forbidden()
  const list = await homeroomStudents(ctx.db, homeroomId, to)
  return Promise.all(list.map(async (s) => ({ ...s, recap: await recap(ctx.db, s.studentId, from, to) })))
}

/** Staff reading one student's attendance: student-record or curriculum staff, or the student's homeroom teacher. */
async function assertStaffSeesStudent(ctx: Ctx, studentId: string) {
  requireStaff(ctx)
  if (!hasPerm(ctx, 'students.read', 'academic.manage') && !(await isHomeroomTeacherOf(ctx, studentId))) forbidden()
}
export async function studentDays(ctx: Ctx, studentId: string, from: string, to: string) {
  if (ctx.account && !(await visibleStudentIds(ctx, 'academic')).has(studentId)) forbidden()
  if (!ctx.account) await assertStaffSeesStudent(ctx, studentId)
  return ctx.db.select().from(dailyAttendance).where(and(eq(dailyAttendance.studentId, studentId), between(dailyAttendance.date, from, to))).orderBy(desc(dailyAttendance.date))
}
export async function studentLeaves(ctx: Ctx, studentId: string) {
  if (ctx.account && !(await visibleStudentIds(ctx, 'academic')).has(studentId)) forbidden()
  if (!ctx.account) await assertStaffSeesStudent(ctx, studentId)
  return ctx.db.select().from(leaveRequests).where(eq(leaveRequests.studentId, studentId)).orderBy(desc(leaveRequests.createdAt)).limit(30)
}
