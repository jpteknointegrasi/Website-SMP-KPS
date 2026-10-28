/**
 * Platform onboarding (Alumniku model), independent of Next.js so it can be tested directly:
 *  - a school signs up → a pending application (nothing else is created);
 *  - only the platform Super Admin approves → in ONE transaction: the school (tenant, with its settings, menu and
 *    feature documents), its first Admin Teknis account and trial subscriptions for the chosen products;
 *  - the Admin Teknis sets a password through an invitation link and manages the school's own staff and roles;
 *  - or the Super Admin rejects with a reason.
 * Every write goes through Payload with the operator as the user, so access rules and the audit log apply.
 */
import { randomBytes, randomInt } from 'crypto'
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from 'payload'
import { isSuperAdmin } from '@/access/roles'
import { clearTenantCache } from '@/tenancy/resolve'
import { rateLimited } from '@/lib/rate-limit'
import type { User } from '@/payload-types'
import { applicationReference, type ApplicationInput, type ApprovalInput } from './validation'

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export const mailReady = () => Boolean(process.env.SMTP_HOST)

async function mail(payload: Payload, to: string, subject: string, html: string, what: string) {
  if (!mailReady()) return false
  return payload
    .sendEmail({ to, subject, html })
    .then(() => true)
    .catch((e: unknown) => {
      payload.logger.warn({ err: e }, `email ${what} gagal`)
      return false
    })
}

/** Rate guards for the public form: per sender (IP) and, as a backstop, for the whole platform. */
export const APPLICATIONS_PER_IP_PER_HOUR = 3
export const APPLICATIONS_PER_HOUR = 60

export type SubmitResult = { ok: true; reference: string; duplicate: boolean } | { ok: false; message: string }

const TOO_MANY = 'Terlalu banyak pendaftaran dalam satu jam terakhir. Silakan coba lagi nanti.'

