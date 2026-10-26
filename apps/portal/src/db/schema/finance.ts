/**
 * M17 Tagihan & pembayaran (Blueprint §21, §44.5): invoices for an applicant (before there is a student) or a student,
 * payments with proof that only count once verified, receipts. Amounts are integer rupiah.
 */
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, date } from 'drizzle-orm/pg-core'
import { accounts, students } from './people'
import { applications } from './admissions'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export const invoices = pgTable(
  'billing_invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: text('number').notNull(),
    category: text('category').notNull(), // pendaftaran | daftar_ulang | spp | kegiatan | lainnya
    title: text('title').notNull(),
    items: jsonb('items').notNull().$type<{ label: string; amount: number }[]>(),
    amount: integer('amount').notNull(),
    paid: integer('paid').notNull().default(0),
    applicationId: uuid('application_id').references(() => applications.id),
    studentId: uuid('student_id').references(() => students.id),
    accountId: uuid('account_id').references(() => accounts.id), // responsible party (payer)
    dueDate: date('due_date'),
    status: text('status').notNull().default('unpaid'), // unpaid | partial | paid | cancelled | waived
    note: text('note'),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('invoices_number_uq').on(t.number), index('invoices_student_idx').on(t.studentId), index('invoices_application_idx').on(t.applicationId)],
)

export const payments = pgTable(
  'billing_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id),
    amount: integer('amount').notNull(),
    method: text('method').notNull(), // transfer | tunai | lainnya
    paidOn: date('paid_on').notNull(),
    payerName: text('payer_name'),
    proofFileId: uuid('proof_file_id'),
    externalReference: text('external_reference'),
    status: text('status').notNull().default('submitted'), // submitted | verified | rejected
    submittedByType: text('submitted_by_type').notNull(),
    submittedById: text('submitted_by_id').notNull(),
    verifiedBy: text('verified_by'),
    verifiedAt: ts('verified_at'),
    rejectReason: text('reject_reason'),
    receiptNo: text('receipt_no'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('payments_external_uq').on(t.externalReference), uniqueIndex('payments_receipt_uq').on(t.receiptNo), index('payments_invoice_idx').on(t.invoiceId)],
)
