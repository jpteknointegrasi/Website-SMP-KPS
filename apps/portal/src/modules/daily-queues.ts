import { and, count, eq, inArray, isNull, lt } from 'drizzle-orm'
import { attendanceCorrections, lessonSessions, serviceRequests } from '@/db/schema'
import { hasPerm } from '@/server/context'
import { today } from '@/server/time'
import { queueSource, type QueueItem } from './queues'
import { pendingLeaves } from './attendance/service'

queueSource(async (ctx) => {
  const out: QueueItem[] = []
  if (!ctx.staff) return out
  if (hasPerm(ctx, 'teach', 'academic.manage')) {
    out.push({ label: 'Pengajuan izin siswa', count: (await pendingLeaves(ctx)).length, href: '/staf/presensi?tab=izin', icon: 'inbox', tone: 'warn' })
    const [j] = await ctx.db.select({ n: count() }).from(lessonSessions).where(and(eq(lessonSessions.teacherId, ctx.staff.id), isNull(lessonSessions.journalAt), lt(lessonSessions.date, today(ctx.tz, ctx.now))))
    out.push({ label: 'Jurnal mengajar belum diisi', count: j!.n, href: '/staf/guru', icon: 'edit', tone: 'info' })
  }
  if (hasPerm(ctx, 'academic.manage')) {
    const [c] = await ctx.db.select({ n: count() }).from(attendanceCorrections).where(eq(attendanceCorrections.status, 'submitted'))
    out.push({ label: 'Koreksi presensi', count: c!.n, href: '/staf/presensi?tab=koreksi', icon: 'checkCircle', tone: 'warn' })
  }
  if (hasPerm(ctx, 'services.process')) {
    const [s] = await ctx.db.select({ n: count() }).from(serviceRequests).where(inArray(serviceRequests.status, ['submitted', 'in_progress']))
    out.push({ label: 'Permohonan layanan TU', count: s!.n, href: '/staf/layanan', icon: 'inbox', tone: 'warn' })
  }
  return out
})
