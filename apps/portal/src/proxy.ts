import { NextResponse, type NextRequest } from 'next/server'
import { portalRequestHost } from '@sekolahku/core'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF guard for the portal (the website's guard does not cover /portal, which it only passes through): a request
 * that changes data and states an Origin must come from the school's own address; cross-site requests without an
 * Origin are refused too. Portal forms and API routes therefore need no extra token.
 */
export function proxy(request: NextRequest) {
  if (SAFE.has(request.method)) return NextResponse.next()
  const host = portalRequestHost(request.headers)
  const origin = request.headers.get('origin')
  let ok = true
  if (origin) {
    try {
      ok = new URL(origin).host === host
    } catch {
      ok = false
    }
  } else if (request.headers.get('sec-fetch-site') === 'cross-site') ok = false
  return ok ? NextResponse.next() : NextResponse.json({ ok: false, error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
}
