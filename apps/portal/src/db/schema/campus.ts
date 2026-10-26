/**
 * P4 school services: library (M16), school health room UKS (M18, restricted), student organisations & activity
 * proposals (M19) and alumni with consent (M19/M21). UKS clinical notes are readable by health officers only;
 * guardians and homeroom teachers see the visit's date, outcome and a note written for them.
 */
import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { staffMembers } from './foundation'
import { students } from './people'
import { academicYears } from './academic'

const ts = (name: string) => timestamp(name, { withTimezone: true })

// ---------- M16 library ----------
export const libraryBooks = pgTable(
  'library_books',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(), // call number / inventory code
    isbn: text('isbn'),
    title: text('title').notNull(),
    author: text('author'),
    publisher: text('publisher'),
    year: integer('year'),
    category: text('category'),
    location: text('location'),
    copies: integer('copies').notNull().default(1),
    active: boolean('active').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('library_books_code_uq').on(t.code), index('library_books_title_idx').on(t.title)],
)

export const libraryLoans = pgTable(
  'library_loans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookId: uuid('book_id')
      .notNull()
      .references(() => libraryBooks.id),
    studentId: uuid('student_id').references(() => students.id),
    staffId: uuid('staff_id').references(() => staffMembers.id),
    borrowedOn: date('borrowed_on').notNull(),
    dueOn: date('due_on').notNull(),
    returnedOn: date('returned_on'),
    status: text('status').notNull().default('active'), // active | returned | lost
    renewals: integer('renewals').notNull().default(0),
    note: text('note'),
    handledBy: text('handled_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('library_loans_book_idx').on(t.bookId, t.status), index('library_loans_student_idx').on(t.studentId)],
)

// ---------- M18 UKS (restricted) ----------
export const healthVisits = pgTable(
  'health_visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    at: ts('at').notNull(),
    complaint: text('complaint').notNull(), // RESTRICTED
    action: text('action'), // RESTRICTED: first aid given
    notes: text('notes'), // RESTRICTED
    outcome: text('outcome').notNull(), // kembali_kelas | istirahat | pulang | rujuk
    familyNote: text('family_note'), // what guardians may read
    guardianNotified: boolean('guardian_notified').notNull().default(false),
    followUpOn: date('follow_up_on'),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => staffMembers.id),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('health_visits_student_idx').on(t.studentId, t.at)],
)

// ---------- M19 organisations ----------
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearId: uuid('year_id')
      .notNull()
      .references(() => academicYears.id),
    name: text('name').notNull(),
    description: text('description'),
    advisorId: uuid('advisor_id').references(() => staffMembers.id),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('organizations_year_name_uq').on(t.yearId, t.name)],
)

export const orgMembers = pgTable(
  'org_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    position: text('position').notNull().default('Anggota'),
    canPropose: boolean('can_propose').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('org_members_uq').on(t.orgId, t.studentId)],
)

export const orgProposals = pgTable('org_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  location: text('location'),
  budget: integer('budget'),
  participants: text('participants'),
  isPublic: boolean('is_public').notNull().default(false), // to the school calendar/website when approved
  status: text('status').notNull().default('submitted'), // submitted | revision | approved | rejected | reported
  submittedByType: text('submitted_by_type').notNull(),
  submittedById: text('submitted_by_id').notNull(),
  submittedByName: text('submitted_by_name'),
  reviewNote: text('review_note'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: ts('reviewed_at'),
  eventId: uuid('event_id'), // academic_events row created on approval
  report: text('report'), // laporan pertanggungjawaban
  reportFileIds: jsonb('report_file_ids').notNull().$type<string[]>().default([]),
  createdAt: ts('created_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
})

// ---------- alumni ----------
export const alumniProfiles = pgTable(
  'alumni_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    graduationYear: text('graduation_year').notNull(),
    continuingTo: text('continuing_to'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    story: text('story'),
    consentContact: boolean('consent_contact').notNull().default(false),
    consentPublic: boolean('consent_public').notNull().default(false),
    consentRecordedBy: text('consent_recorded_by'),
    consentAt: ts('consent_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('alumni_profiles_student_uq').on(t.studentId)],
)
