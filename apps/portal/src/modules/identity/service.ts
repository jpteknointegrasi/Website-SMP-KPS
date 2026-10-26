/**
 * Family/student accounts of the school's App: sign-up, e-mail verification, sign-in with brute-force guards,
 * password reset and change (Blueprint §5). Staff do not have accounts here: they sign in through the CMS.
 */
import { and, count, eq, gt, isNull, sql } from 'drizzle-orm'
import { accountSessions, accountTokens, accounts, loginAttempts, persons } from '@/db/schema'
import type { Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail } from '@/server/errors'
import { hashPassword, passwordProblem, randomToken, sha256, verifyPassword } from '@/server/secrets'

export const SESSION_DAYS = 30
const LOCK_AFTER = 5
const LOCK_MINUTES = 15

export const normLogin = (v: string) => v.trim().toLowerCase()
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200

async function issueToken(tx: Db, accountId: string, purpose: 'verify_email' | 'reset_password', hours: number, now: Date) {
  const token = randomToken()
  await tx.insert(accountTokens).values({ accountId, purpose, tokenHash: sha256(token), expiresAt: new Date(now.getTime() + hours * 3_600_000) })
  return token
}

/**
 * Self sign-up (prospective families). Does not reveal whether the e-mail already has an account: an existing owner is
 * told by e-mail instead (§29 account privacy).
 */
export async function signUp(ctx: Ctx, input: { name: string; email: string; password: string }) {
  const email = normLogin(input.email)
  if (!input.name.trim() || input.name.length > 120) fail('Isi nama lengkap Anda.', 'invalid', 'nama')
  if (!isEmail(email)) fail('Alamat email tidak valid.', 'invalid', 'email')
  const pw = passwordProblem(input.password, email)
  if (pw) fail(pw, 'invalid', 'sandi')
  const passwordHash = await hashPassword(input.password)
  return command(ctx, 'account.signup', {}, async (tx, fx) => {
    const [existing] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.login, email)).limit(1)
    if (existing) {
      fx.event('mail.send', {
        to: email,
        subject: 'Akun portal Anda sudah ada',
        text: 'Ada permintaan membuat akun portal dengan email ini, tetapi email ini sudah memiliki akun. Silakan masuk, atau gunakan "Lupa kata sandi" bila tidak ingat kata sandinya. Abaikan email ini bila bukan Anda.',
        link: '/portal/masuk',
      })
      fx.audit('account.signup_existing', 'account', existing.id)
      return { created: false }
    }
    const [person] = await tx.insert(persons).values({ fullName: input.name.trim(), email }).returning({ id: persons.id })
    const [acc] = await tx.insert(accounts).values({ login: email, email, passwordHash, personId: person!.id }).returning({ id: accounts.id })
    const token = await issueToken(tx, acc!.id, 'verify_email', 48, ctx.now)
    fx.event('mail.send', {
      to: email,
      subject: 'Verifikasi email akun portal',
      text: `Halo ${input.name.trim()},\n\nKlik tautan berikut untuk memverifikasi email akun portal Anda (berlaku 48 jam):\n\nBuka: /portal/verifikasi-email?t=${token}`,
      link: `/portal/verifikasi-email?t=${token}`,
    })
    fx.audit('account.signup', 'account', acc!.id)
    return { created: true, accountId: acc!.id }
  })
}

export async function resendVerification(ctx: Ctx) {
  const a = ctx.account
  if (!a?.email || a.emailVerified) return
  await command(ctx, 'account.resend_verification', {}, async (tx, fx) => {
    const [recent] = await tx
      .select({ n: count() })
      .from(accountTokens)
      .where(and(eq(accountTokens.accountId, a.id), eq(accountTokens.purpose, 'verify_email'), gt(accountTokens.createdAt, new Date(ctx.now.getTime() - 10 * 60_000))))
    if ((recent?.n ?? 0) >= 2) fail('Email verifikasi baru saja dikirim. Periksa kotak masuk/spam, atau coba lagi 10 menit lagi.')
    const token = await issueToken(tx, a.id, 'verify_email', 48, ctx.now)
    fx.event('mail.send', { to: a.email, subject: 'Verifikasi email akun portal', text: `Klik tautan berikut untuk memverifikasi email Anda (berlaku 48 jam):\n\nBuka: /portal/verifikasi-email?t=${token}`, link: `/portal/verifikasi-email?t=${token}` })
  })
}

