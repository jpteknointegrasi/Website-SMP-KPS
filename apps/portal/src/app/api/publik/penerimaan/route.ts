import { requestCtx, requestModules } from '@/server/request'
import { publicSummary } from '@/modules/admissions/config'
import { moduleOpen } from '@/server/settings'

/**
 * Public admissions summary for the school's website (Satu Sekolah Web, addendum D: "ringkasan publik"): open/closed,
 * dates, paths and required documents. No applicant data. Cached briefly.
 */
export async function GET() {
  const ctx = await requestCtx()
  if (!ctx || !moduleOpen((await requestModules())!, 'penerimaan', 'family')) return Response.json({ cycles: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } })
  const cycles = await publicSummary(ctx.db, ctx.now)
  return Response.json(
    { cycles: cycles.map((c) => ({ name: c.name, targetYear: c.targetYear, targetGrade: c.targetGrade, status: c.status, openAt: c.openAt, closeAt: c.closeAt, waves: c.waves, paths: c.paths.map((p) => ({ name: p.name, registrationFee: p.registrationFee })) })) },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
