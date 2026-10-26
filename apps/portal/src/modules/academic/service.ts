/** M03 academic master data (Waka Kurikulum / Admin): years, terms, levels, homerooms, subjects, assignments. */
import { and, asc, count, eq, isNull, ne, sql } from 'drizzle-orm'
import { academicYears, classPlacements, gradeLevels, homerooms, staffMembers, subjects, teachingAssignments, terms } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command } from '@/server/command'
import { fail, notFound } from '@/server/errors'
import { isDate } from '@/server/time'

const manage = (ctx: Ctx) => requireStaff(ctx, 'academic.manage')

export async function saveYear(ctx: Ctx, input: { id?: string | null; name: string; startDate: string; endDate: string }) {
  manage(ctx)
  if (!/^\d{4}\/\d{4}$/.test(input.name)) fail('Nama tahun ajaran berformat 2026/2027.', 'invalid', 'nama')
  if (!isDate(input.startDate) || !isDate(input.endDate) || input.endDate <= input.startDate) fail('Tanggal mulai/selesai tidak valid.')
  return command(ctx, 'academic.year', {}, async (tx, fx) => {
    const [dup] = await tx.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.name, input.name))
    if (dup && dup.id !== input.id) fail('Tahun ajaran ini sudah ada.', 'conflict')
    let id = input.id
    if (id) await tx.update(academicYears).set({ name: input.name, startDate: input.startDate, endDate: input.endDate }).where(eq(academicYears.id, id))
    else {
      const [y] = await tx.insert(academicYears).values({ name: input.name, startDate: input.startDate, endDate: input.endDate }).returning({ id: academicYears.id })
      id = y!.id
      // two terms by default (Ganjil / Genap) split at the half
      const mid = new Date((new Date(input.startDate).getTime() + new Date(input.endDate).getTime()) / 2).toISOString().slice(0, 10)
      const after = new Date(new Date(mid).getTime() + 86_400_000).toISOString().slice(0, 10)
      await tx.insert(terms).values([
        { yearId: id, name: 'Ganjil', ordinal: 1, startDate: input.startDate, endDate: mid },
        { yearId: id, name: 'Genap', ordinal: 2, startDate: after, endDate: input.endDate },
      ])
    }
    fx.audit('academic.year', 'academic_year', id)
    return id!
  })
}

/** Makes a year (and the term containing today, else its first term) the active one. */
export async function activateYear(ctx: Ctx, id: string) {
  manage(ctx)
  await command(ctx, 'academic.year_activate', {}, async (tx, fx) => {
    const [y] = await tx.select().from(academicYears).where(eq(academicYears.id, id))
    if (!y) notFound('Tahun ajaran')
    await tx.update(academicYears).set({ status: 'closed' }).where(and(eq(academicYears.status, 'active'), ne(academicYears.id, id)))
    await tx.update(academicYears).set({ status: 'active' }).where(eq(academicYears.id, id))
    fx.audit('academic.year_activate', 'academic_year', id)
  })
}

export async function saveTerm(ctx: Ctx, id: string, input: { startDate: string; endDate: string; status: string }) {
  manage(ctx)
  if (!isDate(input.startDate) || !isDate(input.endDate) || input.endDate < input.startDate) fail('Tanggal semester tidak valid.')
  if (!['planned', 'active', 'closed'].includes(input.status)) fail('Status tidak dikenal.')
  await command(ctx, 'academic.term', {}, async (tx, fx) => {
    const [t] = await tx.select().from(terms).where(eq(terms.id, id))
    if (!t) notFound('Semester')
    if (input.status === 'active') await tx.update(terms).set({ status: 'closed' }).where(and(eq(terms.status, 'active'), ne(terms.id, id)))
    await tx.update(terms).set(input).where(eq(terms.id, id))
    fx.audit('academic.term', 'term', id, { status: input.status })
  })
}

export async function saveGradeLevel(ctx: Ctx, input: { id?: string | null; name: string; ordinal: number; final: boolean }) {
  manage(ctx)
  if (!input.name.trim()) fail('Isi nama tingkat.')
  await command(ctx, 'academic.grade', {}, async (tx, fx) => {
    if (input.id) await tx.update(gradeLevels).set({ name: input.name.trim(), ordinal: input.ordinal, final: input.final }).where(eq(gradeLevels.id, input.id))
    else {
      const [dup] = await tx.select().from(gradeLevels).where(eq(gradeLevels.name, input.name.trim()))
      if (dup) fail('Tingkat ini sudah ada.')
      await tx.insert(gradeLevels).values({ name: input.name.trim(), ordinal: input.ordinal, final: input.final })
    }
    fx.audit('academic.grade', 'grade_level', input.id ?? input.name)
  })
}

export async function saveHomeroom(ctx: Ctx, input: { id?: string | null; yearId: string; gradeLevelId: string; name: string; homeroomTeacherId: string | null; room: string | null; capacity: number | null }) {
  manage(ctx)
  if (!input.name.trim()) fail('Isi nama rombel (contoh: VII A).')
  return command(ctx, 'academic.homeroom', {}, async (tx, fx) => {
    const [dup] = await tx.select().from(homerooms).where(and(eq(homerooms.yearId, input.yearId), eq(homerooms.name, input.name.trim())))
    if (dup && dup.id !== input.id) fail('Rombel dengan nama ini sudah ada di tahun ajaran tersebut.')
    const values = { yearId: input.yearId, gradeLevelId: input.gradeLevelId, name: input.name.trim(), homeroomTeacherId: input.homeroomTeacherId, room: input.room, capacity: input.capacity }
    let id = input.id
    if (id) await tx.update(homerooms).set(values).where(eq(homerooms.id, id))
    else id = (await tx.insert(homerooms).values(values).returning({ id: homerooms.id }))[0]!.id
    fx.audit('academic.homeroom', 'homeroom', id)
    return id!
  })
}