async function useToken(tx: Db, token: string, purpose: string, now: Date) {
  if (!token || token.length > 100) return null
  const [t] = await tx
    .select()
    .from(accountTokens)
    .where(and(eq(accountTokens.tokenHash, sha256(token)), eq(accountTokens.purpose, purpose), isNull(accountTokens.usedAt), gt(accountTokens.expiresAt, now)))
    .for('update')
    .limit(1)
  if (!t) return null
  await tx.update(accountTokens).set({ usedAt: now }).where(eq(accountTokens.id, t.id))
  return t
}

export async function verifyEmail(ctx: Ctx, token: string) {
  return command(ctx, 'account.verify_email', {}, async (tx, fx) => {
    const t = await useToken(tx, token, 'verify_email', ctx.now)
    if (!t) fail('Tautan verifikasi tidak berlaku atau sudah dipakai. Minta tautan baru dari halaman akun.')
    await tx.update(accounts).set({ emailVerifiedAt: ctx.now, verifiedBy: 'email' }).where(and(eq(accounts.id, t!.accountId), isNull(accounts.emailVerifiedAt)))
    fx.audit('account.email_verified', 'account', t!.accountId)
  })
}

/**
 * Sign-in. Same message for unknown login and wrong password; per-login throttling also applies to logins that do not
 * exist; an account is locked for 15 minutes after 5 failures.
 */
export async function signIn(ctx: Ctx, input: { login: string; password: string }) {
  const login = normLogin(input.login)
  const WRONG = 'Email/nama pengguna atau kata sandi salah.'
  if (!login || !input.password) fail(WRONG)
  const since = new Date(ctx.now.getTime() - LOCK_MINUTES * 60_000)
  const [recent] = await ctx.db.select({ n: count() }).from(loginAttempts).where(and(eq(loginAttempts.scope, `login:${login}`), gt(loginAttempts.at, since)))
  if ((recent?.n ?? 0) >= 10) fail(`Terlalu banyak percobaan masuk. Coba lagi dalam ${LOCK_MINUTES} menit.`)

  const [acc] = await ctx.db.select().from(accounts).where(eq(accounts.login, login)).limit(1)
  const ok = acc ? await verifyPassword(input.password, acc.passwordHash) : (await hashPassword(input.password), false)
  if (acc && acc.lockedUntil && acc.lockedUntil > ctx.now) fail(`Akun dikunci sementara karena terlalu banyak percobaan salah. Coba lagi setelah ${LOCK_MINUTES} menit atau atur ulang kata sandi.`)
  if (!acc || !ok || acc.status !== 'active') {
    await ctx.db.insert(loginAttempts).values({ scope: `login:${login}`, at: ctx.now })
    if (acc && acc.status === 'active') {
      const failed = acc.failedLogins + 1
      await ctx.db
        .update(accounts)
        .set({ failedLogins: failed >= LOCK_AFTER ? 0 : failed, lockedUntil: failed >= LOCK_AFTER ? new Date(ctx.now.getTime() + LOCK_MINUTES * 60_000) : null })
        .where(eq(accounts.id, acc.id))
    }
    if (acc && acc.status !== 'active' && ok) fail('Akun ini dinonaktifkan. Hubungi sekolah.')
    fail(WRONG)
  }
  const token = randomToken()
  await command(ctx, 'account.signin', {}, async (tx, fx) => {
    await tx.insert(accountSessions).values({ tokenHash: sha256(token), accountId: acc!.id, expiresAt: new Date(ctx.now.getTime() + SESSION_DAYS * 86_400_000), lastSeenAt: ctx.now })
    await tx.update(accounts).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: ctx.now }).where(eq(accounts.id, acc!.id))
    // housekeeping: expired sessions of this account
    await tx.delete(accountSessions).where(and(eq(accountSessions.accountId, acc!.id), sql`${accountSessions.expiresAt} < ${ctx.now}`))
    fx.audit('account.signin', 'account', acc!.id)
  })
  return { token, mustChangePassword: acc.mustChangePassword }
}

