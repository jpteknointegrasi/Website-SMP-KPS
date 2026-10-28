import { requestCtx, requestModules } from '@/server/request'
import { websiteFeed } from '@/modules/website/feed'
import { today } from '@/server/time'

/**
 * Public content for the school's website (see modules/website/feed.ts): only modules open to families (Pilot/Aktif).
 * Cached briefly.
 */
export async function GET() {
  const ctx = await requestCtx()
  const headers = { 'Cache-Control': 'public, max-age=300' }
  if (!ctx) return Response.json({ events: [], achievements: [], alumni: [] }, { headers })
  return Response.json(await websiteFeed(ctx.db, (await requestModules())!, today(ctx.tz, ctx.now)), { headers })
}
