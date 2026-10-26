/**
 * M02 Kartu Siswa QR (KRT-01..04). The QR carries a random 144-bit token, never personal data; only its hash is used for
 * look-up. Public verification answers just "valid / not valid" for the school; signed-in card verifiers also see who
 * the card belongs to. A QR scan is not proof of attendance.
 */
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import QRCode from 'qrcode'
import { openSecret, sealSecret } from '@sekolahku/core'
import { cardReplacements, cardTemplates, persons, studentCards, students, type CardTemplateSettings } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, nextNumber, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { randomToken, sha256 } from '@/server/secrets'
import { localDate } from '@/server/time'
import { visibleStudentIds, placementOn } from '../scope'

export const DEFAULT_CARD: CardTemplateSettings = {
  orientation: 'landscape',
  scheme: 'biru',
  show: { photo: true, nis: true, nisn: false, entryYear: true, homeroom: false },
  validityMonths: 12,
  backText: 'Kartu ini milik sekolah. Bila menemukan kartu ini, mohon kembalikan ke sekolah.',
}

export const REPLACE_REASONS: Record<string, string> = { hilang: 'Hilang', rusak: 'Rusak', tidak_terbaca: 'Tidak terbaca', lainnya: 'Lainnya' }
export const CARD_STATUS: Record<string, string> = { active: 'Berlaku', revoked: 'Dicabut', replaced: 'Diganti', expired: 'Kedaluwarsa' }

export async function templates(db: Db) {
  return db.select().from(cardTemplates).orderBy(desc(cardTemplates.version))
}
export async function approvedTemplate(db: Db) {
  const [t] = await db.select().from(cardTemplates).where(eq(cardTemplates.status, 'approved')).orderBy(desc(cardTemplates.version)).limit(1)
  return t ?? null
}

export async function saveTemplateDraft(ctx: Ctx, name: string, settings: CardTemplateSettings) {
  const s = requireStaff(ctx, 'cards.manage')
  if (!(settings.validityMonths >= 1 && settings.validityMonths <= 72)) fail('Masa berlaku 1–72 bulan.')
  return command(ctx, 'cards.template_draft', {}, async (tx, fx) => {
    const [draft] = await tx.select().from(cardTemplates).where(eq(cardTemplates.status, 'draft')).orderBy(desc(cardTemplates.version)).limit(1)
    if (draft) {
      await tx.update(cardTemplates).set({ name: name || draft.name, settings }).where(eq(cardTemplates.id, draft.id))
      fx.audit('cards.template_draft', 'card_template', draft.id)
      return draft.id
    }
    const [last] = await tx.select({ v: sql<number>`coalesce(max(${cardTemplates.version}), 0)`.mapWith(Number) }).from(cardTemplates)
    const [t] = await tx.insert(cardTemplates).values({ name: name || 'Kartu Siswa', version: (last?.v ?? 0) + 1, settings, createdBy: s.id }).returning({ id: cardTemplates.id })
    fx.audit('cards.template_draft', 'card_template', t!.id)
    return t!.id
  })
}

/** Approves the draft; earlier approved versions retire (cards already issued keep the version they were made with). */
export async function approveTemplate(ctx: Ctx, id: string) {
  const s = requireStaff(ctx, 'cards.manage')
  await command(ctx, 'cards.template_approve', {}, async (tx, fx) => {
    const [t] = await tx.select().from(cardTemplates).where(eq(cardTemplates.id, id))
    if (!t || t.status !== 'draft') fail('Hanya draf template yang dapat disetujui.')
    await tx.update(cardTemplates).set({ status: 'retired' }).where(eq(cardTemplates.status, 'approved'))
    await tx.update(cardTemplates).set({ status: 'approved', approvedBy: s.id, approvedAt: ctx.now }).where(eq(cardTemplates.id, id))
    fx.audit('cards.template_approve', 'card_template', id, { version: t!.version })
  })
}

/** Why a student cannot get a card yet (empty = ready). */
export function cardBlockers(r: { status: string; nis: string | null; photo: string | null; name: string }) {
  const out: string[] = []
  if (r.status !== 'active') out.push('Siswa tidak aktif')
  if (!r.nis) out.push('NIS kosong')
  if (!r.photo) out.push('Pasfoto belum ada')
  return out
}