export async function signOut(ctx: Ctx) {
  const a = ctx.account
  if (!a) return
  await command(ctx, 'account.signout', {}, async (tx, fx) => {
    await tx.delete(accountSessions).where(eq(accountSessions.id, a.sessionId))
    fx.audit('account.signout', 'account', a.id)
  })
}

export async function requestReset(ctx: Ctx, loginInput: string) {
  const login = normLogin(loginInput)
  if (!login) fail('Isi email akun Anda.', 'invalid', 'email')
  await command(ctx, 'account.request_reset', {}, async (tx, fx) => {
    const [acc] = await tx.select().from(accounts).where(eq(accounts.login, login)).limit(1)
    if (!acc || !acc.email || acc.status !== 'active') return // same answer whether or not it exists
    const [recent] = await tx
      .select({ n: count() })
      .from(accountTokens)
      .where(and(eq(accountTokens.accountId, acc.id), eq(accountTokens.purpose, 'reset_password'), gt(accountTokens.createdAt, new Date(ctx.now.getTime() - 15 * 60_000))))
    if ((recent?.n ?? 0) >= 3) return
    const token = await issueToken(tx, acc.id, 'reset_password', 1, ctx.now)
    fx.event('mail.send', {
      to: acc.email,
      subject: 'Atur ulang kata sandi portal',
      text: `Ada permintaan mengatur ulang kata sandi akun portal Anda. Tautan berlaku 1 jam:\n\nBuka: /portal/atur-ulang-sandi?t=${token}\n\nAbaikan email ini bila Anda tidak memintanya.`,
      link: `/portal/atur-ulang-sandi?t=${token}`,
    })
    fx.audit('account.reset_requested', 'account', acc.id)
  })
}

/** New password from a reset link: every session of the account is signed out. */
export async function resetPassword(ctx: Ctx, token: string, password: string) {
  const hash = await hashPassword(password)
  await command(ctx, 'account.reset_password', {}, async (tx, fx) => {
    const t = await useToken(tx, token, 'reset_password', ctx.now)
    if (!t) fail('Tautan atur ulang tidak berlaku atau sudah dipakai. Minta tautan baru.')
    const [acc] = await tx.select().from(accounts).where(eq(accounts.id, t!.accountId))
    const pw = passwordProblem(password, acc!.login)
    if (pw) fail(pw, 'invalid', 'sandi')
    // the link proves control of the mailbox: it also verifies the e-mail
    await tx
      .update(accounts)
      .set({ passwordHash: hash, failedLogins: 0, lockedUntil: null, mustChangePassword: false, emailVerifiedAt: acc!.emailVerifiedAt ?? ctx.now, verifiedBy: acc!.verifiedBy ?? 'email' })
      .where(eq(accounts.id, acc!.id))
    await tx.delete(accountSessions).where(eq(accountSessions.accountId, acc!.id))
    fx.audit('account.password_reset', 'account', acc!.id)
  })
}

/** Change of password by the signed-in owner; other sessions are signed out. */
export async function changePassword(ctx: Ctx, current: string, next: string) {
  const a = ctx.account
  if (!a) fail('Silakan masuk.', 'unauthenticated')
  const [acc] = await ctx.db.select().from(accounts).where(eq(accounts.id, a!.id))
  if (!acc || !(await verifyPassword(current, acc.passwordHash))) fail('Kata sandi saat ini salah.', 'invalid', 'sandi_lama')
  const pw = passwordProblem(next, acc!.login)
  if (pw) fail(pw, 'invalid', 'sandi')
  if (current === next) fail('Kata sandi baru harus berbeda.', 'invalid', 'sandi')
  const hash = await hashPassword(next)
  await command(ctx, 'account.change_password', {}, async (tx, fx) => {
    await tx.update(accounts).set({ passwordHash: hash, mustChangePassword: false }).where(eq(accounts.id, acc!.id))
    await tx.delete(accountSessions).where(and(eq(accountSessions.accountId, acc!.id), sql`${accountSessions.id} <> ${a!.sessionId}`))
    fx.audit('account.password_changed', 'account', acc!.id)
  })
}
