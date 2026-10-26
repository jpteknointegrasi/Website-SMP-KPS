/**
 * Applicant side of M14 (§19.4, §41.1): one application per child per cycle, draft saved by step, private documents
 * as versions, submit once (registration number + snapshot + server time), revision limited to what the verifier
 * opened, withdrawal. Staff with admissions.manage can do the same for a family (assisted registration, recorded).
 */
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import {
  accounts,
  admissionPaths,
  admissionWaves,
  applicationDocuments,
  applications,
  decisionBatches,
  decisionVersions,
  files,
  persons,
  reenrollments,
  seatReservations,
  selectionSessions,
  sessionParticipants,
} from '@/db/schema'
import { hasPerm, requireAccount, type Ctx } from '@/server/context'
import { command, expectVersion, nextNumber, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { DOCS, fileAccess, saveFile } from '@/server/files'
import { acceptsApplications, cycleDetail, loadCycle } from './config'
import { checkAppField, checkCustom, fieldsFor } from './fields'
import { createInvoice, invoicesFor } from '../finance/service'

export type Application = typeof applications.$inferSelect

export const isAdmissionsStaff = (ctx: Ctx) =>
  Boolean(ctx.staff && ['admissions.manage', 'admissions.verify', 'admissions.assess', 'admissions.approve', 'admissions.release', 'admissions.reenroll', 'admissions.convert'].some((p) => ctx.staff!.perms.has(p as never)))

export async function loadApplication(db: Db, id: string, lock = false) {
  const q = db.select().from(applications).where(eq(applications.id, id))
  const [a] = lock ? await q.for('update') : await q
  return a ?? null
}

/** Owner account, or admissions staff. Assessors only see applications they are assigned to (checked by callers). */
export async function assertCanSee(ctx: Ctx, a: Application) {
  if (ctx.account && a.ownerAccountId === ctx.account.id) return
  if (isAdmissionsStaff(ctx)) return
  forbidden('Data pendaftaran ini tidak dapat Anda akses.')
}
const ownerOrAssist = (ctx: Ctx, a: Application) => {
  if (ctx.account && a.ownerAccountId === ctx.account.id) return 'owner' as const
  if (hasPerm(ctx, 'admissions.manage')) return 'assist' as const
  return forbidden('Data pendaftaran ini tidak dapat Anda ubah.')
}

fileAccess('application_document', async (ctx, f) => {
  if (!f.contextId) return false
  const [d] = await ctx.db.select({ appId: applicationDocuments.applicationId }).from(applicationDocuments).where(eq(applicationDocuments.id, f.contextId))
  if (!d) return false
  const a = await loadApplication(ctx.db, d.appId)
  if (!a) return false
  if (ctx.account && a.ownerAccountId === ctx.account.id) return true
  // verifiers, managers, re-enrolment & conversion operators; assessors do not need identity documents
  return hasPerm(ctx, 'admissions.verify', 'admissions.manage', 'admissions.reenroll', 'admissions.convert')
})

export async function myApplications(ctx: Ctx) {
  const a = requireAccount(ctx)
  return ctx.db.select().from(applications).where(eq(applications.ownerAccountId, a.id)).orderBy(desc(applications.createdAt))
}

export async function startApplication(ctx: Ctx, input: { cycleId: string; pathId: string; childName: string; forAccountId?: string | null; assistedReason?: string | null }) {
  const assisted = Boolean(input.forAccountId)
  if (assisted && !hasPerm(ctx, 'admissions.manage')) forbidden()
  const owner = assisted ? input.forAccountId! : requireAccount(ctx).id
  if (!input.childName.trim() || input.childName.length > 120) fail('Isi nama calon siswa.', 'invalid', 'nama_anak')
  if (assisted && (!input.assistedReason || input.assistedReason.trim().length < 5)) fail('Tuliskan alasan pendaftaran dibantu.')
  return command(ctx, 'admissions.start', {}, async (tx, fx) => {
    const d = await cycleDetail(tx, input.cycleId)
    if (!d) notFound('Periode')
    const path = d!.paths.find((p) => p.id === input.pathId && p.active)
    if (!path) fail('Pilih jalur pendaftaran yang tersedia.', 'invalid', 'jalur')
    const acc = acceptsApplications(d!.cycle, d!.waves, ctx.now)
    if (!acc.ok && !assisted) fail(acc.why)
    // one active application per child per cycle (same owner, same child name) — siblings/twins are separate names
    const mine = await tx.select({ id: applications.id, name: persons.fullName }).from(applications).innerJoin(persons, eq(persons.id, applications.applicantPersonId)).where(and(eq(applications.ownerAccountId, owner), eq(applications.cycleId, input.cycleId), ne(applications.status, 'withdrawn')))
    if (mine.some((m) => m.name.trim().toLowerCase() === input.childName.trim().toLowerCase())) fail('Calon siswa ini sudah punya pendaftaran di periode ini.', 'conflict')
    const [acct] = await tx.select({ email: accounts.email, name: persons.fullName }).from(accounts).innerJoin(persons, eq(persons.id, accounts.personId)).where(eq(accounts.id, owner))
    if (!acct) notFound('Akun')
    const [child] = await tx.insert(persons).values({ fullName: input.childName.trim() }).returning({ id: persons.id })
    const [app] = await tx
      .insert(applications)
      .values({
        cycleId: input.cycleId,
        pathId: path!.id,
        waveId: acc.ok ? (acc.wave?.id ?? null) : null,
        ownerAccountId: owner,
        applicantPersonId: child!.id,
        data: { fullName: input.childName.trim(), guardianName: acct!.name, guardianEmail: acct!.email ?? '' },
        assistedBy: assisted ? ctx.staff!.id : null,
        assistedReason: assisted ? input.assistedReason!.trim() : null,
      })
      .returning({ id: applications.id })
    fx.audit(assisted ? 'admissions.start_assisted' : 'admissions.start', 'application', app!.id)
    return app!.id
  })
}

/** Which fields/documents are editable now: everything in a draft; only the opened ones during revision. */
export function editableNow(a: Application) {
  if (a.status === 'draft') return { all: true, fields: new Set<string>(), docs: new Set<string>() }
  if (a.status === 'needs_revision') {
    const open = a.revisionFields ?? []
    return { all: false, fields: new Set(open.filter((x) => !x.startsWith('doc:'))), docs: new Set(open.filter((x) => x.startsWith('doc:')).map((x) => x.slice(4))) }
  }
  return null
}

export async function saveApplicationData(ctx: Ctx, id: string, values: Record<string, string>, version: string | null) {
  await command(ctx, 'admissions.save', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    ownerOrAssist(ctx, a!)
    expectVersion(a!.version, version)
    const ed = editableNow(a!)
    if (!ed) fail('Pendaftaran yang sudah dikirim tidak dapat diubah kecuali diminta perbaikan.')
    const c = (await loadCycle(tx, a!.cycleId))!
    const data = { ...a!.data }
    const answers = { ...a!.answers }
    const errors: string[] = []
    for (const def of fieldsFor(c.requireNik)) {
      if (!(def.key in values)) continue
      if (!ed!.all && !ed!.fields.has(def.key)) continue
      const r = checkAppField(def, values[def.key])
      // drafts keep what was typed even when incomplete; invalid formats are reported
      if (r.error && values[def.key]?.trim()) errors.push(r.error)
      data[def.key] = r.value === null ? '' : String(r.value)
    }
    for (const q of c.formFields) {
      const k = `q_${q.key}`
      if (!(k in values)) continue
      if (!ed!.all && !ed!.fields.has(k)) continue
      const r = checkCustom(q, values[k])
      if (r.error && values[k]?.trim()) errors.push(r.error)
      answers[q.key] = r.value ?? ''
    }
    if (errors.length) fail(errors.join(' '))
    await tx.update(applications).set({ data, answers, updatedAt: ctx.now, version: sql`${applications.version} + 1` }).where(eq(applications.id, id))
    if (data.fullName) await tx.update(persons).set({ fullName: data.fullName, updatedAt: ctx.now }).where(eq(persons.id, a!.applicantPersonId))
    fx.audit('admissions.save', 'application', id)
  })
}

