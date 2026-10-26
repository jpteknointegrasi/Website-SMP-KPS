/**
 * Who is acting, for which school, against which database. Built per request (pages, routes) or directly in tests and
 * scripts. Every module receives a Ctx; nothing reads the request elsewhere.
 */
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import type { SchoolInfo, StaffMember } from '@sekolahku/core'
import type { SchoolDb } from '@/db/school-db'
import { accountSessions, accounts, auditEvents, persons, staffMembers, staffRoles, supportGrants } from '@/db/schema'
import { GUARDED_ROLES, IMPLICIT_ROLES, permissionsOf, type Permission } from './roles'
import { sha256 } from './secrets'
import { forbidden, fail } from './errors'

export type StaffActor = {
  kind: 'staff'
  id: string // staff_members.id
  webUserId: string
  name: string
  email: string
  webRole: string
  roles: Set<string>
  perms: Set<Permission>
  /** Platform operator under a school-issued, time-limited support grant: read-only, no restricted data. */
  support?: { grantId: string; expiresAt: Date }
}
export type AccountActor = {
  kind: 'account'
  id: string
  personId: string
  login: string
  name: string
  email: string | null
  emailVerified: boolean
  mustChangePassword: boolean
  sessionId: string
}

export type Ctx = {
  school: SchoolInfo
  db: SchoolDb
  tz: string
  now: Date
  staff: StaffActor | null
  account: AccountActor | null
  correlationId: string
  /** Set by commands that queued outbox events; the request handler then delivers them after responding. */
  outboxPending?: boolean
}

export function makeCtx(p: { school: SchoolInfo; db: SchoolDb; staff?: StaffActor | null; account?: AccountActor | null; now?: Date }): Ctx {
  return {
    school: p.school,
    db: p.db,
    tz: p.school.timezone,
    now: p.now ?? new Date(),
    staff: p.staff ?? null,
    account: p.account ?? null,
    correlationId: crypto.randomUUID(),
  }
}

/**
 * Binds a CMS staff member (confirmed by the website) to this school's App staff record and loads their App roles.
 * The record is matched by CMS user id, or — on the first visit — by an e-mail the school admin pre-registered.
 * Deactivated App staff get no staff access even with a valid CMS session.
 */
export async function loadStaff(db: SchoolDb, m: StaffMember, now = new Date()): Promise<StaffActor | null> {
  const webId = String(m.id)
  const email = m.email.trim().toLowerCase()
  let [row] = await db.select().from(staffMembers).where(eq(staffMembers.webUserId, webId)).limit(1)
  if (!row) {
    // pre-registered by e-mail (not yet bound), else new
    const [pre] = await db
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.email, email), isNull(staffMembers.webUserId)))
      .limit(1)
    if (pre) {
      ;[row] = await db.update(staffMembers).set({ webUserId: webId, name: m.name, webRole: m.role, lastSeenAt: now }).where(eq(staffMembers.id, pre.id)).returning()
      // binding by e-mail alone is not proof of identity: roles that open restricted data or approve them
      // (BK, UKS, pimpinan) granted before the first sign-in are withdrawn and must be granted again to the bound account
      const guarded = await db.select().from(staffRoles).where(and(eq(staffRoles.staffId, pre.id), isNull(staffRoles.revokedAt), inArray(staffRoles.role, [...GUARDED_ROLES])))
      for (const g of guarded) {
        await db.update(staffRoles).set({ revokedAt: now, revokedBy: 'system:binding' }).where(eq(staffRoles.id, g.id))
        await db.insert(auditEvents).values({ actorType: 'system', action: 'staff.role_withdrawn_on_binding', objectType: 'staff', objectId: pre.id, meta: { role: g.role } })
      }
    }
    else {
      const [byEmail] = await db.select().from(staffMembers).where(eq(staffMembers.email, email)).limit(1)
      // e-mail already bound to ANOTHER CMS account: refuse rather than merge identities
      if (byEmail) return null
      ;[row] = await db
        .insert(staffMembers)
        .values({ webUserId: webId, email, name: m.name, webRole: m.role, lastSeenAt: now })
        .onConflictDoNothing()
        .returning()
      if (!row) [row] = await db.select().from(staffMembers).where(eq(staffMembers.webUserId, webId)).limit(1)
    }
  } else if (row.name !== m.name || row.webRole !== m.role || row.email !== email || !row.lastSeenAt || now.getTime() - row.lastSeenAt.getTime() > 600_000) {
    ;[row] = await db.update(staffMembers).set({ name: m.name, webRole: m.role, email, lastSeenAt: now }).where(eq(staffMembers.id, row.id)).returning()
  }
  if (!row || !row.active) return null
  const granted = await db
    .select({ role: staffRoles.role })
    .from(staffRoles)
    .where(and(eq(staffRoles.staffId, row.id), isNull(staffRoles.revokedAt)))
  const roles = new Set<string>([...granted.map((g) => g.role), ...(IMPLICIT_ROLES[m.role] ?? [])])
  return { kind: 'staff', id: row.id, webUserId: webId, name: row.displayName || m.name, email, webRole: m.role, roles, perms: permissionsOf(roles) }
}