export async function issueCards(ctx: Ctx, studentIds: string[], key?: string | null) {
  const s = requireStaff(ctx, 'cards.manage')
  if (!studentIds.length) fail('Pilih siswa yang akan diterbitkan kartunya.')
  return command(ctx, 'cards.issue', { key, input: studentIds }, async (tx, fx) => {
    const tpl = await approvedTemplate(tx)
    if (!tpl) fail('Belum ada template kartu yang disetujui.')
    const rows = await tx
      .select({ id: students.id, status: students.status, nis: students.nis, photo: persons.photoFileId, name: persons.fullName })
      .from(students)
      .innerJoin(persons, eq(persons.id, students.personId))
      .where(inArray(students.id, studentIds))
    const active = new Set((await tx.select({ s: studentCards.studentId }).from(studentCards).where(and(inArray(studentCards.studentId, studentIds), eq(studentCards.status, 'active')))).map((r) => r.s))
    const issued: string[] = []
    const skipped: { name: string; reasons: string[] }[] = []
    for (const r of rows) {
      const b = cardBlockers(r)
      if (active.has(r.id)) b.push('Sudah punya kartu berlaku')
      if (b.length) {
        skipped.push({ name: r.name, reasons: b })
        continue
      }
      issued.push(await createCard(ctx, tx, r.id, tpl!, s.id))
    }
    fx.audit('cards.issue', 'cards', null, { issued: issued.length, skipped: skipped.length })
    return { issued, skipped }
  })
}

async function createCard(ctx: Ctx, tx: Db, studentId: string, tpl: typeof cardTemplates.$inferSelect, by: string) {
  const token = randomToken(18)
  const year = ctx.now.getUTCFullYear()
  const n = await nextNumber(tx, `kartu:${year}`)
  const until = new Date(ctx.now)
  until.setUTCMonth(until.getUTCMonth() + tpl.settings.validityMonths)
  const [c] = await tx
    .insert(studentCards)
    .values({
      cardNo: `${ctx.school.slug.toUpperCase().slice(0, 6)}-${year}-${String(n).padStart(5, '0')}`,
      studentId,
      templateId: tpl.id,
      tokenHash: sha256(token),
      tokenSealed: sealSecret(token),
      issuedBy: by,
      validUntil: localDate(until, ctx.tz),
    })
    .returning({ id: studentCards.id })
  return c!.id
}

export async function markPrinted(ctx: Ctx, cardIds: string[]) {
  requireStaff(ctx, 'cards.manage')
  if (!cardIds.length) return
  await command(ctx, 'cards.printed', {}, async (tx, fx) => {
    await tx.update(studentCards).set({ printedAt: ctx.now }).where(inArray(studentCards.id, cardIds))
    fx.audit('cards.printed', 'cards', null, { count: cardIds.length })
  })
}

export async function revokeCard(ctx: Ctx, id: string, reason: string) {
  requireStaff(ctx, 'cards.manage')
  if (reason.trim().length < 3) fail('Tuliskan alasan pencabutan.')
  await command(ctx, 'cards.revoke', {}, async (tx, fx) => {
    const [c] = await tx.select().from(studentCards).where(eq(studentCards.id, id))
    if (!c || c.status !== 'active') fail('Kartu tidak dalam status berlaku.')
    await tx.update(studentCards).set({ status: 'revoked', revokedAt: ctx.now, revokeReason: reason.trim() }).where(eq(studentCards.id, id))
    fx.audit('cards.revoke', 'student', c!.studentId, { card: c!.cardNo })
  })
}

