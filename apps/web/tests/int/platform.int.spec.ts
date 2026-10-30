/**
 * PLT-xx: platform onboarding (Alumniku model). A school signs up → only the platform Super Admin approves →
 * school + first Admin Teknis + trial subscriptions are created atomically; a failed approval leaves nothing behind;
 * the new Admin Teknis manages only their own school; rejection is recorded with a reason; everything is audited.
 */
import { getPayload, type Payload } from 'payload'
import { randomBytes } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { approve, createApplication, reject } from '@/platform/service'
import { readApplication, readApproval } from '@/platform/validation'
import { clearTenantCache, schoolOwningHost, tenantById } from '@/tenancy/resolve'
import { FREE_CMS_DAYS, hasCms } from '@sekolahku/core'
import { Users } from '@/collections/Users'
import { dropTestSchool } from './school'
import type { User } from '@/payload-types'

const RUN = `p${Date.now().toString(36)}`
const pw = () => randomBytes(18).toString('base64url')
let raw: Payload
let operator: User
let editorElsewhere: User
const tenants: number[] = []
const users: number[] = []

const form = (o: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(o)) fd.set(k, v)
  return fd
}
const signup = (key: string, email = `${RUN}-${key}@test.invalid`) =>
  readApplication(
    form({ schoolName: `SMA Uji ${RUN} ${key}`, shortName: '', level: 'sma', npsn: '', city: 'Balikpapan', province: 'Kalimantan Timur', timezone: 'Asia/Makassar', domain: '', wantWeb: 'on', wantApp: 'on', adminName: `Admin ${key}`, adminEmail: email, consent: 'on' }),
  ).value
const approval = (id: number, slug: string, domain = `${slug}.sekolah.test`) =>
  readApproval(form({ applicationId: String(id), slug, name: `SMA Uji ${slug}`, timezone: 'Asia/Makassar', domain, webPlan: 'basic', appPlan: 'pilot' })).value
const appByRef = async (reference: string) => (await raw.find({ collection: 'school-applications', where: { reference: { equals: reference } }, overrideAccess: true, depth: 0 })).docs[0]!

