/**
 * M13 announcements (§17, §44.2): targeted at everyone, staff, families, students, guardians, homerooms or grades;
 * scheduled publication; optional acknowledgement per child; in-app notice to each recipient at publication.
 * Homeroom teachers may announce to their own homeroom; school-wide needs announcements.publish.
 */
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { announcementReceipts, announcements, files, guardianLinks, guardians, homerooms, staffMembers, students, type Audience } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db, type Effects } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { DOCS, fileAccess, IMAGES, saveFile } from '@/server/files'
import { today } from '@/server/time'
import { activeYear, guardianAccounts, homeroomStudents } from '../scope'
import { scheduled } from '../jobs'
import type { SchoolDb } from '@/db/school-db'
import type { SchoolInfo } from '@sekolahku/core'
import { makeCtx } from '@/server/context'

export const AUDIENCE_LABEL: Record<Audience['type'], string> = { all: 'Semua warga sekolah', staff: 'Staf/guru', families: 'Semua siswa & orang tua', students: 'Siswa', guardians: 'Orang tua/wali', homerooms: 'Rombel tertentu', grades: 'Tingkat tertentu' }

fileAccess('announcement', async (ctx, f) => {
  if (!f.contextId) return false
  const feed = ctx.staff ? await staffFeed(ctx) : await familyFeed(ctx)
  return feed.some((a) => a.a.id === f.contextId) || Boolean(ctx.staff && hasPerm(ctx, 'announcements.publish'))
})

async function myHomeroomIds(db: Db, ctx: Ctx) {
  if (!ctx.staff) return []
  const y = await activeYear(db)
  if (!y) return []
  return (await db.select({ id: homerooms.id }).from(homerooms).where(and(eq(homerooms.homeroomTeacherId, ctx.staff.id), eq(homerooms.yearId, y.id)))).map((h) => h.id)
}

export async function saveAnnouncement(ctx: Ctx, input: { id?: string | null; title: string; body: string; audience: Audience; publishAt: Date | null; requiresAck: boolean; pinned: boolean; publish: boolean }, uploads: { name: string; buffer: Buffer }[]) {
  const s = requireStaff(ctx)
  if (!input.title.trim() || !input.body.trim()) fail('Isi judul dan isi pengumuman.')
  const wide = hasPerm(ctx, 'announcements.publish')
  if (!wide) {
    const mine = await myHomeroomIds(ctx.db, ctx)
    if (input.audience.type !== 'homerooms' || !input.audience.ids?.length || input.audience.ids.some((id) => !mine.includes(id))) forbidden('Anda hanya dapat mengumumkan ke rombel yang Anda walikan.')
  }
  if ((input.audience.type === 'homerooms' || input.audience.type === 'grades') && !input.audience.ids?.length) fail('Pilih rombel/tingkat tujuan.')
  return command(ctx, 'comms.announcement', {}, async (tx, fx) => {
    const id = input.id ?? crypto.randomUUID()
    const [cur] = input.id ? await tx.select().from(announcements).where(eq(announcements.id, input.id)) : []
    if (input.id && !cur) notFound('Pengumuman')
    if (cur && cur.createdBy !== s.id && !wide) forbidden()
    if (cur && cur.status !== 'draft') fail('Pengumuman yang sudah terbit tidak diubah; arsipkan lalu buat yang baru.')
    const fileIds = [...(cur?.fileIds ?? [])]
    for (const u of uploads) fileIds.push((await saveFile(ctx, tx, u, { allow: [...DOCS, ...IMAGES], maxMb: 5, classification: 'private', contextType: 'announcement', contextId: id, label: 'Lampiran' })).id)
    const values = { title: input.title.trim(), body: input.body.trim(), audience: input.audience, publishAt: input.publishAt, requiresAck: input.requiresAck, pinned: input.pinned && wide, fileIds, status: input.publish ? 'published' : 'draft' }
    if (cur) await tx.update(announcements).set(values).where(eq(announcements.id, id))
    else await tx.insert(announcements).values({ id, ...values, createdBy: s.id, createdByName: s.name })
    if (input.publish && (!input.publishAt || input.publishAt <= ctx.now)) await deliver(tx, ctx, id, fx)
    fx.audit(input.publish ? 'comms.announcement_publish' : 'comms.announcement_draft', 'announcement', id, { audience: input.audience.type })
    return id
  })
}

