import { NextResponse, type NextRequest } from 'next/server'
import { PORTAL_BASE_PATH, PORTAL_HOST_HEADER, PORTAL_SYNC_HEADER, PORTAL_PROXY_HEADER } from '@sekolahku/core'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
/** Platform console, school sign-up and the CMS stay reachable on the platform (*.vercel.app) address. */
const PLATFORM_PATHS = ['/platform', '/daftar-sekolah', '/admin']

/**
 * Runs before every request.
 *
 * 1. CSRF guard for the API. Schools have their own (changing) domains, so Payload's static `csrf` origin list
 *    cannot name them all. Instead, a state-changing /api request that states an Origin must come from the very
 *    host it is sent to. Browsers always send Origin on cross-site POST/PATCH/DELETE; session cookies are also
 *    SameSite=Lax. Server-to-server calls without an Origin header (cron with CRON_SECRET) are unaffected.
 *
 * 2. Single-school deployments only (NEXT_PUBLIC_SERVER_URL set): visits to *.vercel.app get a permanent redirect
 *    to that domain, except the API and the platform pages (/platform, /daftar-sekolah, /admin) that belong on the
 *    platform address. A multi-school deployment leaves NEXT_PUBLIC_SERVER_URL empty.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const path = request.nextUrl.pathname

  // 0. Sekolahku App lives on every school domain under /portal ("one portal"). The portal is its own deployment
  //    (PORTAL_ORIGIN); requests are passed through with the school's host and a shared secret so the portal can
  //    trust that host. The browser keeps talking to the school domain, so the staff sign-in cookie is shared.
  if ((path === PORTAL_BASE_PATH || path.startsWith(`${PORTAL_BASE_PATH}/`)) && process.env.PORTAL_ORIGIN) {
    const headers = new Headers(request.headers)
    headers.delete(PORTAL_SYNC_HEADER) // server-to-server only; never from a browser
    headers.set(PORTAL_HOST_HEADER, host)
    headers.set(PORTAL_PROXY_HEADER, process.env.PORTAL_PROXY_SECRET ?? '')
    return NextResponse.rewrite(new URL(path + request.nextUrl.search, process.env.PORTAL_ORIGIN), { request: { headers } })
  }

  if (path.startsWith('/api/') && !SAFE.has(request.method)) {
    const origin = request.headers.get('origin')
    if (origin) {
      let originHost = ''
      try {
        originHost = new URL(origin).host
      } catch {
        // malformed Origin → rejected below
      }
      if (originHost !== host) return NextResponse.json({ ok: false, error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    } else if (request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ ok: false, error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    }
  }

  if (process.env.VERCEL_ENV !== 'production') return NextResponse.next()
  const target = process.env.NEXT_PUBLIC_SERVER_URL
  if (!target || !host.endsWith('.vercel.app')) return NextResponse.next()
  if (path.startsWith('/api/')) return NextResponse.next()
  // platform pages live on the platform address itself (never on a school domain)
  if (PLATFORM_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return NextResponse.next()
  let dest: URL
  try {
    dest = new URL(request.nextUrl.pathname + request.nextUrl.search, target)
  } catch {
    return NextResponse.next()
  }
  if (dest.host === host || !dest.protocol.startsWith('https')) return NextResponse.next()
  return NextResponse.redirect(dest, 308)
}
