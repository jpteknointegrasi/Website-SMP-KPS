/**
 * Student works proposed for the school website (Web↔App, addendum D): a teacher proposes a piece of work, a
 * guardian (or the school, recording written consent) consents to publication, the website imports it as a DRAFT
 * for editorial moderation. Withdrawing consent is always possible and is passed on to the website.
 */
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { staffMembers } from './foundation'
import { students } from './people'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export const workProposals = pgTable(
  'work_proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    title: text('title').notNull(),
    category: text('category').notNull(), // tulisan | seni | sains | teknologi | video | proyek_sosial (website categories)
    description: text('description').notNull(),
    publicName: text('public_name').notNull(), // e.g. "Alya P., kelas VII" — what the website may print
    mentorPublic: text('mentor_public'),
    year: integer('year').notNull(),
    fileIds: jsonb('file_ids').notNull().$type<string[]>().default([]), // images only
    sourceSubmissionId: uuid('source_submission_id'),
    proposedBy: uuid('proposed_by')
      .notNull()
      .references(() => staffMembers.id),
    // awaiting_consent → consented → imported | refused | withdrawn
    status: text('status').notNull().default('awaiting_consent'),
    consentBy: text('consent_by'), // account:<id> | staff:<id>:tertulis
    consentAt: ts('consent_at'),
    consentNote: text('consent_note'),
    importedAt: ts('imported_at'),
    withdrawnAt: ts('withdrawn_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [index('work_proposals_student_idx').on(t.studentId), index('work_proposals_status_idx').on(t.status)],
)