/** Replacement request by the student/guardian (own/linked student) or TU. */
export async function requestReplacement(ctx: Ctx, studentId: string, reason: string, note: string | null, deactivateOld: boolean) {
  if (!(reason in REPLACE_REASONS)) fail('Pilih alasan penggantian.', 'invalid', 'alasan')
  if (!hasPerm(ctx, 'cards.manage')) {
    if (!ctx.account || !(await visibleStudentIds(ctx)).has(studentId)) forbidden()
  }
  return command(ctx, 'cards.replace_request', {}, async (tx, fx) => {
    const [open] = await tx.select().from(cardReplacements).where(and(eq(cardReplacements.studentId, studentId), eq(cardReplacements.status, 'submitted')))
    if (open) fail('Sudah ada permohonan penggantian yang sedang diproses.')
    const [card] = await tx.select().from(studentCards).where(and(eq(studentCards.studentId, studentId), eq(studentCards.status, 'active')))
    // a lost card is deactivated immediately on request (cannot be misused while waiting)
    if (card && deactivateOld && reason === 'hilang') await tx.update(studentCards).set({ status: 'revoked', revokedAt: ctx.now, revokeReason: 'Dilaporkan hilang' }).where(eq(studentCards.id, card.id))
    const [r] = await tx
      .insert(cardReplacements)
      .values({ studentId, cardId: card?.id ?? null, reason, note, deactivateOld: deactivateOld ? 1 : 0, requestedByType: ctx.staff ? 'staff' : 'account', requestedById: ctx.staff?.id ?? ctx.account!.id })
      .returning({ id: cardReplacements.id })
    fx.audit('cards.replace_request', 'student', studentId, { reason })
    return r!.id
  })
}

export async function decideReplacement(ctx: Ctx, id: string, approve: boolean) {
  const s = requireStaff(ctx, 'cards.manage')
  await command(ctx, 'cards.replace_decide', {}, async (tx, fx) => {
    const [r] = await tx.select().from(cardReplacements).where(eq(cardReplacements.id, id)).for('update')
    if (!r || r.status !== 'submitted') fail('Permohonan sudah diproses.')
    if (approve) {
      const tpl = await approvedTemplate(tx)
      if (!tpl) fail('Belum ada template kartu yang disetujui.')
      const [old] = await tx.select().from(studentCards).where(and(eq(studentCards.studentId, r!.studentId), inArray(studentCards.status, ['active', 'revoked'])), ).orderBy(desc(studentCards.issuedAt)).limit(1)
      if (old && old.status === 'active') await tx.update(studentCards).set({ status: 'replaced', revokedAt: ctx.now, revokeReason: `Diganti (${REPLACE_REASONS[r!.reason]})` }).where(eq(studentCards.id, old.id))
      const newId = await createCard(ctx, tx, r!.studentId, tpl!, s.id)
      if (old) await tx.update(studentCards).set({ replacedById: newId }).where(eq(studentCards.id, old.id))
    }
    await tx.update(cardReplacements).set({ status: approve ? 'approved' : 'rejected', processedBy: s.id, processedAt: ctx.now }).where(eq(cardReplacements.id, id))
    fx.audit(approve ? 'cards.replace_approved' : 'cards.replace_rejected', 'student', r!.studentId)
    if (r!.requestedByType === 'account') fx.notify({ type: 'account', id: r!.requestedById }, { title: `Permohonan penggantian kartu ${approve ? 'disetujui — kartu baru diterbitkan' : 'ditolak'}`, link: '/portal/keluarga/kartu' })
  })
}

