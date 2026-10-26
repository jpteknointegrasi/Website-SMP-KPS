/**
 * Buku Induk (REG-01..05, OPS-01): student identity, guardians & verified links, documents, data corrections, family
 * accounts and activation codes, homeroom placement.
 */
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'
import {
  accounts,
  activationCodes,
  auditEvents,
  classPlacements,
  dataCorrections,
  enrollments,
  files,
  gradeLevels,
  guardianLinks,
  guardians,
  homerooms,
  persons,
  studentDocuments,
  students,
} from '@/db/schema'
import { hasPerm, requireAccount, requireStaff, type Ctx } from '@/server/context'
import { command, expectVersion, nextNumber, type Db, type Tx } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { fileAccess, saveFile, DOCS, IMAGES } from '@/server/files'
import { hashPassword, humanCode, normalizeCode, randomToken, sha256 } from '@/server/secrets'
import { addDays, today } from '@/server/time'
import { checkField, FIELD, RELATIONS, STUDENT_FIELDS, DOC_KINDS } from './fields'
import { isHomeroomTeacherOf, linkedChildren, placementOn, visibleStudentIds } from '../scope'
import { isEmail, normLogin } from '../identity/service'

export type StudentRow = typeof students.$inferSelect
export type PersonRow = typeof persons.$inferSelect

// ---------- read ----------
export type StudentListFilter = { q?: string; homeroomId?: string; status?: string; completeness?: 'complete' | 'incomplete' | 'unverified'; page?: number; perPage?: number }

export async function listStudents(ctx: Ctx, f: StudentListFilter) {
  requireStaff(ctx, 'students.read')
  const d = today(ctx.tz, ctx.now)
  const where: SQL[] = []
  if (f.status) where.push(eq(students.status, f.status))
  if (f.q) {
    const q = `%${f.q.replace(/[%_]/g, '')}%`
    where.push(or(ilike(persons.fullName, q), ilike(students.nis, q), ilike(students.nisn, q))!)
  }
  if (f.completeness === 'unverified') where.push(isNull(students.verifiedAt))
  const placement = ctx.db
    .select({ studentId: enrollments.studentId, homeroomId: classPlacements.homeroomId, homeroom: homerooms.name })
    .from(classPlacements)
    .innerJoin(enrollments, eq(enrollments.id, classPlacements.enrollmentId))
    .innerJoin(homerooms, eq(homerooms.id, classPlacements.homeroomId))
    .where(and(sql`${enrollments.status} <> 'ended'`, sql`${classPlacements.validFrom} <= ${d}`, or(isNull(classPlacements.validTo), sql`${classPlacements.validTo} >= ${d}`)))
    .as('pl')
  if (f.homeroomId) where.push(eq(placement.homeroomId, f.homeroomId))
  const perPage = Math.min(Math.max(f.perPage ?? 25, 10), 100)
  const page = Math.max(f.page ?? 1, 1)
  const base = ctx.db
    .select({
      id: students.id,
      nis: students.nis,
      nisn: students.nisn,
      name: persons.fullName,
      gender: persons.gender,
      status: students.status,
      verifiedAt: students.verifiedAt,
      homeroom: placement.homeroom,
      photo: persons.photoFileId,
      birthPlace: persons.birthPlace,
      birthDate: persons.birthDate,
      religion: persons.religion,
      address: persons.address,
      guardians: sql<number>`(SELECT count(*) FROM guardian_student_links l WHERE l.student_id = ${students.id} AND l.status = 'active')`.mapWith(Number),
    })
    .from(students)
    .innerJoin(persons, eq(persons.id, students.personId))
    .leftJoin(placement, eq(placement.studentId, students.id))
    .where(where.length ? and(...where) : undefined)
    .$dynamic()
  let rows = await base.orderBy(asc(persons.fullName))
  const withC = rows.map((r) => ({ ...r, completeness: completenessOf({ ...r, photoFileId: r.photo, fullName: r.name }, r.guardians, Boolean(r.homeroom)) }))
  const filtered = f.completeness === 'complete' ? withC.filter((r) => r.completeness.percent === 100) : f.completeness === 'incomplete' ? withC.filter((r) => r.completeness.percent < 100) : withC
  rows = filtered as never
  return { total: filtered.length, page, perPage, rows: filtered.slice((page - 1) * perPage, page * perPage) }
}

/** Data completeness of a student record: required items present / total (computed, never typed in). */
export function completenessOf(
  r: { fullName?: string | null; nis?: string | null; nisn?: string | null; gender?: string | null; birthPlace?: string | null; birthDate?: string | null; religion?: string | null; address?: string | null; photoFileId?: string | null },
  activeGuardians: number,
  placed: boolean,
) {
  const items: [string, boolean][] = [
    ...STUDENT_FIELDS.filter((f) => f.complete).map((f) => [f.label, Boolean((r as Record<string, unknown>)[f.key])] as [string, boolean]),
    ['Pasfoto', Boolean(r.photoFileId)],
    ['Data orang tua/wali', activeGuardians > 0],
    ['Rombel', placed],
  ]
  const done = items.filter(([, ok]) => ok).length
  return { percent: Math.round((done / items.length) * 100), missing: items.filter(([, ok]) => !ok).map(([l]) => l) }
}

