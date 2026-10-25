import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

// Private records (leads, bookings, messages) carry a random `reference`: use it so no name/email lands in the log.
const titleOf = (doc: Record<string, unknown> | undefined) =>
  String(doc?.reference ?? doc?.title ?? doc?.name ?? doc?.academicYear ?? doc?.email ?? doc?.filename ?? doc?.id ?? '').slice(0, 200)

const IGNORED = new Set(['updatedAt', 'createdAt', 'updatedBy', '_status', 'history', 'sequence', 'bookedCount', 'cancelTokenHash', 'cancelTokenExpiresAt', 'idempotencyKey', 'password', 'hash', 'salt', 'resetPasswordToken', 'resetPasswordExpiration', 'sessions', 'loginAttempts', 'lockUntil'])
/** Names (never values) of top-level fields that changed. */
export const changedFieldNames = (doc?: Record<string, unknown>, prev?: Record<string, unknown>) => {
  if (!doc || !prev) return ''
  const keys = new Set([...Object.keys(doc), ...Object.keys(prev)])
  const out: string[] = []
  const norm = (v: unknown) => JSON.stringify(v && typeof v === 'object' && 'id' in (v as object) ? (v as { id: unknown }).id : v ?? null)
  keys.forEach((k) => {
    if (!IGNORED.has(k) && norm(doc[k]) !== norm(prev[k])) out.push(k)
  })
  return out.slice(0, 30).join(', ')
}

/** Writes an append-only audit entry. Never stores secrets, passwords or tokens. */
export const auditAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, collection }) => {
  if (req.context?.skipAudit) return doc
  let action: string = operation
  if (doc?._status === 'published' && previousDoc?._status !== 'published') action = 'publish'
  else if (doc?._status === 'draft' && previousDoc?._status === 'published') action = 'unpublish'
  if (doc?.deletedAt && !previousDoc?.deletedAt) action = 'trash'
  if (!doc?.deletedAt && previousDoc?.deletedAt) action = 'restore'
  await req.payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req,
    data: {
      action,
      collectionSlug: collection.slug,
      docId: String(doc.id),
      docTitle: titleOf(doc),
      status: (doc?._status as string) ?? null,
      workflowStatus: (doc?.workflowStatus as string) ?? null,
      changedFields: operation === 'update' ? changedFieldNames(doc, previousDoc) : null,
      actor: req.user && req.user.collection === 'users' ? req.user.id : null,
      actorEmail: (req.user as { email?: string } | null)?.email ?? 'sistem',
    },
  })
  return doc
}

/** Explicit audit entry for actions that are not document changes (e.g. CSV export). */
export const auditAction = async (req: import('payload').PayloadRequest, action: string, collectionSlug: string, docTitle: string) => {
  await req.payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    data: {
      action,
      collectionSlug,
      docId: '-',
      docTitle: docTitle.slice(0, 200),
      actor: req.user && req.user.collection === 'users' ? req.user.id : null,
      actorEmail: (req.user as { email?: string } | null)?.email ?? 'sistem',
    },
  })
}

export const auditAfterDelete: CollectionAfterDeleteHook = async ({ doc, req, collection }) => {
  if (req.context?.skipAudit) return doc
  await req.payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req,
    data: {
      action: 'delete',
      collectionSlug: collection.slug,
      docId: String(doc.id),
      docTitle: titleOf(doc),
      actor: req.user && req.user.collection === 'users' ? req.user.id : null,
      actorEmail: (req.user as { email?: string } | null)?.email ?? 'sistem',
    },
  })
  return doc
}

export const auditGlobal: GlobalAfterChangeHook = async ({ doc, req, global }) => {
  if (req.context?.skipAudit) return doc
  await req.payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req,
    data: {
      action: doc?._status === 'published' ? 'publish' : 'update',
      collectionSlug: `global:${global.slug}`,
      docId: global.slug,
      docTitle: global.label ? String(global.label) : global.slug,
      status: (doc?._status as string) ?? null,
      actor: req.user && req.user.collection === 'users' ? req.user.id : null,
      actorEmail: (req.user as { email?: string } | null)?.email ?? 'sistem',
    },
  })
  return doc
}
