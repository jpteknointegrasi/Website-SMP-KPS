/**
 * M05/M06 materials, tasks, submissions and feedback (SIS-02 / GRU-02, §42.2). Teachers act on their own teaching
 * assignments; students see published content of their current homeroom & term; guardians see their children's
 * task status and feedback (read only). Submissions are versions; late is flagged, not hidden.
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { files, homerooms, materials, students, subjects, submissions, taskReviews, tasks, teachingAssignments, staffMembers } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { DOCS, fileAccess, IMAGES, saveFile } from '@/server/files'
import { today } from '@/server/time'
import { canTeach } from '../schedule/service'
import { currentTerm, homeroomStudents, ownStudent, placementOn, visibleStudentIds } from '../scope'

const ALLOW = [...DOCS, ...IMAGES, 'xlsx' as const]

async function assignment(db: Db, id: string) {
  const [a] = await db
    .select({ a: teachingAssignments, subject: subjects.name, homeroom: homerooms.name, teacher: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` })
    .from(teachingAssignments)
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(homerooms, eq(homerooms.id, teachingAssignments.homeroomId))
    .innerJoin(staffMembers, eq(staffMembers.id, teachingAssignments.teacherId))
    .where(eq(teachingAssignments.id, id))
  if (!a) notFound('Kelas/mapel')
  return a!
}
export const loadAssignment = assignment

async function assertTeacher(db: Db, ctx: Ctx, assignmentId: string) {
  if (!(await canTeach(db, ctx, assignmentId))) forbidden('Anda tidak mengajar kelas/mapel ini.')
}

/** Students currently placed in the assignment's homeroom (today). */
async function studentsOf(db: Db, ctx: Ctx, assignmentId: string) {
  const a = await assignment(db, assignmentId)
  return homeroomStudents(db, a.a.homeroomId, today(ctx.tz, ctx.now))
}

/** Is the signed-in student/guardian allowed to see content of this assignment (current homeroom, academic link)? */
async function familyCanSee(db: Db, ctx: Ctx, assignmentId: string) {
  if (!ctx.account) return false
  const a = await assignment(db, assignmentId)
  for (const sid of await visibleStudentIds(ctx, 'academic', db)) {
    const p = await placementOn(db, sid, today(ctx.tz, ctx.now))
    if (p?.homeroomId === a.a.homeroomId) return true
  }
  return false
}

fileAccess('material', async (ctx, f) => {
  const [m] = f.contextId ? await ctx.db.select().from(materials).where(eq(materials.id, f.contextId)) : []
  if (!m) return false
  if (ctx.staff) return canTeach(ctx.db, ctx, m.assignmentId)
  return m.status === 'published' && familyCanSee(ctx.db, ctx, m.assignmentId)
})
fileAccess('task', async (ctx, f) => {
  const [t] = f.contextId ? await ctx.db.select().from(tasks).where(eq(tasks.id, f.contextId)) : []
  if (!t) return false
  if (ctx.staff) return canTeach(ctx.db, ctx, t.assignmentId)
  return t.status !== 'draft' && familyCanSee(ctx.db, ctx, t.assignmentId)
})
fileAccess('submission', async (ctx, f) => {
  const [s] = f.contextId ? await ctx.db.select().from(submissions).where(eq(submissions.id, f.contextId)) : []
  if (!s) return false
  const [t] = await ctx.db.select().from(tasks).where(eq(tasks.id, s.taskId))
  if (ctx.staff) return canTeach(ctx.db, ctx, t!.assignmentId)
  return (await visibleStudentIds(ctx, 'academic')).has(s.studentId)
})

