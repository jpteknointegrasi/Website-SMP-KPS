/**
 * Karya siswa ke website (Web↔App, addendum D). Teachers propose a student's work (title, description, images, a
 * public name). A guardian of the student consents in the portal — or the school records a written consent. Only
 * consented works are offered to the website, server-to-server (shared secret, not public), where they arrive as
 * DRAFTS for editorial moderation. Consent can be withdrawn at any time; the website then hides the work.
 */
import { and, desc, eq, inArray } from 'drizzle-orm'
import { files, persons, students, submissions, tasks, workProposals } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { fileAccess, IMAGES, saveFile } from '@/server/files'
import { today } from '@/server/time'
import { canTeach } from '../schedule/service'
import { guardianAccounts, isHomeroomTeacherOf, linkedChildren, visibleStudentIds } from '../scope'

export const CATEGORIES = { tulisan: 'Tulisan', seni: 'Seni', sains: 'Sains', teknologi: 'Teknologi', video: 'Video', proyek_sosial: 'Proyek sosial' } as const
export const STATUS = { awaiting_consent: 'Menunggu izin orang tua', consented: 'Diizinkan — menunggu moderasi website', imported: 'Masuk moderasi website', refused: 'Tidak diizinkan', withdrawn: 'Izin ditarik' } as const

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

fileAccess('work', async (ctx, f) => {
  const [w] = f.contextId ? await ctx.db.select().from(workProposals).where(eq(workProposals.id, f.contextId)) : []
  if (!w) return false
  if (ctx.staff) return w.proposedBy === ctx.staff.id || hasPerm(ctx, 'student_affairs', 'students.read')
  return (await visibleStudentIds(ctx)).has(w.studentId)
})

/** Teacher of the student (homeroom or a class they teach) or student affairs. */
async function mayPropose(ctx: Ctx, db: Db, studentId: string, submissionId: string | null) {
  if (hasPerm(ctx, 'student_affairs')) return true
  if (await isHomeroomTeacherOf(ctx, studentId, db)) return true
  if (submissionId) {
    const [s] = await db.select({ s: submissions, assignmentId: tasks.assignmentId }).from(submissions).innerJoin(tasks, eq(tasks.id, submissions.taskId)).where(eq(submissions.id, submissionId))
    return Boolean(s && s.s.studentId === studentId && (await canTeach(db, ctx, s.assignmentId)))
  }
  return false
}

export async function propose(
  ctx: Ctx,
  input: { studentId: string; title: string; category: string; description: string; publicName: string; mentorPublic: string | null; submissionId: string | null; fileIds: string[] },
  uploads: { name: string; buffer: Buffer }[],
) {
  const s = requireStaff(ctx)
  if (!input.title.trim() || input.description.trim().length < 20) fail('Isi judul dan deskripsi karya (min. 20 karakter).')
  if (!(input.category in CATEGORIES)) fail('Pilih kategori.')
  if (!input.publicName.trim()) fail('Isi nama publik (mis. "Alya P., kelas VII" atau "Siswa kelas VII").')
  if (input.fileIds.length + uploads.length > 6) fail('Maksimal 6 gambar.')
  return command(ctx, 'works.propose', {}, async (tx, fx) => {
    if (!(await mayPropose(ctx, tx, input.studentId, input.submissionId))) forbidden('Anda tidak membimbing siswa ini.')
    const id = crypto.randomUUID()
    const fileIds: string[] = []
    // images reused from the student's submission (same student, images only)
    if (input.fileIds.length) {
      const [sub] = input.submissionId ? await tx.select().from(submissions).where(eq(submissions.id, input.submissionId)) : []
      const allowed = new Set(sub?.studentId === input.studentId ? sub.fileIds : [])
      const rows = await tx.select().from(files).where(inArray(files.id, input.fileIds))
      for (const f of rows) {
        if (!allowed.has(f.id) || !IMAGE_MIMES.has(f.mime)) fail('Hanya gambar dari pengumpulan siswa ini yang dapat dipakai.')
        fileIds.push(f.id)
      }
    }
    for (const u of uploads) fileIds.push((await saveFile(ctx, tx, u, { allow: IMAGES, maxMb: 8, classification: 'private', contextType: 'work', contextId: id, label: 'Foto karya' })).id)
    await tx.insert(workProposals).values({
      id,
      studentId: input.studentId,
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      publicName: input.publicName.trim(),
      mentorPublic: input.mentorPublic?.trim() || null,
      year: Number(today(ctx.tz, ctx.now).slice(0, 4)),
      fileIds,
      sourceSubmissionId: input.submissionId,
      proposedBy: s.id,
    })
    for (const g of await guardianAccounts(tx, [input.studentId], today(ctx.tz, ctx.now)))
      fx.notify({ type: 'account', id: g.accountId }, { title: `Izin publikasi karya: ${input.title.trim()}`, link: `/portal/keluarga/karya?anak=${input.studentId}` })
    fx.audit('works.propose', 'work', id, { student: input.studentId })
    return id
  })
}

