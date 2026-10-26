import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import { achievements, activities, activityMembers, affairsReports, counselingCases, reportCards, resultSubmissions, teachingAssignments } from '@/db/schema'
import { hasPerm } from '@/server/context'
import { queueSource, type QueueItem } from './queues'

queueSource(async (ctx) => {
  const out: QueueItem[] = []
  if (!ctx.staff) return out
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]!.n
  if (hasPerm(ctx, 'teach')) {
    out.push({ label: 'Nilai dikembalikan wali kelas', count: await n(ctx.db.select({ n: count() }).from(resultSubmissions).innerJoin(teachingAssignments, eq(teachingAssignments.id, resultSubmissions.assignmentId)).where(and(eq(resultSubmissions.status, 'returned'), eq(teachingAssignments.teacherId, ctx.staff.id)))), href: '/staf/nilai', icon: 'list', tone: 'warn' })
  }
  if (hasPerm(ctx, 'reports.review')) out.push({ label: 'Rapor menunggu persetujuan', count: await n(ctx.db.select({ n: count() }).from(reportCards).where(eq(reportCards.status, 'submitted'))), href: '/staf/rapor', icon: 'file', tone: 'warn' })
  if (hasPerm(ctx, 'reports.release')) out.push({ label: 'Rapor siap dirilis', count: await n(ctx.db.select({ n: count() }).from(reportCards).where(eq(reportCards.status, 'approved'))), href: '/staf/rapor', icon: 'megaphone', tone: 'info' })
  if (hasPerm(ctx, 'counseling')) out.push({ label: 'Permintaan BK baru', count: await n(ctx.db.select({ n: count() }).from(counselingCases).where(and(eq(counselingCases.status, 'new'), isNull(counselingCases.assignedTo)))), href: '/staf/bk', icon: 'heart', tone: 'bad' })
  if (hasPerm(ctx, 'student_affairs')) {
    out.push({ label: 'Prestasi menunggu verifikasi', count: await n(ctx.db.select({ n: count() }).from(achievements).where(eq(achievements.status, 'submitted'))), href: '/staf/kesiswaan?tab=prestasi&status=submitted', icon: 'star', tone: 'info' })
    out.push({ label: 'Laporan kesiswaan baru', count: await n(ctx.db.select({ n: count() }).from(affairsReports).where(eq(affairsReports.status, 'received'))), href: '/staf/kesiswaan?tab=laporan', icon: 'shield', tone: 'bad' })
  }
  if (hasPerm(ctx, 'activities.manage', 'activities.coach')) {
    const mine = hasPerm(ctx, 'activities.manage') ? undefined : eq(activities.coachId, ctx.staff.id)
    out.push({ label: 'Pendaftar ekstrakurikuler', count: await n(ctx.db.select({ n: count() }).from(activityMembers).innerJoin(activities, eq(activities.id, activityMembers.activityId)).where(and(inArray(activityMembers.status, ['consented']), mine))), href: '/staf/ekskul', icon: 'ball', tone: 'info' })
  }
  return out
})
