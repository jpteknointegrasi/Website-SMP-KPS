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
}

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
    listSearchableFields: [o.useAsTitle ?? 'title', 'slug'],
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
    beforeChange: [enforceWorkflow({ admissions: o.admissions })],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: [...o.fields, ...workflowFields],
})
