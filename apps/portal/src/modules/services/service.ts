/**
 * M12 school services (LAY-01, §16, §44.1): requests for letters and administrative services with a tracked
 * timeline (submitted → in_progress → needs_info ↔ info added → completed/rejected), SLA due date, output document
 * (uploaded PDF or the system-generated "surat keterangan aktif"), internal notes kept from the requester.
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { academicYears, homerooms, serviceEvents, serviceRequests, serviceTypes, persons, students } from '@/db/schema'
import { actorName, hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, nextNumber, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { DOCS, fileAccess, saveFile } from '@/server/files'
import { placementOn, visibleStudentIds } from '../scope'
import { localDate } from '@/server/time'

export const STATUS: Record<string, string> = { submitted: 'Diajukan', in_progress: 'Diproses', needs_info: 'Perlu informasi', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan' }

export const DEFAULT_TYPES = [
  { code: 'ket_aktif', name: 'Surat Keterangan Aktif Siswa', description: 'Untuk keperluan umum (beasiswa, administrasi orang tua, dll).', category: 'surat', slaDays: 2, questions: [{ key: 'keperluan', label: 'Keperluan', required: true }] },
  { code: 'rekomendasi', name: 'Surat Rekomendasi', description: 'Untuk lomba, beasiswa, kegiatan, atau pindah sekolah.', category: 'surat', slaDays: 5, questions: [{ key: 'keperluan', label: 'Keperluan & tujuan', required: true }] },
  { code: 'legalisir', name: 'Legalisir dokumen', description: 'Legalisir rapor/ijazah/SKL.', category: 'surat', slaDays: 3, requiresFile: true, questions: [{ key: 'jumlah', label: 'Jumlah lembar', required: true }] },
  { code: 'keterangan_lain', name: 'Surat keterangan lainnya', description: 'Layanan administrasi lain.', category: 'surat', slaDays: 5, questions: [{ key: 'uraian', label: 'Uraian kebutuhan', required: true }] },
  { code: 'konsultasi', name: 'Konsultasi administrasi', description: 'Pertanyaan atau konsultasi ke tata usaha.', category: 'konsultasi', slaDays: 3, questions: [{ key: 'uraian', label: 'Pertanyaan', required: true }] },
  { code: 'keluhan', name: 'Saran & keluhan layanan', description: 'Disampaikan kepada pengelola layanan sekolah.', category: 'keluhan', slaDays: 5, questions: [{ key: 'uraian', label: 'Uraian', required: true }] },
]

/** Installs the default service catalogue the first time (idempotent). */
export async function ensureTypes(db: Db) {
  const [n] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(serviceTypes)
  if (n!.n) return
  for (const [i, t] of DEFAULT_TYPES.entries()) await db.insert(serviceTypes).values({ ...t, ordinal: i + 1 }).onConflictDoNothing()
}

export async function catalogue(db: Db) {
  await ensureTypes(db)
  return db.select().from(serviceTypes).where(eq(serviceTypes.active, true)).orderBy(asc(serviceTypes.ordinal))
}

fileAccess('service', async (ctx, f) => {
  if (!f.contextId) return false
  if (hasPerm(ctx, 'services.process')) return true
  const [r] = await ctx.db.select().from(serviceRequests).where(eq(serviceRequests.id, f.contextId))
  if (!r) return false
  const [ev] = await ctx.db.select().from(serviceEvents).where(and(eq(serviceEvents.requestId, r.id), eq(serviceEvents.fileId, f.id)))
  if (ev?.internal) return false
  return Boolean((ctx.account && r.requesterType === 'account' && r.requesterId === ctx.account.id) || (ctx.staff && r.requesterId === ctx.staff.id))
})

export async function submitRequest(ctx: Ctx, input: { typeId: string; studentId: string | null; answers: Record<string, string>; purpose: string | null; file: { name: string; buffer: Buffer } | null }) {
  if (!ctx.account && !ctx.staff) fail('Silakan masuk.', 'unauthenticated')
  return command(ctx, 'services.submit', {}, async (tx, fx) => {
    const [t] = await tx.select().from(serviceTypes).where(and(eq(serviceTypes.id, input.typeId), eq(serviceTypes.active, true)))
    if (!t) notFound('Jenis layanan')
    if (input.studentId && ctx.account && !(await visibleStudentIds(ctx, 'any', tx)).has(input.studentId)) forbidden()
    if (t!.category === 'surat' && !input.studentId) fail('Pilih siswa yang dimaksud.')
    for (const q of t!.questions) if (q.required && !input.answers[q.key]?.trim()) fail(`Isi: ${q.label}.`)
    if (t!.requiresFile && !input.file) fail('Lampirkan dokumen yang diperlukan.')
    const id = crypto.randomUUID()
    const y = ctx.now.getUTCFullYear()
    const n = await nextNumber(tx, `layanan:${y}`)
    await tx.insert(serviceRequests).values({
      id,
      number: `LYN-${y}-${String(n).padStart(4, '0')}`,
      typeId: t!.id,
      studentId: input.studentId,
      requesterType: ctx.staff ? 'staff' : 'account',
      requesterId: ctx.staff?.id ?? ctx.account!.id,
      requesterName: actorName(ctx),
      answers: input.answers,
      purpose: input.purpose,
      dueAt: new Date(ctx.now.getTime() + t!.slaDays * 86_400_000),
    })
    const f = input.file ? await saveFile(ctx, tx, input.file, { allow: DOCS, maxMb: 5, classification: 'restricted', contextType: 'service', contextId: id, label: 'Lampiran' }) : null
    await tx.insert(serviceEvents).values({ requestId: id, actorType: ctx.staff ? 'staff' : 'account', actorName: actorName(ctx), action: 'submitted', note: input.purpose, fileId: f?.id ?? null })
    fx.audit('services.submit', 'service_request', id, { type: t!.code })
    return id
  })
}

