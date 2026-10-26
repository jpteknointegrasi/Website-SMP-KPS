/**
 * Committee verification (§19.5, §41.1): queue, per-document checks, revision requests limited to opened fields and
 * documents with a deadline, verification (all required documents checked, registration fee settled when charged),
 * administrative rejection by an authorised officer, reopening with a reason.
 */
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import { admissionPaths, applicationDocuments, applications, auditEvents, invoices, persons, staffMembers } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command, expectVersion } from '@/server/command'
import { fail, notFound } from '@/server/errors'
import { currentDocuments, loadApplication } from './apply'
import { loadCycle } from './config'
import { APP_FIELDS } from './fields'

export type QueueFilter = { cycleId?: string; status?: string; pathId?: string; q?: string; mine?: boolean }

export async function reviewQueue(ctx: Ctx, f: QueueFilter) {
  requireStaff(ctx, 'admissions.verify', 'admissions.manage', 'admissions.approve', 'admissions.release', 'admissions.reenroll', 'admissions.convert')
  const where: SQL[] = [sql`${applications.status} <> 'draft'`]
  if (f.cycleId) where.push(eq(applications.cycleId, f.cycleId))
  if (f.status) where.push(eq(applications.status, f.status))
  if (f.pathId) where.push(eq(applications.pathId, f.pathId))
  if (f.mine && ctx.staff) where.push(eq(applications.verifierId, ctx.staff.id))
  if (f.q) {
    const q = `%${f.q.replace(/[%_]/g, '')}%`
    where.push(or(ilike(persons.fullName, q), ilike(applications.registrationNo, q))!)
  }
  return ctx.db
    .select({
      a: applications,
      name: persons.fullName,
      path: admissionPaths.name,
      verifier: sql<string | null>`coalesce(${staffMembers.displayName}, ${staffMembers.name})`,
      docsPending: sql<number>`(SELECT count(*) FROM application_documents d WHERE d.application_id = ${applications.id} AND d.state = 'pending' AND d.version_no = (SELECT max(version_no) FROM application_documents d2 WHERE d2.application_id = d.application_id AND d2.code = d.code))`.mapWith(Number),
      unpaid: sql<number>`(SELECT count(*) FROM billing_invoices i WHERE i.application_id = ${applications.id} AND i.category = 'pendaftaran' AND i.status IN ('unpaid','partial'))`.mapWith(Number),
    })
    .from(applications)
    .innerJoin(persons, eq(persons.id, applications.applicantPersonId))
    .innerJoin(admissionPaths, eq(admissionPaths.id, applications.pathId))
    .leftJoin(staffMembers, eq(staffMembers.id, applications.verifierId))
    .where(and(...where))
    .orderBy(asc(applications.submittedAt))
}

export async function startReview(ctx: Ctx, id: string) {
  const s = requireStaff(ctx, 'admissions.verify')
  await command(ctx, 'admissions.review_start', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    if (!['submitted', 'resubmitted', 'under_verification'].includes(a!.status)) fail('Pendaftaran ini tidak menunggu verifikasi.')
    if (a!.status === 'under_verification' && a!.verifierId && a!.verifierId !== s.id) fail('Pendaftaran ini sedang diperiksa petugas lain.')
    await tx.update(applications).set({ status: 'under_verification', verifierId: s.id, version: sql`${applications.version} + 1` }).where(eq(applications.id, id))
    fx.audit('admissions.review_start', 'application', id)
  })
}