/** `ip`: the sender's address (server action: first hop of x-forwarded-for). Omitted only by internal callers. */
export async function createApplication(payload: Payload, value: ApplicationInput, opts: { ip?: string } = {}): Promise<SubmitResult> {
  if (opts.ip && (await rateLimited(payload, `daftar-sekolah:${opts.ip}`, { max: APPLICATIONS_PER_IP_PER_HOUR, windowMs: 3_600_000 }))) return { ok: false, message: TOO_MANY }
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
  const recent = await payload.count({ collection: 'school-applications', where: { createdAt: { greater_than: hourAgo } }, overrideAccess: true })
  if (recent.totalDocs >= APPLICATIONS_PER_HOUR) return { ok: false, message: TOO_MANY }
  // one open application per e-mail / school name: a repeat submit gets the same answer, without a duplicate
  const dup = await payload.find({
    collection: 'school-applications',
    where: { and: [{ status: { equals: 'pending' } }, { or: [{ adminEmail: { equals: value.adminEmail } }, { schoolName: { equals: value.schoolName } }] }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (dup.docs[0]) return { ok: true, reference: dup.docs[0].reference, duplicate: true }
  const reference = applicationReference(randomInt)
  await payload.create({ collection: 'school-applications', overrideAccess: true, data: { ...value, reference, status: 'pending' } })
  await mail(
    payload,
    value.adminEmail,
    `Pendaftaran ${value.schoolName} diterima (${reference})`,
    `<p>Yth. ${escapeHtml(value.adminName)},</p><p>Pendaftaran <b>${escapeHtml(value.schoolName)}</b> ke platform Satu Sekolah sudah kami terima dengan nomor <b>${reference}</b>.</p><p>Tim kami akan meninjau dan mengirim kabar ke email ini. Bila disetujui, Anda menerima tautan untuk mengatur kata sandi akun Admin Teknis sekolah.</p>`,
    'konfirmasi pendaftaran sekolah',
  )
  return { ok: true, reference, duplicate: false }
}

export type ApproveResult =
  | { ok: false; errors: string[] }
  | { ok: true; tenantId: number; adminUserId: number; schoolName: string; slug: string; domain: string; inviteUrl: string; emailed: boolean; adminEmail: string; app: boolean }

const asUser = (u: User) => ({ ...u, collection: 'users' }) as never

/** Approve a pending application (Super Admin only). Nothing is created unless everything succeeds. */
export async function approve(payload: Payload, operator: User, value: ApprovalInput, note: string, rootDomain: string): Promise<ApproveResult> {
  if (!isSuperAdmin(operator as never)) return { ok: false, errors: ['Hanya Super Admin platform yang dapat menyetujui.'] }
  if (!value.domain && !rootDomain) return { ok: false, errors: ['Isi domain sekolah (platform belum punya PLATFORM_ROOT_DOMAIN untuk alamat <kode>.domain-platform).'] }
  const req = await createLocalReq({ user: asUser(operator) }, payload)
  await initTransaction(req)
  let made: { tenantId: number; adminUserId: number; adminEmail: string; schoolName: string; domain: string }
  try {
    const app = await payload.findByID({ collection: 'school-applications', id: value.applicationId, depth: 0, req, overrideAccess: false })
    if (app.status !== 'pending') throw new Error('Pendaftaran ini sudah diputuskan.')
    const email = app.adminEmail.toLowerCase()
    const [slugTaken, emailTaken, domainTaken] = await Promise.all([
      payload.count({ collection: 'tenants', where: { slug: { equals: value.slug } }, req, overrideAccess: true }),
      payload.count({ collection: 'users', where: { email: { equals: email } }, req, overrideAccess: true }),
      value.domain ? payload.count({ collection: 'tenants', where: { 'domains.domain': { equals: value.domain } }, req, overrideAccess: true }) : Promise.resolve({ totalDocs: 0 }),
    ])
    if (slugTaken.totalDocs) throw new Error(`Kode sekolah "${value.slug}" sudah dipakai. Pilih kode lain.`)
    if (emailTaken.totalDocs) throw new Error(`Email ${email} sudah dipakai akun lain (satu akun hanya untuk satu sekolah). Minta sekolah memakai email lain.`)
    if (domainTaken.totalDocs) throw new Error(`Domain ${value.domain} sudah dipakai sekolah lain.`)

    const tenant = await payload.create({
      collection: 'tenants',
      req,
      overrideAccess: false,
      data: {
        name: value.name,
        slug: value.slug,
        status: 'trial',
        timezone: value.timezone as never,
        web: { plan: value.webPlan, status: 'trial' } as never,
        app: { plan: value.appPlan, status: 'trial' } as never,
        domains: value.domain ? [{ domain: value.domain, primary: true }] : [],
      },
    })
    const admin = await payload.create({
      collection: 'users',
      req,
      overrideAccess: false,
      // nobody knows this password: the Admin Teknis sets their own through the invitation link
      data: { name: app.adminName, email, password: randomBytes(24).toString('base64url'), role: 'admin', tenant: tenant.id, active: true } as never,
    })
    await payload.update({
      collection: 'school-applications',
      id: app.id,
      req,
      overrideAccess: false,
      data: { status: 'approved', decidedAt: new Date().toISOString(), decidedBy: operator.id, tenant: tenant.id, adminUser: admin.id, decisionNote: note.trim().slice(0, 1000) || null },
    })
    await commitTransaction(req)
    made = { tenantId: tenant.id, adminUserId: admin.id, adminEmail: email, schoolName: tenant.name, domain: value.domain || `${value.slug}.${rootDomain}` }
  } catch (e) {
    await killTransaction(req)
    return { ok: false, errors: [e instanceof Error ? e.message : 'Persetujuan gagal. Tidak ada yang dibuat.'] }
  }
  clearTenantCache()

  // Invitation = a password-reset token valid 72 hours, on the school's own address (where its staff sign in).
  const token = await payload.forgotPassword({ collection: 'users', data: { email: made.adminEmail }, disableEmail: true, expiration: 72 * 3_600_000 })
  if (!token) return { ok: false, errors: ['Sekolah sudah dibuat, tetapi tautan undangan gagal dibuat. Kirim ulang lewat "Lupa kata sandi" di CMS sekolah.'] }
  const inviteUrl = `https://${made.domain}/admin/reset/${token}`
  const emailed = await mail(
    payload,
    made.adminEmail,
    `${made.schoolName} disetujui — atur kata sandi Admin Teknis`,
    `<p>Selamat, pendaftaran <b>${escapeHtml(made.schoolName)}</b> di platform Satu Sekolah sudah disetujui.</p><p>Anda menjadi <b>Admin Teknis</b> sekolah. Atur kata sandi melalui tautan berikut (berlaku 72 jam):</p><p><a href="${inviteUrl}">${inviteUrl}</a></p><p>Setelah masuk, Anda dapat membuat akun staf lain dan mengatur perannya di menu Pengguna.</p>`,
    'undangan Admin Teknis',
  )
  return { ok: true, tenantId: made.tenantId, adminUserId: made.adminUserId, schoolName: made.schoolName, slug: value.slug, domain: made.domain, inviteUrl, emailed, adminEmail: made.adminEmail, app: value.appPlan !== 'none' }
}

/** Reject a pending application with a reason (Super Admin only). Returns false when nothing was changed. */
export async function reject(payload: Payload, operator: User, id: number, note: string): Promise<boolean> {
  if (!isSuperAdmin(operator as never) || !Number.isInteger(id) || id <= 0) return false
  const reason = note.trim().slice(0, 1000) || 'Belum memenuhi syarat.'
  const req = await createLocalReq({ user: asUser(operator) }, payload)
  const app = await payload.findByID({ collection: 'school-applications', id, depth: 0, req, overrideAccess: false }).catch(() => null)
  if (!app || app.status !== 'pending') return false
  await payload.update({ collection: 'school-applications', id, req, overrideAccess: false, data: { status: 'rejected', decidedAt: new Date().toISOString(), decidedBy: operator.id, decisionNote: reason } })
  await mail(
    payload,
    app.adminEmail,
    `Pendaftaran ${app.schoolName} (${app.reference})`,
    `<p>Yth. ${escapeHtml(app.adminName)},</p><p>Mohon maaf, pendaftaran <b>${escapeHtml(app.schoolName)}</b> belum dapat kami setujui.</p><p>Alasan: ${escapeHtml(reason)}</p><p>Anda dapat mendaftar kembali setelah melengkapi data.</p>`,
    'penolakan pendaftaran',
  )
  return true
}
