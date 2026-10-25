import type { CollectionConfig, GlobalConfig } from 'payload'
import { superAdminOnly } from '../access/roles'
import { auditAfterChange } from '../hooks/audit'

/**
 * Turns a former Payload global into a collection holding exactly one document per school
 * (unique index on `tenant`, added by withTenancy). The slug, fields and access rules stay the same,
 * so the database tables keep their names and only gain a `tenant_id` column.
 */
export function asSingleton(g: GlobalConfig, opts: { useAsTitle?: string } = {}): CollectionConfig {
  const label = typeof g.label === 'string' ? g.label : g.slug
  const versions = g.versions
    ? typeof g.versions === 'object'
      ? { drafts: g.versions.drafts, maxPerDoc: g.versions.max ?? 30 }
      : true
    : false
  const a = g.access ?? {}
  return {
    slug: g.slug,
    labels: { singular: label, plural: label },
    admin: {
      group: g.admin?.group,
      description: `${g.admin?.description ? `${String(g.admin.description)} ` : ''}Satu dokumen untuk setiap sekolah.`,
      useAsTitle: opts.useAsTitle ?? 'id',
      defaultColumns: [opts.useAsTitle ?? 'id', 'tenant', 'updatedAt'],
      // School staff are taken straight to their school's document.
      components: { views: { list: { Component: '@/components/admin/SingletonList#SingletonList' } } },
      hideAPIURL: true,
    },
    access: {
      read: a.read,
      readVersions: a.readVersions,
      update: a.update,
      // the document is created when the school is created; staff may recreate it if it is ever missing
      create: a.update,
      delete: superAdminOnly,
    },
    versions,
    indexes: [{ fields: ['tenant'], unique: true }],
    // globals here only carry the audit hook; the collection variant of it is used instead
    hooks: { afterChange: [auditAfterChange] },
    fields: g.fields,
  }
}