export async function reviewDocument(ctx: Ctx, docId: string, state: 'verified' | 'revision_required' | 'rejected' | 'pending', note: string | null) {
  const s = requireStaff(ctx, 'admissions.verify')
  if (state !== 'verified' && state !== 'pending' && !note?.trim()) fail('Tuliskan alasan agar pendaftar tahu apa yang perlu diperbaiki.')
  await command(ctx, 'admissions.review_document', {}, async (tx, fx) => {
    const [d] = await tx.select().from(applicationDocuments).where(eq(applicationDocuments.id, docId)).for('update')
    if (!d) notFound('Berkas')
    const a = await loadApplication(tx, d!.applicationId, true)
    if (a!.status !== 'under_verification') fail('Mulai pemeriksaan pendaftaran ini terlebih dahulu.')
    const [latest] = await tx.select({ v: sql<number>`max(${applicationDocuments.versionNo})`.mapWith(Number) }).from(applicationDocuments).where(and(eq(applicationDocuments.applicationId, d!.applicationId), eq(applicationDocuments.code, d!.code)))
    if (latest!.v !== d!.versionNo) fail('Ada versi berkas yang lebih baru. Periksa versi terbaru.')
    await tx.update(applicationDocuments).set({ state, note: note?.trim() || null, reviewedBy: s.id, reviewedAt: ctx.now }).where(eq(applicationDocuments.id, docId))
    fx.audit('admissions.review_document', 'application', d!.applicationId, { code: d!.code, state })
  })
}

/** Opens only the listed fields/documents for correction until `due`. */
export async function requestRevision(ctx: Ctx, id: string, input: { fields: string[]; docs: string[]; note: string; due: Date | null }, version: string | null) {
  requireStaff(ctx, 'admissions.verify')
  if (!input.fields.length && !input.docs.length) fail('Pilih data atau berkas yang perlu diperbaiki.')
  if (input.note.trim().length < 5) fail('Tuliskan catatan perbaikan untuk pendaftar.')
  if (input.due && input.due <= ctx.now) fail('Batas waktu perbaikan harus di masa depan.')
  await command(ctx, 'admissions.request_revision', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    expectVersion(a!.version, version)
    if (a!.status !== 'under_verification') fail('Mulai pemeriksaan pendaftaran ini terlebih dahulu.')
    const valid = new Set(APP_FIELDS.map((f) => f.key))
    const c = (await loadCycle(tx, a!.cycleId))!
    for (const q of c.formFields) valid.add(`q_${q.key}`)
    const fields = input.fields.filter((f) => valid.has(f))
    const [path] = await tx.select().from(admissionPaths).where(eq(admissionPaths.id, a!.pathId))
    const docs = input.docs.filter((d) => path!.documents.some((x) => x.code === d))
    await tx
      .update(applications)
      .set({ status: 'needs_revision', revisionNote: input.note.trim(), revisionFields: [...fields, ...docs.map((d) => `doc:${d}`)], revisionDue: input.due, version: sql`${applications.version} + 1` })
      .where(eq(applications.id, id))
    fx.audit('admissions.request_revision', 'application', id, { fields: fields.join(','), docs: docs.join(',') })
    fx.event('admission.revision_requested', { applicationId: id })
    fx.notify({ type: 'account', id: a!.ownerAccountId }, { title: `Pendaftaran ${a!.registrationNo} perlu perbaikan`, body: 'Buka portal untuk melihat data/berkas yang perlu diperbaiki dan batas waktunya.', link: `/portal/keluarga/penerimaan/${id}` })
  })
}