export async function uploadApplicationDocument(ctx: Ctx, id: string, code: string, up: { name: string; buffer: Buffer }) {
  await command(ctx, 'admissions.document', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    ownerOrAssist(ctx, a!)
    const ed = editableNow(a!)
    if (!ed || (!ed.all && !ed.docs.has(code))) fail('Berkas ini tidak sedang dibuka untuk diunggah.')
    const [path] = await tx.select().from(admissionPaths).where(eq(admissionPaths.id, a!.pathId))
    const req = path!.documents.find((d) => d.code === code)
    if (!req) fail('Jenis berkas tidak dikenal untuk jalur ini.')
    const [last] = await tx
      .select({ v: sql<number>`coalesce(max(${applicationDocuments.versionNo}), 0)`.mapWith(Number) })
      .from(applicationDocuments)
      .where(and(eq(applicationDocuments.applicationId, id), eq(applicationDocuments.code, code)))
    const docId = crypto.randomUUID()
    const f = await saveFile(ctx, tx, up, { allow: code === 'pasfoto' ? ['jpg', 'png'] : DOCS, maxMb: code === 'pasfoto' ? 2 : 5, classification: 'restricted', contextType: 'application_document', contextId: docId, label: req!.label })
    await tx.insert(applicationDocuments).values({ id: docId, applicationId: id, code, versionNo: (last?.v ?? 0) + 1, fileId: f.id, uploadedBy: ctx.staff ? `staff:${ctx.staff.id}` : `account:${ctx.account!.id}` })
    fx.audit('admissions.document', 'application', id, { code, version: (last?.v ?? 0) + 1 })
  })
}

