/**
 * M08 grade book & report cards (§42.3): assessment items per teaching assignment, scores, the subject's term result
 * (score + competency description) submitted by the teacher, and report cards per student per term that move
 * draft → submitted by the homeroom teacher → approved by curriculum (frozen snapshot) → released to families.
 * Every re-issue keeps the previous snapshot as a version. No class ranking is stored or shown (§42.3).
 */
import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { staffMembers } from './foundation'
import { students } from './people'
import { homerooms, teachingAssignments, terms } from './academic'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export const gradeItems = pgTable(
  'grade_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => teachingAssignments.id),
    kind: text('kind').notNull(), // formatif | sumatif | sts | sas
    title: text('title').notNull(),
    date: date('date'),
    maxScore: integer('max_score').notNull().default(100),
    weight: integer('weight').notNull().default(1), // relative weight within its kind
    taskId: uuid('task_id'), // imported from a learning task
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('grade_items_assignment_idx').on(t.assignmentId)],
)

export const gradeEntries = pgTable(
  'grade_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => gradeItems.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    score: numeric('score', { precision: 6, scale: 2 }),
    note: text('note'),
    enteredBy: text('entered_by').notNull(),
    enteredAt: ts('entered_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('grade_entries_uq').on(t.itemId, t.studentId)],
)

/** Term result of one subject for one student: final score (computed, adjustable with reason) + description. */
export const subjectResults = pgTable(
  'subject_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => teachingAssignments.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    computed: numeric('computed', { precision: 6, scale: 2 }),
    finalScore: numeric('final_score', { precision: 6, scale: 2 }),
    adjustReason: text('adjust_reason'),
    description: text('description'),
    updatedBy: text('updated_by').notNull(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('subject_results_uq').on(t.assignmentId, t.studentId)],
)

/** Teacher's submission of an assignment's results for the term (locks editing until returned). */
export const resultSubmissions = pgTable(
  'result_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => teachingAssignments.id),
    status: text('status').notNull().default('submitted'), // submitted | returned
    submittedBy: text('submitted_by').notNull(),
    submittedAt: ts('submitted_at').notNull().defaultNow(),
    returnedBy: text('returned_by'),
    returnedAt: ts('returned_at'),
    returnNote: text('return_note'),
  },
  (t) => [uniqueIndex('result_submissions_uq').on(t.assignmentId)],
)

export type ReportSnapshot = {
  student: { name: string; nis: string | null; nisn: string | null }
  school: { name: string; city: string; address: string; principal: string; principalNip: string }
  homeroom: string
  grade: string
  year: string
  term: string
  homeroomTeacher: string | null
  subjects: { code: string; name: string; group: string | null; score: number | null; description: string | null; teacher: string }[]
  attendance: { S: number; I: number; A: number }
  activities: { name: string; predicate: string | null; description: string | null }[]
  achievements: { title: string; level: string; rank: string | null }[]
  notes: string | null
  promotion: string | null
}

export const reportCards = pgTable(
  'report_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    termId: uuid('term_id')
      .notNull()
      .references(() => terms.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    homeroomId: uuid('homeroom_id')
      .notNull()
      .references(() => homerooms.id),
    status: text('status').notNull().default('draft'), // draft | submitted | approved | released
    notes: text('notes'), // catatan wali kelas
    promotion: text('promotion'), // naik | tinggal | lulus (last term of the year)
    snapshot: jsonb('snapshot').$type<ReportSnapshot>(),
    versionNo: integer('version_no').notNull().default(0),
    submittedBy: uuid('submitted_by').references(() => staffMembers.id),
    submittedAt: ts('submitted_at'),
    approvedBy: text('approved_by'),
    approvedAt: ts('approved_at'),
    releasedBy: text('released_by'),
    releasedAt: ts('released_at'),
    returnNote: text('return_note'),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('report_cards_uq').on(t.termId, t.studentId)],
)

export const reportCardVersions = pgTable(
  'report_card_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportCardId: uuid('report_card_id')
      .notNull()
      .references(() => reportCards.id),
    versionNo: integer('version_no').notNull(),
    snapshot: jsonb('snapshot').notNull().$type<ReportSnapshot>(),
    reason: text('reason'),
    released: boolean('released').notNull().default(false),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('report_card_versions_uq').on(t.reportCardId, t.versionNo)],
)
