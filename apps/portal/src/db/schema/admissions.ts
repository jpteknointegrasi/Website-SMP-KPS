/**
 * M14 Penerimaan Siswa Baru (Blueprint §19, §41, §47): cycles, waves, paths & quotas, versioned forms, applications,
 * versioned documents, selection, versioned decisions released in batches, seat reservations, re-enrolment and
 * idempotent conversion into students.
 */
import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { staffMembers } from './foundation'
import { accounts, persons, students } from './people'
import { enrollments } from './academic'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export type FormFieldDef = { key: string; label: string; type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox'; options?: string[]; required?: boolean; help?: string }
export type DocumentReq = { code: string; label: string; required: boolean; help?: string }
export type SelectionComponent = { code: string; label: string; max: number; weight: number }
export type ChecklistItemDef = { code: string; label: string; kind: 'document' | 'confirm' | 'payment' | 'staff'; help?: string }
export type ChecklistItem = ChecklistItemDef & { state: 'pending' | 'done' | 'verified' | 'rejected' | 'waived'; fileId?: string | null; note?: string | null }

export const admissionCycles = pgTable(
  'admission_cycles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(), // prefix of registration numbers, e.g. PPDB27
    name: text('name').notNull(),
    targetYear: text('target_year').notNull(), // 2027/2028
    targetGrade: text('target_grade').notNull(), // VII
    status: text('status').notNull().default('draft'), // draft | ready_for_review | approved | open | closed | archived
    openAt: ts('open_at'),
    closeAt: ts('close_at'),
    selectionEnabled: boolean('selection_enabled').notNull().default(true),
    offerDays: integer('offer_days').notNull().default(14), // days to confirm an offer after release
    reenrollDays: integer('reenroll_days').notNull().default(21),
    requireNik: boolean('require_nik').notNull().default(false),
    formFields: jsonb('form_fields').notNull().$type<FormFieldDef[]>().default([]),
    formVersion: integer('form_version').notNull().default(1),
    info: text('info'), // requirements, schedule, costs as published by the school
    dataNotice: text('data_notice'),
    helpContact: text('help_contact'),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    approvedBy: text('approved_by'),
    approvedAt: ts('approved_at'),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('admission_cycles_code_uq').on(t.code)],
)

export const admissionWaves = pgTable('admission_waves', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id')
    .notNull()
    .references(() => admissionCycles.id),
  name: text('name').notNull(),
  openAt: ts('open_at').notNull(),
  closeAt: ts('close_at').notNull(),
})

export const admissionPaths = pgTable('admission_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id')
    .notNull()
    .references(() => admissionCycles.id),
  name: text('name').notNull(),
  description: text('description'),
  quota: integer('quota').notNull(),
  documents: jsonb('documents').notNull().$type<DocumentReq[]>().default([]),
  components: jsonb('components').notNull().$type<SelectionComponent[]>().default([]),
  registrationFee: integer('registration_fee').notNull().default(0), // rupiah, 0 = free
  reenrollFee: integer('reenroll_fee').notNull().default(0),
  checklist: jsonb('checklist').notNull().$type<ChecklistItemDef[]>().default([]),
  ordinal: integer('ordinal').notNull().default(0),
  active: boolean('active').notNull().default(true),
})

export const applications = pgTable(
  'admission_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => admissionCycles.id),
    waveId: uuid('wave_id').references(() => admissionWaves.id),
    pathId: uuid('path_id')
      .notNull()
      .references(() => admissionPaths.id),
    ownerAccountId: uuid('owner_account_id')
      .notNull()
      .references(() => accounts.id),
    applicantPersonId: uuid('applicant_person_id')
      .notNull()
      .references(() => persons.id),
    status: text('status').notNull().default('draft'), // draft | submitted | under_verification | needs_revision | resubmitted | verified | rejected | withdrawn
    registrationNo: text('registration_no'),
    data: jsonb('data').notNull().$type<Record<string, string>>().default({}), // applicant & family fields (current)
    answers: jsonb('answers').notNull().$type<Record<string, string>>().default({}), // custom form fields
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>(), // at (re)submit
    formVersion: integer('form_version'),
    submittedAt: ts('submitted_at'),
    resubmittedAt: ts('resubmitted_at'),
    verifierId: uuid('verifier_id').references(() => staffMembers.id),
    revisionNote: text('revision_note'),
    revisionFields: jsonb('revision_fields').$type<string[]>(),
    revisionDue: ts('revision_due'),
    eligibility: text('eligibility').notNull().default('pending'), // pending | eligible | not_eligible | exempted
    rejectReason: text('reject_reason'),
    verifiedAt: ts('verified_at'),
    verifiedBy: text('verified_by'),
    assistedBy: text('assisted_by'),
    assistedReason: text('assisted_reason'),
    duplicateOf: uuid('duplicate_of'),
    withdrawnAt: ts('withdrawn_at'),
    // Link to an interest form (minat) the family filled on the school website (addendum D), with their consent
    leadLinkState: text('lead_link_state'), // null | requested | linked | not_found
    leadLinkConsentAt: ts('lead_link_consent_at'),
    leadRef: text('lead_ref'), // the website's interest reference number
    leadDate: ts('lead_date'),
    leadCheckedAt: ts('lead_checked_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('applications_regno_uq').on(t.registrationNo),
    index('applications_cycle_status_idx').on(t.cycleId, t.status),
    index('applications_owner_idx').on(t.ownerAccountId),
    index('applications_lead_link_idx').on(t.leadLinkState),
  ],
)