export async function dashboardStats(ctx: Ctx) {
  requireStaff(ctx, 'students.read')
  const [tot] = await ctx.db.select({ n: count() }).from(students)
  const [act] = await ctx.db.select({ n: count() }).from(students).where(eq(students.status, 'active'))
  const [unv] = await ctx.db.select({ n: count() }).from(students).where(and(eq(students.status, 'active'), isNull(students.verifiedAt)))
  const [corr] = await ctx.db.select({ n: count() }).from(dataCorrections).where(inArray(dataCorrections.status, ['submitted', 'needs_info']))
  const d = today(ctx.tz, ctx.now)
  const perLevel = await ctx.db
    .select({ grade: gradeLevels.name, ordinal: gradeLevels.ordinal, students: count(enrollments.studentId), homerooms: sql<number>`count(DISTINCT ${classPlacements.homeroomId})`.mapWith(Number) })
    .from(classPlacements)
    .innerJoin(enrollments, eq(enrollments.id, classPlacements.enrollmentId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, enrollments.gradeLevelId))
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(and(eq(students.status, 'active'), sql`${enrollments.status} <> 'ended'`, sql`${classPlacements.validFrom} <= ${d}`, or(isNull(classPlacements.validTo), sql`${classPlacements.validTo} >= ${d}`)))
    .groupBy(gradeLevels.name, gradeLevels.ordinal)
    .orderBy(gradeLevels.ordinal)
  const all = await listStudents(ctx, { status: 'active', perPage: 100, page: 1 })
  const incomplete = (await listStudents(ctx, { status: 'active', completeness: 'incomplete', perPage: 10 })).total
  return { total: tot!.n, active: act!.n, unverified: unv!.n, corrections: corr!.n, incomplete, perLevel, sampleTotal: all.total }
}

export async function getStudent(ctx: Ctx, id: string) {
  const s = await loadStudent(ctx.db, id)
  if (!s) notFound('Siswa')
  await assertCanReadStudent(ctx, id)
  const links = await ctx.db
    .select({ link: guardianLinks, guardian: guardians, person: persons, hasAccount: sql<boolean>`${guardians.accountId} IS NOT NULL` })
    .from(guardianLinks)
    .innerJoin(guardians, eq(guardians.id, guardianLinks.guardianId))
    .innerJoin(persons, eq(persons.id, guardians.personId))
    .where(eq(guardianLinks.studentId, id))
    .orderBy(asc(guardianLinks.createdAt))
  const docs = await ctx.db
    .select({ doc: studentDocuments, file: files })
    .from(studentDocuments)
    .innerJoin(files, eq(files.id, studentDocuments.fileId))
    .where(and(eq(studentDocuments.studentId, id), isNull(files.deletedAt)))
    .orderBy(desc(studentDocuments.createdAt))
  const corrections = await ctx.db.select().from(dataCorrections).where(eq(dataCorrections.studentId, id)).orderBy(desc(dataCorrections.createdAt))
  const placement = await placementOn(ctx.db, id, today(ctx.tz, ctx.now))
  const history = await ctx.db
    .select({ enrollment: enrollments, placement: classPlacements, homeroom: homerooms.name, grade: gradeLevels.name })
    .from(enrollments)
    .innerJoin(gradeLevels, eq(gradeLevels.id, enrollments.gradeLevelId))
    .leftJoin(classPlacements, eq(classPlacements.enrollmentId, enrollments.id))
    .leftJoin(homerooms, eq(homerooms.id, classPlacements.homeroomId))
    .where(eq(enrollments.studentId, id))
    .orderBy(desc(classPlacements.validFrom))
  const activeLinks = links.filter((l) => l.link.status === 'active').length
  return { ...s!, links, docs, corrections, placement, history, completeness: completenessOf({ ...s!.person, ...s!.student }, activeLinks, Boolean(placement)) }
}

export async function loadStudent(db: Db, id: string) {
  const [r] = await db.select({ student: students, person: persons }).from(students).innerJoin(persons, eq(persons.id, students.personId)).where(eq(students.id, id)).limit(1)
  return r ?? null
}

/** Staff with students.read; the homeroom teacher of the student; the student; a linked guardian. */
export async function assertCanReadStudent(ctx: Ctx, studentId: string) {
  if (hasPerm(ctx, 'students.read')) return
  if (ctx.staff && (await isHomeroomTeacherOf(ctx, studentId))) return
  if (ctx.account && (await visibleStudentIds(ctx)).has(studentId)) return
  forbidden('Data siswa ini tidak dapat Anda akses.')
}

// ---------- write (TU) ----------
function collect(input: Record<string, string | null | undefined>, opts: { partial?: boolean } = {}) {
  const person: Record<string, unknown> = {}
  const student: Record<string, unknown> = {}
  const errors: string[] = []
  for (const f of STUDENT_FIELDS) {
    if (opts.partial && !(f.key in input)) continue
    const r = checkField(f, input[f.key])
    if (r.error) errors.push(r.error)
    ;(f.target === 'person' ? person : student)[f.key] = r.value
  }
  return { person, student, errors }
}