/** Read-only permissions of a support grant: no restricted (BK/UKS) data, no finance, no writes. */
const SUPPORT_PERMS: Permission[] = ['students.read', 'audit.view', 'dashboard.view']

/**
 * The platform operator (CMS Super Admin) inside this school's App, only while the school's App admin has issued a
 * support grant to that e-mail (time-limited, revocable). Read-only; every visit is audited (§25, addendum v2.1).
 */
export async function loadSupport(db: SchoolDb, m: StaffMember, now = new Date()): Promise<StaffActor | null> {
  const email = m.email.trim().toLowerCase()
  const [g] = await db
    .select()
    .from(supportGrants)
    .where(and(eq(supportGrants.operatorEmail, email), isNull(supportGrants.revokedAt), gt(supportGrants.expiresAt, now)))
    .orderBy(desc(supportGrants.expiresAt))
    .limit(1)
  if (!g) return null
  const key = `operator:${email}`
  let [row] = await db.select().from(staffMembers).where(eq(staffMembers.email, key)).limit(1)
  if (!row) [row] = await db.insert(staffMembers).values({ email: key, name: `Bantuan teknis (${m.name})`, active: false }).onConflictDoNothing().returning()
  if (!row) [row] = await db.select().from(staffMembers).where(eq(staffMembers.email, key)).limit(1)
  // audit the visit (at most every 15 minutes per grant)
  const [last] = await db
    .select({ at: auditEvents.occurredAt })
    .from(auditEvents)
    .where(and(eq(auditEvents.action, 'support.access'), eq(auditEvents.objectId, g.id)))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(1)
  if (!last || now.getTime() - last.at.getTime() > 900_000) await db.insert(auditEvents).values({ actorType: 'staff', actorId: row!.id, action: 'support.access', objectType: 'support_grant', objectId: g.id, meta: { operator: email } })
  return { kind: 'staff', id: row!.id, webUserId: String(m.id), name: `Bantuan teknis (${m.name})`, email, webRole: 'superadmin', roles: new Set(['support']), perms: new Set(SUPPORT_PERMS), support: { grantId: g.id, expiresAt: g.expiresAt } }
}

/** The family/student account of a session cookie value (unexpired session, active account). */
export async function loadAccount(db: SchoolDb, token: string | undefined | null, now = new Date()): Promise<AccountActor | null> {
  if (!token || token.length < 20 || token.length > 200) return null
  const [r] = await db
    .select({ s: accountSessions, a: accounts, name: persons.fullName })
    .from(accountSessions)
    .innerJoin(accounts, eq(accounts.id, accountSessions.accountId))
    .innerJoin(persons, eq(persons.id, accounts.personId))
    .where(and(eq(accountSessions.tokenHash, sha256(token)), gt(accountSessions.expiresAt, now)))
    .limit(1)
  if (!r || r.a.status !== 'active') return null
  if (!r.s.lastSeenAt || now.getTime() - r.s.lastSeenAt.getTime() > 300_000)
    await db.update(accountSessions).set({ lastSeenAt: now }).where(eq(accountSessions.id, r.s.id))
  return {
    kind: 'account',
    id: r.a.id,
    personId: r.a.personId,
    login: r.a.login,
    name: r.name,
    email: r.a.email,
    emailVerified: Boolean(r.a.emailVerifiedAt),
    mustChangePassword: r.a.mustChangePassword,
    sessionId: r.s.id,
  }
}

// ---------- guards used by modules ----------
export function requireStaff(ctx: Ctx, ...perms: Permission[]): StaffActor {
  const s = ctx.staff
  if (!s) return fail('Silakan masuk sebagai staf sekolah.', 'unauthenticated')
  if (perms.length && !perms.some((p) => s.perms.has(p))) forbidden()
  return s
}
export const hasPerm = (ctx: Ctx, ...perms: Permission[]) => Boolean(ctx.staff && perms.some((p) => ctx.staff!.perms.has(p)))

export function requireAccount(ctx: Ctx): AccountActor {
  if (!ctx.account) return fail('Silakan masuk dengan akun Anda.', 'unauthenticated')
  return ctx.account
}

/** Actor fields stored on records ("staff:<id>" / "account:<id>"). */
export const actorRef = (ctx: Ctx) => (ctx.staff ? `staff:${ctx.staff.id}` : ctx.account ? `account:${ctx.account.id}` : 'system')
export const actorName = (ctx: Ctx) => ctx.staff?.name ?? ctx.account?.name ?? 'Sistem'

