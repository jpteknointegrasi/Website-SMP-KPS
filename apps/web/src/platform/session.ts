import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isSuperAdmin } from '@/access/roles'
import { rawPayload } from '@/lib/payload'
import { schoolOwningHost } from '@/tenancy/resolve'
import type { User } from '@/payload-types'

/**
 * The platform console (/platform) and the school sign-up form (/daftar-sekolah) live only on a platform address:
 * a host that belongs to no school (the Web deployment's *.vercel.app address, or a platform domain). On a school's
 * own domain these pages do not exist (404), so a school site never shows the platform.
 */
export const onPlatformHost = cache(async () => {
  const host = (await headers()).get('host')
  return !(await schoolOwningHost(await rawPayload(), host))
})

/** The signed-in platform Super Admin, else null. */
export const platformOperator = cache(async (): Promise<User | null> => {
  const payload = await rawPayload()
  const { user } = await payload.auth({ headers: await headers() })
  return user && isSuperAdmin(user as never) && (user as User).active !== false ? (user as User) : null
})

/** Guard for console pages: platform address + signed-in Super Admin. */
export async function requireOperator(): Promise<User> {
  if (!(await onPlatformHost())) notFound()
  const user = await platformOperator()
  if (!user) redirect('/platform/masuk')
  return user
}