async function assertUnique(tx: Db, nis: unknown, nisn: unknown, exceptId?: string) {
  if (nis) {
    const [x] = await tx.select({ id: students.id }).from(students).where(eq(students.nis, String(nis)))
    if (x && x.id !== exceptId) fail(`NIS ${nis} sudah dipakai siswa lain.`, 'conflict', 'nis')
  }
  if (nisn) {
    const [x] = await tx.select({ id: students.id }).from(students).where(eq(students.nisn, String(nisn)))
    if (x && x.id !== exceptId) fail(`NISN ${nisn} sudah dipakai siswa lain.`, 'conflict', 'nisn')
  }
}

export async function createStudent(ctx: Ctx, input: Record<string, string | null>, o: { homeroomId?: string | null; key?: string | null } = {}) {
  const s = requireStaff(ctx, 'students.write')
  const { person, student, errors } = collect(input)
  if (errors.length) fail(errors.join(' '))
  return command(ctx, 'students.create', { key: o.key, input: { input, o } }, async (tx, fx) => {
    await assertUnique(tx, student.nis, student.nisn)
    const [p] = await tx.insert(persons).values(person as typeof persons.$inferInsert).returning({ id: persons.id })
    const [st] = await tx
      .insert(students)
      .values({ ...(student as object), personId: p!.id, entryVia: 'manual', updatedBy: s.id } as typeof students.$inferInsert)
      .returning({ id: students.id })
    if (o.homeroomId) await placeInHomeroom(ctx, tx, st!.id, o.homeroomId, today(ctx.tz, ctx.now))
    fx.audit('students.create', 'student', st!.id)
    return st!.id
  })
}

export async function updateStudent(ctx: Ctx, id: string, input: Record<string, string | null>, version: string | null) {
  const s = requireStaff(ctx, 'students.write')
  const { person, student, errors } = collect(input, { partial: true })
  if (errors.length) fail(errors.join(' '))
  // sensitive identifiers are only changed by staff who may see them (the form omits them otherwise)
  await command(ctx, 'students.update', {}, async (tx, fx) => {
    const cur = await loadStudent(tx, id)
    if (!cur) notFound('Siswa')
    expectVersion(cur!.student.version, version)
    await assertUnique(tx, student.nis, student.nisn, id)
    const changed = changedFields(cur!, person, student)
    if (!changed.length) return
    if (Object.keys(person).length) await tx.update(persons).set({ ...person, updatedAt: ctx.now, version: sql`${persons.version} + 1` }).where(eq(persons.id, cur!.person.id))
    await tx
      .update(students)
      .set({ ...(student as object), updatedAt: ctx.now, updatedBy: s.id, version: sql`${students.version} + 1`, verifiedAt: null, verifiedBy: null })
      .where(eq(students.id, id))
    // field names only: values may be sensitive (NIK)
    fx.audit('students.update', 'student', id, { fields: changed.join(',') })
  })
}

function changedFields(cur: { person: PersonRow; student: StudentRow }, person: Record<string, unknown>, student: Record<string, unknown>) {
  const out: string[] = []
  for (const [k, v] of Object.entries(person)) if (String((cur.person as Record<string, unknown>)[k] ?? '') !== String(v ?? '')) out.push(k)
  for (const [k, v] of Object.entries(student)) if (String((cur.student as Record<string, unknown>)[k] ?? '') !== String(v ?? '')) out.push(k)
  return out
}

export async function setStudentStatus(ctx: Ctx, id: string, status: string, o: { date: string; reason: string | null }) {
  const s = requireStaff(ctx, 'students.write')
  if (!['active', 'graduated', 'transferred_out', 'withdrawn', 'inactive'].includes(status)) fail('Status tidak dikenal.')
  await command(ctx, 'students.status', {}, async (tx, fx) => {
    const cur = await loadStudent(tx, id)
    if (!cur) notFound('Siswa')
    const leaving = status !== 'active'
    await tx
      .update(students)
      .set({ status, exitDate: leaving ? o.date : null, exitReason: leaving ? o.reason : null, updatedAt: ctx.now, updatedBy: s.id, version: sql`${students.version} + 1` })
      .where(eq(students.id, id))
    if (leaving) {
      // close the open placement and enrolment; guardian links stay (history) but portal access follows status
      const open = await tx.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.studentId, id), sql`${enrollments.status} <> 'ended'`))
      for (const e of open) {
        await tx.update(classPlacements).set({ validTo: o.date }).where(and(eq(classPlacements.enrollmentId, e.id), isNull(classPlacements.validTo)))
        await tx.update(enrollments).set({ status: 'ended', endDate: o.date, outcome: status }).where(eq(enrollments.id, e.id))
      }
    }
    fx.audit('students.status', 'student', id, { from: cur!.student.status, to: status })
  })
}

