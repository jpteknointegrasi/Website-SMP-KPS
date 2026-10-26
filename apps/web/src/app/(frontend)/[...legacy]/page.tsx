import { notFound, permanentRedirect } from 'next/navigation'
import { payloadClient } from '@/lib/payload'

/**
 * Fallback for every unmatched public URL.
 * Old WordPress paths (e.g. /home/profil/) are redirected 301 using the CMS "Pengalihan URL" table —
 * only when LEGACY_REDIRECTS=true (switch on at the approved cutover, brief §14). Otherwise → 404 page.
 * Destinations are validated as internal paths by the collection, so there is no open redirect.
 */
export default async function Legacy({ params }: { params: Promise<{ legacy: string[] }> }) {
  if (process.env.LEGACY_REDIRECTS === 'true') {
    const parts = (await params).legacy.map((p) => decodeURIComponent(p))
    const path = `/${parts.join('/')}`.replace(/\/+$/, '')
    const payload = await payloadClient()
    const res = await payload.find({
      collection: 'redirects',
      where: { and: [{ active: { equals: true } }, { or: [{ oldPath: { equals: path } }, { oldPath: { equals: `${path}/` } }] }] },
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })
    const to = res.docs[0]?.newPath
    if (to && /^\/(?!\/)/.test(to) && to !== path) permanentRedirect(to)
  }
  notFound()
}

export const metadata = { robots: { index: false } }
