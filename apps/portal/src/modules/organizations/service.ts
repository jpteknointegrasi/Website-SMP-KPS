/**
 * M19 organisasi & kegiatan siswa: organisations of the year (OSIS, MPK, …) with an advisor and members; members
 * allowed to propose submit activity proposals; the advisor or `organizations.manage` approves (optionally putting
 * the activity on the school calendar/website), asks for revision or rejects; afterwards the organisation reports.
 */
import { and, asc, desc, eq } from 'drizzle-orm'
import { academicEvents, orgMembers, orgProposals, organizations, persons, staffMembers, students } from '@/db/schema'
import { actorName, hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { isDate } from '@/server/time'
import { activeYear, ownStudent } from '../scope'
import { sql } from 'drizzle-orm'

export const PROPOSAL_STATUS = { submitted: 'Diajukan', revision: 'Perlu perbaikan', approved: 'Disetujui', rejected: 'Ditolak', reported: 'Selesai & dilaporkan' } as const

async function load(db: Db, id: string) {
  const [o] = await db.select().from(organizations).where(eq(organizations.id, id))
  if (!o) notFound('Organisasi')
  return o!
}
const canManage = (ctx: Ctx, o: { advisorId: string | null }) => Boolean(ctx.staff && (o.advisorId === ctx.staff.id || hasPerm(ctx, 'organizations.manage')))

export async function saveOrg(ctx: Ctx, input: { id?: string | null; name: string; description: string | null; advisorId: string | null }) {
  requireStaff(ctx, 'organizations.manage')
  if (!input.name.trim()) fail('Isi nama organisasi.')
  const y = await activeYear(ctx.db)
  if (!y) fail('Belum ada tahun ajaran aktif.')
  return command(ctx, 'org.save', {}, async (tx, fx) => {
    const values = { name: input.name.trim(), description: input.description, advisorId: input.advisorId }
    let id = input.id
    if (id) await tx.update(organizations).set(values).where(eq(organizations.id, id))
    else id = (await tx.insert(organizations).values({ ...values, yearId: y!.id }).returning({ id: organizations.id }))[0]!.id
    fx.audit('org.save', 'organization', id)
    return id!
  })
}

export async function setMember(ctx: Ctx, orgId: string, studentId: string, position: string, canPropose: boolean, active: boolean) {
  requireStaff(ctx)
  await command(ctx, 'org.member', {}, async (tx, fx) => {
    const o = await load(tx, orgId)
    if (!canManage(ctx, o)) forbidden()
    const v = { position: position.trim() || 'Anggota', canPropose, active }
    await tx.insert(orgMembers).values({ orgId, studentId, ...v }).onConflictDoUpdate({ target: [orgMembers.orgId, orgMembers.studentId], set: v })
    fx.audit('org.member', 'organization', orgId, { student: studentId, active })
  })
}

export async function orgs(db: Db) {
  const y = await activeYear(db)
  if (!y) return []
  return db
    .select({ o: organizations, advisor: sql<string | null>`coalesce(${staffMembers.displayName}, ${staffMembers.name})`, members: sql<number>`(SELECT count(*) FROM org_members m WHERE m.org_id = ${organizations.id} AND m.active)`.mapWith(Number), pending: sql<number>`(SELECT count(*) FROM org_proposals p WHERE p.org_id = ${organizations.id} AND p.status = 'submitted')`.mapWith(Number) })
    .from(organizations)
    .leftJoin(staffMembers, eq(staffMembers.id, organizations.advisorId))
    .where(eq(organizations.yearId, y.id))
    .orderBy(asc(organizations.name))
}

export async function orgDetail(ctx: Ctx, id: string) {
  const o = await load(ctx.db, id)
  const members = await ctx.db
    .select({ m: orgMembers, name: persons.fullName, nis: students.nis })
    .from(orgMembers)
    .innerJoin(students, eq(students.id, orgMembers.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(orgMembers.orgId, id))
    .orderBy(desc(orgMembers.canPropose), asc(persons.fullName))
  const proposals = await ctx.db.select().from(orgProposals).where(eq(orgProposals.orgId, id)).orderBy(desc(orgProposals.createdAt))
  return { o, members, proposals, manage: canManage(ctx, o) }
}

/** Organisations where the signed-in student is an active member. */
export async function myOrgs(ctx: Ctx) {
  const own = await ownStudent(ctx)
  if (!own) return []
  return ctx.db.select({ o: organizations, m: orgMembers }).from(orgMembers).innerJoin(organizations, eq(organizations.id, orgMembers.orgId)).where(and(eq(orgMembers.studentId, own.id), eq(orgMembers.active, true)))
}

export async function submitProposal(ctx: Ctx, orgId: string, p: { id?: string | null; title: string; description: string; startDate: string; endDate: string; location: string | null; budget: number | null; participants: string | null; isPublic: boolean }) {
  if (!p.title.trim() || p.description.trim().length < 20) fail('Isi judul dan uraian kegiatan (min. 20 karakter).')
  if (!isDate(p.startDate) || !isDate(p.endDate) || p.endDate < p.startDate) fail('Tanggal kegiatan tidak valid.')
  return command(ctx, 'org.proposal', {}, async (tx, fx) => {
    const o = await load(tx, orgId)
    let by: { t: string; id: string }
    if (ctx.account) {
      const own = await ownStudent(ctx, tx)
      const [m] = own ? await tx.select().from(orgMembers).where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.studentId, own.id), eq(orgMembers.active, true))) : []
      if (!m?.canPropose) forbidden('Hanya pengurus yang dapat mengajukan proposal.')
      by = { t: 'account', id: ctx.account.id }
    } else {
      if (!canManage(ctx, o)) forbidden()
      by = { t: 'staff', id: ctx.staff!.id }
    }
    const values = { title: p.title.trim(), description: p.description.trim(), startDate: p.startDate, endDate: p.endDate, location: p.location, budget: p.budget, participants: p.participants, isPublic: p.isPublic, status: 'submitted' }
    let id = p.id
    if (id) {
      const [cur] = await tx.select().from(orgProposals).where(eq(orgProposals.id, id)).for('update')
      if (!cur || cur.orgId !== orgId) notFound('Proposal')
      if (cur!.status !== 'revision') fail('Proposal hanya dapat diubah saat diminta perbaikan.')
      if (cur!.submittedById !== by.id && !canManage(ctx, o)) forbidden()
      await tx.update(orgProposals).set({ ...values, version: cur!.version + 1 }).where(eq(orgProposals.id, id))
    } else id = (await tx.insert(orgProposals).values({ ...values, orgId, submittedByType: by.t, submittedById: by.id, submittedByName: actorName(ctx) }).returning({ id: orgProposals.id }))[0]!.id
    if (o.advisorId) fx.notify({ type: 'staff', id: o.advisorId }, { title: `Proposal ${o.name}: ${p.title.trim()}`, link: `/portal/staf/organisasi/${orgId}` })
    fx.audit('org.proposal', 'organization', orgId, { proposal: id })
    return id!
  })
}