export async function verifyStudent(ctx: Ctx, id: string) {
  const s = requireStaff(ctx, 'students.review')
  await command(ctx, 'students.verify', {}, async (tx, fx) => {
    await tx.update(students).set({ verifiedAt: ctx.now, verifiedBy: s.id }).where(eq(students.id, id))
    fx.audit('students.verify', 'student', id)
  })
}

/** Places a student in a homeroom from `date` (creates the enrolment for the homeroom's year when needed). */
export async function placeInHomeroom(ctx: Ctx, tx: Tx, studentId: string, homeroomId: string, date: string) {
  const [h] = await tx.select().from(homerooms).where(eq(homerooms.id, homeroomId))
  if (!h) notFound('Rombel')
  let [e] = await tx
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.yearId, h!.yearId), sql`${enrollments.status} <> 'ended'`))
  if (e && e.gradeLevelId !== h!.gradeLevelId) {
    await tx.update(enrollments).set({ gradeLevelId: h!.gradeLevelId }).where(eq(enrollments.id, e.id))
  }
  if (!e) [e] = await tx.insert(enrollments).values({ studentId, yearId: h!.yearId, gradeLevelId: h!.gradeLevelId, status: 'active', startDate: date }).returning()
  const [open] = await tx.select().from(classPlacements).where(and(eq(classPlacements.enrollmentId, e!.id), isNull(classPlacements.validTo)))
  if (open?.homeroomId === homeroomId) return
  if (open) {
    if (open.validFrom >= date) await tx.delete(classPlacements).where(eq(classPlacements.id, open.id))
    else await tx.update(classPlacements).set({ validTo: addDays(date, -1) }).where(eq(classPlacements.id, open.id))
  }
  if (h!.capacity) {
    const [n] = await tx.select({ n: count() }).from(classPlacements).where(and(eq(classPlacements.homeroomId, homeroomId), isNull(classPlacements.validTo)))
    if ((n?.n ?? 0) >= h!.capacity) fail(`Rombel ${h!.name} sudah penuh (kapasitas ${h!.capacity}).`)
  }
  await tx.insert(classPlacements).values({ enrollmentId: e!.id, homeroomId, validFrom: date })
}

export async function moveStudent(ctx: Ctx, studentId: string, homeroomId: string, date: string) {
  requireStaff(ctx, 'students.write', 'academic.manage')
  await command(ctx, 'students.place', {}, async (tx, fx) => {
    await placeInHomeroom(ctx, tx, studentId, homeroomId, date)
    fx.audit('students.place', 'student', studentId, { homeroom: homeroomId, from: date })
  })
}

// ---------- documents ----------
fileAccess('student_document', async (ctx, f) => {
  if (!f.contextId) return false
  const [d] = await ctx.db.select({ studentId: studentDocuments.studentId }).from(studentDocuments).where(eq(studentDocuments.id, f.contextId))
  if (!d) return false
  if (hasPerm(ctx, 'students.read', 'cards.manage')) return true
  return Boolean(ctx.account && (await visibleStudentIds(ctx)).has(d.studentId))
})
// photos: staff with student access, homeroom teacher, the student, linked guardians, card verifiers
fileAccess('person_photo', async (ctx, f) => {
  if (hasPerm(ctx, 'students.read', 'cards.manage', 'cards.verify', 'teach')) return true
  if (!ctx.account || !f.contextId) return false
  const [s] = await ctx.db.select({ id: students.id }).from(students).where(eq(students.personId, f.contextId))
  return Boolean(s && (await visibleStudentIds(ctx)).has(s.id))
})

export async function addStudentDocument(ctx: Ctx, studentId: string, kind: string, up: { name: string; buffer: Buffer }, note: string | null) {
  const s = requireStaff(ctx, 'students.write')
  if (!(kind in DOC_KINDS)) fail('Jenis dokumen tidak dikenal.')
  await command(ctx, 'students.document', {}, async (tx, fx) => {
    const cur = await loadStudent(tx, studentId)
    if (!cur) notFound('Siswa')
    const docId = crypto.randomUUID()
    if (kind === 'pasfoto') {
      const f = await saveFile(ctx, tx, up, { allow: ['jpg', 'png'], maxMb: 2, classification: 'private', contextType: 'person_photo', contextId: cur!.person.id, label: 'Pasfoto' })
      await tx.update(persons).set({ photoFileId: f.id, updatedAt: ctx.now }).where(eq(persons.id, cur!.person.id))
      fx.audit('students.photo', 'student', studentId)
      return
    }
    const f = await saveFile(ctx, tx, up, { allow: DOCS, maxMb: 5, classification: 'restricted', contextType: 'student_document', contextId: docId, label: DOC_KINDS[kind] })
    await tx.insert(studentDocuments).values({ id: docId, studentId, kind, fileId: f.id, note, uploadedBy: s.id })
    fx.audit('students.document', 'student', studentId, { kind })
  })
}

