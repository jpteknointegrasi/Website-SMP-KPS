/**
 * Public content the school's website may show (Web↔App integration, addendum §D): academic calendar items marked
 * public, verified achievements with publication consent, and alumni stories with publication consent. Nothing else —
 * no ids, documents or contact data. Only modules open to families (Pilot/Aktif) are included: a module still in
 * "Konfigurasi" is being set up by staff and publishes nothing.
 */
import type { Db } from '@/server/command'
import { moduleOpen, type ModuleMap } from '@/server/settings'
import { addDays } from '@/server/time'
import { eventsBetween } from '../schedule/service'
import { publicAchievements } from '../affairs/service'
import { publicStories } from '../alumni/service'

export async function websiteFeed(db: Db, modules: ModuleMap, today: string) {
  const events = moduleOpen(modules, 'akademik', 'family')
    ? (await eventsBetween(db, addDays(today, -30), addDays(today, 180), 'public')).map((e) => ({ title: e.title, kind: e.kind, startDate: e.startDate, endDate: e.endDate, description: e.description }))
    : []
  const achievements = moduleOpen(modules, 'kesiswaan', 'family') ? await publicAchievements(db, 12) : []
  const alumni = moduleOpen(modules, 'alumni', 'family') ? await publicStories(db, 6) : []
  return { events, achievements, alumni }
}