export async function reviewProposal(ctx: Ctx, id: string, decision: 'approve' | 'revision' | 'reject', note: string | null) {
  const s = requireStaff(ctx)
  if (decision !== 'approve' && !note?.trim()) fail('Tuliskan catatan untuk pengurus.')
  await command(ctx, 'org.review', {}, async (tx, fx) => {
    const [p] = await tx.select().from(orgProposals).where(eq(orgProposals.id, id)).for('update')
    if (!p) notFound('Proposal')
    const o = await load(tx, p!.orgId)
    if (!canManage(ctx, o)) forbidden()
    if (p!.status !== 'submitted') fail('Proposal tidak menunggu keputusan.')
    let eventId: string | null = null
    if (decision === 'approve') {
      const [e] = await tx.insert(academicEvents).values({ title: `${p!.title} (${o.name})`, kind: 'kegiatan', startDate: p!.startDate, endDate: p!.endDate, audience: 'all', isPublic: p!.isPublic, description: p!.location, createdBy: s.id }).returning({ id: academicEvents.id })
      eventId = e!.id
    }
    await tx.update(orgProposals).set({ status: decision === 'approve' ? 'approved' : decision === 'revision' ? 'revision' : 'rejected', reviewNote: note, reviewedBy: s.id, reviewedAt: ctx.now, eventId, version: p!.version + 1 }).where(eq(orgProposals.id, id))
    if (p!.submittedByType === 'account') fx.notify({ type: 'account', id: p!.submittedById }, { title: `Proposal "${p!.title}": ${PROPOSAL_STATUS[decision === 'approve' ? 'approved' : decision === 'revision' ? 'revision' : 'rejected']}`, body: note ?? undefined, link: '/portal/keluarga/organisasi' })
    fx.audit(`org.${decision}`, 'organization', p!.orgId, { proposal: id })
  })
}

export async function reportProposal(ctx: Ctx, id: string, report: string) {
  if (report.trim().length < 20) fail('Tuliskan laporan kegiatan (min. 20 karakter).')
  await command(ctx, 'org.report', {}, async (tx, fx) => {
    const [p] = await tx.select().from(orgProposals).where(eq(orgProposals.id, id)).for('update')
    if (!p) notFound('Proposal')
    const o = await load(tx, p!.orgId)
    const mine = ctx.account && p!.submittedByType === 'account' && p!.submittedById === ctx.account.id
    if (!mine && !canManage(ctx, o)) forbidden()
    if (p!.status !== 'approved') fail('Laporan dibuat setelah kegiatan disetujui.')
    await tx.update(orgProposals).set({ status: 'reported', report: report.trim(), version: p!.version + 1 }).where(eq(orgProposals.id, id))
    fx.audit('org.report', 'organization', p!.orgId, { proposal: id })
  })
}