// ---------- guardians ----------
export async function addGuardian(
  ctx: Ctx,
  studentId: string,
  input: { relation: string; fullName: string; phone: string | null; email: string | null; occupation: string | null; education: string | null; nik: string | null; isPrimary: boolean },
) {
  const s = requireStaff(ctx, 'family.manage', 'students.write')
  if (!(input.relation in RELATIONS)) fail('Pilih hubungan (ayah/ibu/wali).', 'invalid', 'hubungan')
  if (!input.fullName.trim()) fail('Isi nama orang tua/wali.', 'invalid', 'nama')
  if (input.email && !isEmail(input.email)) fail('Email tidak valid.', 'invalid', 'email')
  if (input.nik && !/^\d{16}$/.test(input.nik)) fail('NIK terdiri dari 16 digit angka.', 'invalid', 'nik')
  return command(ctx, 'guardians.add', {}, async (tx, fx) => {
    if (!(await loadStudent(tx, studentId))) notFound('Siswa')
    const [p] = await tx
      .insert(persons)
      .values({ fullName: input.fullName.trim(), phone: input.phone, email: input.email?.toLowerCase() ?? null, occupation: input.occupation, education: input.education, nik: input.nik })
      .returning({ id: persons.id })
    const [g] = await tx.insert(guardians).values({ personId: p!.id }).returning({ id: guardians.id })
    if (input.isPrimary) await tx.update(guardianLinks).set({ isPrimary: false }).where(eq(guardianLinks.studentId, studentId))
    // entered by an officer from the school's records = officer verification (§5); portal access needs an account + code
    const [l] = await tx
      .insert(guardianLinks)
      .values({ guardianId: g!.id, studentId, relation: input.relation, status: 'active', isPrimary: input.isPrimary, verificationMethod: 'officer', verifiedBy: s.id, verifiedAt: ctx.now, validFrom: today(ctx.tz, ctx.now) })
      .returning({ id: guardianLinks.id })
    fx.audit('guardians.add', 'student', studentId, { link: l!.id, relation: input.relation })
    return l!.id
  })
}

export async function updateGuardianPerson(ctx: Ctx, linkId: string, input: { fullName: string; phone: string | null; email: string | null; occupation: string | null; education: string | null }) {
  requireStaff(ctx, 'family.manage', 'students.write')
  if (input.email && !isEmail(input.email)) fail('Email tidak valid.')
  await command(ctx, 'guardians.update', {}, async (tx, fx) => {
    const [r] = await tx.select({ personId: guardians.personId, studentId: guardianLinks.studentId }).from(guardianLinks).innerJoin(guardians, eq(guardians.id, guardianLinks.guardianId)).where(eq(guardianLinks.id, linkId))
    if (!r) notFound('Relasi wali')
    await tx.update(persons).set({ ...input, email: input.email?.toLowerCase() ?? null, updatedAt: ctx.now }).where(eq(persons.id, r!.personId))
    fx.audit('guardians.update', 'student', r!.studentId, { link: linkId })
  })
}

export async function setLinkPermissions(ctx: Ctx, linkId: string, p: { canViewAcademic: boolean; canViewFinance: boolean; isPrimary: boolean; validTo: string | null }) {
  requireStaff(ctx, 'family.manage')
  await command(ctx, 'guardians.permissions', {}, async (tx, fx) => {
    const [l] = await tx.select().from(guardianLinks).where(eq(guardianLinks.id, linkId))
    if (!l) notFound('Relasi wali')
    if (p.isPrimary) await tx.update(guardianLinks).set({ isPrimary: false }).where(eq(guardianLinks.studentId, l!.studentId))
    await tx.update(guardianLinks).set(p).where(eq(guardianLinks.id, linkId))
    fx.audit('guardians.permissions', 'student', l!.studentId, { link: linkId, academic: p.canViewAcademic, finance: p.canViewFinance })
  })
}

export async function revokeLink(ctx: Ctx, linkId: string, reason: string) {
  const s = requireStaff(ctx, 'family.manage')
  if (reason.trim().length < 5) fail('Tuliskan alasan pencabutan.', 'invalid', 'alasan')
  await command(ctx, 'guardians.revoke', {}, async (tx, fx) => {
    const [l] = await tx.select().from(guardianLinks).where(eq(guardianLinks.id, linkId))
    if (!l || l.status === 'revoked') notFound('Relasi wali')
    await tx.update(guardianLinks).set({ status: 'revoked', revokedAt: ctx.now, revokedBy: s.id, revokeReason: reason.trim() }).where(eq(guardianLinks.id, linkId))
    await tx.update(activationCodes).set({ revokedAt: ctx.now }).where(and(eq(activationCodes.linkId, linkId), isNull(activationCodes.usedAt)))
    fx.audit('guardians.revoke', 'student', l!.studentId, { link: linkId })
  })
}

