/**
 * M11 kesiswaan (§44.5): achievements submitted by students, guardians or teachers and verified by student affairs
 * (verified achievements appear on the report card; only those with explicit public consent may go to the website),
 * and reports to student affairs (bullying, discipline, safety…) handled as a case: received → clarification ↔
 * information added → follow-up → closed, with internal notes kept from the reporter. A reporter may ask that their
 * identity is visible to the student-affairs coordinator only.
 */
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { achievements, affairsEvents, affairsReports, files, persons, students } from '@/db/schema'
import { actorName, hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, nextNumber, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { DOCS, fileAccess, IMAGES, saveFile } from '@/server/files'
import { isDate, today } from '@/server/time'
import { isHomeroomTeacherOf, visibleStudentIds } from '../scope'

export const LEVELS = { sekolah: 'Sekolah', kota: 'Kota/Kabupaten', provinsi: 'Provinsi', nasional: 'Nasional', internasional: 'Internasional' } as const
export const FIELDS = { akademik: 'Akademik', olahraga: 'Olahraga', seni: 'Seni & budaya', keagamaan: 'Keagamaan', lainnya: 'Lainnya' } as const
export const REPORT_CATEGORIES = { perundungan: 'Perundungan', kedisiplinan: 'Kedisiplinan', keamanan: 'Keamanan & keselamatan', sarana: 'Sarana prasarana', lainnya: 'Lainnya' } as const
export const REPORT_STATUS = { received: 'Diterima', clarification: 'Perlu klarifikasi', follow_up: 'Ditindaklanjuti', closed: 'Selesai' } as const

fileAccess('achievement', async (ctx, f) => {
  const [a] = f.contextId ? await ctx.db.select().from(achievements).where(eq(achievements.id, f.contextId)) : []
  if (!a) return false
  if (hasPerm(ctx, 'student_affairs')) return true
  if (ctx.staff) return isHomeroomTeacherOf(ctx, a.studentId)
  return (await visibleStudentIds(ctx)).has(a.studentId)
})
fileAccess('affairs', async (ctx, f) => {
  const [r] = f.contextId ? await ctx.db.select().from(affairsReports).where(eq(affairsReports.id, f.contextId)) : []
  if (!r) return false
  if (hasPerm(ctx, 'student_affairs')) return true
  return Boolean((ctx.account && r.reporterType === 'account' && r.reporterId === ctx.account.id) || (ctx.staff && r.reporterType === 'staff' && r.reporterId === ctx.staff.id))
})

// ---------- achievements ----------
export async function submitAchievement(ctx: Ctx, input: { studentId: string; title: string; field: string; level: string; rank: string | null; organizer: string | null; date: string; publicConsent: boolean; file: { name: string; buffer: Buffer } | null }) {
  if (!input.title.trim()) fail('Isi nama lomba/prestasi.')
  if (!(input.level in LEVELS)) fail('Pilih tingkat.')
  if (!isDate(input.date) || input.date > today(ctx.tz, ctx.now)) fail('Tanggal tidak valid.')
  if (ctx.account) {
    if (!(await visibleStudentIds(ctx)).has(input.studentId)) forbidden()
  } else {
    requireStaff(ctx)
    if (!hasPerm(ctx, 'student_affairs', 'activities.manage') && !(await isHomeroomTeacherOf(ctx, input.studentId))) forbidden()
  }
  return command(ctx, 'affairs.achievement', {}, async (tx, fx) => {
    const id = crypto.randomUUID()
    const f = input.file ? await saveFile(ctx, tx, input.file, { allow: [...DOCS, ...IMAGES], maxMb: 5, classification: 'private', contextType: 'achievement', contextId: id, label: 'Bukti prestasi' }) : null
    const by = ctx.staff ? { t: 'staff', id: ctx.staff.id } : { t: 'account', id: ctx.account!.id }
    const verified = Boolean(ctx.staff && hasPerm(ctx, 'student_affairs'))
    await tx.insert(achievements).values({
      id,
      studentId: input.studentId,
      title: input.title.trim(),
      field: input.field in FIELDS ? input.field : 'lainnya',
      level: input.level,
      rank: input.rank?.trim() || null,
      organizer: input.organizer?.trim() || null,
      date: input.date,
      evidenceFileId: f?.id ?? null,
      publicConsent: input.publicConsent,
      submittedByType: by.t,
      submittedById: by.id,
      status: verified ? 'verified' : 'submitted',
      reviewedBy: verified ? ctx.staff!.id : null,
      reviewedAt: verified ? ctx.now : null,
    })
    fx.audit('affairs.achievement', 'student', input.studentId, { id, verified })
    return id
  })
}

export async function reviewAchievement(ctx: Ctx, id: string, approve: boolean, note: string | null) {
  const s = requireStaff(ctx, 'student_affairs')
  if (!approve && !note?.trim()) fail('Tuliskan alasan.')
  await command(ctx, 'affairs.achievement_review', {}, async (tx, fx) => {
    const [a] = await tx.select().from(achievements).where(eq(achievements.id, id)).for('update')
    if (!a) notFound('Prestasi')
    await tx.update(achievements).set({ status: approve ? 'verified' : 'rejected', reviewedBy: s.id, reviewedAt: ctx.now, reviewNote: note }).where(eq(achievements.id, id))
    if (a!.submittedByType === 'account') fx.notify({ type: 'account', id: a!.submittedById }, { title: `Prestasi "${a!.title}" ${approve ? 'diverifikasi' : 'belum dapat diverifikasi'}`, body: note ?? undefined, link: '/portal/keluarga/kesiswaan' })
    if (approve && a!.publicConsent) fx.event('affairs.achievement_public', { achievementId: id })
    fx.audit(approve ? 'affairs.achievement_verify' : 'affairs.achievement_reject', 'student', a!.studentId, { id })
  })
}

const achCols = { a: achievements, name: persons.fullName, nis: students.nis }
export async function achievementList(ctx: Ctx, status?: string) {
  requireStaff(ctx, 'student_affairs')
  return ctx.db
    .select(achCols)
    .from(achievements)
    .innerJoin(students, eq(students.id, achievements.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(status ? eq(achievements.status, status) : undefined)
    .orderBy(desc(achievements.date))
    .limit(200)
}
export async function achievementsOf(ctx: Ctx, studentId: string) {
  if (ctx.account && !(await visibleStudentIds(ctx)).has(studentId)) forbidden()
  if (ctx.staff && !hasPerm(ctx, 'student_affairs', 'students.read') && !(await isHomeroomTeacherOf(ctx, studentId))) forbidden()
  return ctx.db.select().from(achievements).where(eq(achievements.studentId, studentId)).orderBy(desc(achievements.date))
}
/** Verified achievements with public consent (for the school website). Names only, no ids or documents. */
export async function publicAchievements(db: Db, limit = 20) {
  return db
    .select({ title: achievements.title, level: achievements.level, rank: achievements.rank, date: achievements.date, field: achievements.field, name: persons.fullName })
    .from(achievements)
    .innerJoin(students, eq(students.id, achievements.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(and(eq(achievements.status, 'verified'), eq(achievements.publicConsent, true)))
    .orderBy(desc(achievements.date))
    .limit(limit)
}

// ---------- reports ----------
export async function submitReport(ctx: Ctx, input: { category: string; description: string; occurredOn: string | null; location: string | null; hideIdentity: boolean; file: { name: string; buffer: Buffer } | null }) {
  if (!ctx.account && !ctx.staff) fail('Silakan masuk.', 'unauthenticated')
  if (!(input.category in REPORT_CATEGORIES)) fail('Pilih kategori.')
  if (input.description.trim().length < 15) fail('Ceritakan kejadian dengan lebih jelas (min. 15 karakter).')
  if (input.occurredOn && (!isDate(input.occurredOn) || input.occurredOn > today(ctx.tz, ctx.now))) fail('Tanggal kejadian tidak valid.')
  return command(ctx, 'affairs.report', {}, async (tx, fx) => {
    const id = crypto.randomUUID()
    const y = ctx.now.getUTCFullYear()
    const n = await nextNumber(tx, `laporan:${y}`)
    const fileIds = input.file ? [(await saveFile(ctx, tx, input.file, { allow: [...DOCS, ...IMAGES], maxMb: 5, classification: 'restricted', contextType: 'affairs', contextId: id, label: 'Lampiran laporan' })).id] : []
    await tx.insert(affairsReports).values({
      id,
      number: `LPR-${y}-${String(n).padStart(4, '0')}`,
      category: input.category,
      description: input.description.trim(),
      occurredOn: input.occurredOn,
      location: input.location?.trim() || null,
      reporterType: ctx.staff ? 'staff' : 'account',
      reporterId: ctx.staff?.id ?? ctx.account!.id,
      reporterName: actorName(ctx),
      hideIdentity: input.hideIdentity,
      fileIds,
    })
    await tx.insert(affairsEvents).values({ reportId: id, actorType: ctx.staff ? 'staff' : 'account', actorName: input.hideIdentity ? 'Pelapor' : actorName(ctx), action: 'received' })
    fx.event('affairs.report_received', { reportId: id, category: input.category })
    fx.audit('affairs.report', 'affairs_report', id, { category: input.category })
    return id
  })
}

export async function processReport(ctx: Ctx, id: string, action: 'assign' | 'clarification' | 'follow_up' | 'close' | 'note', note: string | null, opts: { assignee?: string | null; studentIds?: string[] } = {}) {
  const s = requireStaff(ctx, 'student_affairs')
  if (['clarification', 'close'].includes(action) && !note?.trim()) fail('Tuliskan keterangan.')
  await command(ctx, `affairs.${action}`, {}, async (tx, fx) => {
    const [r] = await tx.select().from(affairsReports).where(eq(affairsReports.id, id)).for('update')
    if (!r) notFound('Laporan')
    if (r!.status === 'closed' && action !== 'note') fail('Laporan sudah selesai.')
    const set: Partial<typeof affairsReports.$inferInsert> = { version: r!.version + 1 }
    if (action === 'assign') set.assignedTo = opts.assignee ?? s.id
    if (action === 'clarification') set.status = 'clarification'
    if (action === 'follow_up') set.status = 'follow_up'
    if (action === 'close') Object.assign(set, { status: 'closed', closedAt: ctx.now, outcome: note!.trim() })
    if (opts.studentIds) set.studentIds = opts.studentIds
    await tx.update(affairsReports).set(set).where(eq(affairsReports.id, id))
    await tx.insert(affairsEvents).values({ reportId: id, actorType: 'staff', actorName: s.name, action: action === 'assign' ? 'assigned' : action === 'close' ? 'closed' : action, note, internal: action === 'note' || action === 'assign' })
    if (r!.reporterType === 'account' && ['clarification', 'follow_up', 'close'].includes(action)) fx.notify({ type: 'account', id: r!.reporterId }, { title: `Laporan ${r!.number}: ${REPORT_STATUS[(set.status ?? r!.status) as keyof typeof REPORT_STATUS]}`, link: `/portal/keluarga/kesiswaan/laporan/${id}` })
    fx.audit(`affairs.${action}`, 'affairs_report', id)
  })
}

export async function reporterAddInfo(ctx: Ctx, id: string, note: string, file: { name: string; buffer: Buffer } | null) {
  if (!note.trim() && !file) fail('Isi keterangan atau lampirkan berkas.')
  await command(ctx, 'affairs.reporter_info', {}, async (tx, fx) => {
    const [r] = await tx.select().from(affairsReports).where(eq(affairsReports.id, id)).for('update')
    if (!r) notFound('Laporan')
    const mine = (ctx.account && r!.reporterType === 'account' && r!.reporterId === ctx.account.id) || (ctx.staff && r!.reporterType === 'staff' && r!.reporterId === ctx.staff.id)
    if (!mine) forbidden()
    if (r!.status === 'closed') fail('Laporan sudah selesai.')
    const fileIds = [...r!.fileIds]
    if (file) fileIds.push((await saveFile(ctx, tx, file, { allow: [...DOCS, ...IMAGES], maxMb: 5, classification: 'restricted', contextType: 'affairs', contextId: id, label: 'Lampiran tambahan' })).id)
    await tx.update(affairsReports).set({ status: r!.status === 'clarification' ? 'received' : r!.status, fileIds, version: r!.version + 1 }).where(eq(affairsReports.id, id))
    await tx.insert(affairsEvents).values({ reportId: id, actorType: ctx.staff ? 'staff' : 'account', actorName: r!.hideIdentity ? 'Pelapor' : actorName(ctx), action: 'info_added', note: note.trim() || null })
    if (r!.assignedTo) fx.notify({ type: 'staff', id: r!.assignedTo }, { title: `Informasi tambahan laporan ${r!.number}`, link: `/portal/staf/kesiswaan/laporan/${id}` })
    fx.audit('affairs.reporter_info', 'affairs_report', id)
  })
}

export async function reportView(ctx: Ctx, id: string) {
  const [r] = await ctx.db.select().from(affairsReports).where(eq(affairsReports.id, id))
  if (!r) notFound('Laporan')
  const handler = hasPerm(ctx, 'student_affairs')
  const mine = (ctx.account && r!.reporterType === 'account' && r!.reporterId === ctx.account.id) || (ctx.staff && r!.reporterType === 'staff' && r!.reporterId === ctx.staff.id)
  if (!handler && !mine) forbidden()
  const events = await ctx.db.select().from(affairsEvents).where(and(eq(affairsEvents.reportId, id), handler ? undefined : eq(affairsEvents.internal, false))).orderBy(asc(affairsEvents.at))
  const fileRows = r!.fileIds.length ? await ctx.db.select().from(files).where(inArray(files.id, r!.fileIds)) : []
  const involved = handler && r!.studentIds.length ? await ctx.db.select({ id: students.id, name: persons.fullName, nis: students.nis }).from(students).innerJoin(persons, eq(persons.id, students.personId)).where(inArray(students.id, r!.studentIds)) : []
  return { r: r!, events, files: fileRows, involved, handler, mine: Boolean(mine) }
}

export async function reportQueue(ctx: Ctx, closed = false) {
  requireStaff(ctx, 'student_affairs')
  return ctx.db
    .select()
    .from(affairsReports)
    .where(closed ? eq(affairsReports.status, 'closed') : inArray(affairsReports.status, ['received', 'clarification', 'follow_up']))
    .orderBy(desc(affairsReports.createdAt))
}
export async function myReports(ctx: Ctx) {
  const who = ctx.staff ? { t: 'staff', id: ctx.staff.id } : ctx.account ? { t: 'account', id: ctx.account.id } : null
  if (!who) return []
  return ctx.db.select().from(affairsReports).where(and(eq(affairsReports.reporterType, who.t), eq(affairsReports.reporterId, who.id))).orderBy(desc(affairsReports.createdAt))
}