async function load(tx: Db, id: string) {
  const [r] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, id)).for('update')
  if (!r) notFound('Permohonan')
  return r!
}

/** Staff transitions: take, ask info, complete (with output), reject, note (internal). */
export async function processRequest(ctx: Ctx, id: string, action: 'take' | 'needs_info' | 'complete' | 'reject' | 'note', note: string | null, output: { file: { name: string; buffer: Buffer } | null; number: string | null }) {
  const s = requireStaff(ctx, 'services.process')
  await command(ctx, `services.${action}`, {}, async (tx, fx) => {
    const r = await load(tx, id)
    if (['completed', 'rejected', 'cancelled'].includes(r.status) && action !== 'note') fail('Permohonan sudah selesai.')
    if ((action === 'needs_info' || action === 'reject') && !note?.trim()) fail('Tuliskan keterangan untuk pemohon.')
    let fileId: string | null = null
    const set: Partial<typeof serviceRequests.$inferInsert> = { version: r.version + 1 }
    if (action === 'take') Object.assign(set, { status: 'in_progress', assignedTo: s.id })
    if (action === 'needs_info') set.status = 'needs_info'
    if (action === 'reject') Object.assign(set, { status: 'rejected', closedAt: ctx.now })
    if (action === 'complete') {
      const [t] = await tx.select().from(serviceTypes).where(eq(serviceTypes.id, r.typeId))
      if (output.file) fileId = (await saveFile(ctx, tx, output.file, { allow: ['pdf'], maxMb: 5, classification: 'restricted', contextType: 'service', contextId: id, label: 'Dokumen hasil' })).id
      if (!fileId && t!.code !== 'ket_aktif' && t!.category === 'surat') fail('Unggah dokumen hasil (PDF), atau gunakan surat yang dibuat sistem untuk surat keterangan aktif.')
      Object.assign(set, { status: 'completed', closedAt: ctx.now, outputFileId: fileId, outputNo: output.number })
    }
    if (action !== 'note') await tx.update(serviceRequests).set(set).where(eq(serviceRequests.id, id))
    await tx.insert(serviceEvents).values({ requestId: id, actorType: 'staff', actorName: s.name, action: action === 'take' ? 'assigned' : action === 'complete' ? 'completed' : action === 'reject' ? 'rejected' : action, note, fileId, internal: action === 'note' })
    if (action !== 'note' && action !== 'take' && r.requesterType === 'account')
      fx.notify({ type: 'account', id: r.requesterId }, { title: `Permohonan ${r.number}: ${STATUS[set.status as string] ?? ''}`, link: `/portal/keluarga/layanan/${id}` })
    fx.audit(`services.${action}`, 'service_request', id)
  })
}

/** Requester adds information (when asked) or cancels. */
export async function requesterUpdate(ctx: Ctx, id: string, action: 'info' | 'cancel', note: string | null, file: { name: string; buffer: Buffer } | null) {
  await command(ctx, `services.requester_${action}`, {}, async (tx, fx) => {
    const r = await load(tx, id)
    const mine = (ctx.account && r.requesterType === 'account' && r.requesterId === ctx.account.id) || (ctx.staff && r.requesterId === ctx.staff.id)
    if (!mine) forbidden()
    if (action === 'info') {
      if (r.status !== 'needs_info') fail('Permohonan tidak sedang meminta informasi.')
      if (!note?.trim() && !file) fail('Isi keterangan atau lampirkan berkas.')
      const f = file ? await saveFile(ctx, tx, file, { allow: DOCS, maxMb: 5, classification: 'restricted', contextType: 'service', contextId: id, label: 'Lampiran' }) : null
      await tx.update(serviceRequests).set({ status: r.assignedTo ? 'in_progress' : 'submitted', version: r.version + 1 }).where(eq(serviceRequests.id, id))
      await tx.insert(serviceEvents).values({ requestId: id, actorType: ctx.staff ? 'staff' : 'account', actorName: actorName(ctx), action: 'info_added', note, fileId: f?.id ?? null })
      if (r.assignedTo) fx.notify({ type: 'staff', id: r.assignedTo }, { title: `Informasi tambahan untuk ${r.number}`, link: `/portal/staf/layanan/${id}` })
    } else {
      if (!['submitted', 'needs_info'].includes(r.status)) fail('Permohonan yang sedang diproses tidak dapat dibatalkan dari portal.')
      await tx.update(serviceRequests).set({ status: 'cancelled', closedAt: ctx.now, version: r.version + 1 }).where(eq(serviceRequests.id, id))
      await tx.insert(serviceEvents).values({ requestId: id, actorType: 'account', actorName: actorName(ctx), action: 'cancelled', note })
    }
    fx.audit(`services.requester_${action}`, 'service_request', id)
  })
}

