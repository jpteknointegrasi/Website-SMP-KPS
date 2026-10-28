import type { CollectionConfig, Field, FieldHook, Where } from 'payload'
import { idOf } from '../tenancy/resolve'
import { adminOnly, canCreateContent, canUpdateContent, publishedOrStaff, isStaff } from '../access/roles'
import { workflowFields } from '../fields/common'
import { enforceWorkflow } from '../hooks/workflow'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

type Opts = {
  slug: string
  labels: { singular: string; plural: string }
  group: string
  fields: Field[]
  useAsTitle?: string
  defaultColumns?: string[]
  /** extra public read constraint, evaluated per request (e.g. publishedAt <= now) */
  publicWhere?: () => Where
  description?: string
  admissions?: boolean
  access?: CollectionConfig['access']
  defaultSort?: string
  beforeChange?: NonNullable<NonNullable<CollectionConfig['hooks']>['beforeChange']>
  beforeValidate?: NonNullable<NonNullable<CollectionConfig['hooks']>['beforeValidate']>
  adminExtra?: Partial<NonNullable<CollectionConfig['admin']>>
  listSearchableFields?: string[]
}

const COPY_SUFFIX = 'salinan'

/** First free slug "<slug>-salinan", "<slug>-salinan-2", … within the document's school (trash included). */
const copySlug: FieldHook = async ({ value, data, collection, req }) => {
  if (typeof value !== 'string' || !value || !collection) return value
  const base = `${value.replace(new RegExp(`-${COPY_SUFFIX}(-\\d+)?$`), '')}-${COPY_SUFFIX}`.slice(0, 180)
  const tenant = idOf((data as { tenant?: unknown } | undefined)?.tenant)
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const and: Where[] = [{ slug: { equals: candidate } }, ...(tenant ? [{ tenant: { equals: tenant } }] : [])]
    const { totalDocs } = await req.payload.count({ collection: collection.slug as 'posts', where: { and }, overrideAccess: true, trash: true, req } as never)
    if (!totalDocs) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

/**
 * Field values a duplicate ("Duplikat" in the CMS, payload.duplicate) must not inherit: it starts as an unpublished
 * draft with its own URL, no publication date, no archive mark and a fresh calendar revision.
 */
const DUPLICATE_RESET: Record<string, FieldHook> = {
  slug: copySlug,
  publishedAt: () => null,
  sequence: () => 0,
  workflowStatus: () => 'draft',
  archivedAt: () => null,
  reviewNote: () => null,
}

const withDuplicateReset = (fields: Field[]): Field[] =>
  fields.map((f) => {
    if ('name' in f && f.name && DUPLICATE_RESET[f.name] && f.type !== 'group' && f.type !== 'ui')
      return { ...f, hooks: { ...(f as { hooks?: object }).hooks, beforeDuplicate: [DUPLICATE_RESET[f.name]] } } as Field
    if ((f.type === 'row' || f.type === 'collapsible') && 'fields' in f) return { ...f, fields: withDuplicateReset(f.fields) } as Field
    if (f.type === 'tabs') return { ...f, tabs: f.tabs.map((t) => ('name' in t && t.name ? t : { ...t, fields: withDuplicateReset(t.fields) })) } as Field
    return f
  })

const PREVIEW = ['posts', 'announcements', 'events', 'media-items', 'student-works', 'faqs']

/** Standard versioned, workflow-aware, audited content collection. */
export const defineContent = (o: Opts): CollectionConfig => ({
  slug: o.slug,
  labels: o.labels,
  trash: true,
  defaultSort: o.defaultSort ?? '-updatedAt',
  admin: {
    group: o.group,
    useAsTitle: o.useAsTitle ?? 'title',
    defaultColumns: o.defaultColumns ?? [o.useAsTitle ?? 'title', 'workflowStatus', '_status', 'updatedAt'],
    description: o.description,
    listSearchableFields: o.listSearchableFields ?? [o.useAsTitle ?? 'title', 'slug'],
    // "Pratinjau" button in the editor: draft rendered at desktop and phone width (staff session required)
    ...(PREVIEW.includes(o.slug) ? { preview: (doc: Record<string, unknown>) => (doc?.id ? `/pratinjau-bingkai/${o.slug}/${doc.id}` : null) } : {}),
    ...o.adminExtra,
  },
  access: {
    read: publishedOrStaff(o.publicWhere),
    readVersions: ({ req: { user } }) => isStaff(user),
    create: canCreateContent,
    update: canUpdateContent,
    delete: adminOnly,
    ...o.access,
  },
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 },
  hooks: {
    // a duplicate is always saved as a draft (the REST route already does this; the Local API copies _status)
    beforeOperation: [({ args, operation }) => (operation === 'create' && (args as { duplicateFromID?: unknown }).duplicateFromID != null ? { ...args, draft: true } : args)],
    ...(o.beforeValidate ? { beforeValidate: o.beforeValidate } : {}),
    beforeChange: [enforceWorkflow({ admissions: o.admissions }), ...(o.beforeChange ?? [])],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: withDuplicateReset([...o.fields, ...workflowFields]),
})