/** Append-only document versions; a replacement sets the related check back to pending. */
export const applicationDocuments = pgTable(
  'application_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    code: text('code').notNull(),
    versionNo: integer('version_no').notNull(),
    fileId: uuid('file_id').notNull(),
    state: text('state').notNull().default('pending'), // pending | verified | revision_required | rejected
    note: text('note'),
    uploadedBy: text('uploaded_by').notNull(),
    reviewedBy: text('reviewed_by'),
    reviewedAt: ts('reviewed_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('application_documents_version_uq').on(t.applicationId, t.code, t.versionNo)],
)

export const selectionSessions = pgTable('selection_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id')
    .notNull()
    .references(() => admissionCycles.id),
  pathId: uuid('path_id').references(() => admissionPaths.id),
  title: text('title').notNull(),
  kind: text('kind').notNull().default('tes'), // tes | wawancara | lainnya
  startsAt: ts('starts_at').notNull(),
  endsAt: ts('ends_at').notNull(),
  location: text('location').notNull(),
  capacity: integer('capacity').notNull(),
  instructions: text('instructions'),
  status: text('status').notNull().default('scheduled'), // scheduled | done | cancelled
  createdBy: text('created_by').notNull(),
})

export const sessionAssessors = pgTable(
  'selection_session_assessors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staffMembers.id),
  },
  (t) => [uniqueIndex('session_assessors_uq').on(t.sessionId, t.staffId)],
)

export const sessionParticipants = pgTable(
  'selection_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    state: text('state').notNull().default('scheduled'), // scheduled | confirmed | attended | no_show | rescheduled | cancelled
    note: text('note'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('participants_open_uq').on(t.sessionId, t.applicationId).where(sql`${t.state} NOT IN ('rescheduled', 'cancelled')`)],
)

export const selectionScores = pgTable(
  'selection_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    component: text('component').notNull(),
    assessorId: uuid('assessor_id')
      .notNull()
      .references(() => staffMembers.id),
    score: numeric('score', { precision: 6, scale: 2 }).notNull(),
    note: text('note'), // internal: never shown to families
    status: text('status').notNull().default('draft'), // draft | submitted | locked | superseded
    revision: integer('revision').notNull().default(1),
    lockedBy: text('locked_by'),
    lockedAt: ts('locked_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('selection_scores_current_uq').on(t.applicationId, t.component, t.assessorId).where(sql`${t.status} <> 'superseded'`)],
)

export const decisionBatches = pgTable('decision_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id')
    .notNull()
    .references(() => admissionCycles.id),
  title: text('title').notNull(),
  status: text('status').notNull().default('proposed'), // proposed | in_review | approved | released | cancelled
  releaseAt: ts('release_at'),
  instructions: text('instructions'), // what offered applicants do next (shown with the result)
  proposedBy: text('proposed_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  reviewedBy: text('reviewed_by'),
  approvedBy: text('approved_by'),
  approvedAt: ts('approved_at'),
  releasedBy: text('released_by'),
  releasedAt: ts('released_at'),
  notifiedAt: ts('notified_at'),
  version: integer('version').notNull().default(1),
})

/** One row per application per decision; a changed result is a new version (old one superseded). */
export const decisionVersions = pgTable(
  'decision_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => decisionBatches.id),
    versionNo: integer('version_no').notNull(),
    outcome: text('outcome').notNull(), // offered | waitlisted | not_selected
    reasonCode: text('reason_code'),
    internalNote: text('internal_note'),
    superseded: boolean('superseded').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('decision_versions_uq').on(t.applicationId, t.versionNo), index('decision_versions_batch_idx').on(t.batchId)],
)

export const seatReservations = pgTable(
  'seat_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    pathId: uuid('path_id')
      .notNull()
      .references(() => admissionPaths.id),
    decisionVersionId: uuid('decision_version_id')
      .notNull()
      .references(() => decisionVersions.id),
    state: text('state').notNull().default('reserved'), // reserved | confirmed | expired | released
    expiresAt: ts('expires_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('seat_reservations_active_uq').on(t.applicationId).where(sql`${t.state} IN ('reserved', 'confirmed')`), index('seat_reservations_path_idx').on(t.pathId, t.state)],
)

export const reenrollments = pgTable(
  'reenrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    status: text('status').notNull().default('in_progress'), // in_progress | needs_revision | submitted | verified | declined | expired | cancelled
    checklist: jsonb('checklist').notNull().$type<ChecklistItem[]>(),
    dueAt: ts('due_at'),
    submittedAt: ts('submitted_at'),
    verifiedBy: text('verified_by'),
    verifiedAt: ts('verified_at'),
    note: text('note'),
    createdAt: ts('created_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('reenrollments_application_uq').on(t.applicationId)],
)

export const conversionOps = pgTable(
  'conversion_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    state: text('state').notNull().default('pending'), // pending | succeeded | failed
    attempts: integer('attempts').notNull().default(0),
    studentId: uuid('student_id').references(() => students.id),
    error: text('error'),
    by: text('by').notNull(),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('conversion_ops_application_uq').on(t.applicationId)],
)

export const applicantStudentMappings = pgTable(
  'applicant_student_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id),
    mappedBy: text('mapped_by').notNull(),
    mappedAt: ts('mapped_at').notNull().defaultNow(),
    matched: boolean('matched').notNull().default(false), // mapped to an existing student record
  },
  (t) => [uniqueIndex('applicant_mapping_application_uq').on(t.applicationId)],
)