export async function saveSubject(ctx: Ctx, input: { id?: string | null; code: string; name: string; group: string | null; ordinal: number; active: boolean }) {
  manage(ctx)
  if (!/^[A-Za-z0-9-]{1,12}$/.test(input.code)) fail('Kode mapel 1–12 huruf/angka.')
  if (!input.name.trim()) fail('Isi nama mata pelajaran.')
  await command(ctx, 'academic.subject', {}, async (tx, fx) => {
    const code = input.code.toUpperCase()
    const [dup] = await tx.select().from(subjects).where(eq(subjects.code, code))
    if (dup && dup.id !== input.id) fail('Kode mapel sudah dipakai.')
    const values = { code, name: input.name.trim(), group: input.group, ordinal: input.ordinal, active: input.active }
    if (input.id) await tx.update(subjects).set(values).where(eq(subjects.id, input.id))
    else await tx.insert(subjects).values(values)
    fx.audit('academic.subject', 'subject', code)
  })
}

export async function saveAssignment(ctx: Ctx, input: { termId: string; homeroomId: string; subjectId: string; teacherId: string; hoursPerWeek: number | null }) {
  manage(ctx)
  await command(ctx, 'academic.assignment', {}, async (tx, fx) => {
    const [t] = await tx.select().from(staffMembers).where(eq(staffMembers.id, input.teacherId))
    if (!t || !t.active) fail('Guru tidak ditemukan atau nonaktif.')
    const [cur] = await tx
      .select()
      .from(teachingAssignments)
      .where(and(eq(teachingAssignments.termId, input.termId), eq(teachingAssignments.homeroomId, input.homeroomId), eq(teachingAssignments.subjectId, input.subjectId), eq(teachingAssignments.active, true)))
    if (cur) await tx.update(teachingAssignments).set({ teacherId: input.teacherId, hoursPerWeek: input.hoursPerWeek }).where(eq(teachingAssignments.id, cur.id))
    else await tx.insert(teachingAssignments).values(input)
    fx.audit('academic.assignment', 'homeroom', input.homeroomId, { subject: input.subjectId, teacher: input.teacherId })
  })
}
export async function removeAssignment(ctx: Ctx, id: string) {
  manage(ctx)
  await command(ctx, 'academic.assignment_remove', {}, async (tx, fx) => {
    await tx.update(teachingAssignments).set({ active: false }).where(eq(teachingAssignments.id, id))
    fx.audit('academic.assignment_remove', 'teaching_assignment', id)
  })
}

// ---------- reads ----------
export async function academicOverview(ctx: Ctx) {
  const years = await ctx.db.select().from(academicYears).orderBy(sql`${academicYears.startDate} DESC`)
  const allTerms = await ctx.db.select().from(terms).orderBy(asc(terms.ordinal))
  const levels = await ctx.db.select().from(gradeLevels).orderBy(asc(gradeLevels.ordinal))
  const subs = await ctx.db.select().from(subjects).orderBy(asc(subjects.ordinal), asc(subjects.name))
  return { years, terms: allTerms, levels, subjects: subs }
}

export async function homeroomsOfYear(ctx: Ctx, yearId: string) {
  return ctx.db
    .select({
      h: homerooms,
      grade: gradeLevels.name,
      gradeOrdinal: gradeLevels.ordinal,
      teacher: sql<string | null>`coalesce(${staffMembers.displayName}, ${staffMembers.name})`,
      students: sql<number>`(SELECT count(*) FROM class_placements p JOIN enrollments e ON e.id = p.enrollment_id WHERE p.homeroom_id = ${homerooms.id} AND p.valid_to IS NULL AND e.status <> 'ended')`.mapWith(Number),
    })
    .from(homerooms)
    .innerJoin(gradeLevels, eq(gradeLevels.id, homerooms.gradeLevelId))
    .leftJoin(staffMembers, eq(staffMembers.id, homerooms.homeroomTeacherId))
    .where(eq(homerooms.yearId, yearId))
    .orderBy(asc(gradeLevels.ordinal), asc(homerooms.name))
}

export async function assignmentsOfTerm(ctx: Ctx, termId: string) {
  return ctx.db
    .select({ a: teachingAssignments, homeroom: homerooms.name, subject: subjects.name, subjectCode: subjects.code, teacher: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` })
    .from(teachingAssignments)
    .innerJoin(homerooms, eq(homerooms.id, teachingAssignments.homeroomId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(staffMembers, eq(staffMembers.id, teachingAssignments.teacherId))
    .where(and(eq(teachingAssignments.termId, termId), eq(teachingAssignments.active, true)))
    .orderBy(asc(homerooms.name), asc(subjects.ordinal))
}

export async function staffOptions(ctx: Ctx) {
  return ctx.db
    .select({ id: staffMembers.id, name: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` })
    .from(staffMembers)
    .where(eq(staffMembers.active, true))
    .orderBy(asc(staffMembers.name))
}

export async function unplacedCount(ctx: Ctx) {
  const [r] = await ctx.db.select({ n: count() }).from(classPlacements).where(isNull(classPlacements.validTo))
  return r?.n ?? 0
}