/** One-time code for a guardian to connect their portal account to this link (shown once; 14 days). */
export async function issueGuardianCode(ctx: Ctx, linkId: string) {
  const s = requireStaff(ctx, 'family.manage')
  return command(ctx, 'guardians.code', {}, async (tx, fx) => {
    const [l] = await tx.select().from(guardianLinks).where(eq(guardianLinks.id, linkId))
    if (!l || l.status !== 'active') fail('Relasi wali tidak aktif.')
    await tx.update(activationCodes).set({ revokedAt: ctx.now }).where(and(eq(activationCodes.linkId, linkId), isNull(activationCodes.usedAt), isNull(activationCodes.revokedAt)))
    const code = humanCode()
    await tx.insert(activationCodes).values({ codeHash: sha256(code), purpose: 'guardian', linkId, studentId: l!.studentId, expiresAt: new Date(ctx.now.getTime() + 14 * 86_400_000), createdBy: s.id })
    fx.audit('guardians.code_issued', 'student', l!.studentId, { link: linkId })
    return { code, expiresAt: new Date(ctx.now.getTime() + 14 * 86_400_000).toISOString() }
  })
}

/**
 * A signed-in family account redeems a guardian code: the account becomes the guardian of that link. If the account
 * already acts as guardian (another child), the link moves to that guardian so one account = one guardian.
 */
export async function redeemCode(ctx: Ctx, rawCode: string) {
  const a = requireAccount(ctx)
  const code = normalizeCode(rawCode)
  if (code.length !== 14) fail('Kode aktivasi terdiri dari 12 huruf/angka, contoh K7QM-2XPA-9DTE.', 'invalid', 'kode')
  return command(ctx, 'guardians.redeem', {}, async (tx, fx) => {
    const [c] = await tx.select().from(activationCodes).where(eq(activationCodes.codeHash, sha256(code))).for('update')
    if (!c || c.usedAt || c.revokedAt || c.expiresAt < ctx.now) fail('Kode aktivasi tidak berlaku. Minta kode baru ke sekolah.', 'invalid', 'kode')
    await tx.update(activationCodes).set({ usedAt: ctx.now, usedByAccountId: a.id }).where(eq(activationCodes.id, c!.id))
    if (c!.purpose === 'student') {
      const [st] = await tx.select().from(students).where(eq(students.id, c!.studentId!))
      if (st!.accountId && st!.accountId !== a.id) fail('Siswa ini sudah memiliki akun. Hubungi sekolah.')
      const [other] = await tx.select({ id: students.id }).from(students).where(eq(students.accountId, a.id))
      if (other) fail('Akun ini sudah terhubung sebagai akun siswa.')
      await tx.update(students).set({ accountId: a.id }).where(eq(students.id, st!.id))
      fx.audit('students.account_linked', 'student', st!.id)
      return { studentId: st!.id, kind: 'student' as const }
    }
    const [l] = await tx.select().from(guardianLinks).where(eq(guardianLinks.id, c!.linkId!))
    if (!l || l.status !== 'active') fail('Relasi wali tidak aktif lagi. Hubungi sekolah.')
    const [mine] = await tx.select().from(guardians).where(eq(guardians.accountId, a.id))
    const [target] = await tx.select().from(guardians).where(eq(guardians.id, l!.guardianId))
    if (mine && mine.id !== target!.id) {
      const [dup] = await tx.select({ id: guardianLinks.id }).from(guardianLinks).where(and(eq(guardianLinks.guardianId, mine.id), eq(guardianLinks.studentId, l!.studentId), sql`${guardianLinks.status} <> 'revoked'`))
      if (dup) fail('Akun Anda sudah terhubung dengan siswa ini.')
      await tx.update(guardianLinks).set({ guardianId: mine.id, verificationMethod: 'activation_code' }).where(eq(guardianLinks.id, l!.id))
    } else if (!mine) {
      if (target!.accountId && target!.accountId !== a.id) fail('Data wali ini sudah terhubung ke akun lain. Hubungi sekolah.')
      await tx.update(guardians).set({ accountId: a.id }).where(eq(guardians.id, target!.id))
    }
    fx.audit('guardians.code_redeemed', 'student', l!.studentId, { link: l!.id })
    return { studentId: l!.studentId, kind: 'guardian' as const }
  })
}

/**
 * Account made by the school for a family member or student without self sign-up (e.g. no e-mail): login and a
 * temporary password shown once; the password must be changed at first sign-in.
 */