beforeAll(async () => {
  raw = await getPayload({ config })
  operator = (await raw.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-super@test.invalid`, password: pw(), name: 'Super', role: 'superadmin' } })) as User
  users.push(operator.id)
})

afterAll(async () => {
  for (const t of tenants) {
    await raw.delete({ collection: 'users', where: { tenant: { equals: t } }, overrideAccess: true }).catch(() => {})
    await dropTestSchool(raw, t)
  }
  for (const u of users) await raw.delete({ collection: 'users', id: u, overrideAccess: true }).catch(() => {})
  await raw.delete({ collection: 'school-applications', where: { adminEmail: { like: RUN } }, overrideAccess: true }).catch(() => {})
})

describe('PLT-01 pendaftaran sekolah', () => {
  it('membuat antrean saja (tanpa sekolah/akun); pengajuan ulang tidak menggandakan', async () => {
    const before = await raw.count({ collection: 'tenants', overrideAccess: true })
    const r = await createApplication(raw, signup('a'))
    expect(r.ok && /^SK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(r.reference)).toBe(true)
    const again = await createApplication(raw, signup('a'))
    expect(again).toMatchObject({ ok: true, duplicate: true, reference: (r as { reference: string }).reference })
    expect((await raw.count({ collection: 'tenants', overrideAccess: true })).totalDocs).toBe(before.totalDocs)
    expect((await raw.count({ collection: 'users', where: { email: { equals: `${RUN}-a@test.invalid` } }, overrideAccess: true })).totalDocs).toBe(0)
  })

  it('pengunjung & Admin Teknis sekolah tidak dapat membaca, membuat atau mengubah pendaftaran', async () => {
    const schoolAdmin = { id: -1, role: 'admin', tenant: 1, collection: 'users', active: true } as never
    for (const user of [null, schoolAdmin]) {
      await expect(raw.find({ collection: 'school-applications', overrideAccess: false, user: user as never })).rejects.toThrow()
      await expect(raw.create({ collection: 'school-applications', overrideAccess: false, user: user as never, data: { ...signup('x'), reference: 'SK-XXXX-XXXX' } as never })).rejects.toThrow()
    }
    // even the Super Admin cannot create one through the API: only the public form (server code) does
    await expect(raw.create({ collection: 'school-applications', overrideAccess: false, user: { ...operator, collection: 'users' } as never, data: { ...signup('y'), reference: 'SK-YYYY-YYYY' } as never })).rejects.toThrow()
  })
})

describe('PLT-02 persetujuan oleh Super Admin', () => {
  it('membuat sekolah + Admin Teknis + langganan uji coba sekaligus, dengan tautan undangan 72 jam', async () => {
    const r = await createApplication(raw, signup('b'))
    const app = await appByRef((r as { reference: string }).reference)
    const slug = `${RUN}b`
    const res = await approve(raw, operator, approval(app.id, slug), 'Data NPSN terverifikasi', '')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    tenants.push(res.tenantId)
    const t = await raw.findByID({ collection: 'tenants', id: res.tenantId, overrideAccess: true, depth: 0 })
    expect(t).toMatchObject({ slug, status: 'trial', timezone: 'Asia/Makassar' })
    // Paket Lengkap: App always comes with Website + CMS
    expect(t.web).toMatchObject({ plan: 'pro', status: 'trial' })
    expect(t.app).toMatchObject({ plan: 'pilot', status: 'trial' })
    // provisioned per-school documents (settings/menu/features) came with it
    expect((await raw.count({ collection: 'site-settings', where: { tenant: { equals: res.tenantId } }, overrideAccess: true })).totalDocs).toBe(1)
    const admin = await raw.findByID({ collection: 'users', id: res.adminUserId, overrideAccess: true, depth: 0, showHiddenFields: true })
    expect(admin).toMatchObject({ role: 'admin', tenant: res.tenantId, email: `${RUN}-b@test.invalid`, active: true })
    expect(res.inviteUrl).toMatch(new RegExp(`^https://${slug}\\.sekolah\\.test/admin/reset/\\w+`))
    const exp = new Date((admin as { resetPasswordExpiration?: string }).resetPasswordExpiration!).getTime()
    expect(exp - Date.now()).toBeGreaterThan(70 * 3_600_000)
    const decided = await raw.findByID({ collection: 'school-applications', id: app.id, overrideAccess: true, depth: 0 })
    expect(decided).toMatchObject({ status: 'approved', tenant: res.tenantId, adminUser: res.adminUserId, decidedBy: operator.id })
    // the new school's domain belongs to the school (not the platform)
    expect((await schoolOwningHost(raw, `${slug}.sekolah.test`))?.id).toBe(res.tenantId)
    // audited as the operator
    const log = await raw.find({ collection: 'audit-logs', where: { and: [{ collectionSlug: { equals: 'tenants' } }, { docId: { equals: String(res.tenantId) } }] }, overrideAccess: true })
    expect(log.docs[0]?.actorEmail).toBe(operator.email)
    // the account created right after provisioning is audited too (provisioning must not leave skipAudit behind)
    const userLog = await raw.find({ collection: 'audit-logs', where: { and: [{ collectionSlug: { equals: 'users' } }, { docId: { equals: String(res.adminUserId) } }, { action: { equals: 'create' } }] }, overrideAccess: true })
    expect(userLog.docs[0]).toMatchObject({ action: 'create', actorEmail: operator.email })
    // a second approval of the same application is refused
    expect((await approve(raw, operator, approval(app.id, `${RUN}b2`), '', '')).ok).toBe(false)
  })

  it('gagal di tengah jalan → tidak ada yang dibuat (email sudah dipakai)', async () => {
    editorElsewhere = (await raw.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-taken@test.invalid`, password: pw(), name: 'X', role: 'superadmin' } })) as User
    users.push(editorElsewhere.id)
    const r = await createApplication(raw, signup('c', `${RUN}-taken@test.invalid`))
    const app = await appByRef((r as { reference: string }).reference)
    const res = await approve(raw, operator, approval(app.id, `${RUN}c`), '', '')
    expect(res).toMatchObject({ ok: false })
    expect((await raw.count({ collection: 'tenants', where: { slug: { equals: `${RUN}c` } }, overrideAccess: true })).totalDocs).toBe(0)
    expect((await raw.findByID({ collection: 'school-applications', id: app.id, overrideAccess: true })).status).toBe('pending')
  })

  it('hanya Super Admin; Admin Teknis sekolah tidak dapat menyetujui', async () => {
    const r = await createApplication(raw, signup('d'))
    const app = await appByRef((r as { reference: string }).reference)
    const fakeAdmin = { ...operator, role: 'admin', tenant: tenants[0] } as User
    expect(await approve(raw, fakeAdmin, approval(app.id, `${RUN}d`), '', '')).toMatchObject({ ok: false })
    expect(await reject(raw, fakeAdmin, app.id, 'tidak')).toBe(false)
    expect((await raw.count({ collection: 'tenants', where: { slug: { equals: `${RUN}d` } }, overrideAccess: true })).totalDocs).toBe(0)
  })

  it('Super Admin menolak dengan alasan', async () => {
    const r = await createApplication(raw, signup('e'))
    const app = await appByRef((r as { reference: string }).reference)
    expect(await reject(raw, operator, app.id, 'NPSN tidak ditemukan')).toBe(true)
    expect(await raw.findByID({ collection: 'school-applications', id: app.id, overrideAccess: true })).toMatchObject({ status: 'rejected', decisionNote: 'NPSN tidak ditemukan', decidedBy: operator.id })
    expect(await reject(raw, operator, app.id, 'lagi')).toBe(false)
  })
})

describe('PLT-03 paket SatuSekolah & akses CMS', () => {
  const asUser = (u: User) => ({ ...u, collection: 'users' }) as never
  const panel = (u: User) => (Users.access!.admin as (a: unknown) => Promise<boolean>)({ req: { user: asUser(u), payload: raw } })

  it('Website Gratis: CMS dibuka 30 hari pertama, lalu tertutup (website tetap tayang)', async () => {
    const r = await createApplication(raw, readApplication(form({ schoolName: `SMP Gratis ${RUN}`, city: 'Balikpapan', province: 'Kaltim', package: 'gratis', adminName: 'Admin G', adminEmail: `${RUN}-g@test.invalid`, consent: 'on' })).value)
    const app = await appByRef((r as { reference: string }).reference)
    expect(app.package).toBe('gratis')
    const res = await approve(raw, operator, readApproval(form({ applicationId: String(app.id), slug: `${RUN}g`, name: `SMP Gratis ${RUN}`, timezone: 'Asia/Makassar', domain: `${RUN}g.sekolah.test`, package: 'gratis' })).value, '', '')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    tenants.push(res.tenantId)
    const t = await raw.findByID({ collection: 'tenants', id: res.tenantId, overrideAccess: true, depth: 0 })
    expect(t.web?.plan).toBe('basic')
    const days = (Date.parse(String(t.web?.cmsUntil)) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(FREE_CMS_DAYS - 1)
    expect(days).toBeLessThanOrEqual(FREE_CMS_DAYS)
    const admin = (await raw.findByID({ collection: 'users', id: res.adminUserId, overrideAccess: true, depth: 0 })) as User
    expect(hasCms(await tenantById(raw, res.tenantId))).toBe(true)
    expect(await panel(admin)).toBe(true)
    const post = await raw.create({ collection: 'posts', user: asUser(admin), overrideAccess: false, draft: true, data: { title: `Berita ${RUN}`, slug: `berita-${RUN}`, _status: 'draft' } as never })

    // first month over
    await raw.update({ collection: 'tenants', id: res.tenantId, overrideAccess: true, data: { web: { ...t.web, cmsUntil: new Date(Date.now() - 60_000).toISOString() } } as never })
    clearTenantCache()
    expect(hasCms(await tenantById(raw, res.tenantId))).toBe(false)
    expect(await panel(admin)).toBe(false)
    await expect(raw.create({ collection: 'posts', user: asUser(admin), overrideAccess: false, draft: true, data: { title: `Lagi ${RUN}`, slug: `lagi-${RUN}`, _status: 'draft' } as never })).rejects.toThrow()
    await expect(raw.update({ collection: 'posts', id: post.id, user: asUser(admin), overrideAccess: false, draft: true, data: { title: 'Ubah' } as never })).rejects.toThrow()
    // the Super Admin still can (e.g. to help the school)
    await raw.update({ collection: 'posts', id: post.id, user: asUser(operator), overrideAccess: false, draft: true, data: { title: 'Dibantu platform' } as never })

    // upgrading to Website + CMS opens the CMS again
    await raw.update({ collection: 'tenants', id: res.tenantId, overrideAccess: true, data: { web: { plan: 'pro', status: 'active' } } as never })
    clearTenantCache()
    expect(await panel(admin)).toBe(true)
  })

  it('tidak ada paket App saja: App menjadikan Web "Website + CMS"', async () => {
    const tid = tenants[0]!
    await raw.update({ collection: 'tenants', id: tid, overrideAccess: true, data: { web: { plan: 'basic', status: 'active' }, app: { plan: 'standard', status: 'active' } } as never })
    const t = await raw.findByID({ collection: 'tenants', id: tid, overrideAccess: true, depth: 0 })
    expect(t.web?.plan).toBe('pro')
    clearTenantCache()
  })
})
