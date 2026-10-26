/**
 * M10 extracurricular (§44.4): catalogue per school year, applications with guardian consent, coach decision within
 * capacity, sessions with attendance, and a term evaluation that feeds the report card. The coach of an activity
 * manages it; `activities.manage` (kesiswaan) manages all.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { activities, activityEvaluations, activityMembers, activitySessions, guardianLinks, guardians, persons, staffMembers, students } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { isDate, today } from '@/server/time'
import { activeYear, linkedChildren, ownStudent } from '../scope'

export const PREDICATES = ['Sangat baik', 'Baik', 'Cukup', 'Perlu bimbingan'] as const
export const MEMBER_STATUS = { applied: 'Menunggu izin orang tua', consented: 'Menunggu keputusan pembina', active: 'Anggota', rejected: 'Tidak diterima', withdrawn: 'Mengundurkan diri' } as const

async function load(db: Db, id: string) {
  const [a] = await db.select().from(activities).where(eq(activities.id, id))
  if (!a) notFound('Ekstrakurikuler')
  return a!
}
const canManage = (ctx: Ctx, a: { coachId: string | null }) => Boolean(ctx.staff && (a.coachId === ctx.staff.id || hasPerm(ctx, 'activities.manage')))

export async function saveActivity(ctx: Ctx, input: { id?: string | null; name: string; category: string; description: string | null; coachId: string | null; schedule: string | null; location: string | null; capacity: number | null; requiresConsent: boolean; status: string }) {
  requireStaff(ctx, 'activities.manage')
  if (!input.name.trim()) fail('Isi nama kegiatan.')
  if (!['open', 'closed', 'archived'].includes(input.status)) fail('Status tidak dikenal.')
  const y = await activeYear(ctx.db)
  if (!y) fail('Belum ada tahun ajaran aktif.')
  return command(ctx, 'activities.save', {}, async (tx, fx) => {
    const values = { name: input.name.trim(), category: input.category === 'wajib' ? 'wajib' : 'minat', description: input.description, coachId: input.coachId, schedule: input.schedule, location: input.location, capacity: input.capacity, requiresConsent: input.requiresConsent, status: input.status }
    const [dup] = await tx.select().from(activities).where(and(eq(activities.yearId, y!.id), eq(activities.name, values.name)))
    if (dup && dup.id !== input.id) fail('Nama kegiatan sudah ada.')
    let id = input.id
    if (id) await tx.update(activities).set(values).where(eq(activities.id, id))
    else id = (await tx.insert(activities).values({ ...values, yearId: y!.id }).returning({ id: activities.id }))[0]!.id
    fx.audit('activities.save', 'activity', id)
    return id!
  })
}

/** Catalogue of the active year with active member counts. */
export async function catalogue(db: Db) {
  const y = await activeYear(db)
  if (!y) return []
  return db
    .select({ a: activities, coach: sql<string | null>`coalesce(${staffMembers.displayName}, ${staffMembers.name})`, members: sql<number>`(SELECT count(*) FROM activity_members m WHERE m.activity_id = ${activities.id} AND m.status = 'active')`.mapWith(Number), pending: sql<number>`(SELECT count(*) FROM activity_members m WHERE m.activity_id = ${activities.id} AND m.status IN ('applied','consented'))`.mapWith(Number) })
    .from(activities)
    .leftJoin(staffMembers, eq(staffMembers.id, activities.coachId))
    .where(and(eq(activities.yearId, y.id), sql`${activities.status} <> 'archived'`))
    .orderBy(asc(activities.category), asc(activities.name))
}

/** Student (self) or guardian (for a linked child) applies. A guardian's application counts as consent. */
export async function apply(ctx: Ctx, activityId: string, studentId: string, motivation: string | null) {
  if (!ctx.account) fail('Masuk sebagai siswa atau orang tua.', 'unauthenticated')
  const own = await ownStudent(ctx)
  const asGuardian = (await linkedChildren(ctx)).some((c) => c.studentId === studentId)
  if (own?.id !== studentId && !asGuardian) forbidden()
  return command(ctx, 'activities.apply', {}, async (tx, fx) => {
    const a = await load(tx, activityId)
    if (a.status !== 'open') fail('Pendaftaran kegiatan ini ditutup.')
    const [cur] = await tx.select().from(activityMembers).where(and(eq(activityMembers.activityId, activityId), eq(activityMembers.studentId, studentId)))
    if (cur && ['applied', 'consented', 'active'].includes(cur.status)) fail('Sudah terdaftar di kegiatan ini.')
    const consented = asGuardian || !a.requiresConsent
    const values = { status: consented ? 'consented' : 'applied', motivation: motivation?.trim() || null, consentBy: asGuardian ? `account:${ctx.account!.id}` : null, consentAt: asGuardian ? ctx.now : null, decidedBy: null, decidedAt: null, decisionNote: null }
    let id: string
    if (cur) {
      await tx.update(activityMembers).set(values).where(eq(activityMembers.id, cur.id))
      id = cur.id
    } else id = (await tx.insert(activityMembers).values({ activityId, studentId, ...values }).returning({ id: activityMembers.id }))[0]!.id
    if (!consented) {
      const gs = await tx.select({ accountId: guardians.accountId }).from(guardianLinks).innerJoin(guardians, eq(guardians.id, guardianLinks.guardianId)).where(and(eq(guardianLinks.studentId, studentId), eq(guardianLinks.status, 'active')))
      for (const g of gs) if (g.accountId) fx.notify({ type: 'account', id: g.accountId }, { title: `Persetujuan ekstrakurikuler: ${a.name}`, link: `/portal/keluarga/ekskul?anak=${studentId}` })
    } else if (a.coachId) fx.notify({ type: 'staff', id: a.coachId }, { title: `Pendaftar baru ${a.name}`, link: `/portal/staf/ekskul/${activityId}` })
    fx.audit('activities.apply', 'activity', activityId, { student: studentId, consented })
    return id
  })
}

