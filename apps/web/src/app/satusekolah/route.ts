import { onPlatformHost } from '@/platform/session'
import { LANDING_HTML } from '@/platform/landing-html'

export const dynamic = 'force-dynamic'

/**
 * Landing page SatuSekolah for the platform address (e.g. satusekolah.my.id). The proxy rewrites "/" on a platform
 * host to this route. On a school's own domain it does not exist (404), like the other platform pages.
 */
export async function GET() {
  if (!(await onPlatformHost())) return new Response('Not found', { status: 404 })
  return new Response(LANDING_HTML, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
  })
}
