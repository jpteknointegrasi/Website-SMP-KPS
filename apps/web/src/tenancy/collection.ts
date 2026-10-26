import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig, Field, FilterOptions, Where } from 'payload'
import { isSuperAdmin } from '../access/roles'
import { PLATFORM_COLLECTIONS } from './config'
import { andAccess, contextTenant, requestTenantId, tenantOfUser, withTenantAccess } from './access'
import { idOf } from './resolve'

/** Unique fields that stay unique platform-wide (random tokens), instead of per school. */
const GLOBALLY_UNIQUE = new Set(['idempotencyKey', 'reference', 'cancelTokenHash'])

export const tenantField = (required = true): Field => ({
  name: 'tenant',
  type: 'relationship',
  relationTo: 'tenants',
  label: 'Sekolah',
  required,
  index: true,
  maxDepth: 0,
  admin: {
    position: 'sidebar',
    // School staff never see or change it: their own school is always used.
    condition: (_data, _sibling, { user }) => isSuperAdmin(user as never),
    description: 'Hanya Super Admin platform. Staf sekolah selalu bekerja di sekolahnya sendiri.',
  },
  defaultValue: async ({ req, user }: { req: never; user: never }) => tenantOfUser(user) ?? contextTenant(req) ?? undefined,
})

/**
 * Sets the school of new documents and keeps it fixed afterwards:
 *  - school staff → always their own school (whatever the request body says)
 *  - Super Admin → the chosen school, else the request's school
 *  - server code (Local API, no user) → data.tenant, else context.tenantId
 *  - visitors via REST → the school of the Host header (body value ignored)
 * Only the Super Admin can move a document to another school.
 */
export const assignTenant: CollectionBeforeValidateHook = async ({ data, req, operation, originalDoc }) => {
  if (!data) return data
  const user = req.user
  if (operation === 'update') {
    const current = idOf(originalDoc?.tenant)
    if (!(isSuperAdmin(user) && data.tenant !== undefined && data.tenant !== null)) data.tenant = current ?? data.tenant
    return data
  }
  const own = tenantOfUser(user)
  if (own) data.tenant = own
  else if (isSuperAdmin(user)) data.tenant = idOf(data.tenant) ?? (await requestTenantId(req)) ?? data.tenant
  else if (req.payloadAPI === 'local') data.tenant = idOf(data.tenant) ?? contextTenant(req) ?? data.tenant
  else data.tenant = (await requestTenantId(req)) ?? null
  return data
}

/** Second line of defence after field hooks: a school's staff can never move a document to another school. */
export const lockTenant: CollectionBeforeChangeHook = ({ data, req, operation, originalDoc }) => {
  if (operation === 'update' && !isSuperAdmin(req.user) && originalDoc?.tenant !== undefined) data.tenant = idOf(originalDoc.tenant)
  if (operation === 'create') {
    const own = tenantOfUser(req.user)
    if (own) data.tenant = own
  }
  return data
}

type RelField = Extract<Field, { type: 'relationship' | 'upload' }>

const scopeFor = (target: string, t: number): Where | true => {
  if (target === 'tenants') return true
  if (target === 'users') return { or: [{ tenant: { equals: t } }, { role: { equals: 'superadmin' } }] }
  return { tenant: { equals: t } }
}

/** Relationship/upload pickers (and their server-side validation) only offer documents of the same school. */
const scopeRelationship = (field: RelField): RelField => {
  const targets = (Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo]) as string[]
  if (targets.every((c) => c === 'tenants')) return field
  const orig = field.filterOptions as FilterOptions | undefined
  const filterOptions: FilterOptions = async (args) => {
    const base = typeof orig === 'function' ? await orig(args) : (orig ?? true)
    const t = idOf((args.data as { tenant?: unknown } | undefined)?.tenant) ?? tenantOfUser(args.user as never) ?? contextTenant(args.req)
    if (!t || base === false) return base
    const target = args.relationTo ?? targets[0]!
    return andAccess(base as Where | boolean, scopeFor(String(target), t))
  }
  return { ...field, filterOptions } as RelField
}

const mapFields = (fields: Field[], fn: (f: Field) => Field): Field[] =>
  fields.map((f) => {
    const g = fn(f)
    if ('fields' in g && Array.isArray(g.fields)) return { ...g, fields: mapFields(g.fields, fn) } as Field
    if (g.type === 'tabs') return { ...g, tabs: g.tabs.map((t) => ({ ...t, fields: mapFields(t.fields, fn) })) } as Field
    if (g.type === 'blocks') return { ...g, blocks: g.blocks.map((b) => ({ ...b, fields: mapFields(b.fields, fn) })) } as Field
    return g
  })

/** Top-level `unique` fields (also inside unnamed tabs/rows/collapsibles) become unique per school. */
const perTenantUnique = (fields: Field[], out: string[]): Field[] =>
  fields.map((f) => {
    if (f.type === 'tabs') return { ...f, tabs: f.tabs.map((t) => ('name' in t && t.name ? t : { ...t, fields: perTenantUnique(t.fields, out) })) } as Field
    if ((f.type === 'row' || f.type === 'collapsible') && 'fields' in f) return { ...f, fields: perTenantUnique(f.fields, out) } as Field
    if ('name' in f && 'unique' in f && f.unique && !GLOBALLY_UNIQUE.has(f.name)) {
      out.push(f.name)
      return { ...f, unique: false, index: true } as Field
    }
    return f
  })

/**
 * Makes a collection belong to a school: adds the `tenant` field, isolates every access rule,
 * assigns/locks the school in hooks, scopes relationship pickers and turns unique fields into
 * per-school unique indexes (two schools can both have a post with slug "ppdb-2026").
 */
export function withTenancy(c: CollectionConfig, opts: { optional?: boolean } = {}): CollectionConfig {
  if (PLATFORM_COLLECTIONS.has(c.slug)) return c
  const uniques: string[] = []
  const fields = mapFields(perTenantUnique(c.fields, uniques), (f) => (f.type === 'relationship' || f.type === 'upload' ? scopeRelationship(f) : f))
  const a = c.access ?? {}
  const indexes = (c.indexes ?? []).map((ix) => (ix.unique && !ix.fields.includes('tenant') ? { ...ix, fields: ['tenant', ...ix.fields] } : ix))
  return {
    ...c,
    // Payload's document locks live in one shared collection that cannot be limited per school, so locking is off.
    lockDocuments: false,
    fields: [...fields, tenantField(!opts.optional)],
    indexes: [...indexes, ...uniques.map((name) => ({ fields: ['tenant', name], unique: true }))],
    access: {
      ...a,
      read: withTenantAccess(a.read, 'read'),
      create: withTenantAccess(a.create, 'create'),
      update: withTenantAccess(a.update, 'update'),
      delete: withTenantAccess(a.delete, 'delete'),
      ...(c.versions ? { readVersions: withTenantAccess(a.readVersions, 'readVersions') } : {}),
    },
    hooks: {
      ...c.hooks,
      beforeValidate: [assignTenant, ...(c.hooks?.beforeValidate ?? [])],
      beforeChange: [lockTenant, ...(c.hooks?.beforeChange ?? [])],
    },
  }
}
