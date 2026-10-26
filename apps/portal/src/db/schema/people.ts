/**
 * People, family accounts, students (Buku Induk), guardians and their verified relations (Blueprint §5, §26, §45).
 * Person and account are separate: one parent may register two children and later be a guardian, a student may get an
 * account later, a guardian without e-mail can still exist. Persons are local to this school's database.
 */
import { sql } from 'drizzle-orm'
import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { files } from './foundation'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    nickname: text('nickname'),
    gender: text('gender'), // L | P
    birthPlace: text('birth_place'),
    birthDate: date('birth_date'),
    religion: text('religion'),
    nationality: text('nationality'),
    nik: text('nik'), // permissioned attribute: never shown in lists, logs or exports by default
    familyCardNo: text('family_card_no'),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    occupation: text('occupation'),
    education: text('education'),
    photoFileId: uuid('photo_file_id').references(() => files.id),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [index('persons_name_idx').on(t.fullName)],
)

/** Family / student sign-in accounts of this school (staff sign in through the CMS instead). */
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    login: text('login').notNull(), // e-mail (lower case) or a username issued by the school
    email: text('email'),
    passwordHash: text('password_hash').notNull(),
    personId: uuid('person_id')
      .notNull()
      .references(() => persons.id),
    status: text('status').notNull().default('active'), // active | disabled
    emailVerifiedAt: ts('email_verified_at'),
    verifiedBy: text('verified_by'), // e.g. "email" or "staff:<id>" (family without e-mail, §41.4)
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    failedLogins: integer('failed_logins').notNull().default(0),
    lockedUntil: ts('locked_until'),
    lastLoginAt: ts('last_login_at'),
    createdBy: text('created_by'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('accounts_login_uq').on(t.login), uniqueIndex('accounts_person_uq').on(t.personId)],
)

export const accountSessions = pgTable(
  'account_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    lastSeenAt: ts('last_seen_at'),
  },
  (t) => [uniqueIndex('account_sessions_token_uq').on(t.tokenHash), index('account_sessions_account_idx').on(t.accountId)],
)

/** One-time tokens: e-mail verification, password reset. Only the hash is stored. */
export const accountTokens = pgTable(
  'account_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(), // verify_email | reset_password
    tokenHash: text('token_hash').notNull(),
    expiresAt: ts('expires_at').notNull(),
    usedAt: ts('used_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('account_tokens_hash_uq').on(t.tokenHash)],
)

/** Attempts per login/IP window (brute-force guard independent of whether the account exists). */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull(), // login:<login> | ip:<ip>
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('login_attempts_scope_idx').on(t.scope, t.at)],
)

/** Buku Induk: one row per student of this school. Internal id is the key; NIS/NISN are permissioned attributes. */
export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id')
      .notNull()
      .references(() => persons.id),
    nis: text('nis'),
    nisn: text('nisn'),
    status: text('status').notNull().default('active'), // active | graduated | transferred_out | withdrawn | inactive
    entryYear: integer('entry_year'),
    entryDate: date('entry_date'),
    entryGrade: text('entry_grade'),
    entryVia: text('entry_via').notNull().default('manual'), // admission | transfer_in | import | manual
    originSchool: text('origin_school'),
    exitDate: date('exit_date'),
    exitReason: text('exit_reason'),
    accountId: uuid('account_id').references(() => accounts.id),
    verifiedAt: ts('verified_at'),
    verifiedBy: text('verified_by'),
    extra: jsonb('extra').$type<Record<string, string>>(),
    notes: text('notes'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    updatedBy: text('updated_by'),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('students_person_uq').on(t.personId),
    uniqueIndex('students_nis_uq').on(t.nis),
    uniqueIndex('students_nisn_uq').on(t.nisn),
    uniqueIndex('students_account_uq').on(t.accountId),
    index('students_status_idx').on(t.status),
  ],
)

export const guardians = pgTable(
  'guardians',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id')
      .notNull()
      .references(() => persons.id),
    accountId: uuid('account_id').references(() => accounts.id),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('guardians_person_uq').on(t.personId), uniqueIndex('guardians_account_uq').on(t.accountId)],
)

/**
 * Guardian ↔ student relation. Access is granted only by an ACTIVE, verified link inside its validity period — never
 * by matching names, birth dates, NIS or phone numbers (§5).
 */
export const guardianLinks = pgTable(
  'guardian_student_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    relation: text('relation').notNull(), // ayah | ibu | wali
    status: text('status').notNull().default('pending'), // pending | active | revoked
    isPrimary: boolean('is_primary').notNull().default(false),
    canViewAcademic: boolean('can_view_academic').notNull().default(true),
    canViewFinance: boolean('can_view_finance').notNull().default(true),
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
    verificationMethod: text('verification_method'), // admission | activation_code | officer
    verifiedBy: text('verified_by'),
    verifiedAt: ts('verified_at'),
    revokedAt: ts('revoked_at'),
    revokedBy: text('revoked_by'),
    revokeReason: text('revoke_reason'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('guardian_links_open_uq').on(t.guardianId, t.studentId).where(sql`${t.status} <> 'revoked'`),
    index('guardian_links_student_idx').on(t.studentId),
  ],
)

/** One-time activation codes handed out by the school (guardian access to a student, or a student's own account). */
export const activationCodes = pgTable(
  'activation_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codeHash: text('code_hash').notNull(),
    purpose: text('purpose').notNull(), // guardian | student
    linkId: uuid('link_id').references(() => guardianLinks.id),
    studentId: uuid('student_id').references(() => students.id),
    expiresAt: ts('expires_at').notNull(),
    usedAt: ts('used_at'),
    usedByAccountId: uuid('used_by_account_id'),
    revokedAt: ts('revoked_at'),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('activation_codes_hash_uq').on(t.codeHash)],
)

/** Documents kept in the student's file (akta, KK, ijazah, pasfoto …). Private; reviewed by TU. */
export const studentDocuments = pgTable(
  'student_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    kind: text('kind').notNull(),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id),
    note: text('note'),
    uploadedBy: text('uploaded_by'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('student_documents_student_idx').on(t.studentId)],
)

/** Requested changes to Buku Induk data, with before/after, evidence and a reviewer decision (REG-03). */
export const dataCorrections = pgTable(
  'data_corrections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: text('number').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    requestedByType: text('requested_by_type').notNull(), // staff | account
    requestedById: text('requested_by_id').notNull(),
    requestedByName: text('requested_by_name'),
    changes: jsonb('changes').notNull().$type<{ field: string; before: string | null; after: string | null }[]>(),
    reason: text('reason').notNull(),
    evidenceFileId: uuid('evidence_file_id').references(() => files.id),
    status: text('status').notNull().default('submitted'), // submitted | needs_info | approved | rejected | cancelled
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: ts('reviewed_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('data_corrections_number_uq').on(t.number), index('data_corrections_status_idx').on(t.status)],
)

/** Excel/CSV import of students: upload → column mapping → validated preview → confirmed commit (REG-04). */
export const importBatches = pgTable('import_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull().default('students'),
  fileId: uuid('file_id').references(() => files.id),
  status: text('status').notNull().default('uploaded'), // uploaded | validated | committed | cancelled
  headers: jsonb('headers').$type<string[]>(),
  mapping: jsonb('mapping').$type<Record<string, string>>(),
  rows: jsonb('rows').$type<Record<string, string>[]>(),
  results: jsonb('results').$type<{ row: number; status: 'valid' | 'review' | 'error'; messages: string[] }[]>(),
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  committedAt: ts('committed_at'),
  summary: jsonb('summary').$type<Record<string, number>>(),
})
