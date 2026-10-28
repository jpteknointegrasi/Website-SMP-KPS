import { headers } from 'next/headers'
import { isPortalSync } from '@satusekolah/core'
import { requestCtx, requestModules } from '@/server/request'
import { moduleOpen } from '@/server/settings'
import { leadLinkFeed, markLeadLinks, parseLeadResults } from '@/modules/admissions/lead-link'

/**
 * Website ↔ App link of interest forms (minat) to applications, with the family's consent (server-to-server only:
 * shared secret in PORTAL_SYNC_HEADER, which the website's proxy strips from browser requests).
 * GET: pending link requests. POST { results: [{ ref, leadRef | null, leadDate | null }] }: what the website matched.
 */
async function guard() {
  if (!isPortalSync(await headers())) return null
  const ctx = await requestCtx()
  if (!ctx || !moduleOpen((await requestModules())!, 'penerimaan', 'staff')) return null
  return ctx
}

export async function GET() {
  const ctx = await guard()
  if (!ctx) return new Response('Tidak berwenang', { status: 401 })
  return Response.json(await leadLinkFeed(ctx.db), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const ctx = await guard()
  if (!ctx) return new Response('Tidak berwenang', { status: 401 })
  const results = parseLeadResults(await req.json().catch(() => null))
  return Response.json(await markLeadLinks(ctx.db, results, ctx.now))
}
