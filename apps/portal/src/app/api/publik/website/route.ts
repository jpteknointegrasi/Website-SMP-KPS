import { requestCtx, requestModules } from '@/server/request'
import { moduleOpen } from '@/server/settings'
import { eventsBetween } from '@/modules/schedule/service'
import { publicAchievements } from '@/modules/affairs/service'
import { publicStories } from '@/modules/alumni/service'
import { addDays, today } from '@/server/time'

/**
 * Public content the school's website may show (Web↔App integration): academic calendar items marked public,
 * verified achievements with publication consent, and alumni stories with publication consent. Nothing else —
 * no ids, documents or contact data. Only modules that are open to families are included. Cached briefly.
 */
export async function GET() {
  const ctx = await requestCtx()
  const headers = { 'Cache-Control': 'public, max-age=300' }
  if (!ctx) return Response.json({ events: [], achievements: [], alumni: [] }, { headers })
  const m = (await requestModules())!
  const d = today(ctx.tz, ctx.now)
  const events = moduleOpen(m, 'akademik', 'family') ? (await eventsBetween(ctx.db, addDays(d, -30), addDays(d, 180), 'public')).map((e) => ({ title: e.title, kind: e.kind, startDate: e.startDate, endDate: e.endDate, description: e.description })) : []
  const achievements = moduleOpen(m, 'kesiswaan', 'family') ? await publicAchievements(ctx.db, 12) : []
  const alumni = moduleOpen(m, 'alumni', 'staff') ? await publicStories(ctx.db, 6) : []
  return Response.json({ events, achievements, alumni }, { headers })
}