/** Guardian gives or refuses consent for an application made by the student. */
export async function consent(ctx: Ctx, memberId: string, approve: boolean) {
  if (!ctx.account) fail('Silakan masuk.', 'unauthenticated')
  await command(ctx, 'activities.consent', {}, async (tx, fx) => {
    const [m] = await tx.select().from(activityMembers).where(eq(activityMembers.id, memberId)).for('update')
    if (!m) notFound('Pendaftaran')
    if (!(await linkedChildren(ctx, tx)).some((c) => c.studentId === m!.studentId)) forbidden()
    if (m!.status !== 'applied') fail('Pendaftaran ini tidak menunggu persetujuan.')
    await tx.update(activityMembers).set(approve ? { status: 'consented', consentBy: `account:${ctx.account!.id}`, consentAt: ctx.now } : { status: 'withdrawn', decisionNote: 'Tidak disetujui orang tua' }).where(eq(activityMembers.id, memberId))
    const a = await load(tx, m!.activityId)
    if (approve && a.coachId) fx.notify({ type: 'staff', id: a.coachId }, { title: `Pendaftar baru ${a.name}`, link: `/portal/staf/ekskul/${a.id}` })
    fx.audit(approve ? 'activities.consent' : 'activities.consent_refused', 'activity', m!.activityId, { student: m!.studentId })
  })
}

/** Coach accepts (within capacity) or rejects; `offlineConsent` records a paper consent for students without a guardian account. */
export async function decide(ctx: Ctx, memberId: string, accept: boolean, note: string | null, offlineConsent = false) {
  const s = requireStaff(ctx)
  await command(ctx, 'activities.decide', {}, async (tx, fx) => {
    const [m] = await tx.select().from(activityMembers).where(eq(activityMembers.id, memberId)).for('update')
    if (!m) notFound('Pendaftaran')
    const a = await load(tx, m!.activityId)
    if (!canManage(ctx, a)) forbidden('Anda bukan pembina kegiatan ini.')
    if (accept) {
      if (m!.status === 'applied' && !offlineConsent) fail('Menunggu persetujuan orang tua (atau catat izin tertulis).')
      if (!['applied', 'consented'].includes(m!.status)) fail('Pendaftaran ini sudah diputuskan.')
      if (a.capacity) {
        const [n] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(activityMembers).where(and(eq(activityMembers.activityId, a.id), eq(activityMembers.status, 'active')))
        if (n!.n >= a.capacity) fail(`Kuota ${a.capacity} anggota sudah penuh.`)
      }
    }
    await tx
      .update(activityMembers)
      .set({ status: accept ? 'active' : 'rejected', decidedBy: s.id, decidedAt: ctx.now, decisionNote: note, ...(offlineConsent && m!.status === 'applied' ? { consentBy: `staff:${s.id}:tertulis`, consentAt: ctx.now } : {}) })
      .where(eq(activityMembers.id, memberId))
    const [st] = await tx.select({ accountId: students.accountId }).from(students).where(eq(students.id, m!.studentId))
    if (st?.accountId) fx.notify({ type: 'account', id: st.accountId }, { title: `${a.name}: ${accept ? 'diterima sebagai anggota' : 'pendaftaran tidak diterima'}`, link: '/portal/keluarga/ekskul' })
    fx.audit(accept ? 'activities.accept' : 'activities.reject', 'activity', a.id, { student: m!.studentId })
  })
}

export async function withdraw(ctx: Ctx, memberId: string) {
  await command(ctx, 'activities.withdraw', {}, async (tx, fx) => {
    const [m] = await tx.select().from(activityMembers).where(eq(activityMembers.id, memberId))
    if (!m) notFound('Pendaftaran')
    const a = await load(tx, m!.activityId)
    const own = ctx.account ? await ownStudent(ctx, tx) : null
    const fam = ctx.account && (own?.id === m!.studentId || (await linkedChildren(ctx, tx)).some((c) => c.studentId === m!.studentId))
    if (!fam && !canManage(ctx, a)) forbidden()
    if (!['applied', 'consented', 'active'].includes(m!.status)) fail('Tidak ada keanggotaan aktif.')
    await tx.update(activityMembers).set({ status: 'withdrawn', decidedAt: ctx.now }).where(eq(activityMembers.id, memberId))
    fx.audit('activities.withdraw', 'activity', a.id, { student: m!.studentId })
  })
}

