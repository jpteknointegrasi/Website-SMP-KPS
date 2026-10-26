/**
 * M03 academic master data: years, terms, grade levels, homerooms (rombel), subjects, enrolments, placements and
 * teaching assignments (Blueprint §6, §26). Access to class content always follows the effective period (§27).
 */
import { sql } from 'drizzle-orm'
import { boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { staffMembers } from './foundation'
import { students } from './people'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export const academicYears = pgTable(
  'academic_years',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(), // 2026/2027
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: text('status').notNull().default('planned'), // planned | active | closed
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('academic_years_name_uq').on(t.name), uniqueIndex('academic_years_one_active').on(t.status).where(sql`${t.status} = 'active'`)],
)

export const terms = pgTable(
  'terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearId: uuid('year_id')
      .notNull()
      .references(() => academicYears.id),
    name: text('name').notNull(), // Ganjil | Genap
    ordinal: integer('ordinal').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: text('status').notNull().default('planned'), // planned | active | closed
  },
  (t) => [uniqueIndex('terms_year_ordinal_uq').on(t.yearId, t.ordinal)],
)

export const gradeLevels = pgTable(
  'grade_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(), // VII, VIII, IX
    ordinal: integer('ordinal').notNull(),
    final: boolean('final').notNull().default(false), // graduating level
  },
  (t) => [uniqueIndex('grade_levels_name_uq').on(t.name)],
)

export const homerooms = pgTable(
  'homerooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearId: uuid('year_id')
      .notNull()
      .references(() => academicYears.id),
    gradeLevelId: uuid('grade_level_id')
      .notNull()
      .references(() => gradeLevels.id),
    name: text('name').notNull(), // VII A
    homeroomTeacherId: uuid('homeroom_teacher_id').references(() => staffMembers.id),
    room: text('room'),
    capacity: integer('capacity'),
  },
  (t) => [uniqueIndex('homerooms_year_name_uq').on(t.yearId, t.name)],
)

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    group: text('group'),
    ordinal: integer('ordinal').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [uniqueIndex('subjects_code_uq').on(t.code)],
)

/** A student's membership of a school year at a level. At most one active enrolment per student and year. */
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    yearId: uuid('year_id')
      .notNull()
      .references(() => academicYears.id),
    gradeLevelId: uuid('grade_level_id')
      .notNull()
      .references(() => gradeLevels.id),
    status: text('status').notNull().default('active'), // planned | active | ended
    startDate: date('start_date'),
    endDate: date('end_date'),
    outcome: text('outcome'), // promoted | retained | graduated | transferred_out | withdrawn
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('enrollments_student_year_open_uq').on(t.studentId, t.yearId).where(sql`${t.status} <> 'ended'`),
    index('enrollments_year_idx').on(t.yearId),
  ],
)

/** Placement of an enrolment in a homeroom for a period (moves keep history). */
export const classPlacements = pgTable(
  'class_placements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id),
    homeroomId: uuid('homeroom_id')
      .notNull()
      .references(() => homerooms.id),
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('class_placements_open_uq').on(t.enrollmentId).where(sql`${t.validTo} IS NULL`),
    index('class_placements_homeroom_idx').on(t.homeroomId),
  ],
)

/** Who teaches which subject to which homeroom in a term. Scope for materials, tasks, attendance and grades. */
export const teachingAssignments = pgTable(
  'teaching_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    termId: uuid('term_id')
      .notNull()
      .references(() => terms.id),
    homeroomId: uuid('homeroom_id')
      .notNull()
      .references(() => homerooms.id),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => staffMembers.id),
    hoursPerWeek: integer('hours_per_week'),
    active: boolean('active').notNull().default(true),
  },
  (t) => [
    uniqueIndex('teaching_assignments_uq').on(t.termId, t.homeroomId, t.subjectId).where(sql`${t.active}`),
    index('teaching_assignments_teacher_idx').on(t.teacherId),
  ],
)
