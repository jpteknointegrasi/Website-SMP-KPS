/**
 * M17 billing core: invoices and payments. A transfer proof is not a verified payment: only a finance officer's
 * verification counts (§19.8). Modules react to fully paid invoices inside the same transaction (onInvoicePaid).
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { invoices, payments, students } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, nextNumber, type Db, type Effects } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { DOCS, fileAccess, saveFile } from '@/server/files'
import { isDate } from '@/server/time'
import { visibleStudentIds } from '../scope'

export type Invoice = typeof invoices.$inferSelect
type PaidHook = (tx: Db, inv: Invoice, ctx: Ctx, fx: Effects) => Promise<void>
const paidHooks: PaidHook[] = []
/** Called when an invoice becomes fully paid or waived (same transaction). */
export const onInvoicePaid = (h: PaidHook) => void paidHooks.push(h)

export const CATEGORIES: Record<string, string> = { pendaftaran: 'Biaya pendaftaran', daftar_ulang: 'Daftar ulang', spp: 'SPP', kegiatan: 'Kegiatan', lainnya: 'Lainnya' }
export const INVOICE_STATUS: Record<string, string> = { unpaid: 'Belum dibayar', partial: 'Dibayar sebagian', paid: 'Lunas', cancelled: 'Dibatalkan', waived: 'Dibebaskan' }

/** Creates an invoice inside the caller's transaction (used by admissions and by finance staff). */
export async function createInvoice(
  tx: Db,
  ctx: Ctx,
  i: { category: string; title: string; items: { label: string; amount: number }[]; applicationId?: string | null; studentId?: string | null; accountId?: string | null; dueDate?: string | null; note?: string | null },
) {
  const amount = i.items.reduce((a, x) => a + x.amount, 0)
  if (amount <= 0 || i.items.some((x) => !Number.isInteger(x.amount) || x.amount < 0)) fail('Nominal tagihan tidak valid.')
  const y = ctx.now.getUTCFullYear()
  const n = await nextNumber(tx, `tagihan:${y}`)
  const [row] = await tx
    .insert(invoices)
    .values({ number: `INV-${y}-${String(n).padStart(5, '0')}`, category: i.category, title: i.title, items: i.items, amount, applicationId: i.applicationId ?? null, studentId: i.studentId ?? null, accountId: i.accountId ?? null, dueDate: i.dueDate ?? null, note: i.note ?? null, createdBy: ctx.staff?.id ?? 'system' })
    .returning()
  return row!
}

/** Who may see/pay an invoice: finance staff; the responsible account; the student or a guardian allowed to see finance. */
export async function canSeeInvoice(ctx: Ctx, inv: Invoice) {
  if (hasPerm(ctx, 'finance.manage', 'finance.verify')) return true
  if (!ctx.account) return false
  if (inv.accountId === ctx.account.id) return true
  if (inv.studentId) return (await visibleStudentIds(ctx, 'finance')).has(inv.studentId)
  return false
}

fileAccess('payment_proof', async (ctx, f) => {
  if (hasPerm(ctx, 'finance.manage', 'finance.verify')) return true
  if (!f.contextId) return false
  const [p] = await ctx.db.select({ inv: invoices }).from(payments).innerJoin(invoices, eq(invoices.id, payments.invoiceId)).where(eq(payments.id, f.contextId))
  return Boolean(p && (await canSeeInvoice(ctx, p.inv)))
})