/** Creates receipts + in-app notices for every recipient (once). */
async function deliver(tx: Db, ctx: Ctx, id: string, fx: Pick<Effects, 'notify'>) {
  const [a] = await tx.select().from(announcements).where(eq(announcements.id, id))
  if (!a || a.publishedAt) return
  await tx.update(announcements).set({ publishedAt: ctx.now }).where(eq(announcements.id, id))
  const recips = await recipients(tx, ctx, a.audience)
  for (const r of recips) {
    await tx.insert(announcementReceipts).values({ announcementId: id, recipientType: r.type, recipientId: r.id, studentId: r.studentId ?? null }).onConflictDoNothing()
    fx.notify({ type: r.type, id: r.id }, { title: `Pengumuman: ${a.title}`, link: r.type === 'staff' ? `/portal/staf/pengumuman/${id}` : `/portal/keluarga/pengumuman/${id}` })
  }
}

async function recipients(tx: Db, ctx: Ctx, aud: Audience) {
  const out = new Map<string, { type: 'account' | 'staff'; id: string; studentId?: string }>()
  const d = today(ctx.tz, ctx.now)
  if (aud.type === 'all' || aud.type === 'staff') {
    for (const s of await tx.select({ id: staffMembers.id }).from(staffMembers).where(eq(staffMembers.active, true))) out.set(`s:${s.id}`, { type: 'staff', id: s.id })
  }
  if (aud.type === 'staff') return [...out.values()]
  // students in scope
  let studentIds: string[] = []
  if (aud.type === 'homerooms') for (const h of aud.ids ?? []) studentIds.push(...(await homeroomStudents(tx, h, d)).map((s) => s.studentId))
  else if (aud.type === 'grades') {
    const y = await activeYear(tx)
    const rooms = y ? await tx.select().from(homerooms).where(and(eq(homerooms.yearId, y.id), inArray(homerooms.gradeLevelId, aud.ids ?? []))) : []
    for (const h of rooms) studentIds.push(...(await homeroomStudents(tx, h.id, d)).map((s) => s.studentId))
  } else studentIds = (await tx.select({ id: students.id }).from(students).where(eq(students.status, 'active'))).map((s) => s.id)
  if (!studentIds.length) return [...out.values()]
  if (aud.type !== 'guardians') for (const s of await tx.select({ id: students.id, accountId: students.accountId }).from(students).where(inArray(students.id, studentIds))) if (s.accountId) out.set(`a:${s.accountId}`, { type: 'account', id: s.accountId, studentId: s.id })
  if (aud.type !== 'students')
    for (const g of await guardianAccounts(tx, studentIds, d))
      if (g.accountId) out.set(`a:${g.accountId}`, { type: 'account', id: g.accountId, studentId: g.studentId })
  return [...out.values()]
}

export async function archiveAnnouncement(ctx: Ctx, id: string) {
  requireStaff(ctx)
  await command(ctx, 'comms.announcement_archive', {}, async (tx, fx) => {
    const [a] = await tx.select().from(announcements).where(eq(announcements.id, id))
    if (!a) notFound('Pengumuman')
    if (a!.createdBy !== ctx.staff!.id && !hasPerm(ctx, 'announcements.publish')) forbidden()
    await tx.update(announcements).set({ status: 'archived' }).where(eq(announcements.id, id))
    fx.audit('comms.announcement_archive', 'announcement', id)
  })
}

/** Announcements visible to a family account now (by its students' scope). */
export async function familyFeed(ctx: Ctx) {
  if (!ctx.account) return []
  const rows = await ctx.db
    .select({ a: announcements, r: announcementReceipts })
    .from(announcementReceipts)
    .innerJoin(announcements, eq(announcements.id, announcementReceipts.announcementId))
    .where(and(eq(announcementReceipts.recipientType, 'account'), eq(announcementReceipts.recipientId, ctx.account.id), eq(announcements.status, 'published'), or(isNull(announcements.publishAt), lte(announcements.publishAt, ctx.now))))
    .orderBy(desc(announcements.pinned), desc(announcements.publishedAt))
  return rows
}
export async function staffFeed(ctx: Ctx) {
  if (!ctx.staff) return []
  return ctx.db
    .select({ a: announcements, r: announcementReceipts })
    .from(announcementReceipts)
    .innerJoin(announcements, eq(announcements.id, announcementReceipts.announcementId))
    .where(and(eq(announcementReceipts.recipientType, 'staff'), eq(announcementReceipts.recipientId, ctx.staff.id), eq(announcements.status, 'published')))
    .orderBy(desc(announcements.pinned), desc(announcements.publishedAt))
}