/** Guardian (linked) consents or refuses; staff with student affairs may record a written consent. */
export async function decideConsent(ctx: Ctx, id: string, approve: boolean, note: string | null) {
  await command(ctx, approve ? 'works.consent' : 'works.refuse', {}, async (tx, fx) => {
    const [w] = await tx.select().from(workProposals).where(eq(workProposals.id, id)).for('update')
    if (!w) notFound('Karya')
    let by: string
    if (ctx.account) {
      if (!(await linkedChildren(ctx, tx)).some((c) => c.studentId === w!.studentId)) forbidden('Izin diberikan oleh orang tua/wali siswa.')
      by = `account:${ctx.account.id}`
    } else {
      requireStaff(ctx, 'student_affairs')
      if (!approve) fail('Petugas hanya mencatat izin tertulis.')
      if (!note?.trim()) fail('Sebutkan bukti izin tertulis (mis. formulir tertanggal).')
      by = `staff:${ctx.staff!.id}:tertulis`
    }
    if (w!.status !== 'awaiting_consent') fail('Usulan ini sudah diputuskan.')
    await tx.update(workProposals).set({ status: approve ? 'consented' : 'refused', consentBy: by, consentAt: ctx.now, consentNote: note?.trim() || null, version: w!.version + 1 }).where(eq(workProposals.id, id))
    fx.notify({ type: 'staff', id: w!.proposedBy }, { title: `Karya "${w!.title}": ${approve ? 'diizinkan untuk website' : 'tidak diizinkan'}`, link: '/portal/staf/karya' })
    fx.audit(approve ? 'works.consent' : 'works.refuse', 'work', id)
  })
}

/** Guardian or student affairs withdraws consent; the website hides the work on its next sync. */
export async function withdraw(ctx: Ctx, id: string) {
  await command(ctx, 'works.withdraw', {}, async (tx, fx) => {
    const [w] = await tx.select().from(workProposals).where(eq(workProposals.id, id)).for('update')
    if (!w) notFound('Karya')
    const ok = ctx.account ? (await linkedChildren(ctx, tx)).some((c) => c.studentId === w!.studentId) : hasPerm(ctx, 'student_affairs')
    if (!ok) forbidden()
    if (!['consented', 'imported'].includes(w!.status)) fail('Tidak ada izin yang dapat ditarik.')
    await tx.update(workProposals).set({ status: 'withdrawn', withdrawnAt: ctx.now, version: w!.version + 1 }).where(eq(workProposals.id, id))
    fx.event('works.withdrawn', { workId: id })
    fx.audit('works.withdraw', 'work', id)
  })
}

const cols = { w: workProposals, name: persons.fullName }
export async function staffList(ctx: Ctx) {
  const s = requireStaff(ctx)
  return ctx.db
    .select(cols)
    .from(workProposals)
    .innerJoin(students, eq(students.id, workProposals.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(hasPerm(ctx, 'student_affairs') ? undefined : eq(workProposals.proposedBy, s.id))
    .orderBy(desc(workProposals.createdAt))
    .limit(200)
}
export async function familyList(ctx: Ctx, studentId: string) {
  if (!(await visibleStudentIds(ctx)).has(studentId)) forbidden()
  return ctx.db.select().from(workProposals).where(eq(workProposals.studentId, studentId)).orderBy(desc(workProposals.createdAt))
}

// ---------- server-to-server sync with the website ----------
/** Works the website may import (consented, not yet imported or still published) and withdrawn ones to hide. */
export async function syncFeed(db: Db) {
  const rows = await db.select().from(workProposals).where(inArray(workProposals.status, ['consented', 'imported', 'withdrawn']))
  return {
    works: rows
      .filter((w) => w.status !== 'withdrawn')
      .map((w) => ({ ref: w.id, title: w.title, category: w.category, description: w.description, publicName: w.publicName, mentorPublic: w.mentorPublic, year: w.year, images: w.fileIds, imported: w.status === 'imported' })),
    withdrawn: rows.filter((w) => w.status === 'withdrawn').map((w) => w.id),
  }
}
/** An image of a work the website may download (consented/imported works only). */
export async function syncImage(db: Db, workId: string, fileId: string) {
  const [w] = await db.select().from(workProposals).where(and(eq(workProposals.id, workId), inArray(workProposals.status, ['consented', 'imported'])))
  if (!w || !w.fileIds.includes(fileId)) return null
  const [f] = await db.select().from(files).where(eq(files.id, fileId))
  return f && !f.deletedAt && IMAGE_MIMES.has(f.mime) ? f : null
}
export async function markImported(db: Db, refs: string[]) {
  if (!refs.length) return 0
  const r = await db.update(workProposals).set({ status: 'imported', importedAt: new Date() }).where(and(inArray(workProposals.id, refs), eq(workProposals.status, 'consented'))).returning({ id: workProposals.id })
  return r.length
}
