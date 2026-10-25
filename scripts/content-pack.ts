/**
 * The bundled initial content (content/, scripts/seed-core.ts) is the SMP Nasional KPS content pack. It is only
 * ever written into that school (slug SEED_TENANT_SLUG, default "kps"), never into another school.
 */
import type { Payload } from 'payload'
import { scopePayload, type TenantPayload } from '../src/tenancy/scoped'

export const CONTENT_PACK_SLUG = (process.env.SEED_TENANT_SLUG || 'kps').toLowerCase()

/** The content-pack school, created (with its settings documents) if it does not exist yet. */
export async function contentPackSchool(raw: Payload): Promise<TenantPayload> {
  const found = await raw.find({ collection: 'tenants', where: { slug: { equals: CONTENT_PACK_SLUG } }, limit: 1, depth: 0, overrideAccess: true })
  const t =
    found.docs[0] ??
    (await raw.create({
      collection: 'tenants',
      overrideAccess: true,
      data: { name: 'SMP Nasional KPS', slug: CONTENT_PACK_SLUG, status: 'active', plan: 'pro', timezone: 'Asia/Makassar' },
    }))
  return scopePayload(raw, t.id)
}