export async function markRead(ctx: Ctx, id: string, ack: boolean) {
  const r = ctx.staff ? { t: 'staff', id: ctx.staff.id } : ctx.account ? { t: 'account', id: ctx.account.id } : null
  if (!r) fail('Silakan masuk.', 'unauthenticated')
  await command(ctx, ack ? 'comms.ack' : 'comms.read', {}, async (tx, fx) => {
    const [rec] = await tx.select().from(announcementReceipts).where(and(eq(announcementReceipts.announcementId, id), eq(announcementReceipts.recipientType, r!.t), eq(announcementReceipts.recipientId, r!.id)))
    if (!rec) notFound('Pengumuman')
    await tx.update(announcementReceipts).set({ readAt: rec!.readAt ?? ctx.now, ackAt: ack ? (rec!.ackAt ?? ctx.now) : rec!.ackAt }).where(eq(announcementReceipts.id, rec!.id))
    if (ack) fx.audit('comms.ack', 'announcement', id)
  })
}

export async function manageList(ctx: Ctx) {
  requireStaff(ctx)
  const wide = hasPerm(ctx, 'announcements.publish')
  const rows = await ctx.db.select().from(announcements).where(wide ? undefined : eq(announcements.createdBy, ctx.staff!.id)).orderBy(desc(announcements.createdAt)).limit(100)
  const ids = rows.map((r) => r.id)
  const stats = ids.length
    ? await ctx.db
        .select({ id: announcementReceipts.announcementId, total: sql<number>`count(*)`.mapWith(Number), read: sql<number>`count(${announcementReceipts.readAt})`.mapWith(Number), ack: sql<number>`count(${announcementReceipts.ackAt})`.mapWith(Number) })
        .from(announcementReceipts)
        .where(inArray(announcementReceipts.announcementId, ids))
        .groupBy(announcementReceipts.announcementId)
    : []
  return rows.map((r) => ({ ...r, stats: stats.find((s) => s.id === r.id) ?? { total: 0, read: 0, ack: 0 } }))
}

/** Scheduled announcements are delivered when their time comes. */
scheduled('announcements', async (db: SchoolDb, school: SchoolInfo, now: Date) => {
  const ctx = makeCtx({ school, db, now })
  const due = await db.select({ id: announcements.id }).from(announcements).where(and(eq(announcements.status, 'published'), isNull(announcements.publishedAt), lte(announcements.publishAt, now)))
  for (const a of due) {
    await command(ctx, 'comms.announcement_deliver', {}, async (tx, fx) => deliver(tx, ctx, a.id, fx))
  }
  return due.length
})


/** One announcement for a reader (recipient) or its author/manager, with attachments; opening marks it read. */
export async function readAnnouncement(ctx: Ctx, id: string) {
  const [a] = await ctx.db.select().from(announcements).where(eq(announcements.id, id))
  if (!a) notFound('Pengumuman')
  const who = ctx.staff ? { t: 'staff', id: ctx.staff.id } : ctx.account ? { t: 'account', id: ctx.account.id } : null
  const [rec] = who ? await ctx.db.select().from(announcementReceipts).where(and(eq(announcementReceipts.announcementId, id), eq(announcementReceipts.recipientType, who.t), eq(announcementReceipts.recipientId, who.id))) : []
  const manager = Boolean(ctx.staff && (a!.createdBy === ctx.staff.id || hasPerm(ctx, 'announcements.publish')))
  if (!manager && (!rec || a!.status !== 'published' || (a!.publishAt && a!.publishAt > ctx.now))) notFound('Pengumuman')
  if (rec && !rec.readAt) await ctx.db.update(announcementReceipts).set({ readAt: ctx.now }).where(eq(announcementReceipts.id, rec.id))
  const fileRows = a!.fileIds.length ? await ctx.db.select().from(files).where(inArray(files.id, a!.fileIds)) : []
  return { a: a!, receipt: rec ?? null, manager, files: fileRows }
}

/** Publishes a saved draft as it is (same audience). */
export async function publishDraft(ctx: Ctx, id: string) {
  const [a] = await ctx.db.select().from(announcements).where(eq(announcements.id, id))
  if (!a) notFound('Pengumuman')
  if (a!.status !== 'draft') fail('Pengumuman ini bukan draf.')
  return saveAnnouncement(ctx, { id, title: a!.title, body: a!.body, audience: a!.audience, publishAt: a!.publishAt, requiresAck: a!.requiresAck, pinned: a!.pinned, publish: true }, [])
}
