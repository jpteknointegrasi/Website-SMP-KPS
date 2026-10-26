/**
 * Schema of a school's own App database (one PostgreSQL database per school; identical schema everywhere).
 * Foundation only (P0 start). Domain tables (people, guardians, admissions M14, academics, …) are added module by
 * module, each with a versioned migration — see docs/BLUEPRINT_ADDENDUM_v2.1.md.
 */
import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actorType: text('actor_type').notNull(), // staff | applicant | guardian | student | system
    actorId: text('actor_id'),
    action: text('action').notNull(),
    objectType: text('object_type'),
    objectId: text('object_id'),
    correlationId: text('correlation_id'),
    meta: jsonb('meta').$type<Record<string, string | number | boolean | null>>(),
  },
  (t) => [index('audit_events_object_idx').on(t.objectType, t.objectId), index('audit_events_occurred_idx').on(t.occurredAt)],
)