// ---------- reads ----------
export async function cardsOf(db: Db, studentIds: string[]) {
  if (!studentIds.length) return []
  return db
    .select({ card: studentCards, tpl: cardTemplates, name: persons.fullName, nis: students.nis, nisn: students.nisn, entryYear: students.entryYear, photo: persons.photoFileId, studentId: students.id })
    .from(studentCards)
    .innerJoin(cardTemplates, eq(cardTemplates.id, studentCards.templateId))
    .innerJoin(students, eq(students.id, studentCards.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(inArray(studentCards.studentId, studentIds))
    .orderBy(asc(persons.fullName), desc(studentCards.issuedAt))
}

export async function cardsForPrint(ctx: Ctx, cardIds: string[]) {
  requireStaff(ctx, 'cards.manage')
  if (!cardIds.length) return []
  const rows = await ctx.db
    .select({ card: studentCards, tpl: cardTemplates, name: persons.fullName, nis: students.nis, nisn: students.nisn, entryYear: students.entryYear, photo: persons.photoFileId, studentId: students.id })
    .from(studentCards)
    .innerJoin(cardTemplates, eq(cardTemplates.id, studentCards.templateId))
    .innerJoin(students, eq(students.id, studentCards.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(and(inArray(studentCards.id, cardIds), eq(studentCards.status, 'active')))
    .orderBy(asc(persons.fullName))
  return Promise.all(rows.map(async (r) => ({ ...r, qr: await cardQr(ctx, r.card.tokenSealed) })))
}

export const verifyUrl = (ctx: Ctx, token: string) => `${ctx.school.primaryDomain ? `https://${ctx.school.primaryDomain}` : ''}/portal/v/${token}`

/** SVG of the card's QR (quiet zone 4 modules, as the print guide asks). */
export async function cardQr(ctx: Ctx, sealed: string) {
  return QRCode.toString(verifyUrl(ctx, openSecret(sealed)), { type: 'svg', margin: 4, errorCorrectionLevel: 'M' })
}

/** Digital card(s) of the signed-in student or linked children. */
export async function myCards(ctx: Ctx) {
  const ids = [...(await visibleStudentIds(ctx))]
  const rows = (await cardsOf(ctx.db, ids)).filter((r) => r.card.status === 'active')
  return Promise.all(rows.map(async (r) => ({ ...r, qr: await cardQr(ctx, r.card.tokenSealed) })))
}

/**
 * Card check by QR token. Everyone gets the status for this school only; staff with cards.verify also see the holder.
 * Expired cards are reported as such.
 */
export async function verifyToken(ctx: Ctx, token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return { found: false as const }
  const [r] = await ctx.db
    .select({ card: studentCards, name: persons.fullName, nis: students.nis, photo: persons.photoFileId, studentStatus: students.status, entryYear: students.entryYear, studentId: students.id })
    .from(studentCards)
    .innerJoin(students, eq(students.id, studentCards.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(studentCards.tokenHash, sha256(token)))
    .limit(1)
  if (!r) return { found: false as const }
  const expired = r.card.validUntil < localDate(ctx.now, ctx.tz)
  const valid = r.card.status === 'active' && !expired && r.studentStatus === 'active'
  const status = r.card.status !== 'active' ? CARD_STATUS[r.card.status]! : expired ? 'Kedaluwarsa' : r.studentStatus !== 'active' ? 'Siswa tidak aktif' : 'Berlaku'
  const detail = hasPerm(ctx, 'cards.verify', 'cards.manage')
    ? { name: r.name, nis: r.nis, photo: r.photo, cardNo: r.card.cardNo, validUntil: r.card.validUntil, entryYear: r.entryYear, homeroom: (await placementOn(ctx.db, r.studentId, localDate(ctx.now, ctx.tz)))?.homeroom ?? null }
    : null
  return { found: true as const, valid, status, detail }
}

export async function cardIssuanceList(ctx: Ctx, homeroomId?: string | null) {
  requireStaff(ctx, 'cards.manage')
  const rows = await ctx.db
    .select({ id: students.id, name: persons.fullName, nis: students.nis, status: students.status, photo: persons.photoFileId, entryYear: students.entryYear })
    .from(students)
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(students.status, 'active'))
    .orderBy(asc(persons.fullName))
  const cards = await ctx.db.select().from(studentCards).where(eq(studentCards.status, 'active'))
  const d = localDate(ctx.now, ctx.tz)
  const out = []
  for (const r of rows) {
    const p = await placementOn(ctx.db, r.id, d)
    if (homeroomId && p?.homeroomId !== homeroomId) continue
    const card = cards.find((c) => c.studentId === r.id) ?? null
    out.push({ ...r, homeroom: p?.homeroom ?? null, card, blockers: cardBlockers(r) })
  }
  return out
}

export async function pendingReplacements(ctx: Ctx) {
  requireStaff(ctx, 'cards.manage')
  return ctx.db
    .select({ r: cardReplacements, name: persons.fullName, nis: students.nis })
    .from(cardReplacements)
    .innerJoin(students, eq(students.id, cardReplacements.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(eq(cardReplacements.status, 'submitted'))
    .orderBy(asc(cardReplacements.createdAt))
}

export const printedCount = (db: Db) => db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(studentCards).where(isNotNull(studentCards.printedAt))