// ---------- materials ----------
export async function saveMaterial(ctx: Ctx, input: { id?: string | null; assignmentId: string; title: string; unit: string | null; body: string | null; links: string[]; publish: boolean }, uploads: { name: string; buffer: Buffer }[]) {
  const s = requireStaff(ctx)
  if (!input.title.trim()) fail('Isi judul materi.')
  for (const l of input.links) if (!/^https:\/\/[^\s]+$/.test(l)) fail(`Tautan harus https:// (${l.slice(0, 40)}).`)
  return command(ctx, 'learning.material', {}, async (tx, fx) => {
    await assertTeacher(tx, ctx, input.assignmentId)
    const id = input.id ?? crypto.randomUUID()
    const [cur] = input.id ? await tx.select().from(materials).where(eq(materials.id, input.id)) : []
    if (input.id && (!cur || cur.assignmentId !== input.assignmentId)) notFound('Materi')
    const fileIds = [...(cur?.fileIds ?? [])]
    for (const u of uploads) fileIds.push((await saveFile(ctx, tx, u, { allow: ALLOW, maxMb: 10, classification: 'private', contextType: 'material', contextId: id, label: 'Lampiran' })).id)
    const values = { title: input.title.trim(), unit: input.unit, body: input.body, links: input.links, fileIds, status: input.publish ? 'published' : (cur?.status ?? 'draft'), publishedAt: input.publish ? (cur?.publishedAt ?? ctx.now) : (cur?.publishedAt ?? null) }
    if (cur) await tx.update(materials).set(values).where(eq(materials.id, id))
    else await tx.insert(materials).values({ id, assignmentId: input.assignmentId, createdBy: s.id, ...values })
    fx.audit('learning.material', 'teaching_assignment', input.assignmentId, { material: id, published: input.publish })
    return id
  })
}

export async function materialsOf(ctx: Ctx, assignmentId: string) {
  const teacher = Boolean(ctx.staff) && (await canTeach(ctx.db, ctx, assignmentId))
  if (!teacher && !(await familyCanSee(ctx.db, ctx, assignmentId))) forbidden()
  return ctx.db.select().from(materials).where(and(eq(materials.assignmentId, assignmentId), teacher ? undefined : eq(materials.status, 'published'))).orderBy(desc(materials.createdAt))
}

// ---------- tasks ----------
export async function saveTask(
  ctx: Ctx,
  input: { id?: string | null; assignmentId: string; title: string; kind: string; instructions: string | null; dueAt: Date | null; maxScore: number; allowLate: boolean; submissionType: string; publish: boolean },
  uploads: { name: string; buffer: Buffer }[],
) {
  const s = requireStaff(ctx)
  if (!input.title.trim()) fail('Isi judul tugas.')
  if (!['tugas', 'kuis', 'proyek', 'ulangan'].includes(input.kind)) fail('Jenis tugas tidak dikenal.')
  if (!(input.maxScore > 0 && input.maxScore <= 1000)) fail('Nilai maksimum 1–1000.')
  return command(ctx, 'learning.task', {}, async (tx, fx) => {
    await assertTeacher(tx, ctx, input.assignmentId)
    const id = input.id ?? crypto.randomUUID()
    const [cur] = input.id ? await tx.select().from(tasks).where(eq(tasks.id, input.id)) : []
    if (input.id && (!cur || cur.assignmentId !== input.assignmentId)) notFound('Tugas')
    const fileIds = [...(cur?.fileIds ?? [])]
    for (const u of uploads) fileIds.push((await saveFile(ctx, tx, u, { allow: ALLOW, maxMb: 10, classification: 'private', contextType: 'task', contextId: id, label: 'Lampiran' })).id)
    const values = {
      title: input.title.trim(),
      kind: input.kind,
      instructions: input.instructions,
      dueAt: input.dueAt,
      maxScore: input.maxScore,
      allowLate: input.allowLate,
      submissionType: input.submissionType === 'none' ? 'none' : 'file_or_text',
      fileIds,
      status: input.publish ? 'published' : (cur?.status ?? 'draft'),
      publishedAt: input.publish ? (cur?.publishedAt ?? ctx.now) : (cur?.publishedAt ?? null),
    }
    if (cur) await tx.update(tasks).set({ ...values, version: cur.version + 1 }).where(eq(tasks.id, id))
    else await tx.insert(tasks).values({ id, assignmentId: input.assignmentId, createdBy: s.id, ...values })
    if (input.publish && cur?.status !== 'published') {
      const a = await assignment(tx, input.assignmentId)
      for (const st of await homeroomStudents(tx, a.a.homeroomId, today(ctx.tz, ctx.now))) {
        const [acc] = await tx.select({ accountId: students.accountId }).from(students).where(eq(students.id, st.studentId))
        if (acc?.accountId) fx.notify({ type: 'account', id: acc.accountId }, { title: `Tugas baru ${a.subject}: ${input.title.trim()}`, link: `/portal/keluarga/tugas/${id}` })
      }
    }
    fx.audit('learning.task', 'teaching_assignment', input.assignmentId, { task: id, published: input.publish })
    return id
  })
}

