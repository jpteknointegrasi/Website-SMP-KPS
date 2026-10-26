import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import { cardReplacements, dataCorrections, importBatches, students } from '@/db/schema'
import { hasPerm } from '@/server/context'
import { queueSource } from '../queues'

queueSource(async (ctx) => {
  const out = []
  if (hasPerm(ctx, 'students.review')) {
    const [c] = await ctx.db.select({ n: count() }).from(dataCorrections).where(inArray(dataCorrections.status, ['submitted']))
    out.push({ label: 'Usulan koreksi data', count: c!.n, href: '/staf/siswa/koreksi', icon: 'edit' as const, tone: 'bad' as const })
    const [v] = await ctx.db.select({ n: count() }).from(students).where(and(eq(students.status, 'active'), isNull(students.verifiedAt)))
    out.push({ label: 'Verifikasi data siswa', count: v!.n, href: '/staf/siswa/daftar?kelengkapan=unverified', icon: 'checkCircle' as const, tone: 'warn' as const })
  }
  if (hasPerm(ctx, 'students.import')) {
    const [i] = await ctx.db.select({ n: count() }).from(importBatches).where(eq(importBatches.status, 'validated'))
    out.push({ label: 'Hasil impor perlu dikonfirmasi', count: i!.n, href: '/staf/siswa/impor', icon: 'upload' as const, tone: 'info' as const })
  }
  if (hasPerm(ctx, 'cards.manage')) {
    const [r] = await ctx.db.select({ n: count() }).from(cardReplacements).where(eq(cardReplacements.status, 'submitted'))
    out.push({ label: 'Permohonan ganti kartu', count: r!.n, href: '/staf/kartu?tab=penggantian', icon: 'card' as const, tone: 'warn' as const })
  }
  return out
})