export async function requestView(ctx: Ctx, id: string) {
  const [r] = await ctx.db
    .select({ r: serviceRequests, type: serviceTypes, student: persons.fullName, nis: students.nis })
    .from(serviceRequests)
    .innerJoin(serviceTypes, eq(serviceTypes.id, serviceRequests.typeId))
    .leftJoin(students, eq(students.id, serviceRequests.studentId))
    .leftJoin(persons, eq(persons.id, students.personId))
    .where(eq(serviceRequests.id, id))
  if (!r) notFound('Permohonan')
  const staff = hasPerm(ctx, 'services.process')
  const mine = (ctx.account && r!.r.requesterType === 'account' && r!.r.requesterId === ctx.account.id) || (ctx.staff && r!.r.requesterId === ctx.staff.id)
  if (!staff && !mine) forbidden()
  const events = await ctx.db.select().from(serviceEvents).where(and(eq(serviceEvents.requestId, id), staff ? undefined : eq(serviceEvents.internal, false))).orderBy(asc(serviceEvents.at))
  return { ...r!, events, staff }
}

export async function myRequests(ctx: Ctx) {
  if (!ctx.account) return []
  return ctx.db
    .select({ r: serviceRequests, type: serviceTypes.name, student: persons.fullName })
    .from(serviceRequests)
    .innerJoin(serviceTypes, eq(serviceTypes.id, serviceRequests.typeId))
    .leftJoin(students, eq(students.id, serviceRequests.studentId))
    .leftJoin(persons, eq(persons.id, students.personId))
    .where(and(eq(serviceRequests.requesterType, 'account'), eq(serviceRequests.requesterId, ctx.account.id)))
    .orderBy(desc(serviceRequests.createdAt))
}

export async function queue(ctx: Ctx, status?: string) {
  requireStaff(ctx, 'services.process')
  return ctx.db
    .select({ r: serviceRequests, type: serviceTypes.name, student: persons.fullName })
    .from(serviceRequests)
    .innerJoin(serviceTypes, eq(serviceTypes.id, serviceRequests.typeId))
    .leftJoin(students, eq(students.id, serviceRequests.studentId))
    .leftJoin(persons, eq(persons.id, students.personId))
    .where(status ? eq(serviceRequests.status, status) : inArray(serviceRequests.status, ['submitted', 'in_progress', 'needs_info']))
    .orderBy(asc(serviceRequests.dueAt))
}

export async function saveType(ctx: Ctx, t: { id?: string | null; code: string; name: string; description: string | null; category: string; slaDays: number; requiresFile: boolean; questions: { key: string; label: string; required?: boolean }[]; active: boolean }) {
  requireStaff(ctx, 'services.process', 'settings.manage')
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(t.code)) fail('Kode layanan huruf kecil/angka/garis bawah.')
  await command(ctx, 'services.type', {}, async (tx, fx) => {
    const values = { code: t.code, name: t.name, description: t.description, category: t.category, slaDays: t.slaDays, requiresFile: t.requiresFile, questions: t.questions, active: t.active }
    if (t.id) await tx.update(serviceTypes).set(values).where(eq(serviceTypes.id, t.id))
    else await tx.insert(serviceTypes).values(values)
    fx.audit('services.type', 'service_type', t.code)
  })
}

/** Data for the system-generated "Surat Keterangan Aktif" of a completed ket_aktif request (requester or TU). */
export async function activeLetter(ctx: Ctx, id: string) {
  const v = await requestView(ctx, id)
  if (v.type.code !== 'ket_aktif' || v.r.status !== 'completed' || !v.r.studentId) notFound('Surat')
  const [p] = await ctx.db
    .select({ name: persons.fullName, birthPlace: persons.birthPlace, birthDate: persons.birthDate, gender: persons.gender, nis: students.nis, nisn: students.nisn, status: students.status })
    .from(students)
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(students.id, v.r.studentId!))
  const closed = v.r.closedAt ?? ctx.now
  const date = localDate(closed, ctx.tz)
  const pl = await placementOn(ctx.db, v.r.studentId!, date)
  const [h] = pl ? await ctx.db.select({ name: homerooms.name, year: academicYears.name }).from(homerooms).innerJoin(academicYears, eq(academicYears.id, homerooms.yearId)).where(eq(homerooms.id, pl.homeroomId)) : []
  return { ...v, student: p!, homeroom: h?.name ?? null, year: h?.year ?? null, date }
}