export async function closeTask(ctx: Ctx, id: string) {
  requireStaff(ctx)
  await command(ctx, 'learning.task_close', {}, async (tx, fx) => {
    const [t] = await tx.select().from(tasks).where(eq(tasks.id, id))
    if (!t) notFound('Tugas')
    await assertTeacher(tx, ctx, t!.assignmentId)
    await tx.update(tasks).set({ status: 'closed' }).where(eq(tasks.id, id))
    fx.audit('learning.task_close', 'task', id)
  })
}

export async function tasksOf(ctx: Ctx, assignmentId: string) {
  const teacher = Boolean(ctx.staff) && (await canTeach(ctx.db, ctx, assignmentId))
  if (!teacher && !(await familyCanSee(ctx.db, ctx, assignmentId))) forbidden()
  const rows = await ctx.db.select().from(tasks).where(and(eq(tasks.assignmentId, assignmentId), teacher ? undefined : sql`${tasks.status} <> 'draft'`)).orderBy(desc(tasks.createdAt))
  if (!teacher) return rows.map((t) => ({ ...t, submitted: 0, reviewed: 0, total: 0 }))
  const total = (await studentsOf(ctx.db, ctx, assignmentId)).length
  const ids = rows.map((r) => r.id)
  const sub = ids.length ? await ctx.db.select({ taskId: submissions.taskId, n: sql<number>`count(DISTINCT ${submissions.studentId})`.mapWith(Number) }).from(submissions).where(inArray(submissions.taskId, ids)).groupBy(submissions.taskId) : []
  const rev = ids.length ? await ctx.db.select({ taskId: taskReviews.taskId, n: sql<number>`count(*)`.mapWith(Number) }).from(taskReviews).where(inArray(taskReviews.taskId, ids)).groupBy(taskReviews.taskId) : []
  return rows.map((t) => ({ ...t, submitted: sub.find((x) => x.taskId === t.id)?.n ?? 0, reviewed: rev.find((x) => x.taskId === t.id)?.n ?? 0, total }))
}

/** Teacher view of one task: every student of the class with latest submission and review. */
export async function taskBoard(ctx: Ctx, taskId: string) {
  const [t] = await ctx.db.select().from(tasks).where(eq(tasks.id, taskId))
  if (!t) notFound('Tugas')
  await assertTeacher(ctx.db, ctx, t!.assignmentId)
  const a = await assignment(ctx.db, t!.assignmentId)
  const list = await studentsOf(ctx.db, ctx, t!.assignmentId)
  const subs = await ctx.db.select().from(submissions).where(eq(submissions.taskId, taskId)).orderBy(desc(submissions.versionNo))
  const revs = await ctx.db.select().from(taskReviews).where(eq(taskReviews.taskId, taskId))
  const fileRows = subs.flatMap((s) => s.fileIds).length ? await ctx.db.select().from(files).where(inArray(files.id, subs.flatMap((s) => s.fileIds))) : []
  return {
    task: t!,
    assignment: a,
    rows: list.map((st) => ({ ...st, submission: subs.find((s) => s.studentId === st.studentId) ?? null, versions: subs.filter((s) => s.studentId === st.studentId).length, review: revs.find((r) => r.studentId === st.studentId) ?? null })),
    files: fileRows,
  }
}

