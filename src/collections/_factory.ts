import type { CollectionConfig, Field, Where } from 'payload'
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
    ...(o.beforeValidate ? { beforeValidate: o.beforeValidate } : {}),
    beforeChange: [enforceWorkflow({ admissions: o.admissions }), ...(o.beforeChange ?? [])],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: [...o.fields, ...workflowFields],
})
