/** Scheduled duties per school (called by the cron route). Modules add their periodic work here. */
import type { SchoolInfo } from '@satusekolah/core'
import type { SchoolDb } from '@/db/school-db'

type Job = (db: SchoolDb, school: SchoolInfo, now: Date) => Promise<number>
const jobs = new Map<string, Job>()
export const scheduled = (name: string, j: Job) => void jobs.set(name, j)

export async function runScheduled(db: SchoolDb, school: SchoolInfo, now = new Date()) {
  const out: Record<string, number> = {}
  for (const [name, j] of jobs) out[name] = await j(db, school, now)
  return out
}
