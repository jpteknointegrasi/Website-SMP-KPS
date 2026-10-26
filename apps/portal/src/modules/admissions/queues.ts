import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import { applications, decisionBatches, payments, reenrollments } from '@/db/schema'
import { hasPerm } from '@/server/context'
import { queueSource } from '../queues'

queueSource(async (ctx) => {
  const out = []
  if (hasPerm(ctx, 'admissions.verify')) {
    const [n] = await ctx.db.select({ n: count() }).from(applications).where(inArray(applications.status, ['submitted', 'resubmitted']))
    out.push({ label: 'Pendaftar menunggu verifikasi', count: n!.n, href: '/staf/ppdb', icon: 'clipboard' as const, tone: 'warn' as const })
    const [m] = await ctx.db.select({ n: count() }).from(applications).where(and(eq(applications.status, 'under_verification'), eq(applications.verifierId, ctx.staff!.id)))
    out.push({ label: 'Pendaftar sedang saya periksa', count: m!.n, href: '/staf/ppdb', icon: 'clipboard' as const, tone: 'info' as const })
  }
  if (hasPerm(ctx, 'admissions.approve')) {
    const [n] = await ctx.db.select({ n: count() }).from(decisionBatches).where(eq(decisionBatches.status, 'in_review'))
    out.push({ label: 'Usulan keputusan menunggu persetujuan', count: n!.n, href: '/staf/ppdb', icon: 'checkCircle' as const, tone: 'warn' as const })
  }
  if (hasPerm(ctx, 'admissions.release')) {
    const [n] = await ctx.db.select({ n: count() }).from(decisionBatches).where(and(eq(decisionBatches.status, 'approved'), isNull(decisionBatches.releasedAt)))
    out.push({ label: 'Hasil disetujui belum dirilis', count: n!.n, href: '/staf/ppdb', icon: 'megaphone' as const, tone: 'info' as const })
  }
  if (hasPerm(ctx, 'admissions.reenroll')) {
    const [n] = await ctx.db.select({ n: count() }).from(reenrollments).where(eq(reenrollments.status, 'submitted'))
    out.push({ label: 'Daftar ulang menunggu pengesahan', count: n!.n, href: '/staf/ppdb', icon: 'file' as const, tone: 'warn' as const })
  }
  if (hasPerm(ctx, 'finance.verify')) {
    const [n] = await ctx.db.select({ n: count() }).from(payments).where(eq(payments.status, 'submitted'))
    out.push({ label: 'Bukti pembayaran menunggu verifikasi', count: n!.n, href: '/staf/keuangan', icon: 'wallet' as const, tone: 'warn' as const })
  }
  return out
})
