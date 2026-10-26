/**
 * "Antrean tindakan": what is waiting for the signed-in staff member, contributed by each module. Shown on the staff
 * home page and module dashboards. Counts only (no personal details).
 */
import type { Ctx } from '@/server/context'
import type { IconName } from '@/ui/icons'

export type QueueItem = { label: string; count: number; href: string; icon: IconName; tone?: 'warn' | 'bad' | 'info' }
type Source = (ctx: Ctx) => Promise<QueueItem[]>
const sources: Source[] = []
export const queueSource = (s: Source) => void sources.push(s)

export async function staffQueues(ctx: Ctx) {
  const all = (await Promise.all(sources.map((s) => s(ctx).catch(() => [])))).flat()
  return all.filter((q) => q.count > 0)
}