/** Coach view: activity, members & applicants, sessions. */
export async function activityDetail(ctx: Ctx, id: string) {
  requireStaff(ctx)
  const a = await load(ctx.db, id)
  if (!canManage(ctx, a)) forbidden('Anda bukan pembina kegiatan ini.')
  const members = await ctx.db
    .select({ m: activityMembers, name: persons.fullName, nis: students.nis })
    .from(activityMembers)
    .innerJoin(students, eq(students.id, activityMembers.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(activityMembers.activityId, id))
    .orderBy(asc(persons.fullName))
  const sessions = await ctx.db.select().from(activitySessions).where(eq(activitySessions.activityId, id)).orderBy(sql`${activitySessions.date} DESC`)
  return { a, members, sessions }
}

export async function recordSession(ctx: Ctx, activityId: string, date: string, topic: string | null, attendance: Record<string, string>) {
  const s = requireStaff(ctx)
  if (!isDate(date) || date > today(ctx.tz, ctx.now)) fail('Tanggal tidak valid.')
  await command(ctx, 'activities.session', {}, async (tx, fx) => {
    const a = await load(tx, activityId)
    if (!canManage(ctx, a)) forbidden()
    const active = new Set((await tx.select({ id: activityMembers.studentId }).from(activityMembers).where(and(eq(activityMembers.activityId, activityId), eq(activityMembers.status, 'active')))).map((x) => x.id))
    for (const [k, v] of Object.entries(attendance)) if (!active.has(k) || !['H', 'S', 'I', 'A'].includes(v)) fail('Data kehadiran tidak valid.')
    await tx.insert(activitySessions).values({ activityId, date, topic: topic?.trim() || null, attendance, recordedBy: s.id })
    fx.audit('activities.session', 'activity', activityId, { date })
  })
}

export async function evaluate(ctx: Ctx, activityId: string, termId: string, rows: { studentId: string; predicate: string | null; description: string | null }[]) {
  const s = requireStaff(ctx)
  await command(ctx, 'activities.evaluate', {}, async (tx, fx) => {
    const a = await load(tx, activityId)
    if (!canManage(ctx, a)) forbidden()
    const active = new Set((await tx.select({ id: activityMembers.studentId }).from(activityMembers).where(and(eq(activityMembers.activityId, activityId), eq(activityMembers.status, 'active')))).map((x) => x.id))
    for (const r of rows) {
      if (!active.has(r.studentId)) fail('Ada siswa yang bukan anggota aktif.')
      if (r.predicate && !(PREDICATES as readonly string[]).includes(r.predicate)) fail('Predikat tidak dikenal.')
      const v = { predicate: r.predicate || null, description: r.description?.trim() || null, updatedBy: s.id, updatedAt: ctx.now }
      await tx.insert(activityEvaluations).values({ activityId, termId, studentId: r.studentId, ...v }).onConflictDoUpdate({ target: [activityEvaluations.activityId, activityEvaluations.termId, activityEvaluations.studentId], set: v })
    }
    fx.audit('activities.evaluate', 'activity', activityId, { term: termId, rows: rows.length })
  })
}

export async function evaluationsOf(db: Db, activityId: string, termId: string) {
  return db.select().from(activityEvaluations).where(and(eq(activityEvaluations.activityId, activityId), eq(activityEvaluations.termId, termId)))
}

/** Activities coached by the staff member. */
export async function myCoaching(ctx: Ctx) {
  if (!ctx.staff) return []
  return (await catalogue(ctx.db)).filter((r) => r.a.coachId === ctx.staff!.id)
}

/** Family view for one student: catalogue with membership state and attendance summary. */
export async function forStudent(ctx: Ctx, studentId: string) {
  const own = await ownStudent(ctx)
  if (own?.id !== studentId && !(await linkedChildren(ctx)).some((c) => c.studentId === studentId)) forbidden()
  const list = await catalogue(ctx.db)
  const mem = list.length ? await ctx.db.select().from(activityMembers).where(and(eq(activityMembers.studentId, studentId), inArray(activityMembers.activityId, list.map((l) => l.a.id)))) : []
  const sess = mem.length ? await ctx.db.select().from(activitySessions).where(inArray(activitySessions.activityId, mem.map((m) => m.activityId))) : []
  return list.map((l) => {
    const m = mem.find((x) => x.activityId === l.a.id) ?? null
    const ss = sess.filter((x) => x.activityId === l.a.id && x.attendance[studentId])
    return { ...l, member: m, attended: ss.filter((x) => x.attendance[studentId] === 'H').length, sessions: ss.length }
  })
}