/** Latest version of each document. */
export async function currentDocuments(db: Db, applicationId: string) {
  const rows = await db
    .select({ d: applicationDocuments, file: files })
    .from(applicationDocuments)
    .innerJoin(files, eq(files.id, applicationDocuments.fileId))
    .where(eq(applicationDocuments.applicationId, applicationId))
    .orderBy(asc(applicationDocuments.code), desc(applicationDocuments.versionNo))
  const latest = new Map<string, (typeof rows)[number]>()
  for (const r of rows) if (!latest.has(r.d.code)) latest.set(r.d.code, r)
  return { latest, all: rows }
}

/** What still blocks submitting (empty = ready). */
export async function submitProblems(db: Db, a: Application) {
  const c = (await loadCycle(db, a.cycleId))!
  const [path] = await db.select().from(admissionPaths).where(eq(admissionPaths.id, a.pathId))
  const out: string[] = []
  for (const def of fieldsFor(c.requireNik)) {
    const r = checkAppField(def, a.data[def.key])
    if (r.error) out.push(r.error)
  }
  for (const q of c.formFields) {
    const r = checkCustom(q, a.answers[q.key])
    if (r.error) out.push(r.error)
  }
  const { latest } = await currentDocuments(db, a.id)
  for (const d of path!.documents.filter((x) => x.required)) {
    const cur = latest.get(d.code)
    if (!cur) out.push(`Berkas ${d.label} belum diunggah.`)
    else if (cur.d.state === 'revision_required' || cur.d.state === 'rejected') out.push(`Berkas ${d.label} perlu diganti.`)
  }
  return out
}

