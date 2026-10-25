import { NextResponse, type NextRequest } from 'next/server'

/**
 * Production only: visits to the Vercel default address (*.vercel.app) get a permanent redirect to the school
 * domain set in NEXT_PUBLIC_SERVER_URL, keeping the path and query. Vercel's dashboard cannot redirect the
 * built-in production domain, so it is done here. Preview deployments and local development are untouched.
 * The scheduled-jobs endpoint is exempt so Vercel Cron keeps working.
 */
export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.next()
  const target = process.env.NEXT_PUBLIC_SERVER_URL
  const host = request.headers.get('host') ?? ''
  if (!target || !host.endsWith('.vercel.app')) return NextResponse.next()
  if (request.nextUrl.pathname.startsWith('/api/payload-jobs')) return NextResponse.next()
  let dest: URL
  try {
    dest = new URL(request.nextUrl.pathname + request.nextUrl.search, target)
  } catch {
    return NextResponse.next()
  }
  if (dest.host === host || !dest.protocol.startsWith('https')) return NextResponse.next()
  return NextResponse.redirect(dest, 308)
}
