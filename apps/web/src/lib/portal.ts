import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { PORTAL_BASE_PATH, PORTAL_HOST_HEADER, PORTAL_PROXY_HEADER, hasProduct } from '@satusekolah/core'
import { currentTenant } from './payload'

export type PortalPublic = {
  events: { title: string; kind: string; startDate: string; endDate: string; description: string | null }[]
  achievements: { title: string; level: string; rank: string | null; date: string; field: string | null; name: string }[]
  alumni: { name: string; year: string; continuingTo: string | null; story: string | null }[]
}
export type PortalAdmissions = { cycles: { name: string; targetYear: string; targetGrade: string; status: string; openAt: string | null; closeAt: string | null; paths: { name: string; registrationFee: number | null }[] }[] }

/**
 * Server-side read of the school's Satu Sekolah App public endpoints (same trust path as the /portal proxy: the
 * school's host plus the shared secret). Returns null when the school has no App, the portal is not configured,
 * or the App does not answer — the website then simply shows its own content.
 */
async function portalGet<T>(path: string): Promise<T | null> {
  const origin = process.env.PORTAL_ORIGIN
  const t = await currentTenant()
  if (!origin || !t || !hasProduct(t, 'app')) return null
  const host = (await headers()).get('host') ?? t.primaryDomain ?? ''
  try {
    const r = await fetch(new URL(`${PORTAL_BASE_PATH}${path}`, origin), {
      headers: { [PORTAL_HOST_HEADER]: host, [PORTAL_PROXY_HEADER]: process.env.PORTAL_PROXY_SECRET ?? '' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

export const portalPublic = cache(() => portalGet<PortalPublic>('/api/publik/website'))
export const portalAdmissions = cache(() => portalGet<PortalAdmissions>('/api/publik/penerimaan'))
