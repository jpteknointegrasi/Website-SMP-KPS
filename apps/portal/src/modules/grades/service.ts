/**
 * M08 grade book (§42.3): assessment items per teaching assignment (formatif, sumatif, STS, SAS), scores, the term
 * result per student (computed from configurable weights, adjustable only with a reason) with a competency
 * description, and the teacher's submission of results to the homeroom teacher. Formative work informs feedback;
 * by default only summative kinds count toward the report score (Kurikulum Merdeka). No ranking is produced.
 */
import { and, asc, eq, inArray } from 'drizzle-orm'
import { gradeEntries, gradeItems, homerooms, resultSubmissions, subjectResults, taskReviews, tasks } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { getSetting, putSetting } from '@/server/settings'
import { today } from '@/server/time'
import { canTeach } from '../schedule/service'
import { loadAssignment } from '../learning/service'
import { homeroomStudents } from '../scope'

export const KINDS = { formatif: 'Formatif', sumatif: 'Sumatif lingkup materi', sts: 'Sumatif tengah semester', sas: 'Sumatif akhir semester' } as const
export type Kind = keyof typeof KINDS
export type GradingConfig = { weights: Record<Kind, number>; passMark: number }
export const DEFAULT_GRADING: GradingConfig = { weights: { formatif: 0, sumatif: 60, sts: 20, sas: 20 }, passMark: 75 }

export async function gradingConfig(db: Db): Promise<GradingConfig> {
  const c = await getSetting(db, 'grading', DEFAULT_GRADING)
  return { passMark: c.passMark, weights: { ...DEFAULT_GRADING.weights, ...c.weights } }
}
export async function saveGradingConfig(ctx: Ctx, c: GradingConfig) {
  const s = requireStaff(ctx, 'academic.manage')
  const sum = Object.values(c.weights).reduce((a, b) => a + b, 0)
  if (Object.values(c.weights).some((w) => !(w >= 0 && w <= 100)) || sum <= 0) fail('Bobot 0–100 dan minimal satu jenis berbobot.')
  if (!(c.passMark >= 0 && c.passMark <= 100)) fail('KKTP 0–100.')
  await command(ctx, 'grades.config', {}, async (tx, fx) => {
    await putSetting(tx, 'grading', c, s.id)
    fx.audit('grades.config', 'settings', 'grading', { ...c.weights, passMark: c.passMark })
  })
}

async function assertTeacher(db: Db, ctx: Ctx, assignmentId: string) {
  if (!(await canTeach(db, ctx, assignmentId))) forbidden('Anda tidak mengampu kelas/mapel ini.')
}
async function submission(db: Db, assignmentId: string) {
  const [s] = await db.select().from(resultSubmissions).where(eq(resultSubmissions.assignmentId, assignmentId))
  return s ?? null
}
async function assertEditable(db: Db, assignmentId: string) {
  const s = await submission(db, assignmentId)
  if (s?.status === 'submitted') fail('Nilai sudah dikirim ke wali kelas. Minta dikembalikan bila perlu perubahan.')
}

/** Weighted result: average of percentages per kind (item weights), combined over kinds that have scores. */
export function compute(items: { id: string; kind: string; maxScore: number; weight: number }[], scores: Map<string, number | null>, cfg: GradingConfig) {
  let total = 0
  let wsum = 0
  for (const kind of Object.keys(KINDS) as Kind[]) {
    const w = cfg.weights[kind]
    if (!w) continue
    let s = 0
    let iw = 0
    for (const it of items.filter((i) => i.kind === kind)) {
      const v = scores.get(it.id)
      if (v === null || v === undefined) continue
      s += (v / it.maxScore) * 100 * it.weight
      iw += it.weight
    }
    if (!iw) continue
    total += (s / iw) * w
    wsum += w
  }
  return wsum ? Math.round((total / wsum) * 100) / 100 : null
}

