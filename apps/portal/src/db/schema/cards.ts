/**
 * M02 Kartu Siswa QR: versioned templates, issued cards with a random QR token (≥128 bit; only its hash is used for
 * look-up), revocation and replacement (UI paket 02, panduan "Kartu dan QR").
 */
import { sql } from 'drizzle-orm'
import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { students } from './people'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export type CardTemplateSettings = {
  orientation: 'landscape' | 'portrait'
  scheme: 'biru' | 'cyan' | 'kuning' | 'netral'
  show: { photo: boolean; nis: boolean; nisn: boolean; entryYear: boolean; homeroom: boolean }
  validityMonths: number
  backText?: string
}

export const cardTemplates = pgTable('card_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  status: text('status').notNull().default('draft'), // draft | approved | retired
  settings: jsonb('settings').notNull().$type<CardTemplateSettings>(),
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  approvedBy: text('approved_by'),
  approvedAt: ts('approved_at'),
})

export const studentCards = pgTable(
  'student_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardNo: text('card_no').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    templateId: uuid('template_id')
      .notNull()
      .references(() => cardTemplates.id),
    tokenHash: text('token_hash').notNull(),
    tokenSealed: text('token_sealed').notNull(), // to re-render the same QR for (re)printing
    status: text('status').notNull().default('active'), // active | revoked | replaced | expired
    issuedAt: ts('issued_at').notNull().defaultNow(),
    issuedBy: text('issued_by').notNull(),
    validUntil: date('valid_until').notNull(),
    printedAt: ts('printed_at'),
    revokedAt: ts('revoked_at'),
    revokeReason: text('revoke_reason'),
    replacedById: uuid('replaced_by_id'),
  },
  (t) => [
    uniqueIndex('student_cards_no_uq').on(t.cardNo),
    uniqueIndex('student_cards_token_uq').on(t.tokenHash),
    uniqueIndex('student_cards_one_active_uq').on(t.studentId).where(sql`${t.status} = 'active'`),
  ],
)

export const cardReplacements = pgTable(
  'card_replacement_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    cardId: uuid('card_id').references(() => studentCards.id),
    reason: text('reason').notNull(), // hilang | rusak | tidak_terbaca | lainnya
    note: text('note'),
    deactivateOld: integer('deactivate_old').notNull().default(1),
    requestedByType: text('requested_by_type').notNull(),
    requestedById: text('requested_by_id').notNull(),
    status: text('status').notNull().default('submitted'), // submitted | approved | rejected
    processedBy: text('processed_by'),
    processedAt: ts('processed_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('card_replacements_status_idx').on(t.status)],
)
