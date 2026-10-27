/** School App administration: staff & roles, branding, module activation, support access (MOD-01, ACC-01, §25). */
import { and, eq, isNull } from 'drizzle-orm'
import { staffMembers, staffRoles, supportGrants } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { isGuardedRole, isRole, mayChangeRole, ROLES } from '@/server/roles'
import { DEFAULT_BRANDING, getBranding, getModules, MODULE_STATES, MODULES, putSetting, type Branding, type ModuleState } from '@/server/settings'
import { saveFile, IMAGES } from '@/server/files'
import { isEmail } from '../identity/service'

export async function addStaff(ctx: Ctx, input: { email: string; name: string; displayName?: string | null; nip?: string | null; position?: string | null; roles: string[] }) {
  const s = requireStaff(ctx, 'staff.manage')
  const email = input.email.trim().toLowerCase()
  if (!isEmail(email)) fail('Email staf tidak valid. Gunakan email akun CMS staf tersebut.', 'invalid', 'email')
  if (!input.name.trim()) fail('Isi nama staf.', 'invalid', 'nama')
  for (const r of input.roles) if (!isRole(r)) fail('Peran tidak dikenal.')
  if (input.roles.some(isGuardedRole)) fail('Peran pimpinan, BK dan UKS diberikan setelah staf masuk pertama kali dengan akunnya (bukan saat pendaftaran email).')
  return command(ctx, 'staff.add', { input }, async (tx, fx) => {
    const [exists] = await tx.select({ id: staffMembers.id }).from(staffMembers).where(eq(staffMembers.email, email))
    if (exists) fail('Staf dengan email ini sudah terdaftar.', 'conflict', 'email')
    const [row] = await tx
      .insert(staffMembers)
      .values({ email, name: input.name.trim(), displayName: input.displayName || null, nip: input.nip || null, position: input.position || null })
      .returning({ id: staffMembers.id })
    for (const role of new Set(input.roles)) await tx.insert(staffRoles).values({ staffId: row!.id, role, grantedBy: s.id })
    fx.audit('staff.add', 'staff', row!.id, { roles: input.roles.join(',') })
    return row!.id
  })
}

export async function updateStaff(ctx: Ctx, id: string, input: { displayName: string | null; nip: string | null; position: string | null; active: boolean }) {
  const s = requireStaff(ctx, 'staff.manage')
  await command(ctx, 'staff.update', {}, async (tx, fx) => {
    const [row] = await tx.select().from(staffMembers).where(eq(staffMembers.id, id))
    if (!row) notFound('Staf')
    if (row!.id === s.id && !input.active) fail('Anda tidak dapat menonaktifkan akun Anda sendiri.')
    await tx.update(staffMembers).set(input).where(eq(staffMembers.id, id))
    fx.audit(input.active === row!.active ? 'staff.update' : input.active ? 'staff.activate' : 'staff.deactivate', 'staff', id)
  })
}

/**
 * Sets a staff member's roles. Roles the caller may not change (restricted BK/UKS roles without pimpinan/coordinator
 * rights, guarded roles on oneself, ordinary roles without staff.manage) keep their current state; trying to ADD one
 * is refused.
 */
export async function setStaffRoles(ctx: Ctx, id: string, roles: string[]) {
  const s = requireStaff(ctx, 'staff.manage', 'roles.restricted')
  for (const r of roles) if (!isRole(r)) fail('Peran tidak dikenal.')
  await command(ctx, 'staff.roles', {}, async (tx, fx) => {
    const [row] = await tx.select().from(staffMembers).where(eq(staffMembers.id, id))
    if (!row) notFound('Staf')
    const current = await tx.select().from(staffRoles).where(and(eq(staffRoles.staffId, id), isNull(staffRoles.revokedAt)))
    const asked = new Set(roles)
    const want = new Set<string>()
    for (const r of Object.keys(ROLES)) {
      const has = current.some((c) => c.role === r)
      if (mayChangeRole(s, id, r)) {
        if (asked.has(r)) want.add(r)
      } else {
        if (asked.has(r) && !has) fail(isGuardedRole(r) && id === s.id ? 'Peran pimpinan, BK dan UKS tidak dapat diberikan kepada diri sendiri.' : `Peran ${ROLES[r]!.label} hanya dapat diberikan oleh pimpinan sekolah${r === 'petugas_uks' ? '' : ' atau Koordinator BK'}.`)
        if (has) want.add(r)
      }
    }
    // an admin cannot remove their own admin role (avoid locking the school out)
    if (id === s.id && current.some((c) => c.role === 'school_admin') && !want.has('school_admin') && s.webRole !== 'admin')
      fail('Anda tidak dapat mencabut peran Admin App dari akun Anda sendiri.')
    for (const c of current)
      if (!want.has(c.role)) {
        await tx.update(staffRoles).set({ revokedAt: ctx.now, revokedBy: s.id }).where(eq(staffRoles.id, c.id))
        fx.audit('staff.role_revoked', 'staff', id, { role: c.role })
      }
    for (const r of want)
      if (!current.some((c) => c.role === r)) {
        await tx.insert(staffRoles).values({ staffId: id, role: r, grantedBy: s.id })
        fx.audit('staff.role_granted', 'staff', id, { role: r })
        if (isGuardedRole(r)) fx.notify({ type: 'staff', id }, { title: `Anda diberi peran ${ROLES[r]?.label ?? r} di App sekolah`, link: '/portal/staf' })
      }
  })
}

