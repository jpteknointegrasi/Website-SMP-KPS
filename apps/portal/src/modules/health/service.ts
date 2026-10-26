/**
 * M18 UKS (§22) — restricted to health officers (`health.manage`, never the school admin role). A visit records the
 * complaint and first aid (restricted), the outcome, and a note written for the family. Guardians are told that a
 * visit happened and its outcome — never the clinical content. When a student is sent home, the homeroom teacher is
 * informed (outcome only) so attendance can follow.
 */
import { and, desc, eq, gte } from 'drizzle-orm'
import { guardianLinks, guardians, healthVisits, homerooms, persons, students } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command } from '@/server/command'
import { fail, forbidden } from '@/server/errors'
import { isDate, localDate, today } from '@/server/time'
import { guardianAccounts, isHomeroomTeacherOf, placementOn, visibleStudentIds } from '../scope'

export const OUTCOMES = { kembali_kelas: 'Kembali ke kelas', istirahat: 'Istirahat di UKS', pulang: 'Dipulangkan', rujuk: 'Dirujuk ke fasilitas kesehatan' } as const

export async function recordVisit(ctx: Ctx, v: { studentId: string; at: Date; complaint: string; action: string | null; notes: string | null; outcome: string; familyNote: string | null; notifyGuardian: boolean; followUpOn: string | null }) {
  const s = requireStaff(ctx, 'health.manage')
  if (v.complaint.trim().length < 3) fail('Isi keluhan.')
  if (!(v.outcome in OUTCOMES)) fail('Pilih hasil kunjungan.')
  if (v.at > ctx.now) fail('Waktu kunjungan tidak valid.')
  if (v.followUpOn && !isDate(v.followUpOn)) fail('Tanggal tindak lanjut tidak valid.')
  const notify = v.notifyGuardian || v.outcome === 'pulang' || v.outcome === 'rujuk'
  return command(ctx, 'health.visit', {}, async (tx, fx) => {
    const [st] = await tx.select().from(students).where(eq(students.id, v.studentId))
    if (!st) fail('Siswa tidak ditemukan.')
    const [row] = await tx
      .insert(healthVisits)
      .values({ studentId: v.studentId, at: v.at, complaint: v.complaint.trim(), action: v.action?.trim() || null, notes: v.notes?.trim() || null, outcome: v.outcome, familyNote: v.familyNote?.trim() || null, guardianNotified: notify, followUpOn: v.followUpOn, recordedBy: s.id })
      .returning({ id: healthVisits.id })
    const title = `Kunjungan UKS: ${OUTCOMES[v.outcome as keyof typeof OUTCOMES]}`
    if (notify) {
      const gs = await guardianAccounts(tx, [v.studentId], today(ctx.tz, ctx.now))
      for (const g of gs) if (g.accountId) fx.notify({ type: 'account', id: g.accountId }, { title, body: v.familyNote?.trim() || undefined, link: `/portal/keluarga/uks?anak=${v.studentId}` })
    }
    if (v.outcome === 'pulang' || v.outcome === 'rujuk') {
      const p = await placementOn(tx, v.studentId, localDate(v.at, ctx.tz))
      const [h] = p ? await tx.select().from(homerooms).where(eq(homerooms.id, p.homeroomId)) : []
      if (h?.homeroomTeacherId) fx.notify({ type: 'staff', id: h.homeroomTeacherId }, { title: `Siswa perwalian ${h.name} ${v.outcome === 'pulang' ? 'dipulangkan' : 'dirujuk'} dari UKS`, link: '/portal/staf/presensi' })
    }
    fx.audit('health.visit', 'health_visit', row!.id, { outcome: v.outcome })
    return row!.id
  })
}

export async function visits(ctx: Ctx, f: { studentId?: string; since?: Date }) {
  requireStaff(ctx, 'health.manage')
  return ctx.db
    .select({ v: healthVisits, name: persons.fullName, nis: students.nis })
    .from(healthVisits)
    .innerJoin(students, eq(students.id, healthVisits.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(and(f.studentId ? eq(healthVisits.studentId, f.studentId) : undefined, f.since ? gte(healthVisits.at, f.since) : undefined))
    .orderBy(desc(healthVisits.at))
    .limit(200)
}

/** Family / homeroom view: date, outcome and the family note only. */
export async function visitsForFamily(ctx: Ctx, studentId: string) {
  if (ctx.account) {
    if (!(await visibleStudentIds(ctx)).has(studentId)) forbidden()
  } else if (!(await isHomeroomTeacherOf(ctx, studentId))) forbidden()
  return ctx.db
    .select({ id: healthVisits.id, at: healthVisits.at, outcome: healthVisits.outcome, familyNote: healthVisits.familyNote })
    .from(healthVisits)
    .where(and(eq(healthVisits.studentId, studentId), ctx.account ? eq(healthVisits.guardianNotified, true) : undefined))
    .orderBy(desc(healthVisits.at))
    .limit(50)
}
