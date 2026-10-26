/**
 * Assisted registration (§19.4): the committee registers for a family that needs help. The family gets its own
 * account (existing one reused by login), with a temporary password shown once — staff never keep family passwords.
 */
import { eq } from 'drizzle-orm'
import { accounts, persons } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command } from '@/server/command'
import { fail } from '@/server/errors'
import { hashPassword, randomToken } from '@/server/secrets'
import { isEmail, normLogin } from '../identity/service'

export async function createAccountFor(ctx: Ctx, input: { login: string; name: string }) {
  const s = requireStaff(ctx, 'admissions.manage')
  const login = normLogin(input.login)
  if (!/^[a-z0-9._@+-]{4,80}$/.test(login)) fail('Isi email atau nama pengguna keluarga (4–80 karakter).', 'invalid', 'login')
  const temp = randomToken(9).replace(/[-_]/g, 'x')
  const hash = await hashPassword(temp)
  return command(ctx, 'admissions.assist_account', {}, async (tx, fx) => {
    const [existing] = await tx.select().from(accounts).where(eq(accounts.login, login))
    if (existing) return { accountId: existing.id, login, temporaryPassword: null as string | null }
    const [p] = await tx.insert(persons).values({ fullName: input.name.trim(), email: isEmail(login) ? login : null }).returning({ id: persons.id })
    const [a] = await tx
      .insert(accounts)
      .values({ login, email: isEmail(login) ? login : null, passwordHash: hash, personId: p!.id, mustChangePassword: true, createdBy: s.id, emailVerifiedAt: ctx.now, verifiedBy: `staff:${s.id}` })
      .returning({ id: accounts.id })
    fx.audit('admissions.assist_account', 'account', a!.id)
    return { accountId: a!.id, login, temporaryPassword: temp as string | null }
  })
}