export async function submitPayment(ctx: Ctx, invoiceId: string, p: { amount: number; method: string; paidOn: string; payerName: string | null; proof: { name: string; buffer: Buffer } | null }) {
  if (!(p.amount > 0)) fail('Isi nominal pembayaran.')
  if (!isDate(p.paidOn)) fail('Tanggal bayar tidak valid.')
  if (!['transfer', 'tunai', 'lainnya'].includes(p.method)) fail('Metode tidak dikenal.')
  return command(ctx, 'billing.payment_submit', {}, async (tx, fx) => {
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for('update')
    if (!inv) notFound('Tagihan')
    if (!(await canSeeInvoice(ctx, inv!))) forbidden()
    if (!['unpaid', 'partial'].includes(inv!.status)) fail('Tagihan ini tidak menunggu pembayaran.')
    if (!ctx.staff && !p.proof) fail('Unggah bukti pembayaran.')
    const id = crypto.randomUUID()
    const proof = p.proof ? await saveFile(ctx, tx, p.proof, { allow: DOCS, maxMb: 4, classification: 'restricted', contextType: 'payment_proof', contextId: id, label: 'Bukti bayar' }) : null
    await tx.insert(payments).values({ id, invoiceId, amount: p.amount, method: p.method, paidOn: p.paidOn, payerName: p.payerName, proofFileId: proof?.id ?? null, submittedByType: ctx.staff ? 'staff' : 'account', submittedById: ctx.staff?.id ?? ctx.account!.id })
    fx.audit('billing.payment_submit', 'invoice', invoiceId, { amount: p.amount })
    return id
  })
}

async function settle(tx: Db, ctx: Ctx, fx: Effects, invoiceId: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId))
  const [sum] = await tx.select({ s: sql<number>`coalesce(sum(${payments.amount}), 0)`.mapWith(Number) }).from(payments).where(and(eq(payments.invoiceId, invoiceId), eq(payments.status, 'verified')))
  const paid = sum!.s
  const status = inv!.status === 'cancelled' || inv!.status === 'waived' ? inv!.status : paid >= inv!.amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
  await tx.update(invoices).set({ paid, status, version: sql`${invoices.version} + 1` }).where(eq(invoices.id, invoiceId))
  if (status === 'paid' && inv!.status !== 'paid') for (const h of paidHooks) await h(tx, { ...inv!, paid, status }, ctx, fx)
}

/** Finance verifies a payment (amount, reference, proof). Gives a receipt number; the invoice settles automatically. */
export async function verifyPayment(ctx: Ctx, paymentId: string, ref: string | null) {
  const s = requireStaff(ctx, 'finance.verify')
  await command(ctx, 'billing.payment_verify', {}, async (tx, fx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for('update')
    if (!p || p.status !== 'submitted') fail('Pembayaran ini sudah diproses.')
    if (ref) {
      const [dup] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.externalReference, ref))
      if (dup) fail('Nomor referensi ini sudah dipakai pembayaran lain.', 'conflict')
    }
    const y = ctx.now.getUTCFullYear()
    const n = await nextNumber(tx, `kuitansi:${y}`)
    await tx.update(payments).set({ status: 'verified', verifiedBy: s.id, verifiedAt: ctx.now, externalReference: ref, receiptNo: `KWT-${y}-${String(n).padStart(5, '0')}` }).where(eq(payments.id, paymentId))
    await settle(tx, ctx, fx, p!.invoiceId)
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, p!.invoiceId))
    if (inv!.accountId) fx.notify({ type: 'account', id: inv!.accountId }, { title: `Pembayaran ${inv!.number} terverifikasi`, link: '/portal/keluarga/tagihan' })
    fx.audit('billing.payment_verify', 'invoice', p!.invoiceId, { amount: p!.amount })
  })
}

export async function rejectPayment(ctx: Ctx, paymentId: string, reason: string) {
  const s = requireStaff(ctx, 'finance.verify')
  if (reason.trim().length < 3) fail('Tuliskan alasan penolakan.')
  await command(ctx, 'billing.payment_reject', {}, async (tx, fx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for('update')
    if (!p || p.status !== 'submitted') fail('Pembayaran ini sudah diproses.')
    await tx.update(payments).set({ status: 'rejected', verifiedBy: s.id, verifiedAt: ctx.now, rejectReason: reason.trim() }).where(eq(payments.id, paymentId))
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, p!.invoiceId))
    if (inv!.accountId) fx.notify({ type: 'account', id: inv!.accountId }, { title: `Bukti pembayaran ${inv!.number} perlu diperbaiki`, body: reason.trim(), link: '/portal/keluarga/tagihan' })
    fx.audit('billing.payment_reject', 'invoice', p!.invoiceId)
  })
}