export async function submitApplication(ctx: Ctx, id: string, o: { confirm: boolean; key?: string | null }) {
  if (!o.confirm) fail('Centang pernyataan kebenaran data untuk mengirim.')
  return command(ctx, 'admissions.submit', { key: o.key, input: id }, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    const who = ownerOrAssist(ctx, a!)
    if (a!.status !== 'draft' && a!.status !== 'needs_revision') fail('Pendaftaran ini sudah dikirim.')
    if (who === 'owner') {
      const [acc] = await tx.select().from(accounts).where(eq(accounts.id, a!.ownerAccountId))
      if (!acc!.emailVerifiedAt) fail('Verifikasi email akun Anda terlebih dahulu (cek kotak masuk), lalu kirim pendaftaran.')
    }
    const problems = await submitProblems(tx, a!)
    if (problems.length) fail(`Belum dapat dikirim: ${problems.slice(0, 6).join(' ')}${problems.length > 6 ? ' …' : ''}`)
    const d = (await cycleDetail(tx, a!.cycleId))!
    const snapshot = { data: a!.data, answers: a!.answers, formVersion: d.cycle.formVersion, pathId: a!.pathId, at: ctx.now.toISOString() }
    if (a!.status === 'needs_revision') {
      if (a!.revisionDue && ctx.now > a!.revisionDue && who === 'owner') fail('Batas waktu perbaikan sudah lewat. Hubungi panitia.')
      await tx.update(applications).set({ status: 'resubmitted', resubmittedAt: ctx.now, snapshot, version: sql`${applications.version} + 1` }).where(eq(applications.id, id))
      fx.audit('admissions.resubmit', 'application', id)
      if (a!.verifierId) fx.notify({ type: 'staff', id: a!.verifierId }, { title: `Perbaikan pendaftaran ${a!.registrationNo} sudah dikirim`, link: `/portal/staf/ppdb/pendaftar/${id}` })
      return { registrationNo: a!.registrationNo, resubmitted: true }
    }
    // submission time is the server's; the window is checked at commit (assisted entries may be late with a reason)
    const acc = acceptsApplications(d.cycle, d.waves, ctx.now)
    if (!acc.ok && who === 'owner') fail(acc.why)
    const n = await nextNumber(tx, `ppdb:${a!.cycleId}`)
    const registrationNo = `${d.cycle.code}-${String(n).padStart(4, '0')}`
    // possible duplicate (same child name + birth date in this cycle) is flagged for review, never auto-rejected
    const [dup] = await tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.cycleId, a!.cycleId),
          ne(applications.id, id),
          inArray(applications.status, ['submitted', 'under_verification', 'needs_revision', 'resubmitted', 'verified']),
          sql`lower(${applications.data}->>'fullName') = lower(${a!.data.fullName ?? ''})`,
          sql`${applications.data}->>'birthDate' = ${a!.data.birthDate ?? ''}`,
        ),
      )
      .limit(1)
    await tx
      .update(applications)
      .set({ status: 'submitted', submittedAt: ctx.now, registrationNo, snapshot, formVersion: d.cycle.formVersion, waveId: acc.ok ? (acc.wave?.id ?? a!.waveId) : a!.waveId, duplicateOf: dup?.id ?? null, version: sql`${applications.version} + 1` })
      .where(eq(applications.id, id))
    const path = d.paths.find((p) => p.id === a!.pathId)!
    if (path.registrationFee > 0)
      await createInvoice(tx, ctx, { category: 'pendaftaran', title: `Biaya pendaftaran ${registrationNo}`, items: [{ label: `Pendaftaran ${d.cycle.name} — ${path.name}`, amount: path.registrationFee }], applicationId: id, accountId: a!.ownerAccountId })
    fx.audit('admissions.submit', 'application', id, { registrationNo, duplicate: Boolean(dup) })
    fx.event('admission.application_submitted', { applicationId: id, cycleId: a!.cycleId })
    const [acct] = await tx.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, a!.ownerAccountId))
    fx.notify(
      { type: 'account', id: a!.ownerAccountId },
      { title: `Pendaftaran ${registrationNo} diterima`, body: `Pendaftaran ${a!.data.fullName} sudah terkirim dan akan diperiksa panitia.${path.registrationFee > 0 ? ' Selesaikan pembayaran biaya pendaftaran.' : ''}`, link: `/portal/keluarga/penerimaan/${id}`, email: acct?.email },
    )
    return { registrationNo, resubmitted: false }
  })
}