export async function createAccountFor(ctx: Ctx, target: { linkId?: string; studentId?: string }, loginInput: string) {
  const s = requireStaff(ctx, 'family.manage')
  const login = normLogin(loginInput)
  if (!/^[a-z0-9._@+-]{4,80}$/.test(login)) fail('Nama pengguna/email 4–80 karakter (huruf kecil, angka, titik, @).', 'invalid', 'login')
  const temp = randomToken(9).replace(/[-_]/g, 'x')
  const hash = await hashPassword(temp)
  return command(ctx, 'accounts.create_for', {}, async (tx, fx) => {
    const [exists] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.login, login))
    if (exists) fail('Nama pengguna/email ini sudah dipakai.', 'conflict', 'login')
    let personId: string
    if (target.studentId) {
      const st = await loadStudent(tx, target.studentId)
      if (!st) notFound('Siswa')
      if (st!.student.accountId) fail('Siswa ini sudah memiliki akun.')
      personId = st!.person.id
    } else {
      const [r] = await tx.select({ g: guardians }).from(guardianLinks).innerJoin(guardians, eq(guardians.id, guardianLinks.guardianId)).where(eq(guardianLinks.id, target.linkId!))
      if (!r) notFound('Relasi wali')
      if (r!.g.accountId) fail('Wali ini sudah memiliki akun.')
      personId = r!.g.personId
    }
    const email = isEmail(login) ? login : null
    const [acc] = await tx
      .insert(accounts)
      .values({ login, email, passwordHash: hash, personId, mustChangePassword: true, createdBy: s.id, emailVerifiedAt: ctx.now, verifiedBy: `staff:${s.id}` })
      .returning({ id: accounts.id })
    if (target.studentId) await tx.update(students).set({ accountId: acc!.id }).where(eq(students.id, target.studentId))
    else {
      const [r] = await tx.select({ gid: guardianLinks.guardianId }).from(guardianLinks).where(eq(guardianLinks.id, target.linkId!))
      await tx.update(guardians).set({ accountId: acc!.id }).where(eq(guardians.id, r!.gid))
    }
    fx.audit('accounts.create_for', 'account', acc!.id, { for: target.studentId ? 'student' : 'guardian' })
    return { login, temporaryPassword: temp }
  })
}

/** Resets a family account's password to a temporary one (shown once). */
export async function resetAccountPassword(ctx: Ctx, accountId: string) {
  requireStaff(ctx, 'family.manage')
  const temp = randomToken(9).replace(/[-_]/g, 'x')
  const hash = await hashPassword(temp)
  return command(ctx, 'accounts.reset_by_staff', {}, async (tx, fx) => {
    const [a] = await tx.select().from(accounts).where(eq(accounts.id, accountId))
    if (!a) notFound('Akun')
    await tx.update(accounts).set({ passwordHash: hash, mustChangePassword: true, failedLogins: 0, lockedUntil: null }).where(eq(accounts.id, accountId))
    await tx.execute(sql`DELETE FROM account_sessions WHERE account_id = ${accountId}`)
    fx.audit('accounts.reset_by_staff', 'account', accountId)
    return { login: a!.login, temporaryPassword: temp }
  })
}

export async function setAccountStatus(ctx: Ctx, accountId: string, active: boolean) {
  requireStaff(ctx, 'family.manage')
  await command(ctx, 'accounts.status', {}, async (tx, fx) => {
    await tx.update(accounts).set({ status: active ? 'active' : 'disabled' }).where(eq(accounts.id, accountId))
    if (!active) await tx.execute(sql`DELETE FROM account_sessions WHERE account_id = ${accountId}`)
    fx.audit(active ? 'accounts.enable' : 'accounts.disable', 'account', accountId)
  })
}

// ---------- corrections (REG-03) ----------
fileAccess('correction_evidence', async (ctx, f) => {
  if (hasPerm(ctx, 'students.review', 'students.read')) return true
  if (!f.contextId) return false
  const [c] = await ctx.db.select().from(dataCorrections).where(eq(dataCorrections.id, f.contextId))
  return Boolean(c && ((ctx.account && c.requestedById === ctx.account.id) || (ctx.staff && c.requestedById === ctx.staff.id)))
})

/**
 * Correction request by TU, the homeroom teacher, a linked guardian or the student. Only listed, non-sensitive fields
 * can be requested by families; changes apply only when a reviewer approves.
 */
export async function requestCorrection(ctx: Ctx, studentId: string, changesIn: Record<string, string>, reason: string, evidence: { name: string; buffer: Buffer } | null) {
  const isStaffReq = Boolean(ctx.staff && (hasPerm(ctx, 'students.write') || (await isHomeroomTeacherOf(ctx, studentId))))
  if (!isStaffReq) {
    requireAccount(ctx)
    if (!(await visibleStudentIds(ctx)).has(studentId)) forbidden('Data siswa ini tidak dapat Anda akses.')
  }
  if (reason.trim().length < 5) fail('Tuliskan alasan/penjelasan perubahan.', 'invalid', 'alasan')
  return command(ctx, 'corrections.request', {}, async (tx, fx) => {
    const cur = await loadStudent(tx, studentId)
    if (!cur) notFound('Siswa')
    const changes: { field: string; before: string | null; after: string | null }[] = []
    for (const [k, v] of Object.entries(changesIn)) {
      const f = FIELD[k]
      if (!f || (!isStaffReq && f.sensitive)) continue
      const r = checkField(f, v)
      if (r.error) fail(r.error, 'invalid', k)
      const before = (f.target === 'person' ? (cur!.person as Record<string, unknown>)[k] : (cur!.student as Record<string, unknown>)[k]) as string | number | null
      if (String(before ?? '') !== String(r.value ?? '')) changes.push({ field: k, before: before === null || before === undefined ? null : String(before), after: r.value === null ? null : String(r.value) })
    }
    if (!changes.length) fail('Tidak ada perubahan yang diusulkan.')
    const id = crypto.randomUUID()
    let evidenceFileId: string | null = null
    if (evidence) evidenceFileId = (await saveFile(ctx, tx, evidence, { allow: DOCS, maxMb: 5, classification: 'restricted', contextType: 'correction_evidence', contextId: id, label: 'Dokumen pendukung' })).id
    const n = await nextNumber(tx, `koreksi:${ctx.now.getUTCFullYear()}`)
    await tx.insert(dataCorrections).values({
      id,
      number: `KR-${ctx.now.getUTCFullYear()}-${String(n).padStart(4, '0')}`,
      studentId,
      requestedByType: ctx.staff ? 'staff' : 'account',
      requestedById: ctx.staff?.id ?? ctx.account!.id,
      requestedByName: ctx.staff?.name ?? ctx.account!.name,
      changes,
      reason: reason.trim(),
      evidenceFileId,
    })
    fx.audit('corrections.request', 'student', studentId, { correction: id, fields: changes.map((c) => c.field).join(',') })
    return id
  })
}

