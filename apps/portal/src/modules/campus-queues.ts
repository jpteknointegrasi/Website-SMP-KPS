import { and, count, eq, lt } from 'drizzle-orm'
import { libraryLoans, orgProposals, organizations } from '@/db/schema'
import { hasPerm } from '@/server/context'
import { today } from '@/server/time'
import { queueSource, type QueueItem } from './queues'

queueSource(async (ctx) => {
  const out: QueueItem[] = []
  if (!ctx.staff) return out
  if (hasPerm(ctx, 'library.manage')) {
    const [l] = await ctx.db.select({ n: count() }).from(libraryLoans).where(and(eq(libraryLoans.status, 'active'), lt(libraryLoans.dueOn, today(ctx.tz, ctx.now))))
    out.push({ label: 'Pinjaman buku lewat tenggat', count: l!.n, href: '/staf/perpustakaan?tab=sirkulasi&terlambat=1', icon: 'library', tone: 'warn' })
  }
  const scope = hasPerm(ctx, 'organizations.manage') ? undefined : eq(organizations.advisorId, ctx.staff.id)
  const [p] = await ctx.db.select({ n: count() }).from(orgProposals).innerJoin(organizations, eq(organizations.id, orgProposals.orgId)).where(and(eq(orgProposals.status, 'submitted'), scope))
  out.push({ label: 'Proposal kegiatan siswa', count: p!.n, href: '/staf/organisasi', icon: 'flag', tone: 'info' })
  return out
})
