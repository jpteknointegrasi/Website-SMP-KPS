import { hasProduct } from '@sekolahku/core'
import { schoolById } from '@sekolahku/core/registry'
import pg from 'pg'
import { schoolDb } from '@/db/school-db'
import { processOutbox } from '@/server/outbox'
import '@/modules/register'
import { runScheduled } from '@/modules/jobs'

/**
 * Background work for every school with Sekolahku App (cron, e.g. every 5 minutes): outbox delivery (e-mail,
 * notifications, events) and scheduled duties (expiring offers, due dates). Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Tidak berwenang', { status: 401 })
  const platform = new pg.Pool({ connectionString: process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URI, max: 1 })
  const ids = (await platform.query<{ id: number }>("SELECT id FROM tenants WHERE app_database IS NOT NULL AND app_plan <> 'none' AND status <> 'suspended'")).rows.map((r) => r.id)
  await platform.end()
  const out: Record<string, unknown> = {}
  for (const id of ids) {
    const school = await schoolById(id)
    if (!school || !hasProduct(school, 'app')) continue
    try {
      const db = await schoolDb(school)
      const scheduled = await runScheduled(db, school)
      out[school.slug] = { outbox: await processOutbox(db, school, 100), ...scheduled }
    } catch (e) {
      out[school.slug] = { error: (e as Error).message }
    }
  }
  return Response.json({ ok: true, schools: out })
}