export async function verifyApplication(ctx: Ctx, id: string, version: string | null) {
  const s = requireStaff(ctx, 'admissions.verify')
  await command(ctx, 'admissions.verify', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    expectVersion(a!.version, version)
    if (a!.status !== 'under_verification') fail('Mulai pemeriksaan pendaftaran ini terlebih dahulu.')
    const [path] = await tx.select().from(admissionPaths).where(eq(admissionPaths.id, a!.pathId))
    const { latest } = await currentDocuments(tx, id)
    const notOk = path!.documents.filter((d) => d.required && latest.get(d.code)?.d.state !== 'verified')
    if (notOk.length) fail(`Berkas wajib belum terverifikasi: ${notOk.map((d) => d.label).join(', ')}.`)
    const [unpaid] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(invoices).where(and(eq(invoices.applicationId, id), eq(invoices.category, 'pendaftaran'), inArray(invoices.status, ['unpaid', 'partial'])))
    if (unpaid!.n) fail('Biaya pendaftaran belum terverifikasi lunas (atau dibebaskan oleh keuangan).')
    const c = (await loadCycle(tx, a!.cycleId))!
    await tx
      .update(applications)
      .set({ status: 'verified', verifiedAt: ctx.now, verifiedBy: s.id, eligibility: 'eligible', revisionFields: null, version: sql`${applications.version} + 1` })
      .where(eq(applications.id, id))
    fx.audit('admissions.verify', 'application', id)
    fx.notify({ type: 'account', id: a!.ownerAccountId }, { title: `Berkas pendaftaran ${a!.registrationNo} terverifikasi`, body: c.selectionEnabled ? 'Jadwal seleksi akan diinformasikan melalui portal.' : 'Hasil akan diumumkan melalui portal.', link: `/portal/keluarga/penerimaan/${id}` })
  })
}

/** Administrative rejection (requirements not met) — not the same as "not selected"; needs admissions.manage. */
export async function rejectApplication(ctx: Ctx, id: string, reason: string) {
  requireStaff(ctx, 'admissions.manage')
  if (reason.trim().length < 10) fail('Tuliskan alasan penolakan administratif (minimal 10 karakter).')
  await command(ctx, 'admissions.reject', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    if (!['submitted', 'under_verification', 'resubmitted', 'needs_revision', 'verified'].includes(a!.status)) fail('Status pendaftaran tidak dapat ditolak.')
    await tx.update(applications).set({ status: 'rejected', rejectReason: reason.trim(), eligibility: 'not_eligible', version: sql`${applications.version} + 1` }).where(eq(applications.id, id))
    fx.audit('admissions.reject', 'application', id)
    fx.notify({ type: 'account', id: a!.ownerAccountId }, { title: `Pendaftaran ${a!.registrationNo} tidak memenuhi persyaratan administrasi`, body: 'Lihat keterangan di portal. Hubungi panitia bila ada pertanyaan.', link: `/portal/keluarga/penerimaan/${id}` })
  })
}

/** Reopens a verified/rejected application for review (substantial change); needs a reason. */
export async function reopenApplication(ctx: Ctx, id: string, reason: string) {
  requireStaff(ctx, 'admissions.manage')
  if (reason.trim().length < 5) fail('Tuliskan alasan membuka kembali.')
  await command(ctx, 'admissions.reopen', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    if (!['verified', 'rejected'].includes(a!.status)) fail('Hanya pendaftaran terverifikasi/ditolak yang dapat dibuka kembali.')
    const [decided] = await tx.execute(sql`SELECT 1 FROM decision_versions WHERE application_id = ${id} AND NOT superseded`).then((r) => r.rows)
    if (decided) fail('Pendaftaran ini sudah masuk usulan keputusan. Batalkan/ubah keputusan melalui alur keputusan.')
    await tx.update(applications).set({ status: 'under_verification', verifiedAt: null, verifiedBy: null, eligibility: 'pending', rejectReason: null, version: sql`${applications.version} + 1` }).where(eq(applications.id, id))
    fx.audit('admissions.reopen', 'application', id, { reason: reason.slice(0, 200) })
  })
}

export async function applicationTimeline(ctx: Ctx, id: string) {
  return ctx.db.select().from(auditEvents).where(and(eq(auditEvents.objectType, 'application'), eq(auditEvents.objectId, id))).orderBy(desc(auditEvents.occurredAt)).limit(80)
}

export async function documentHistory(ctx: Ctx, id: string) {
  return ctx.db.select().from(applicationDocuments).where(eq(applicationDocuments.applicationId, id)).orderBy(asc(applicationDocuments.code), desc(applicationDocuments.versionNo))
}