export async function reviewSubmission(ctx: Ctx, taskId: string, studentId: string, r: { score: number | null; feedback: string | null; needsRevision: boolean }) {
  const s = requireStaff(ctx)
  await command(ctx, 'learning.review', {}, async (tx, fx) => {
    const [t] = await tx.select().from(tasks).where(eq(tasks.id, taskId))
    if (!t) notFound('Tugas')
    await assertTeacher(tx, ctx, t!.assignmentId)
    if (r.score !== null && !(r.score >= 0 && r.score <= t!.maxScore)) fail(`Nilai 0–${t!.maxScore}.`)
    if (r.needsRevision && !r.feedback?.trim()) fail('Tuliskan umpan balik untuk revisi.')
    const allowed = (await studentsOf(tx, ctx, t!.assignmentId)).some((x) => x.studentId === studentId)
    if (!allowed) fail('Siswa bukan anggota kelas ini.')
    await tx
      .insert(taskReviews)
      .values({ taskId, studentId, score: r.score === null ? null : String(r.score), feedback: r.feedback, status: r.needsRevision ? 'needs_revision' : 'returned', reviewedBy: s.id })
      .onConflictDoUpdate({ target: [taskReviews.taskId, taskReviews.studentId], set: { score: r.score === null ? null : String(r.score), feedback: r.feedback, status: r.needsRevision ? 'needs_revision' : 'returned', reviewedBy: s.id, reviewedAt: ctx.now } })
    const [acc] = await tx.select({ accountId: students.accountId }).from(students).where(eq(students.id, studentId))
    if (acc?.accountId) fx.notify({ type: 'account', id: acc.accountId }, { title: `${r.needsRevision ? 'Perlu revisi' : 'Tugas dinilai'}: ${t!.title}`, link: `/portal/keluarga/tugas/${taskId}` })
    fx.audit('learning.review', 'task', taskId, { student: studentId })
  })
}

// ---------- student side ----------
/** Student submits (new version). Only the student's own account; guardians cannot submit for the child. */
export async function submitTask(ctx: Ctx, taskId: string, text: string | null, uploads: { name: string; buffer: Buffer }[]) {
  const own = await ownStudent(ctx)
  if (!own) fail('Pengumpulan tugas dilakukan dari akun siswa.', 'forbidden')
  if (!text?.trim() && !uploads.length) fail('Isi jawaban atau lampirkan berkas.')
  return command(ctx, 'learning.submit', {}, async (tx, fx) => {
    const [t] = await tx.select().from(tasks).where(eq(tasks.id, taskId))
    if (!t || t.status === 'draft') notFound('Tugas')
    if (t!.submissionType === 'none') fail('Tugas ini dikumpulkan langsung di kelas.')
    if (t!.status === 'closed') fail('Tugas sudah ditutup guru.')
    if (!(await familyCanSee(tx, ctx, t!.assignmentId))) forbidden()
    const late = Boolean(t!.dueAt && ctx.now > t!.dueAt)
    if (late && !t!.allowLate) fail('Batas waktu pengumpulan sudah lewat.')
    const [rev] = await tx.select().from(taskReviews).where(and(eq(taskReviews.taskId, taskId), eq(taskReviews.studentId, own!.id)))
    if (rev && rev.status === 'returned') fail('Tugas sudah dinilai. Hubungi guru bila perlu mengumpulkan ulang.')
    const [last] = await tx.select({ v: sql<number>`coalesce(max(${submissions.versionNo}), 0)`.mapWith(Number) }).from(submissions).where(and(eq(submissions.taskId, taskId), eq(submissions.studentId, own!.id)))
    const id = crypto.randomUUID()
    const fileIds: string[] = []
    for (const u of uploads) fileIds.push((await saveFile(ctx, tx, u, { allow: ALLOW, maxMb: 10, classification: 'private', contextType: 'submission', contextId: id, label: 'Berkas tugas' })).id)
    await tx.insert(submissions).values({ id, taskId, studentId: own!.id, versionNo: (last?.v ?? 0) + 1, text: text?.trim() || null, fileIds, late, submittedBy: ctx.account!.id })
    fx.event('learning.submission_received', { taskId, studentId: own!.id })
    fx.audit('learning.submit', 'task', taskId, { version: (last?.v ?? 0) + 1, late })
    return { version: (last?.v ?? 0) + 1, late }
  })
}