/** Teacher's grade book: students × items with scores, computed and stored results, submission state. */
export async function gradebook(ctx: Ctx, assignmentId: string) {
  await assertTeacher(ctx.db, ctx, assignmentId)
  const a = await loadAssignment(ctx.db, assignmentId)
  const list = await homeroomStudents(ctx.db, a.a.homeroomId, today(ctx.tz, ctx.now))
  const items = await ctx.db.select().from(gradeItems).where(eq(gradeItems.assignmentId, assignmentId)).orderBy(asc(gradeItems.date), asc(gradeItems.createdAt))
  const entries = items.length ? await ctx.db.select().from(gradeEntries).where(inArray(gradeEntries.itemId, items.map((i) => i.id))) : []
  const results = await ctx.db.select().from(subjectResults).where(eq(subjectResults.assignmentId, assignmentId))
  const cfg = await gradingConfig(ctx.db)
  const rows = list.map((st) => {
    const sc = new Map<string, number | null>(entries.filter((e) => e.studentId === st.studentId).map((e) => [e.itemId, e.score === null ? null : Number(e.score)]))
    return { ...st, scores: sc, computed: compute(items, sc, cfg), result: results.find((r) => r.studentId === st.studentId) ?? null }
  })
  return { assignment: a, items, rows, cfg, submission: await submission(ctx.db, assignmentId) }
}

export async function saveItem(ctx: Ctx, input: { id?: string | null; assignmentId: string; kind: string; title: string; date: string | null; maxScore: number; weight: number }) {
  const s = requireStaff(ctx)
  if (!(input.kind in KINDS)) fail('Jenis penilaian tidak dikenal.')
  if (!input.title.trim()) fail('Isi nama penilaian.')
  if (!(input.maxScore > 0 && input.maxScore <= 1000) || !(input.weight >= 1 && input.weight <= 10)) fail('Nilai maksimum 1–1000, bobot 1–10.')
  return command(ctx, 'grades.item', {}, async (tx, fx) => {
    await assertTeacher(tx, ctx, input.assignmentId)
    await assertEditable(tx, input.assignmentId)
    const values = { kind: input.kind, title: input.title.trim(), date: input.date, maxScore: input.maxScore, weight: input.weight }
    let id = input.id
    if (id) {
      const [cur] = await tx.select().from(gradeItems).where(eq(gradeItems.id, id))
      if (!cur || cur.assignmentId !== input.assignmentId) notFound('Penilaian')
      await tx.update(gradeItems).set(values).where(eq(gradeItems.id, id))
    } else id = (await tx.insert(gradeItems).values({ ...values, assignmentId: input.assignmentId, createdBy: s.id }).returning({ id: gradeItems.id }))[0]!.id
    fx.audit('grades.item', 'teaching_assignment', input.assignmentId, { item: id, kind: input.kind })
    return id!
  })
}

export async function removeItem(ctx: Ctx, itemId: string) {
  requireStaff(ctx)
  await command(ctx, 'grades.item_remove', {}, async (tx, fx) => {
    const [it] = await tx.select().from(gradeItems).where(eq(gradeItems.id, itemId))
    if (!it) notFound('Penilaian')
    await assertTeacher(tx, ctx, it!.assignmentId)
    await assertEditable(tx, it!.assignmentId)
    await tx.delete(gradeItems).where(eq(gradeItems.id, itemId))
    fx.audit('grades.item_remove', 'teaching_assignment', it!.assignmentId, { item: itemId, title: it!.title })
  })
}

