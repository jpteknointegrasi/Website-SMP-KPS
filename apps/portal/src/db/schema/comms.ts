/**
 * M13 announcements (targeted, optional acknowledgement) and M12 school services (letters, data, consultation and
 * complaints) with a tracked timeline and an output document.
 */
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { students } from './people'

const ts = (name: string) => timestamp(name, { withTimezone: true })

export type Audience = { type: 'all' | 'staff' | 'families' | 'students' | 'guardians' | 'homerooms' | 'grades'; ids?: string[] }

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    audience: jsonb('audience').notNull().$type<Audience>(),
    status: text('status').notNull().default('draft'), // draft | published | archived
    publishAt: ts('publish_at'),
    requiresAck: boolean('requires_ack').notNull().default(false),
    pinned: boolean('pinned').notNull().default(false),
    fileIds: jsonb('file_ids').notNull().$type<string[]>().default([]),
    createdBy: text('created_by').notNull(),
    createdByName: text('created_by_name'),
    createdAt: ts('created_at').notNull().defaultNow(),
    publishedAt: ts('published_at'),
  },
  (t) => [index('announcements_status_idx').on(t.status, t.publishAt)],
)

export const announcementReceipts = pgTable(
  'announcement_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id),
    recipientType: text('recipient_type').notNull(), // account | staff
    recipientId: text('recipient_id').notNull(),
    studentId: uuid('student_id'), // the child the acknowledgement is for (guardians)
    readAt: ts('read_at'),
    ackAt: ts('ack_at'),
  },
  (t) => [uniqueIndex('announcement_receipts_uq').on(t.announcementId, t.recipientType, t.recipientId)],
)

export const serviceTypes = pgTable(
  'service_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull().default('surat'), // surat | data | konsultasi | keluhan | lainnya
    slaDays: integer('sla_days').notNull().default(3),
    requiresFile: boolean('requires_file').notNull().default(false),
    questions: jsonb('questions').notNull().$type<{ key: string; label: string; required?: boolean }[]>().default([]),
    active: boolean('active').notNull().default(true),
    ordinal: integer('ordinal').notNull().default(0),
  },
  (t) => [uniqueIndex('service_types_code_uq').on(t.code)],
)

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: text('number').notNull(),
    typeId: uuid('type_id')
      .notNull()
      .references(() => serviceTypes.id),
    studentId: uuid('student_id').references(() => students.id),
    requesterType: text('requester_type').notNull(), // account | staff
    requesterId: text('requester_id').notNull(),
    requesterName: text('requester_name'),
    answers: jsonb('answers').notNull().$type<Record<string, string>>().default({}),
    purpose: text('purpose'),
    status: text('status').notNull().default('submitted'), // submitted | in_progress | needs_info | completed | rejected | cancelled
    assignedTo: text('assigned_to'),
    outputFileId: uuid('output_file_id'),
    outputNo: text('output_no'),
    dueAt: ts('due_at'),
    closedAt: ts('closed_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('service_requests_number_uq').on(t.number), index('service_requests_status_idx').on(t.status)],
)

export const serviceEvents = pgTable(
  'service_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => serviceRequests.id),
    at: ts('at').notNull().defaultNow(),
    actorType: text('actor_type').notNull(),
    actorName: text('actor_name'),
    action: text('action').notNull(), // submitted | assigned | needs_info | info_added | completed | rejected | cancelled | note
    note: text('note'),
    fileId: uuid('file_id'),
    internal: boolean('internal').notNull().default(false),
  },
  (t) => [index('service_events_request_idx').on(t.requestId, t.at)],
)
