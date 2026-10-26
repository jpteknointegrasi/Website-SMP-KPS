/**
 * Daily academics (P2): timetable versions & exceptions, academic calendar, lesson sessions & teaching journals (M04,
 * M05), materials, tasks & submissions with feedback (M06), daily/lesson attendance, leave requests and corrections
 * (M07). Every row belongs to a term/homeroom/assignment so access follows the effective period (§27).
 */

import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { staffMembers } from './foundation'
import { students } from './people'
import { homerooms, teachingAssignments, terms } from './academic'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export const timeSlots = pgTable(
  'time_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ordinal: integer('ordinal').notNull(),
    label: text('label').notNull(), // "Jam 1"
    startTime: text('start_time').notNull(), // 07:00
    endTime: text('end_time').notNull(),
    kind: text('kind').notNull().default('lesson'), // lesson | break
  },
  (t) => [uniqueIndex('time_slots_ordinal_uq').on(t.ordinal)],
)

export const timetableVersions = pgTable('timetable_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  termId: uuid('term_id')
    .notNull()
    .references(() => terms.id),
  versionNo: integer('version_no').notNull(),
  status: text('status').notNull().default('draft'), // draft | published | superseded
  note: text('note'),
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  publishedBy: text('published_by'),
  publishedAt: ts('published_at'),
  effectiveFrom: date('effective_from'),
})

export const timetableEntries = pgTable(
  'timetable_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => timetableVersions.id),
    homeroomId: uuid('homeroom_id')
      .notNull()
      .references(() => homerooms.id),
    day: integer('day').notNull(), // 1 = Senin … 6 = Sabtu
    slotId: uuid('slot_id')
      .notNull()
      .references(() => timeSlots.id),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => teachingAssignments.id),
    room: text('room'),
  },
  (t) => [uniqueIndex('timetable_entries_cell_uq').on(t.versionId, t.homeroomId, t.day, t.slotId), index('timetable_entries_assignment_idx').on(t.assignmentId)],
)

/** Holidays, cancellations, substitutions on a date (whole school or one homeroom; whole day or one slot). */
export const scheduleExceptions = pgTable(
  'schedule_exceptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull(),
    homeroomId: uuid('homeroom_id').references(() => homerooms.id),
    slotId: uuid('slot_id').references(() => timeSlots.id),
    kind: text('kind').notNull(), // libur | batal | pengganti
    substituteTeacherId: uuid('substitute_teacher_id').references(() => staffMembers.id),
    note: text('note'),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('schedule_exceptions_date_idx').on(t.date)],
)

export const academicEvents = pgTable(
  'academic_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    kind: text('kind').notNull().default('kegiatan'), // libur | ujian | kegiatan | rapat
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    audience: text('audience').notNull().default('all'), // all | staff | families
    isPublic: boolean('is_public').notNull().default(false), // may be shown on the school website agenda
    description: text('description'),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('academic_events_date_idx').on(t.startDate)],
)

/** One lesson that took place on a date (created when the teacher opens it). Stable per entry+date (§27). */
export const lessonSessions = pgTable(
  'lesson_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => timetableEntries.id),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => teachingAssignments.id),
    homeroomId: uuid('homeroom_id')
      .notNull()
      .references(() => homerooms.id),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => staffMembers.id),
    status: text('status').notNull().default('held'), // held | cancelled
    topic: text('topic'),
    notes: text('notes'),
    realization: text('realization'), // sesuai | sebagian | tidak
    journalAt: ts('journal_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('lesson_sessions_entry_date_uq').on(t.entryId, t.date), index('lesson_sessions_assignment_idx').on(t.assignmentId, t.date)],
)

export const materials = pgTable(
  'learning_materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => teachingAssignments.id),
    title: text('title').notNull(),
    unit: text('unit'), // topic / learning unit
    body: text('body'),
    links: jsonb('links').notNull().$type<string[]>().default([]),
    fileIds: jsonb('file_ids').notNull().$type<string[]>().default([]),
    status: text('status').notNull().default('draft'), // draft | published
    publishedAt: ts('published_at'),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('materials_assignment_idx').on(t.assignmentId)],
)

