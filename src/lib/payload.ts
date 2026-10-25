import 'server-only'
import { cache } from 'react'
import { AsyncLocalStorage } from 'node:async_hooks'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isLive, tenantByHost, tenantById, type TenantInfo } from '@/tenancy/resolve'
import { scopePayload, type TenantPayload } from '@/tenancy/scoped'
import { setRequestTimezone } from './tz'

/** Unscoped Payload: platform-level work only (resolving schools, admin views). Never for public pages. */
export const rawPayload = () => getPayload({ config })

export class TenantNotFoundError extends Error {
  constructor(public host: string) {
    super(`Tidak ada sekolah aktif untuk alamat ${host}`)
  }
}

const fixed = new AsyncLocalStorage<number>()

/** Runs `fn` as if the request came from school `tenantId` (scripts and tests; pages use the Host header). */
export const runAsTenant = <T>(tenantId: number, fn: () => Promise<T>) => fixed.run(tenantId, fn)

/** The school serving this request (by Host header), or null for an unknown/suspended address. */
export const currentTenant = cache(async (): Promise<TenantInfo | null> => {
  const pinned = fixed.getStore()
  const t = pinned ? await tenantById(await rawPayload(), pinned) : await tenantByHost(await rawPayload(), (await headers()).get('host'))
  if (!isLive(t)) return null
  setRequestTimezone(t.timezone)
  return t
})

/**
 * Payload confined to the school of this request. Every public page and route uses this, so a page can only
 * ever show its own school's content. Throws TenantNotFoundError when the address belongs to no active school.
 */
export const payloadClient = cache(async (): Promise<TenantPayload> => {
  const t = await currentTenant()
  if (!t) throw new TenantNotFoundError(fixed.getStore() ? `#${fixed.getStore()}` : ((await headers()).get('host') ?? ''))
  return scopePayload(await rawPayload(), t.id)
})

/**
 * Absolute base URL of the school serving this request (no trailing slash): its primary domain, else the
 * address it was reached on. Used for canonical links, sitemap, ICS and Open Graph.
 */
export const siteUrl = cache(async (): Promise<string> => {
  const t = await currentTenant()
  let host = t?.primaryDomain ?? null
  let proto = 'https'
  try {
    const h = await headers()
    host = host ?? h.get('host')
    const fwd = h.get('x-forwarded-proto')
    if (!t?.primaryDomain) proto = fwd ?? (host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https')
  } catch {
    // outside a request (tests/scripts)
  }
  return host ? `${proto}://${host}` : 'http://localhost:3000'
})
