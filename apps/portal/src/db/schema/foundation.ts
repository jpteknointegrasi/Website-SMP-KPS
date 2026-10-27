/**
 * Foundation tables of a school's own App database (one PostgreSQL database per school; identical schema
 * everywhere): ownership stamp, audit, idempotency, outbox, notifications, files, settings and staff roles.
 */
import { sql } from 'drizzle-orm'
import { bigint, bigserial, boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

const ts = (name: string) => timestamp(name, { withTimezone: true })

/**
 * Which school this database belongs to: exactly one row. Every connection checks it against the school the request
 * is for, so a wrongly configured URL can never show one school's data on another school's portal.
 */
export const schoolMeta = pgTable(
  'school_meta',
  {
    id: integer('id').primaryKey().default(1),
    schoolId: integer('school_id').notNull(),
    schoolSlug: text('school_slug').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [check('school_meta_single_row', sql`${t.id} = 1`)],
)

/**
 * Append-only audit of actions (who did what to which object). Metadata only: never copies sensitive content
 * (BK/UKS notes, documents, grades) into the log (Blueprint §26, §29).
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurredAt: ts('occurred_at').notNull().defaultNow(),
    actorType: text('actor_type').notNull(), // staff | account | system
    actorId: text('actor_id'),
    action: text('action').notNull(),
    objectType: text('object_type'),
    objectId: text('object_id'),
    correlationId: text('correlation_id'),
    meta: jsonb('meta').$type<Record<string, string | number | boolean | null>>(),
  },
  (t) => [index('audit_events_object_idx').on(t.objectType, t.objectId), index('audit_events_occurred_idx').on(t.occurredAt)],
)

/** Key/value settings of the school's App (branding, modules, card defaults, numbering…). */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

/** Idempotency: the same operation key from the same actor returns the first result instead of acting twice (§47.4). */
export const operationKeys = pgTable('operation_keys', {
  key: text('key').primaryKey(), // `${actor}:${command}:${clientKey}`
  command: text('command').notNull(),
  fingerprint: text('fingerprint').notNull(),
  result: jsonb('result'),
  createdAt: ts('created_at').notNull().defaultNow(),
})

/** Transactional outbox: events written in the same transaction as the change, delivered afterwards (§27, §47.3). */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
    correlationId: text('correlation_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    availableAt: ts('available_at').notNull().defaultNow(),
    attempts: integer('attempts').notNull().default(0),
    processedAt: ts('processed_at'),
    dead: boolean('dead').notNull().default(false),
    lastError: text('last_error'),
  },
  (t) => [index('outbox_pending_idx').on(t.availableAt).where(sql`${t.processedAt} IS NULL AND NOT ${t.dead}`)],
)

/** In-app inbox (staff or family account). Neutral texts only: no sensitive content (§17). */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientType: text('recipient_type').notNull(), // account | staff
    recipientId: text('recipient_id').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    link: text('link'),
    createdAt: ts('created_at').notNull().defaultNow(),
    readAt: ts('read_at'),
  },
  (t) => [index('notifications_recipient_idx').on(t.recipientType, t.recipientId, t.createdAt)],
)

/** Outgoing e-mail log. Message bodies are kept only when no mail server is configured (development). */
export const mailLog = pgTable('mail_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  body: text('body'),
  createdAt: ts('created_at').notNull().defaultNow(),
  sentAt: ts('sent_at'),
  error: text('error'),
})

/** Gap-free per-scope sequences (registration numbers, card numbers, receipts). */
export const counters = pgTable('counters', {
  name: text('name').primaryKey(),
  value: bigint('value', { mode: 'number' }).notNull().default(0),
})

/**
 * Stored files. Classification decides who may fetch them; every download goes through the portal, which checks the
 * owning record (§26: "a private bucket is not enough if the download endpoint does not check access").
 */
export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classification: text('classification').notNull(), // public | private | restricted
    contextType: text('context_type').notNull(),
    contextId: text('context_id'),
    storageKey: text('storage_key').notNull(),
    originalName: text('original_name').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    sha256: text('sha256').notNull(),
    uploadedByType: text('uploaded_by_type').notNull(),
    uploadedById: text('uploaded_by_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    deletedAt: ts('deleted_at'),
  },
  (t) => [uniqueIndex('files_storage_key_uq').on(t.storageKey), index('files_context_idx').on(t.contextType, t.contextId)],
)

/**
 * School staff known to the App. Staff sign in on the school's CMS (shared login); the row is bound to the CMS user on
 * their first visit, or pre-registered by e-mail by the school admin so roles can be given in advance.
 */
export const staffMembers = pgTable(
  'staff_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    webUserId: text('web_user_id'),
    email: text('email').notNull(),
    name: text('name').notNull(),
    displayName: text('display_name'), // e.g. "Bu Sari Wulandari, S.Pd."
    nip: text('nip'),
    position: text('position'),
    webRole: text('web_role'),
    active: boolean('active').notNull().default(true),
    lastSeenAt: ts('last_seen_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('staff_members_web_user_uq').on(t.webUserId), uniqueIndex('staff_members_email_uq').on(t.email)],
)

/** App roles of staff (separate from CMS roles: a website admin does not automatically see applicants' documents). */
export const staffRoles = pgTable(
  'staff_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffId: uuid('staff_id').notNull().references(() => staffMembers.id, { onDelete: 'restrict' }),
    role: text('role').notNull(),
    grantedBy: text('granted_by'),
    grantedAt: ts('granted_at').notNull().defaultNow(),
    revokedAt: ts('revoked_at'),
    revokedBy: text('revoked_by'),
  },
  (t) => [uniqueIndex('staff_roles_active_uq').on(t.staffId, t.role).where(sql`${t.revokedAt} IS NULL`)],
)

/**
 * Time-limited, reasoned and audited support access for the platform operator (§25). Read-only views only.
 */
export const supportGrants = pgTable('support_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorEmail: text('operator_email').notNull(),
  reason: text('reason').notNull(),
  scope: text('scope').notNull().default('operasional'), // operasional | data_siswa
  grantedBy: text('granted_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  expiresAt: ts('expires_at').notNull(),
  revokedAt: ts('revoked_at'),
})

/** Consents (publication of works/profile, data processing purposes) given by a guardian or adult person (§21, §44.7). */
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id').notNull(),
    purpose: text('purpose').notNull(),
    granted: boolean('granted').notNull(),
    givenByAccountId: uuid('given_by_account_id'),
    givenByStaffId: text('given_by_staff_id'),
    note: text('note'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('consents_person_idx').on(t.personId, t.purpose, t.createdAt)],
)
