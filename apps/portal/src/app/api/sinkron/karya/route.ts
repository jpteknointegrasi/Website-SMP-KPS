import { headers } from 'next/headers'
import { isPortalSync } from '@sekolahku/core'
import { requestCtx, requestModules } from '@/server/request'
import { moduleOpen } from '@/server/settings'
import { markImported, syncFeed } from '@/modules/works/service'

/**
 * Website ↔ App sync of student works (server-to-server only: shared secret in PORTAL_SYNC_HEADER, which the
 * website's proxy strips from browser requests). GET: consented works to import as drafts + withdrawn refs.
 * POST { imported: string[] }: the website confirms what it imported.
 */
async function guard() {
  if (!isPortalSync(await headers())) return null
  const ctx = await requestCtx()
  if (!ctx || !moduleOpen((await requestModules())!, 'kesiswaan', 'staff')) return null
  return ctx
}

export async function GET() {
  const ctx = await guard()
  if (!ctx) return new Response('Tidak berwenang', { status: 401 })
  return Response.json(await syncFeed(ctx.db), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const ctx = await guard()
  if (!ctx) return new Response('Tidak berwenang', { status: 401 })
  const body = (await req.json().catch(() => null)) as { imported?: unknown } | null
  const refs = Array.isArray(body?.imported) ? body!.imported.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/.test(x)).slice(0, 500) : []
  return Response.json({ marked: await markImported(ctx.db, refs) })
}
