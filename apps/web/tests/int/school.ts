/**
 * Test helper: every integration test file works inside its own throw-away school, through a school-scoped
 * Payload (exactly how pages, endpoints and jobs use it). The school and all its data are removed afterwards.
 */
import type { Payload } from 'payload'
import { randomBytes } from 'crypto'
import { scopePayload, type TenantPayload } from '@/tenancy/scoped'
import { clearTenantCache } from '@/tenancy/resolve'

export type TestSchool = { id: number; slug: string; domain: string; payload: TenantPayload }

/** Fixed platform operator account of the test database (kept between runs). */
export const TEST_PLATFORM_ADMIN = 'platform-uji@test.invalid'

/**
 * On an empty platform the very first account becomes the Super Admin (production rule, Users.ts). Tests must not
 * depend on which test happens to create the first account, so a fixed Super Admin is created first when the
 * database has no accounts yet. Idempotent; the account stays for later runs.
 */
export async function ensurePlatformSuperAdmin(raw: Payload) {
  const any = await raw.count({ collection: 'users', overrideAccess: true })
  if (any.totalDocs > 0) return
  await raw
    .create({ collection: 'users', overrideAccess: true, data: { email: TEST_PLATFORM_ADMIN, password: randomBytes(18).toString('base64url'), name: 'Super Admin Uji', role: 'superadmin' } as never })
    .catch(async (e) => {
      // a concurrent creator won; anything else is a real error
      if (!(await raw.count({ collection: 'users', overrideAccess: true })).totalDocs) throw e
    })
}

export async function createTestSchool(raw: Payload, run: string, opts: { plan?: 'basic' | 'pro'; timezone?: string } = {}): Promise<TestSchool> {
  await ensurePlatformSuperAdmin(raw)
  const slug = `uji-${run}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
  const domain = `${slug}.sekolah.test`
  const t = await raw.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { name: `Sekolah Uji ${run}`, slug, status: 'active', web: { plan: opts.plan ?? 'pro', status: 'active' } as never, timezone: (opts.timezone ?? 'Asia/Makassar') as never, domains: [{ domain, primary: true }] } as never,
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
    await raw
      .delete({ collection: c.slug as 'posts', where: { tenant: { equals: id } }, overrideAccess: true, trash: false, context: ctx } as never)
      .then((r: any) => r?.errors?.length && console.warn(c.slug, r.errors.map((e: any) => e.message).join('; ')))
      .catch((e) => console.warn(c.slug, e.message))
  }
  await raw.delete({ collection: 'tenants', id, overrideAccess: true, context: ctx }).catch((e) => console.warn('school not deleted', e.message))
  clearTenantCache()
}