/** Saves scores of one item (blank = not assessed). Only students of the class, 0..max. */
export async function saveScores(ctx: Ctx, itemId: string, rows: { studentId: string; score: number | null }[]) {
  const s = requireStaff(ctx)
  return command(ctx, 'grades.scores', {}, async (tx, fx) => {
    const [it] = await tx.select().from(gradeItems).where(eq(gradeItems.id, itemId))
    if (!it) notFound('Penilaian')
    await assertTeacher(tx, ctx, it!.assignmentId)
    await assertEditable(tx, it!.assignmentId)
    const a = await loadAssignment(tx, it!.assignmentId)
    const members = new Set((await homeroomStudents(tx, a.a.homeroomId, today(ctx.tz, ctx.now))).map((x) => x.studentId))
    let n = 0
    for (const r of rows) {
      if (!members.has(r.studentId)) fail('Ada siswa yang bukan anggota kelas ini.')
      if (r.score !== null && !(r.score >= 0 && r.score <= it!.maxScore)) fail(`Nilai harus 0–${it!.maxScore}.`)
      const [cur] = await tx.select().from(gradeEntries).where(and(eq(gradeEntries.itemId, itemId), eq(gradeEntries.studentId, r.studentId)))
      const v = r.score === null ? null : String(r.score)
      if (cur && cur.score === v) continue
      if (cur) await tx.update(gradeEntries).set({ score: v, enteredBy: s.id, enteredAt: ctx.now }).where(eq(gradeEntries.id, cur.id))
      else if (v !== null) await tx.insert(gradeEntries).values({ itemId, studentId: r.studentId, score: v, enteredBy: s.id })
      else continue
      n++
    }
    fx.audit('grades.scores', 'teaching_assignment', it!.assignmentId, { item: itemId, changed: n })
    return n
  })
}

/** Creates a formative/summative item from a reviewed learning task, copying its scores. */
export async function importTask(ctx: Ctx, assignmentId: string, taskId: string, kind: string) {
  const s = requireStaff(ctx)
  if (!(kind in KINDS)) fail('Jenis penilaian tidak dikenal.')
  return command(ctx, 'grades.import_task', {}, async (tx, fx) => {
    await assertTeacher(tx, ctx, assignmentId)
    await assertEditable(tx, assignmentId)
    const [t] = await tx.select().from(tasks).where(eq(tasks.id, taskId))
    if (!t || t.assignmentId !== assignmentId) notFound('Tugas')
    const [dup] = await tx.select().from(gradeItems).where(and(eq(gradeItems.assignmentId, assignmentId), eq(gradeItems.taskId, taskId)))
    if (dup) fail('Tugas ini sudah dimasukkan ke buku nilai.')
    const [it] = await tx.insert(gradeItems).values({ assignmentId, kind, title: t!.title, date: t!.dueAt ? t!.dueAt.toISOString().slice(0, 10) : null, maxScore: t!.maxScore, weight: 1, taskId, createdBy: s.id }).returning({ id: gradeItems.id })
    const revs = await tx.select().from(taskReviews).where(eq(taskReviews.taskId, taskId))
    for (const r of revs) if (r.score !== null) await tx.insert(gradeEntries).values({ itemId: it!.id, studentId: r.studentId, score: r.score, enteredBy: s.id })
    fx.audit('grades.import_task', 'teaching_assignment', assignmentId, { task: taskId, scores: revs.length })
    return it!.id
  })
}

/** Stores term results: final = computed unless adjusted (reason required); description per student. */
export async function saveResults(ctx: Ctx, assignmentId: string, rows: { studentId: string; finalScore: number | null; adjustReason: string | null; description: string | null }[]) {
  const s = requireStaff(ctx)
  const book = await gradebook(ctx, assignmentId)
  if (book.submission?.status === 'submitted') fail('Nilai sudah dikirim ke wali kelas.')
  await command(ctx, 'grades.results', {}, async (tx, fx) => {
    for (const r of rows) {
      const row = book.rows.find((x) => x.studentId === r.studentId)
      if (!row) fail('Ada siswa yang bukan anggota kelas ini.')
      const computed = row!.computed
      const final = r.finalScore ?? computed
      if (final !== null && !(final >= 0 && final <= 100)) fail('Nilai rapor 0–100.')
      const adjusted = final !== null && computed !== null && Math.abs(final - computed) >= 0.5
      if (adjusted && !r.adjustReason?.trim()) fail(`Tuliskan alasan penyesuaian nilai ${row!.name}.`)
      const values = { computed: computed === null ? null : String(computed), finalScore: final === null ? null : String(final), adjustReason: adjusted ? r.adjustReason!.trim() : null, description: r.description?.trim() || null, updatedBy: s.id, updatedAt: ctx.now }
      await tx
        .insert(subjectResults)
        .values({ assignmentId, studentId: r.studentId, ...values })
        .onConflictDoUpdate({ target: [subjectResults.assignmentId, subjectResults.studentId], set: values })
    }
    fx.audit('grades.results', 'teaching_assignment', assignmentId, { rows: rows.length })
  })
}