export const tasks = pgTable(
  'learning_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => teachingAssignments.id),
    title: text('title').notNull(),
    kind: text('kind').notNull().default('tugas'), // tugas | kuis | proyek | ulangan
    instructions: text('instructions'),
    fileIds: jsonb('file_ids').notNull().$type<string[]>().default([]),
    dueAt: ts('due_at'),
    maxScore: integer('max_score').notNull().default(100),
    allowLate: boolean('allow_late').notNull().default(true),
    submissionType: text('submission_type').notNull().default('file_or_text'), // file_or_text | none (offline)
    status: text('status').notNull().default('draft'), // draft | published | closed
    publishedAt: ts('published_at'),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [index('tasks_assignment_idx').on(t.assignmentId)],
)

/** Append-only submission versions (resubmission keeps history). */
export const submissions = pgTable(
  'task_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    versionNo: integer('version_no').notNull(),
    text: text('text'),
    fileIds: jsonb('file_ids').notNull().$type<string[]>().default([]),
    submittedAt: ts('submitted_at').notNull().defaultNow(),
    late: boolean('late').notNull().default(false),
    submittedBy: text('submitted_by').notNull(),
  },
  (t) => [uniqueIndex('submissions_version_uq').on(t.taskId, t.studentId, t.versionNo)],
)

export const taskReviews = pgTable(
  'task_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    score: numeric('score', { precision: 6, scale: 2 }),
    feedback: text('feedback'),
    status: text('status').notNull().default('returned'), // returned | needs_revision
    reviewedBy: text('reviewed_by').notNull(),
    reviewedAt: ts('reviewed_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('task_reviews_uq').on(t.taskId, t.studentId)],
)

/** Daily attendance per student (homeroom teacher). H hadir, S sakit, I izin, A tanpa keterangan, D dispensasi. */
export const dailyAttendance = pgTable(
  'daily_attendance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    homeroomId: uuid('homeroom_id')
      .notNull()
      .references(() => homerooms.id),
    status: text('status').notNull(),
    note: text('note'),
    source: text('source').notNull().default('homeroom'), // homeroom | leave | correction
    recordedBy: text('recorded_by').notNull(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('daily_attendance_uq').on(t.date, t.studentId), index('daily_attendance_homeroom_idx').on(t.homeroomId, t.date)],
)

export const lessonAttendance = pgTable(
  'lesson_attendance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => lessonSessions.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    status: text('status').notNull(),
    note: text('note'),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('lesson_attendance_uq').on(t.sessionId, t.studentId)],
)

export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    kind: text('kind').notNull(), // sakit | izin | dispensasi
    fromDate: date('from_date').notNull(),
    toDate: date('to_date').notNull(),
    reason: text('reason').notNull(),
    fileId: uuid('file_id'),
    requestedByType: text('requested_by_type').notNull(),
    requestedById: text('requested_by_id').notNull(),
    status: text('status').notNull().default('submitted'), // submitted | approved | rejected | cancelled
    reviewedBy: text('reviewed_by'),
    reviewedAt: ts('reviewed_at'),
    reviewNote: text('review_note'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('leave_requests_student_idx').on(t.studentId, t.fromDate)],
)

/** Change of an attendance record after its edit window: requested, reviewed, applied with history (M07). */
export const attendanceCorrections = pgTable('attendance_corrections', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  date: date('date').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  reason: text('reason').notNull(),
  requestedByType: text('requested_by_type').notNull(),
  requestedById: text('requested_by_id').notNull(),
  status: text('status').notNull().default('submitted'), // submitted | approved | rejected
  reviewedBy: text('reviewed_by'),
  reviewedAt: ts('reviewed_at'),
  reviewNote: text('review_note'),
  createdAt: ts('created_at').notNull().defaultNow(),
})

