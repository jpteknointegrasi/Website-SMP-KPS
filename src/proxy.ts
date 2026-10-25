import { NextResponse, type NextRequest } from 'next/server'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Runs before every request.
 *
 * 1. CSRF guard for the API. Schools have their own (changing) domains, so Payload's static `csrf` origin list
 *    cannot name them all. Instead, a state-changing /api request that states an Origin must come from the very
 *    host it is sent to. Browsers always send Origin on cross-site POST/PATCH/DELETE; session cookies are also
 *    SameSite=Lax. Server-to-server calls without an Origin header (cron with CRON_SECRET) are unaffected.
 *
 * 2. Single-school deployments only (NEXT_PUBLIC_SERVER_URL set): visits to *.vercel.app get a permanent redirect
 *    to that domain. A multi-school deployment leaves NEXT_PUBLIC_SERVER_URL empty.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const path = request.nextUrl.pathname

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
  let dest: URL
  try {
    dest = new URL(request.nextUrl.pathname + request.nextUrl.search, target)
  } catch {
    return NextResponse.next()
  }
  if (dest.host === host || !dest.protocol.startsWith('https')) return NextResponse.next()
  return NextResponse.redirect(dest, 308)
}