export async function saveBranding(ctx: Ctx, input: Partial<Branding>, uploads: { logo?: { name: string; buffer: Buffer } | null; hero?: { name: string; buffer: Buffer } | null }) {
  const s = requireStaff(ctx, 'settings.manage')
  for (const c of [input.primary, input.navy]) if (c && !/^#[0-9a-f]{6}$/i.test(c)) fail('Warna harus berformat #RRGGBB.')
  await command(ctx, 'settings.branding', {}, async (tx, fx) => {
    const cur = await getBranding(tx)
    const next: Branding = { ...DEFAULT_BRANDING, ...cur, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) }
    if (uploads.logo) next.logoFileId = (await saveFile(ctx, tx, uploads.logo, { allow: ['png', 'jpg', 'webp'], maxMb: 2, classification: 'public', contextType: 'branding', label: 'Logo' })).id
    if (uploads.hero) next.heroFileId = (await saveFile(ctx, tx, uploads.hero, { allow: IMAGES, maxMb: 4, classification: 'public', contextType: 'branding', label: 'Foto sekolah' })).id
    await putSetting(tx, 'branding', next, s.id)
    fx.audit('settings.branding', 'settings', 'branding')
  })
}

export async function setModuleState(ctx: Ctx, code: string, state: string) {
  const s = requireStaff(ctx, 'settings.manage')
  if (!MODULES.some((m) => m.code === code)) fail('Modul tidak dikenal.')
  if (!(state in MODULE_STATES)) fail('Status modul tidak dikenal.')
  await command(ctx, 'settings.module', {}, async (tx, fx) => {
    const cur = await getModules(tx)
    await putSetting(tx, 'modules', { ...cur, [code]: state as ModuleState }, s.id)
    fx.audit('settings.module', 'module', code, { from: cur[code as keyof typeof cur], to: state })
  })
}

/** Time-limited support access for the platform operator; reasoned and audited (§25). */
export async function grantSupport(ctx: Ctx, input: { email: string; reason: string; hours: number; scope?: 'operasional' | 'data_siswa' }) {
  const s = requireStaff(ctx, 'staff.manage')
  // support access is the SCHOOL's consent to the platform: the platform cannot grant it to itself
  if (ctx.staff?.platform) forbidden('Akses bantuan teknis hanya dapat diberikan oleh Admin App sekolah.')
  if (!isEmail(input.email.trim().toLowerCase())) fail('Email operator tidak valid.')
  if (input.reason.trim().length < 10) fail('Tuliskan alasan akses bantuan (minimal 10 karakter).')
  if (!(input.hours >= 1 && input.hours <= 72)) fail('Durasi 1–72 jam.')
  await command(ctx, 'support.grant', {}, async (tx, fx) => {
    const [g] = await tx
      .insert(supportGrants)
      .values({ operatorEmail: input.email.trim().toLowerCase(), reason: input.reason.trim(), scope: input.scope ?? 'operasional', grantedBy: s.id, expiresAt: new Date(ctx.now.getTime() + input.hours * 3_600_000) })
      .returning({ id: supportGrants.id })
    fx.audit('support.grant', 'support_grant', g!.id, { hours: input.hours, scope: input.scope ?? 'operasional' })
  })
}
export async function revokeSupport(ctx: Ctx, id: string) {
  requireStaff(ctx, 'staff.manage')
  await command(ctx, 'support.revoke', {}, async (tx, fx) => {
    await tx.update(supportGrants).set({ revokedAt: ctx.now }).where(eq(supportGrants.id, id))
    fx.audit('support.revoke', 'support_grant', id)
  })
}

export const roleOptions = () => Object.entries(ROLES).map(([value, r]) => ({ value, label: r.label, group: r.group }))
