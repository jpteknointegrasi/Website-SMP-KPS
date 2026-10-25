import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

const titleOf = (doc: Record<string, unknown> | undefined) =>
  String(doc?.title ?? doc?.name ?? doc?.academicYear ?? doc?.email ?? doc?.filename ?? doc?.id ?? '').slice(0, 200)

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
      actor: req.user && req.user.collection === 'users' ? req.user.id : null,
      actorEmail: (req.user as { email?: string } | null)?.email ?? 'sistem',
    },
  })
  return doc
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
