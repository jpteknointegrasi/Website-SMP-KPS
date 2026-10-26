import { NotFound, type DataFromCollectionSlug, type Payload, type Where } from 'payload'
import { PLATFORM_COLLECTIONS, SINGLETON_COLLECTIONS, type SingletonSlug } from './config'

type Args = Record<string, unknown> & { collection?: string; where?: Where; context?: Record<string, unknown>; id?: number | string }

const isSingleton = (s: unknown): s is SingletonSlug => SINGLETON_COLLECTIONS.includes(s as SingletonSlug)

/** Constraint that keeps a query inside one school (`null` = collection is not school-owned). */
export const tenantWhere = (collection: string | undefined, tenantId: number): Where | null => {
  if (!collection) return null
  if (collection === 'tenants') return { id: { equals: tenantId } }
  if (collection === 'users') return { tenant: { equals: tenantId } }
  if (PLATFORM_COLLECTIONS.has(collection) || collection.startsWith('payload-')) return null
  return { tenant: { equals: tenantId } }
}

const andWhere = (a: Where | undefined, b: Where | null): Where | undefined => (b ? (a && Object.keys(a).length ? { and: [a, b] } : b) : a)

/** Finds the single document of a former global for one school. */
export async function findSingleton(payload: Payload, slug: SingletonSlug, tenantId: number, a: Args = {}) {
  const { slug: _s, ...rest } = a as Args & { slug?: string }
  const res = await payload.find({
    ...(rest as object),
    collection: slug,
    where: { tenant: { equals: tenantId } },
    limit: 1,
    pagination: false,
    context: { ...(a.context ?? {}), tenantId },
  } as never)
  return (res.docs[0] ?? null) as unknown as Record<string, unknown> | null
}

/** Updates (or creates, if the school has none yet) the single document of a former global. */
export async function updateSingleton(payload: Payload, slug: SingletonSlug, tenantId: number, a: Args & { data?: Record<string, unknown> }) {
  const { slug: _s, data, ...rest } = a as Args & { slug?: string; data?: Record<string, unknown> }
  const existing = await findSingleton(payload, slug, tenantId, { depth: 0, overrideAccess: true, draft: true })
  const context = { ...(a.context ?? {}), tenantId }
  if (existing) return payload.update({ ...(rest as object), collection: slug, id: existing.id as number, data: data ?? {}, context } as never)
  return payload.create({ ...(rest as object), collection: slug, data: { ...(data ?? {}), tenant: tenantId }, context } as never)
}

type SingletonArgs<S extends SingletonSlug> = { slug: S; depth?: number; draft?: boolean; overrideAccess?: boolean; context?: Record<string, unknown>; req?: unknown; user?: unknown; select?: unknown }

/** Payload confined to one school; former globals are read/written with findGlobal/updateGlobal as before. */
export type TenantPayload = Omit<Payload, 'findGlobal' | 'updateGlobal'> & {
  tenantId: number
  findGlobal<S extends SingletonSlug>(a: SingletonArgs<S>): Promise<DataFromCollectionSlug<S>>
  updateGlobal<S extends SingletonSlug>(a: SingletonArgs<S> & { data: Partial<DataFromCollectionSlug<S>> | Record<string, unknown> }): Promise<DataFromCollectionSlug<S>>
}

/**
 * A Payload instance confined to one school. Server code (pages, endpoints, jobs, seeds) uses this instead of
 * the raw instance, so even `overrideAccess: true` queries can only see that school's documents:
 *  - find/count/update(where)/delete(where): the school constraint is AND-ed into `where`
 *  - findByID/update(id)/delete(id): only succeed for documents of this school
 *  - create: `tenant` is set to this school
 *  - findGlobal/updateGlobal: read/write the school's document of the former global
 * Every call also carries `context.tenantId`, which access rules use for non-privileged calls.
 */
export function scopePayload(payload: Payload, tenantId: number): TenantPayload {
  const ctx = <T extends Args>(a: T): T => ({ ...a, context: { ...(a.context ?? {}), tenantId } })
  const scoped = (a: Args): Args => ctx({ ...a, where: andWhere(a.where, tenantWhere(a.collection, tenantId)) })
  const owns = async (a: Args) => {
    const w = tenantWhere(a.collection, tenantId)
    if (!w) return true
    const r = await payload.count({ collection: a.collection as 'posts', where: { and: [{ id: { equals: a.id } }, w] } as Where, overrideAccess: true, trash: true } as never)
    return r.totalDocs > 0
  }
  const api: Record<string, unknown> = {
    tenantId,
    find: (a: Args) => payload.find(scoped(a) as never),
    count: (a: Args) => payload.count(scoped(a) as never),
    findByID: async (a: Args & { disableErrors?: boolean }) => {
      const { id, disableErrors, ...rest } = a
      const w = tenantWhere(a.collection, tenantId)
      if (!w) return payload.findByID(ctx(a) as never)
      const r = await payload.find(ctx({ ...rest, where: { and: [{ id: { equals: id } }, w] }, limit: 1, pagination: false }) as never)
      if (r.docs[0]) return r.docs[0]
      if (disableErrors) return null
      throw new NotFound()
    },
    create: (a: Args & { data?: Record<string, unknown> }) =>
      payload.create(ctx(tenantWhere(a.collection, tenantId) && a.collection !== 'tenants' ? { ...a, data: { ...(a.data ?? {}), tenant: tenantId } } : a) as never),
    update: async (a: Args) => {
      if (a.id === undefined) return payload.update(scoped(a) as never)
      if (!(await owns(a))) throw new NotFound()
      return payload.update(ctx(a) as never)
    },
    delete: async (a: Args) => {
      if (a.id === undefined) return payload.delete(scoped(a) as never)
      if (!(await owns(a))) throw new NotFound()
      return payload.delete(ctx(a) as never)
    },
    findGlobal: (a: Args & { slug: string }) => {
      if (!isSingleton(a.slug)) throw new Error(`Unknown school setting "${a.slug}"`)
      return findSingleton(payload, a.slug, tenantId, a)
    },
    updateGlobal: (a: Args & { slug: string; data?: Record<string, unknown> }) => {
      if (!isSingleton(a.slug)) throw new Error(`Unknown school setting "${a.slug}"`)
      return updateSingleton(payload, a.slug, tenantId, a)
    },
  }
  return new Proxy(payload, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && prop in api) return api[prop]
      const v = Reflect.get(target, prop, receiver)
      return typeof v === 'function' ? v.bind(target) : v
    },
  }) as unknown as TenantPayload
}

/** The raw (unscoped) instance behind a scoped one, for platform-level work. */
export const isScoped = (p: Payload | TenantPayload): p is TenantPayload => typeof (p as Partial<TenantPayload>).tenantId === 'number'

/** Payload scoped to the school of the document a hook is working on (data first, then the stored version). */
export function scopeToDoc(payload: Payload, ...docs: (Record<string, unknown> | null | undefined)[]): TenantPayload {
  for (const d of docs) {
    const t = d?.tenant
    const id = typeof t === 'number' ? t : t && typeof t === 'object' && 'id' in t ? Number((t as { id: unknown }).id) : Number(t)
    if (Number.isInteger(id) && id > 0) return scopePayload(payload, id)
  }
  throw new Error('Sekolah pemilik dokumen tidak diketahui.')
}
