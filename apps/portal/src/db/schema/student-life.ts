/**
 * Student life (P3): counselling (M09, restricted), extracurricular activities (M10), achievements & student-affairs
 * reports (M11) and end-of-year promotion runs. Counselling notes live only in counseling_sessions.notes and are
 * never shown outside the counsellors; what may be shared is written separately as `sharedSummary` (§13.3).
 */
import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { staffMembers } from './foundation'
import { students } from './people'
import { academicYears, terms } from './academic'

const ts = (name: string) => timestamp(name, { withTimezone: true })

// ---------- M09 counselling ----------
export const counselingCases = pgTable(
  'counseling_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: text('number').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    source: text('source').notNull(), // student | guardian | homeroom | teacher | counselor
    category: text('category').notNull(), // pribadi | sosial | belajar | karier | lainnya
    urgency: text('urgency').notNull().default('normal'), // normal | segera
    request: text('request').notNull(), // what the requester wrote (visible to requester & counsellors)
    preferredTime: text('preferred_time'),
    requestedByType: text('requested_by_type').notNull(), // account | staff
    requestedById: text('requested_by_id').notNull(),
    status: text('status').notNull().default('new'), // new | assigned | in_progress | closed
    assignedTo: uuid('assigned_to').references(() => staffMembers.id),
    closedAt: ts('closed_at'),
    closingSummary: text('closing_summary'), // shareable closing note
    createdAt: ts('created_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [index('counseling_cases_student_idx').on(t.studentId), index('counseling_cases_assigned_idx').on(t.assignedTo)],
)

export const counselingSessions = pgTable('counseling_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => counselingCases.id),
  date: date('date').notNull(),
  mode: text('mode').notNull().default('tatap_muka'), // tatap_muka | daring | kunjungan | kelompok
  notes: text('notes'), // RESTRICTED: counsellors only
  sharedSummary: text('shared_summary'),
  shareWithGuardian: boolean('share_with_guardian').notNull().default(false),
  shareWithHomeroom: boolean('share_with_homeroom').notNull().default(false),
  followUpOn: date('follow_up_on'),
  counselorId: uuid('counselor_id')
    .notNull()
    .references(() => staffMembers.id),
  createdAt: ts('created_at').notNull().defaultNow(),
})

// ---------- M10 extracurricular ----------
export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearId: uuid('year_id')
      .notNull()
      .references(() => academicYears.id),
    name: text('name').notNull(),
    category: text('category').notNull().default('minat'), // wajib | minat
    description: text('description'),
    coachId: uuid('coach_id').references(() => staffMembers.id),
    schedule: text('schedule'),
    location: text('location'),
    capacity: integer('capacity'),
    requiresConsent: boolean('requires_consent').notNull().default(true),
    status: text('status').notNull().default('open'), // open | closed | archived
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('activities_year_name_uq').on(t.yearId, t.name)],
)

export const activityMembers = pgTable(
  'activity_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    // applied (student) → consented (guardian) → active (coach) | rejected | withdrawn
    status: text('status').notNull().default('applied'),
    motivation: text('motivation'),
    consentBy: text('consent_by'),
    consentAt: ts('consent_at'),
    decidedBy: text('decided_by'),
    decidedAt: ts('decided_at'),
    decisionNote: text('decision_note'),
    role: text('role'), // ketua, anggota …
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('activity_members_uq').on(t.activityId, t.studentId)],
)

export const activitySessions = pgTable('activity_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id')
    .notNull()
    .references(() => activities.id),
  date: date('date').notNull(),
  topic: text('topic'),
  attendance: jsonb('attendance').notNull().$type<Record<string, string>>().default({}), // studentId → H/S/I/A
  recordedBy: text('recorded_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const activityEvaluations = pgTable(
  'activity_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => terms.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    predicate: text('predicate'), // Sangat baik | Baik | Cukup | Perlu bimbingan
    description: text('description'),
    updatedBy: text('updated_by').notNull(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('activity_evaluations_uq').on(t.activityId, t.termId, t.studentId)],
)

// ---------- M11 student affairs ----------
export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    title: text('title').notNull(),
    field: text('field'), // akademik | olahraga | seni | keagamaan | lainnya
    level: text('level').notNull(), // sekolah | kota | provinsi | nasional | internasional
    rank: text('rank'),
    organizer: text('organizer'),
    date: date('date').notNull(),
    evidenceFileId: uuid('evidence_file_id'),
    status: text('status').notNull().default('submitted'), // submitted | verified | rejected
    publicConsent: boolean('public_consent').notNull().default(false), // may appear on the school website
    submittedByType: text('submitted_by_type').notNull(),
    submittedById: text('submitted_by_id').notNull(),
    reviewedBy: text('reviewed_by'),
    reviewedAt: ts('reviewed_at'),
    reviewNote: text('review_note'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('achievements_student_idx').on(t.studentId)],
)

/** Reports to student affairs (bullying, discipline, safety…) handled as a case with a follow-up timeline. */
export const affairsReports = pgTable('affairs_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull(),
  category: text('category').notNull(), // perundungan | kedisiplinan | keamanan | sarana | lainnya
  description: text('description').notNull(),
  occurredOn: date('occurred_on'),
  location: text('location'),
  studentIds: jsonb('student_ids').notNull().$type<string[]>().default([]), // students involved (staff-entered)
  reporterType: text('reporter_type').notNull(), // account | staff
  reporterId: text('reporter_id').notNull(),
  reporterName: text('reporter_name'),
  hideIdentity: boolean('hide_identity').notNull().default(false), // reporter shown only to student_affairs.coordinate (Waka Kesiswaan); see affairs redactReporter
  status: text('status').notNull().default('received'), // received | clarification | follow_up | closed
  assignedTo: uuid('assigned_to').references(() => staffMembers.id),
  outcome: text('outcome'),
  fileIds: jsonb('file_ids').notNull().$type<string[]>().default([]),
  createdAt: ts('created_at').notNull().defaultNow(),
  closedAt: ts('closed_at'),
  version: integer('version').notNull().default(1),
})

export const affairsEvents = pgTable('affairs_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => affairsReports.id),
  at: ts('at').notNull().defaultNow(),
  actorType: text('actor_type').notNull(),
  actorName: text('actor_name'),
  action: text('action').notNull(), // received | assigned | clarification | info_added | follow_up | closed | note
  note: text('note'),
  internal: boolean('internal').notNull().default(false),
})

// ---------- promotion (kenaikan kelas) ----------
export type PromotionLine = { studentId: string; name: string; fromHomeroom: string; decision: 'naik' | 'tinggal' | 'lulus' | 'keluar'; toHomeroomId: string | null }
export const promotionRuns = pgTable('promotion_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromYearId: uuid('from_year_id')
    .notNull()
    .references(() => academicYears.id),
  toYearId: uuid('to_year_id')
    .notNull()
    .references(() => academicYears.id),
  status: text('status').notNull().default('draft'), // draft | executed
  lines: jsonb('lines').notNull().$type<PromotionLine[]>().default([]),
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  executedBy: text('executed_by'),
  executedAt: ts('executed_at'),
  effectiveDate: date('effective_date'),
})
