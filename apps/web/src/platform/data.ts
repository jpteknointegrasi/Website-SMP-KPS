import 'server-only'
import { hasProduct } from '@satusekolah/core'
import { rawPayload } from '@/lib/payload'
import { toInfo } from '@/tenancy/resolve'
import type { AuditLog, SchoolApplication, Tenant } from '@/payload-types'

export type PlatformSchool = {
  id: number
  name: string
  slug: string
  status: 'active' | 'trial' | 'suspended'
  primaryDomain: string | null
  domains: string[]
  web: { plan: string; status: string; on: boolean }
  app: { plan: string; status: string; on: boolean; database: boolean }
  staff: number
  admins: number
  createdAt: string
}

/**
 * Every school on the platform with its subscriptions and account counts. Operator view only: no school content and
 * no personal data beyond staff counts. The sealed App database URL is reduced to "configured or not".
 */
export async function listSchools(): Promise<PlatformSchool[]> {
  const payload = await rawPayload()
  const [tenants, users] = await Promise.all([
    payload.find({ collection: 'tenants', pagination: false, depth: 0, sort: 'name', overrideAccess: true }),
    payload.find({ collection: 'users', pagination: false, depth: 0, overrideAccess: true, select: { tenant: true, role: true, active: true } }),
  ])
  const staff = new Map<number, { all: number; admins: number }>()
  for (const u of users.docs) {
    const t = typeof u.tenant === 'number' ? u.tenant : (u.tenant as { id?: number } | null)?.id
    if (!t || u.active === false) continue
    const c = staff.get(t) ?? { all: 0, admins: 0 }
    c.all++
    if (u.role === 'admin') c.admins++
    staff.set(t, c)
  }
  return (tenants.docs as Tenant[]).map((t) => {
    const info = toInfo(t as never)
    const c = staff.get(t.id) ?? { all: 0, admins: 0 }
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: info.status,
      primaryDomain: info.primaryDomain,
      domains: (t.domains ?? []).map((d) => d.domain).filter(Boolean) as string[],
      web: { plan: info.web.plan, status: info.web.status, on: hasProduct(info, 'web') },
      app: { plan: info.app.plan, status: info.app.status, on: hasProduct(info, 'app'), database: Boolean((t.app as { database?: string | null } | undefined)?.database) },
      staff: c.all,
      admins: c.admins,
      createdAt: t.createdAt,
    }
  })
}

export async function listApplications(status?: SchoolApplication['status']): Promise<SchoolApplication[]> {
  const payload = await rawPayload()
  const res = await payload.find({
    collection: 'school-applications',
    where: status ? { status: { equals: status } } : undefined,
    sort: '-createdAt',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs as SchoolApplication[]
}

/** Platform-level history: schools, sign-ups and accounts (newest first). */
export async function platformAudit(limit = 100): Promise<AuditLog[]> {
  const payload = await rawPayload()
  const res = await payload.find({
    collection: 'audit-logs',
    where: { collectionSlug: { in: ['tenants', 'school-applications', 'users'] } },
    sort: '-createdAt',
    limit,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs as AuditLog[]
}

export type PlatformStats = {
  schools: number
  active: number
  trial: number
  suspended: number
  web: number
  app: number
  pending: number
  staff: number
}

export function statsOf(schools: PlatformSchool[], pending: number): PlatformStats {
  return {
    schools: schools.length,
    active: schools.filter((s) => s.status === 'active').length,
    trial: schools.filter((s) => s.status === 'trial').length,
    suspended: schools.filter((s) => s.status === 'suspended').length,
    web: schools.filter((s) => s.web.on).length,
    app: schools.filter((s) => s.app.on).length,
    pending,
    staff: schools.reduce((n, s) => n + s.staff, 0),
  }
}
