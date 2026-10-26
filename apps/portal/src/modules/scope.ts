/**
 * Attribute rules shared by modules (§25): which students a family account may see (verified, active guardian links
 * inside their validity period), which student an account is, which homerooms/assignments a teacher holds.
 */
import { and, eq, gte, isNull, lte, or, sql } from 'drizzle-orm'
import { academicYears, classPlacements, enrollments, gradeLevels, guardianLinks, guardians, homerooms, persons, students, teachingAssignments, terms } from '@/db/schema'
import type { Ctx } from '@/server/context'
import type { Db } from '@/server/command'
import { today } from '@/server/time'
import { forbidden } from '@/server/errors'

export type LinkedChild = { studentId: string; name: string; linkId: string; relation: string; canViewAcademic: boolean; canViewFinance: boolean }

/** Children the signed-in account may see as guardian, today. */
export async function linkedChildren(ctx: Ctx, db: Db = ctx.db): Promise<LinkedChild[]> {
  if (!ctx.account) return []
  const d = today(ctx.tz, ctx.now)
  const rows = await db
    .select({ studentId: students.id, name: persons.fullName, linkId: guardianLinks.id, relation: guardianLinks.relation, canViewAcademic: guardianLinks.canViewAcademic, canViewFinance: guardianLinks.canViewFinance })
    .from(guardianLinks)
    .innerJoin(guardians, eq(guardians.id, guardianLinks.guardianId))
    .innerJoin(students, eq(students.id, guardianLinks.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(
      and(
        eq(guardians.accountId, ctx.account.id),
        eq(guardianLinks.status, 'active'),
        or(isNull(guardianLinks.validFrom), lte(guardianLinks.validFrom, d)),
        or(isNull(guardianLinks.validTo), gte(guardianLinks.validTo, d)),
      ),
    )
    .orderBy(persons.fullName)
  return rows
}

/** The student record of the signed-in account (student's own account), if any. */
export async function ownStudent(ctx: Ctx, db: Db = ctx.db) {
  if (!ctx.account) return null
  const [s] = await db.select().from(students).where(and(eq(students.accountId, ctx.account.id), eq(students.status, 'active'))).limit(1)
  return s ?? null
}

/**
 * Students the account may see: itself (student) or linked children (guardian). `need` narrows guardian links by the
 * link's permission. Returns ids.
 */
export async function visibleStudentIds(ctx: Ctx, need: 'academic' | 'finance' | 'any' = 'any', db: Db = ctx.db) {
  const out = new Set<string>()
  const own = await ownStudent(ctx, db)
  if (own) out.add(own.id)
  for (const c of await linkedChildren(ctx, db))
    if (need === 'any' || (need === 'academic' && c.canViewAcademic) || (need === 'finance' && c.canViewFinance)) out.add(c.studentId)
  return out
}
export async function assertStudentVisible(ctx: Ctx, studentId: string, need: 'academic' | 'finance' | 'any' = 'any', db: Db = ctx.db) {
  if (!(await visibleStudentIds(ctx, need, db)).has(studentId)) forbidden('Data siswa ini tidak dapat Anda akses.')
}

export async function activeYear(db: Db) {
  const [y] = await db.select().from(academicYears).where(eq(academicYears.status, 'active')).limit(1)
  return y ?? null
}
/** The term whose dates contain `date`, else the active term. */
export async function currentTerm(ctx: Ctx, db: Db = ctx.db) {
  const d = today(ctx.tz, ctx.now)
  const [t] = await db.select().from(terms).where(and(lte(terms.startDate, d), gte(terms.endDate, d))).limit(1)
  if (t) return t
  const [a] = await db.select().from(terms).where(eq(terms.status, 'active')).limit(1)
  return a ?? null
}

/** Current homeroom of a student on a date (open placement of an active enrolment). */
export async function placementOn(db: Db, studentId: string, date: string) {
  const [p] = await db
    .select({ homeroomId: homerooms.id, homeroom: homerooms.name, gradeLevelId: gradeLevels.id, grade: gradeLevels.name, yearId: enrollments.yearId, enrollmentId: enrollments.id })
    .from(classPlacements)
    .innerJoin(enrollments, eq(enrollments.id, classPlacements.enrollmentId))
    .innerJoin(homerooms, eq(homerooms.id, classPlacements.homeroomId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, enrollments.gradeLevelId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        sql`${enrollments.status} <> 'ended'`,
        lte(classPlacements.validFrom, date),
        or(isNull(classPlacements.validTo), gte(classPlacements.validTo, date)),
      ),
    )
    .limit(1)
  return p ?? null
}

/** Student ids placed in a homeroom on a date. */
export async function homeroomStudents(db: Db, homeroomId: string, date: string) {
  return db
    .select({ studentId: students.id, name: persons.fullName, nis: students.nis, gender: persons.gender })
    .from(classPlacements)
    .innerJoin(enrollments, eq(enrollments.id, classPlacements.enrollmentId))
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(
      and(
        eq(classPlacements.homeroomId, homeroomId),
        sql`${enrollments.status} <> 'ended'`,
        eq(students.status, 'active'),
        lte(classPlacements.validFrom, date),
        or(isNull(classPlacements.validTo), gte(classPlacements.validTo, date)),
      ),
    )
    .orderBy(persons.fullName)
}

/** Homerooms where the staff member is homeroom teacher (wali kelas) in the active year. */
export async function myHomerooms(ctx: Ctx, db: Db = ctx.db) {
  if (!ctx.staff) return []
  const y = await activeYear(db)
  if (!y) return []
  return db.select().from(homerooms).where(and(eq(homerooms.homeroomTeacherId, ctx.staff.id), eq(homerooms.yearId, y.id)))
}

/** Teaching assignments of the staff member in a term. */
export async function myAssignments(ctx: Ctx, termId: string, db: Db = ctx.db) {
  if (!ctx.staff) return []
  return db
    .select()
    .from(teachingAssignments)
    .where(and(eq(teachingAssignments.teacherId, ctx.staff.id), eq(teachingAssignments.termId, termId), eq(teachingAssignments.active, true)))
}

/** Is the staff member the homeroom teacher of the student's current class? */
export async function isHomeroomTeacherOf(ctx: Ctx, studentId: string, db: Db = ctx.db) {
  if (!ctx.staff) return false
  const p = await placementOn(db, studentId, today(ctx.tz, ctx.now))
  if (!p) return false
  const [h] = await db.select({ t: homerooms.homeroomTeacherId }).from(homerooms).where(eq(homerooms.id, p.homeroomId))
  return h?.t === ctx.staff.id
}