/** Teacher sends the class results to the homeroom teacher (complete: score + description for everyone). */
export async function submitResults(ctx: Ctx, assignmentId: string) {
  const s = requireStaff(ctx)
  const book = await gradebook(ctx, assignmentId)
  const missing = book.rows.filter((r) => !r.result?.finalScore || !r.result?.description)
  if (missing.length) fail(`Lengkapi nilai & deskripsi: ${missing.slice(0, 4).map((m) => m.name).join(', ')}${missing.length > 4 ? ` dan ${missing.length - 4} lainnya` : ''}.`)
  await command(ctx, 'grades.submit', {}, async (tx, fx) => {
    await tx
      .insert(resultSubmissions)
      .values({ assignmentId, submittedBy: s.id })
      .onConflictDoUpdate({ target: resultSubmissions.assignmentId, set: { status: 'submitted', submittedBy: s.id, submittedAt: ctx.now, returnedBy: null, returnedAt: null, returnNote: null } })
    const [h] = await tx.select().from(homerooms).where(eq(homerooms.id, book.assignment.a.homeroomId))
    if (h?.homeroomTeacherId && h.homeroomTeacherId !== s.id) fx.notify({ type: 'staff', id: h.homeroomTeacherId }, { title: `Nilai ${book.assignment.subject} ${h.name} sudah dikirim`, link: `/portal/staf/rapor/${h.id}` })
    fx.audit('grades.submit', 'teaching_assignment', assignmentId)
  })
}

/** Homeroom teacher of the class (or report reviewer) returns results to the teacher for correction. */
export async function returnResults(ctx: Ctx, assignmentId: string, note: string) {
  const s = requireStaff(ctx)
  if (!note.trim()) fail('Tuliskan apa yang perlu diperbaiki.')
  await command(ctx, 'grades.return', {}, async (tx, fx) => {
    const a = await loadAssignment(tx, assignmentId)
    const [h] = await tx.select().from(homerooms).where(eq(homerooms.id, a.a.homeroomId))
    if (h?.homeroomTeacherId !== s.id && !hasPerm(ctx, 'reports.review')) forbidden()
    const sub = await submission(tx, assignmentId)
    if (sub?.status !== 'submitted') fail('Nilai belum dikirim.')
    await tx.update(resultSubmissions).set({ status: 'returned', returnedBy: s.id, returnedAt: ctx.now, returnNote: note.trim() }).where(eq(resultSubmissions.assignmentId, assignmentId))
    fx.notify({ type: 'staff', id: a.a.teacherId }, { title: `Nilai ${a.subject} ${a.homeroom} dikembalikan`, body: note.trim(), link: `/portal/staf/nilai/${assignmentId}?tab=hasil` })
    fx.audit('grades.return', 'teaching_assignment', assignmentId)
  })
}

/** Reviewed tasks of the assignment not yet in the grade book (for "ambil dari tugas"). */
export async function importableTasks(ctx: Ctx, assignmentId: string) {
  const ts = await ctx.db.select().from(tasks).where(and(eq(tasks.assignmentId, assignmentId), inArray(tasks.status, ['published', 'closed'])))
  const used = new Set((await ctx.db.select({ t: gradeItems.taskId }).from(gradeItems).where(eq(gradeItems.assignmentId, assignmentId))).map((x) => x.t))
  return ts.filter((t) => !used.has(t.id))
}