/** Waive (free) or cancel an invoice with a reason. Waiving counts as settled for checklists. */
export async function closeInvoice(ctx: Ctx, invoiceId: string, kind: 'waived' | 'cancelled', reason: string) {
  requireStaff(ctx, 'finance.manage')
  if (reason.trim().length < 3) fail('Tuliskan alasan.')
  await command(ctx, `billing.invoice_${kind}`, {}, async (tx, fx) => {
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for('update')
    if (!inv || !['unpaid', 'partial'].includes(inv.status)) fail('Tagihan ini tidak dapat diubah.')
    await tx.update(invoices).set({ status: kind, note: `${inv!.note ? `${inv!.note}\n` : ''}${kind === 'waived' ? 'Dibebaskan' : 'Dibatalkan'}: ${reason.trim()}` }).where(eq(invoices.id, invoiceId))
    if (kind === 'waived') for (const h of paidHooks) await h(tx, { ...inv!, status: 'waived' }, ctx, fx)
    fx.audit(`billing.invoice_${kind}`, 'invoice', invoiceId)
  })
}

export async function createStudentInvoice(ctx: Ctx, i: { studentIds: string[]; category: string; title: string; amount: number; dueDate: string | null }) {
  requireStaff(ctx, 'finance.manage')
  if (!(i.category in CATEGORIES)) fail('Kategori tidak dikenal.')
  if (!i.title.trim()) fail('Isi judul tagihan.')
  if (!Number.isInteger(i.amount) || i.amount <= 0) fail('Isi nominal (rupiah).')
  if (!i.studentIds.length) fail('Pilih siswa.')
  return command(ctx, 'billing.invoice_create', {}, async (tx, fx) => {
    const rows = await tx.select({ id: students.id }).from(students).where(and(inArray(students.id, i.studentIds), eq(students.status, 'active')))
    for (const r of rows) await createInvoice(tx, ctx, { category: i.category, title: i.title.trim(), items: [{ label: i.title.trim(), amount: i.amount }], studentId: r.id, dueDate: i.dueDate })
    fx.audit('billing.invoice_create', 'billing', null, { count: rows.length, amount: i.amount })
    return rows.length
  })
}

export async function invoicesFor(ctx: Ctx, where: { applicationId?: string; studentId?: string }) {
  const rows = await ctx.db
    .select()
    .from(invoices)
    .where(where.applicationId ? eq(invoices.applicationId, where.applicationId) : eq(invoices.studentId, where.studentId!))
    .orderBy(desc(invoices.createdAt))
  const pays = rows.length ? await ctx.db.select().from(payments).where(inArray(payments.invoiceId, rows.map((r) => r.id))).orderBy(desc(payments.createdAt)) : []
  return rows.map((r) => ({ ...r, payments: pays.filter((p) => p.invoiceId === r.id) }))
}

// ---------- staff lists ----------
export async function listInvoices(ctx: Ctx, f: { status?: string; category?: string; q?: string }) {
  requireStaff(ctx, 'finance.manage', 'finance.verify')
  const where = []
  if (f.status) where.push(eq(invoices.status, f.status))
  if (f.category) where.push(eq(invoices.category, f.category))
  const rows = await ctx.db
    .select({ i: invoices, studentName: sql<string | null>`(SELECT p.full_name FROM students s JOIN persons p ON p.id = s.person_id WHERE s.id = ${invoices.studentId})`, applicantName: sql<string | null>`(SELECT a.data->>'fullName' FROM admission_applications a WHERE a.id = ${invoices.applicationId})`, regNo: sql<string | null>`(SELECT a.registration_no FROM admission_applications a WHERE a.id = ${invoices.applicationId})` })
    .from(invoices)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(invoices.createdAt))
    .limit(300)
  const q = f.q?.toLowerCase()
  return q ? rows.filter((r) => [r.i.number, r.studentName, r.applicantName, r.regNo].some((x) => x?.toLowerCase().includes(q))) : rows
}

export async function pendingPayments(ctx: Ctx) {
  requireStaff(ctx, 'finance.verify', 'finance.manage')
  return ctx.db.select({ p: payments, i: invoices }).from(payments).innerJoin(invoices, eq(invoices.id, payments.invoiceId)).where(eq(payments.status, 'submitted')).orderBy(payments.createdAt)
}