export type StudentTask = Awaited<ReturnType<typeof tasksForStudent>>[number]
/** Published tasks of the student's current homeroom & term with personal status (for student and guardians). */
export async function tasksForStudent(ctx: Ctx, studentId: string) {
  if (!(await visibleStudentIds(ctx, 'academic')).has(studentId) && !hasPerm(ctx, 'teach', 'academic.manage')) forbidden()
  const p = await placementOn(ctx.db, studentId, today(ctx.tz, ctx.now))
  const term = await currentTerm(ctx)
  if (!p || !term) return []
  const rows = await ctx.db
    .select({ t: tasks, subject: subjects.name })
    .from(tasks)
    .innerJoin(teachingAssignments, eq(teachingAssignments.id, tasks.assignmentId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .where(and(eq(teachingAssignments.homeroomId, p.homeroomId), eq(teachingAssignments.termId, term.id), sql`${tasks.status} <> 'draft'`))
    .orderBy(asc(tasks.dueAt))
  const ids = rows.map((r) => r.t.id)
  const subs = ids.length ? await ctx.db.select().from(submissions).where(and(inArray(submissions.taskId, ids), eq(submissions.studentId, studentId))).orderBy(desc(submissions.versionNo)) : []
  const revs = ids.length ? await ctx.db.select().from(taskReviews).where(and(inArray(taskReviews.taskId, ids), eq(taskReviews.studentId, studentId))) : []
  return rows.map((r) => {
    const sub = subs.find((s) => s.taskId === r.t.id) ?? null
    const rev = revs.find((x) => x.taskId === r.t.id) ?? null
    const overdue = !sub && r.t.dueAt && ctx.now > r.t.dueAt
    const state = rev ? (rev.status === 'needs_revision' ? 'revisi' : 'dinilai') : sub ? 'terkumpul' : r.t.submissionType === 'none' ? 'di_kelas' : overdue ? 'terlambat' : 'belum'
    return { ...r, submission: sub, review: rev, state }
  })
}

export async function taskForStudent(ctx: Ctx, taskId: string, studentId: string) {
  const all = await tasksForStudent(ctx, studentId)
  const t = all.find((x) => x.t.id === taskId)
  if (!t) notFound('Tugas')
  const history = await ctx.db.select().from(submissions).where(and(eq(submissions.taskId, taskId), eq(submissions.studentId, studentId))).orderBy(desc(submissions.versionNo))
  const fileIds = [...t!.t.fileIds, ...history.flatMap((h) => h.fileIds)]
  const fileRows = fileIds.length ? await ctx.db.select().from(files).where(inArray(files.id, fileIds)) : []
  return { ...t!, history, files: fileRows }
}

/** Teacher's classes this term (GRU-01 "Kelas & mapel saya"). */
export async function myClasses(ctx: Ctx) {
  requireStaff(ctx)
  const term = await currentTerm(ctx)
  if (!term) return []
  return ctx.db
    .select({ a: teachingAssignments, subject: subjects.name, homeroom: homerooms.name, students: sql<number>`(SELECT count(*) FROM class_placements p JOIN enrollments e ON e.id = p.enrollment_id WHERE p.homeroom_id = ${teachingAssignments.homeroomId} AND p.valid_to IS NULL AND e.status <> 'ended')`.mapWith(Number) })
    .from(teachingAssignments)
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(homerooms, eq(homerooms.id, teachingAssignments.homeroomId))
    .where(and(eq(teachingAssignments.teacherId, ctx.staff!.id), eq(teachingAssignments.termId, term.id), eq(teachingAssignments.active, true)))
    .orderBy(asc(homerooms.name), asc(subjects.name))
}

