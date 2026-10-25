/**
 * Test helper: every integration test file works inside its own throw-away school, through a school-scoped
 * Payload (exactly how pages, endpoints and jobs use it). The school and all its data are removed afterwards.
 */
import type { Payload } from 'payload'
import { scopePayload, type TenantPayload } from '@/tenancy/scoped'
import { clearTenantCache } from '@/tenancy/resolve'

export type TestSchool = { id: number; slug: string; domain: string; payload: TenantPayload }

export async function createTestSchool(raw: Payload, run: string, opts: { plan?: 'basic' | 'pro'; timezone?: string } = {}): Promise<TestSchool> {
  const slug = `uji-${run}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
  const domain = `${slug}.sekolah.test`
  const t = await raw.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { name: `Sekolah Uji ${run}`, slug, status: 'active', plan: opts.plan ?? 'pro', timezone: (opts.timezone ?? 'Asia/Makassar') as never, domains: [{ domain, primary: true }] },
  })
  clearTenantCache()
  return { id: t.id, slug, domain, payload: scopePayload(raw, t.id) }
}

/** Deletes every document of the school (all school-owned collections), its accounts, then the school. */
export async function dropTestSchool(raw: Payload, id: number) {
  const ctx = { forceMediaDelete: true, skipAudit: true }
  for (const c of raw.config.collections) {
    if (c.slug === 'tenants' || c.slug.startsWith('payload-')) continue
    if (!c.flattenedFields.some((f) => 'name' in f && f.name === 'tenant')) continue
    await raw.delete({ collection: c.slug as 'posts', where: { tenant: { equals: id } }, overrideAccess: true, trash: false, context: ctx } as never).catch(() => {})
  }
  await raw.delete({ collection: 'tenants', id, overrideAccess: true, context: ctx }).catch((e) => console.warn('school not deleted', e.message))
  clearTenantCache()
}
