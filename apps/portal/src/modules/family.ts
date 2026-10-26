/** Students the signed-in account may see (self as student, linked children as guardian), and the selected one. */
import { eq } from 'drizzle-orm'
import { persons } from '@/db/schema'
import type { Ctx } from '@/server/context'
import { linkedChildren, ownStudent } from './scope'

export async function familyStudents(ctx: Ctx) {
  const out: { studentId: string; name: string; self?: boolean; canViewAcademic: boolean; canViewFinance: boolean }[] = []
  const own = await ownStudent(ctx)
  if (own) {
    const [p] = await ctx.db.select({ name: persons.fullName }).from(persons).where(eq(persons.id, own.personId))
    out.push({ studentId: own.id, name: p!.name, self: true, canViewAcademic: true, canViewFinance: false })
  }
  for (const c of await linkedChildren(ctx)) out.push({ studentId: c.studentId, name: c.name, canViewAcademic: c.canViewAcademic, canViewFinance: c.canViewFinance })
  return out
}

export async function selectedStudent(ctx: Ctx, wanted: string | undefined) {
  const list = await familyStudents(ctx)
  const current = list.find((c) => c.studentId === wanted) ?? list[0] ?? null
  return { list, current }
}