export async function reviewCorrection(ctx: Ctx, id: string, decision: 'approve' | 'reject' | 'needs_info', note: string | null, version: string | null) {
  const s = requireStaff(ctx, 'students.review')
  if (decision !== 'approve' && !note?.trim()) fail('Tuliskan catatan untuk pengusul.', 'invalid', 'catatan')
  await command(ctx, 'corrections.review', {}, async (tx, fx) => {
    const [c] = await tx.select().from(dataCorrections).where(eq(dataCorrections.id, id)).for('update')
    if (!c) notFound('Usulan koreksi')
    expectVersion(c!.version, version)
    if (!['submitted', 'needs_info'].includes(c!.status)) fail('Usulan ini sudah diputuskan.')
    if (c!.requestedByType === 'staff' && c!.requestedById === s.id) fail('Usulan Anda sendiri harus ditinjau petugas lain.')
    if (decision === 'approve') {
      const cur = await loadStudent(tx, c!.studentId)
      // the data must still be what the request saw (otherwise review again)
      for (const ch of c!.changes) {
        const f = FIELD[ch.field]!
        const now = (f.target === 'person' ? (cur!.person as Record<string, unknown>)[ch.field] : (cur!.student as Record<string, unknown>)[ch.field]) as unknown
        if (String(now ?? '') !== String(ch.before ?? '')) fail(`Data ${f.label} sudah berubah sejak usulan dibuat. Minta pengusul memperbarui usulan.`, 'conflict')
      }
      const person: Record<string, unknown> = {}
      const student: Record<string, unknown> = {}
      for (const ch of c!.changes) {
        const f = FIELD[ch.field]!
        const v = f.type === 'int' && ch.after !== null ? Number(ch.after) : ch.after
        ;(f.target === 'person' ? person : student)[ch.field] = v
      }
      await assertUnique(tx, student.nis, student.nisn, c!.studentId)
      if (Object.keys(person).length) await tx.update(persons).set({ ...person, updatedAt: ctx.now, version: sql`${persons.version} + 1` }).where(eq(persons.id, cur!.person.id))
      await tx.update(students).set({ ...student, updatedAt: ctx.now, updatedBy: s.id, version: sql`${students.version} + 1` }).where(eq(students.id, c!.studentId))
    }
    const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'needs_info'
    await tx.update(dataCorrections).set({ status, reviewNote: note, reviewedBy: s.id, reviewedAt: ctx.now, version: sql`${dataCorrections.version} + 1` }).where(eq(dataCorrections.id, id))
    fx.audit(`corrections.${status}`, 'student', c!.studentId, { correction: id })
    if (c!.requestedByType === 'account')
      fx.notify({ type: 'account', id: c!.requestedById }, { title: `Usulan koreksi data ${c!.number}: ${status === 'approved' ? 'disetujui' : status === 'rejected' ? 'ditolak' : 'perlu informasi tambahan'}`, link: '/portal/keluarga/koreksi' })
  })
}

export async function listCorrections(ctx: Ctx, status?: string) {
  requireStaff(ctx, 'students.review', 'students.write')
  return ctx.db
    .select({ c: dataCorrections, name: persons.fullName, nis: students.nis })
    .from(dataCorrections)
    .innerJoin(students, eq(students.id, dataCorrections.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(status ? eq(dataCorrections.status, status) : inArray(dataCorrections.status, ['submitted', 'needs_info']))
    .orderBy(desc(dataCorrections.createdAt))
}

export async function myCorrections(ctx: Ctx) {
  const a = requireAccount(ctx)
  return ctx.db
    .select({ c: dataCorrections, name: persons.fullName })
    .from(dataCorrections)
    .innerJoin(students, eq(students.id, dataCorrections.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(and(eq(dataCorrections.requestedByType, 'account'), eq(dataCorrections.requestedById, a.id)))
    .orderBy(desc(dataCorrections.createdAt))
}

export async function studentAudit(ctx: Ctx, studentId: string) {
  requireStaff(ctx, 'students.read')
  return ctx.db.select().from(auditEvents).where(and(eq(auditEvents.objectType, 'student'), eq(auditEvents.objectId, studentId))).orderBy(desc(auditEvents.occurredAt)).limit(50)
}

export { linkedChildren }