export async function withdrawApplication(ctx: Ctx, id: string, reason: string) {
  if (reason.trim().length < 3) fail('Tuliskan alasan penarikan.')
  await command(ctx, 'admissions.withdraw', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    ownerOrAssist(ctx, a!)
    if (['withdrawn', 'rejected'].includes(a!.status)) fail('Pendaftaran ini sudah berakhir.')
    const [mapped] = await tx.execute(sql`SELECT 1 FROM applicant_student_mappings WHERE application_id = ${id}`).then((r) => r.rows)
    if (mapped) fail('Pendaftar sudah menjadi siswa; gunakan proses mutasi/keluar siswa.')
    await tx.update(applications).set({ status: 'withdrawn', withdrawnAt: ctx.now, rejectReason: reason.trim(), version: sql`${applications.version} + 1` }).where(eq(applications.id, id))
    await tx.update(seatReservations).set({ state: 'released', updatedAt: ctx.now }).where(and(eq(seatReservations.applicationId, id), inArray(seatReservations.state, ['reserved', 'confirmed'])))
    await tx.update(reenrollments).set({ status: 'cancelled' }).where(and(eq(reenrollments.applicationId, id), inArray(reenrollments.status, ['in_progress', 'needs_revision', 'submitted'])))
    fx.audit('admissions.withdraw', 'application', id)
  })
}

/** Result visible to the family: latest non-superseded decision whose batch is released and whose release time passed. */
export async function releasedDecision(db: Db, applicationId: string, now: Date) {
  const [d] = await db
    .select({ v: decisionVersions, b: decisionBatches })
    .from(decisionVersions)
    .innerJoin(decisionBatches, eq(decisionBatches.id, decisionVersions.batchId))
    .where(and(eq(decisionVersions.applicationId, applicationId), eq(decisionVersions.superseded, false), eq(decisionBatches.status, 'released'), sql`coalesce(${decisionBatches.releaseAt}, ${decisionBatches.releasedAt}) <= ${now}`))
    .orderBy(desc(decisionVersions.versionNo))
    .limit(1)
  return d ?? null
}

/** Everything the family (or staff) sees about one application. Internal notes and scores are not included. */
export async function applicationView(ctx: Ctx, id: string) {
  const a = await loadApplication(ctx.db, id)
  if (!a) notFound('Pendaftaran')
  await assertCanSee(ctx, a!)
  const d = (await cycleDetail(ctx.db, a!.cycleId))!
  const path = d.paths.find((p) => p.id === a!.pathId)!
  const docs = await currentDocuments(ctx.db, id)
  const sessions = await ctx.db
    .select({ p: sessionParticipants, s: selectionSessions })
    .from(sessionParticipants)
    .innerJoin(selectionSessions, eq(selectionSessions.id, sessionParticipants.sessionId))
    .where(and(eq(sessionParticipants.applicationId, id), ne(sessionParticipants.state, 'cancelled')))
    .orderBy(asc(selectionSessions.startsAt))
  const decision = await releasedDecision(ctx.db, id, ctx.now)
  const [reservation] = await ctx.db.select().from(seatReservations).where(eq(seatReservations.applicationId, id)).orderBy(desc(seatReservations.updatedAt)).limit(1)
  const [reenroll] = await ctx.db.select().from(reenrollments).where(eq(reenrollments.applicationId, id))
  const bills = await invoicesFor(ctx, { applicationId: id })
  const problems = a!.status === 'draft' || a!.status === 'needs_revision' ? await submitProblems(ctx.db, a!) : []
  const waves = await ctx.db.select().from(admissionWaves).where(eq(admissionWaves.cycleId, a!.cycleId))
  return { app: a!, cycle: d.cycle, path, waves, docs, sessions, decision, reservation: reservation ?? null, reenroll: reenroll ?? null, bills, problems, editable: editableNow(a!) }
}

/** Steps for the applicant dashboard (ADM-01): Daftar → Berkas → Seleksi → Hasil → Daftar ulang. */
export function progressOf(v: Awaited<ReturnType<typeof applicationView>>) {
  const s = v.app.status
  if (s === 'draft') return 0
  if (['submitted', 'under_verification', 'needs_revision', 'resubmitted'].includes(s)) return 1
  if (s === 'verified' && !v.decision) return v.cycle.selectionEnabled ? 2 : 3
  if (v.decision && !v.reenroll) return 3
  if (v.reenroll && v.reenroll.status !== 'verified') return 4
  if (v.reenroll?.status === 'verified') return 5
  return 1
}
