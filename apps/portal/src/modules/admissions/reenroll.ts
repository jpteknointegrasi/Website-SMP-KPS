/**
 * Re-enrolment (§19.8) and conversion into a student (§19.9, §47.4). Payment items are settled only by verified
 * payments (invoice paid/waived) — never by uploading a transfer slip. Conversion is idempotent per application:
 * a retry returns the same student; one application maps to at most one student.
 */
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import {
  academicYears,
  accounts,
  admissionPaths,
  applicantStudentMappings,
  applications,
  conversionOps,
  enrollments,
  files,
  gradeLevels,
  guardianLinks,
  guardians,
  homerooms,
  persons,
  reenrollments,
  seatReservations,
  studentDocuments,
  students,
  type ChecklistItem,
} from '@/db/schema'
import { hasPerm, requireAccount, requireStaff, type Ctx } from '@/server/context'
import { command, expectVersion, type Db } from '@/server/command'
import { fail, notFound } from '@/server/errors'
import { DOCS, fileAccess, readFile, saveFile } from '@/server/files'
import { today } from '@/server/time'
import { loadApplication, currentDocuments } from './apply'
import { loadCycle } from './config'
import { onInvoicePaid } from '../finance/service'
import { placeInHomeroom } from '../students/service'

fileAccess('reenroll_document', async (ctx, f) => {
  if (hasPerm(ctx, 'admissions.reenroll', 'admissions.convert', 'admissions.manage')) return true
  if (!ctx.account || !f.contextId) return false
  const a = await loadApplication(ctx.db, f.contextId)
  return Boolean(a && a.ownerAccountId === ctx.account.id)
})

/** Paid/waived re-enrolment invoice ticks the payment item (same transaction as the payment verification). */
onInvoicePaid(async (tx, inv, _ctx, fx) => {
  if (inv.category !== 'daftar_ulang' || !inv.applicationId) return
  const [r] = await tx.select().from(reenrollments).where(eq(reenrollments.applicationId, inv.applicationId)).for('update')
  if (!r) return
  const checklist = r.checklist.map((i) => (i.kind === 'payment' ? { ...i, state: 'verified' as const, note: inv.status === 'waived' ? 'Dibebaskan' : `Lunas (${inv.number})` } : i))
  await tx.update(reenrollments).set({ checklist, version: sql`${reenrollments.version} + 1` }).where(eq(reenrollments.id, r.id))
  fx.audit('admissions.reenroll_payment', 'application', inv.applicationId)
})

async function loadRe(tx: Db, applicationId: string) {
  const [r] = await tx.select().from(reenrollments).where(eq(reenrollments.applicationId, applicationId)).for('update')
  return r ?? null
}

/** Family: upload a document item or tick a confirmation item. */
export async function completeItem(ctx: Ctx, applicationId: string, code: string, up: { name: string; buffer: Buffer } | null) {
  const acc = requireAccount(ctx)
  await command(ctx, 'admissions.reenroll_item', {}, async (tx, fx) => {
    const a = await loadApplication(tx, applicationId)
    if (!a || a.ownerAccountId !== acc.id) notFound('Pendaftaran')
    const r = await loadRe(tx, applicationId)
    if (!r || !['in_progress', 'needs_revision'].includes(r.status)) fail('Daftar ulang tidak sedang dibuka.')
    const item = r!.checklist.find((i) => i.code === code)
    if (!item || (item.kind !== 'document' && item.kind !== 'confirm')) fail('Butir ini diisi oleh sekolah.')
    let fileId: string | null = item!.fileId ?? null
    if (item!.kind === 'document') {
      if (!up) fail('Pilih berkas.')
      fileId = (await saveFile(ctx, tx, up!, { allow: DOCS, maxMb: 5, classification: 'restricted', contextType: 'reenroll_document', contextId: applicationId, label: item!.label })).id
    }
    const checklist = r!.checklist.map((i) => (i.code === code ? { ...i, state: 'done' as const, fileId, note: null } : i))
    await tx.update(reenrollments).set({ checklist, version: sql`${reenrollments.version} + 1` }).where(eq(reenrollments.id, r!.id))
    fx.audit('admissions.reenroll_item', 'application', applicationId, { code })
  })
}

export async function submitReenrollment(ctx: Ctx, applicationId: string) {
  const acc = requireAccount(ctx)
  await command(ctx, 'admissions.reenroll_submit', {}, async (tx, fx) => {
    const a = await loadApplication(tx, applicationId)
    if (!a || a.ownerAccountId !== acc.id) notFound('Pendaftaran')
    const r = await loadRe(tx, applicationId)
    if (!r || !['in_progress', 'needs_revision'].includes(r.status)) fail('Daftar ulang tidak sedang dibuka.')
    const missing = r!.checklist.filter((i) => (i.kind === 'document' || i.kind === 'confirm') && !['done', 'verified', 'waived'].includes(i.state))
    if (missing.length) fail(`Lengkapi dulu: ${missing.map((i) => i.label).join(', ')}.`)
    await tx.update(reenrollments).set({ status: 'submitted', submittedAt: ctx.now, version: sql`${reenrollments.version} + 1` }).where(eq(reenrollments.id, r!.id))
    fx.audit('admissions.reenroll_submit', 'application', applicationId)
  })
}

/** Officer checks one item: verified / rejected (needs correction) / waived (exception with note). */
export async function reviewItem(ctx: Ctx, applicationId: string, code: string, state: 'verified' | 'rejected' | 'waived', note: string | null) {
  requireStaff(ctx, 'admissions.reenroll')
  if (state !== 'verified' && !note?.trim()) fail('Tuliskan keterangan.')
  await command(ctx, 'admissions.reenroll_review_item', {}, async (tx, fx) => {
    const r = await loadRe(tx, applicationId)
    if (!r || !['in_progress', 'needs_revision', 'submitted'].includes(r.status)) fail('Daftar ulang tidak dalam pemeriksaan.')
    const item = r!.checklist.find((i) => i.code === code)
    if (!item) notFound('Butir')
    if (item!.kind === 'payment' && state === 'verified') fail('Pembayaran disahkan lewat verifikasi keuangan, bukan di sini.')
    if (item!.kind === 'payment' && state === 'waived' && !hasPerm(ctx, 'finance.manage')) fail('Pembebasan biaya hanya oleh bagian keuangan.')
    const checklist = r!.checklist.map((i) => (i.code === code ? { ...i, state, note: note?.trim() || null } : i))
    const status = state === 'rejected' ? 'needs_revision' : r!.status
    await tx.update(reenrollments).set({ checklist, status, version: sql`${reenrollments.version} + 1` }).where(eq(reenrollments.id, r!.id))
    fx.audit('admissions.reenroll_review_item', 'application', applicationId, { code, state })
    if (state === 'rejected') {
      const a = (await loadApplication(tx, applicationId))!
      fx.notify({ type: 'account', id: a.ownerAccountId }, { title: `Daftar ulang ${a.registrationNo} perlu dilengkapi`, link: `/portal/keluarga/penerimaan/${applicationId}` })
    }
  })
}

/** Officer approves the whole re-enrolment: every item verified or waived. */
export async function verifyReenrollment(ctx: Ctx, applicationId: string, version: string | null) {
  const s = requireStaff(ctx, 'admissions.reenroll')
  await command(ctx, 'admissions.reenroll_verify', {}, async (tx, fx) => {
    const r = await loadRe(tx, applicationId)
    if (!r || !['submitted', 'in_progress', 'needs_revision'].includes(r.status)) fail('Daftar ulang tidak dapat disahkan.')
    expectVersion(r!.version, version)
    const open = r!.checklist.filter((i) => !['verified', 'waived'].includes(i.state))
    if (open.length) fail(`Belum disahkan: ${open.map((i) => i.label).join(', ')}.`)
    const [seat] = await tx.select().from(seatReservations).where(and(eq(seatReservations.applicationId, applicationId), eq(seatReservations.state, 'confirmed')))
    if (!seat) fail('Tempat untuk pendaftar ini tidak lagi aktif.')
    await tx.update(reenrollments).set({ status: 'verified', verifiedBy: s.id, verifiedAt: ctx.now, version: sql`${reenrollments.version} + 1` }).where(eq(reenrollments.id, r!.id))
    fx.audit('admissions.reenroll_verify', 'application', applicationId)
    fx.event('admission.reenrollment_verified', { applicationId })
    const a = (await loadApplication(tx, applicationId))!
    fx.notify({ type: 'account', id: a.ownerAccountId }, { title: `Daftar ulang ${a.registrationNo} disahkan`, body: 'Selamat bergabung! Informasi aktivasi akun siswa dan kelas akan disampaikan sekolah.', link: `/portal/keluarga/penerimaan/${applicationId}` })
  })
}

export async function extendReenrollment(ctx: Ctx, applicationId: string, due: Date, reason: string) {
  requireStaff(ctx, 'admissions.reenroll')
  if (due <= ctx.now) fail('Tenggat baru harus di masa depan.')
  if (reason.trim().length < 5) fail('Tuliskan alasan perpanjangan.')
  await command(ctx, 'admissions.reenroll_extend', {}, async (tx, fx) => {
    const r = await loadRe(tx, applicationId)
    if (!r || ['verified', 'declined', 'cancelled'].includes(r.status)) fail('Daftar ulang tidak dapat diperpanjang.')
    // an expired re-enrolment reopens only while the seat can be taken back (quota)
    if (r!.status === 'expired') {
      const a = (await loadApplication(tx, applicationId))!
      const [p] = await tx.select().from(admissionPaths).where(eq(admissionPaths.id, a.pathId)).for('update')
      const [used] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(seatReservations).where(and(eq(seatReservations.pathId, a.pathId), inArray(seatReservations.state, ['reserved', 'confirmed'])))
      if (used!.n >= p!.quota) fail('Kuota jalur sudah penuh; perpanjangan memerlukan keputusan baru.')
      await tx.update(seatReservations).set({ state: 'confirmed', updatedAt: ctx.now }).where(and(eq(seatReservations.applicationId, applicationId), eq(seatReservations.state, 'released')))
    }
    await tx.update(reenrollments).set({ dueAt: due, status: r!.status === 'expired' ? 'in_progress' : r!.status, note: reason.trim(), version: sql`${reenrollments.version} + 1` }).where(eq(reenrollments.id, r!.id))
    fx.audit('admissions.reenroll_extend', 'application', applicationId)
  })
}

export async function reenrollQueue(ctx: Ctx, cycleId: string) {
  requireStaff(ctx, 'admissions.reenroll', 'admissions.convert', 'admissions.manage')
  return ctx.db
    .select({ r: reenrollments, a: applications, name: persons.fullName, mapped: applicantStudentMappings.studentId })
    .from(reenrollments)
    .innerJoin(applications, eq(applications.id, reenrollments.applicationId))
    .innerJoin(persons, eq(persons.id, applications.applicantPersonId))
    .leftJoin(applicantStudentMappings, eq(applicantStudentMappings.applicationId, applications.id))
    .where(eq(applications.cycleId, cycleId))
    .orderBy(desc(reenrollments.createdAt))
}

// ---------- conversion ----------
/** Existing students that might be the same child (NISN, or name + birth date). Operator decides; no auto-merge. */
export async function conversionCandidates(ctx: Ctx, applicationId: string) {
  requireStaff(ctx, 'admissions.convert')
  const a = await loadApplication(ctx.db, applicationId)
  if (!a) notFound('Pendaftaran')
  const d = a!.data
  const conds = []
  if (d.nisn) conds.push(eq(students.nisn, d.nisn))
  if (d.fullName && d.birthDate) conds.push(and(ilike(persons.fullName, d.fullName), eq(persons.birthDate, d.birthDate)))
  if (!conds.length) return []
  return ctx.db
    .select({ id: students.id, name: persons.fullName, nis: students.nis, nisn: students.nisn, birthDate: persons.birthDate, status: students.status })
    .from(students)
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(or(...conds))
}

/**
 * Converts a re-enrolled applicant into a student: student (new or matched), enrolment in the target year/level,
 * optional homeroom, guardian link (the registering account, verified by admission), selected documents copied into
 * the student file, mapping kept. Idempotent: a repeated call returns the first result.
 */
export async function convertToStudent(ctx: Ctx, applicationId: string, o: { mode: 'new' | 'existing'; studentId?: string | null; homeroomId?: string | null; nis?: string | null; key?: string | null }) {
  const s = requireStaff(ctx, 'admissions.convert')
  return command(ctx, 'admissions.convert', { key: o.key, input: { applicationId, o } }, async (tx, fx) => {
    const a = await loadApplication(tx, applicationId, true)
    if (!a) notFound('Pendaftaran')
    const [done] = await tx.select().from(conversionOps).where(eq(conversionOps.applicationId, applicationId)).for('update')
    if (done?.state === 'succeeded') return { studentId: done.studentId!, repeated: true }
    const [re] = await tx.select().from(reenrollments).where(eq(reenrollments.applicationId, applicationId))
    if (re?.status !== 'verified') fail('Daftar ulang belum disahkan.')
    const c = (await loadCycle(tx, a!.cycleId))!
    const [year] = await tx.select().from(academicYears).where(eq(academicYears.name, c.targetYear))
    if (!year) fail(`Tahun ajaran ${c.targetYear} belum dibuat di Data akademik.`)
    const [level] = await tx.select().from(gradeLevels).where(eq(gradeLevels.name, c.targetGrade))
    if (!level) fail(`Tingkat ${c.targetGrade} belum dibuat di Data akademik.`)
    if (o.nis) {
      const [x] = await tx.select({ id: students.id }).from(students).where(eq(students.nis, o.nis))
      if (x && x.id !== o.studentId) fail(`NIS ${o.nis} sudah dipakai.`)
    }
    const d = a!.data
    let studentId: string
    let matched = false
    if (o.mode === 'existing') {
      if (!o.studentId) fail('Pilih data siswa yang cocok.')
      const [st] = await tx.select().from(students).where(eq(students.id, o.studentId!))
      if (!st) notFound('Siswa')
      studentId = st!.id
      matched = true
      await tx.update(students).set({ status: 'active', nis: o.nis ?? st!.nis, entryVia: st!.entryVia, updatedAt: ctx.now, updatedBy: s.id }).where(eq(students.id, st!.id))
    } else {
      // the applicant's person record becomes the student's (verified identity fields are copied onto it)
      await tx
        .update(persons)
        .set({ fullName: d.fullName, nickname: d.nickname || null, gender: d.gender || null, birthPlace: d.birthPlace || null, birthDate: d.birthDate || null, religion: d.religion || null, nik: d.nik || null, address: d.address || null, updatedAt: ctx.now })
        .where(eq(persons.id, a!.applicantPersonId))
      const [st] = await tx
        .insert(students)
        .values({ personId: a!.applicantPersonId, nis: o.nis || null, nisn: d.nisn || null, status: 'active', entryYear: Number(c.targetYear.slice(0, 4)), entryDate: year!.startDate, entryGrade: c.targetGrade, entryVia: 'admission', originSchool: d.originSchool || null, updatedBy: s.id, verifiedAt: ctx.now, verifiedBy: s.id })
        .returning({ id: students.id })
      studentId = st!.id
    }
    // enrolment in the target year (planned until that year becomes active)
    let [en] = await tx.select().from(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.yearId, year!.id), sql`${enrollments.status} <> 'ended'`))
    if (!en) [en] = await tx.insert(enrollments).values({ studentId, yearId: year!.id, gradeLevelId: level!.id, status: year!.status === 'active' ? 'active' : 'planned', startDate: year!.startDate }).returning()
    if (o.homeroomId) {
      const [h] = await tx.select().from(homerooms).where(eq(homerooms.id, o.homeroomId))
      if (!h || h.yearId !== year!.id) fail('Rombel harus dari tahun ajaran tujuan.')
      await placeInHomeroom(ctx, tx, studentId, o.homeroomId, year!.startDate > today(ctx.tz, ctx.now) ? year!.startDate : today(ctx.tz, ctx.now))
    }
    // guardian: the registering account (one account = one guardian), verified by the admission process
    const [acct] = await tx.select().from(accounts).where(eq(accounts.id, a!.ownerAccountId))
    let [g] = await tx.select().from(guardians).where(eq(guardians.accountId, acct!.id))
    if (!g) {
      await tx.update(persons).set({ phone: d.guardianPhone || null, occupation: d.guardianOccupation || null, fullName: d.guardianName || undefined }).where(eq(persons.id, acct!.personId))
      const [byPerson] = await tx.select().from(guardians).where(eq(guardians.personId, acct!.personId))
      g = byPerson ?? (await tx.insert(guardians).values({ personId: acct!.personId, accountId: acct!.id }).returning())[0]!
      if (!g.accountId) await tx.update(guardians).set({ accountId: acct!.id }).where(eq(guardians.id, g.id))
    }
    const [link] = await tx.select().from(guardianLinks).where(and(eq(guardianLinks.guardianId, g!.id), eq(guardianLinks.studentId, studentId), sql`${guardianLinks.status} <> 'revoked'`))
    if (!link)
      await tx.insert(guardianLinks).values({ guardianId: g!.id, studentId, relation: d.guardianRelation || 'wali', status: 'active', isPrimary: true, verificationMethod: 'admission', verifiedBy: s.id, verifiedAt: ctx.now, validFrom: today(ctx.tz, ctx.now) })
    // authorised administrative documents move into the student file (copies; admission records keep theirs)
    if (o.mode === 'new') {
      const { latest } = await currentDocuments(tx, applicationId)
      for (const code of ['pasfoto', 'akta', 'kk', 'skl']) {
        const cur = latest.get(code)
        if (!cur || cur.d.state !== 'verified') continue
        const body = await readFile(cur.file)
        if (!body) continue
        if (code === 'pasfoto') {
          const f = await saveFile(ctx, tx, { name: cur.file.originalName, buffer: body }, { allow: ['jpg', 'png'], maxMb: 2, classification: 'private', contextType: 'person_photo', contextId: a!.applicantPersonId, label: 'Pasfoto' })
          await tx.update(persons).set({ photoFileId: f.id }).where(eq(persons.id, a!.applicantPersonId))
        } else {
          const docId = crypto.randomUUID()
          const f = await saveFile(ctx, tx, { name: cur.file.originalName, buffer: body }, { allow: DOCS, maxMb: 5, classification: 'restricted', contextType: 'student_document', contextId: docId, label: 'Dokumen' })
          await tx.insert(studentDocuments).values({ id: docId, studentId, kind: code === 'skl' ? 'ijazah' : code, fileId: f.id, note: `Dari pendaftaran ${a!.registrationNo}`, uploadedBy: s.id })
        }
      }
    }
    await tx.insert(applicantStudentMappings).values({ applicationId, studentId, enrollmentId: en!.id, mappedBy: s.id, matched })
    if (done) await tx.update(conversionOps).set({ state: 'succeeded', studentId, attempts: done.attempts + 1 }).where(eq(conversionOps.id, done.id))
    else await tx.insert(conversionOps).values({ applicationId, state: 'succeeded', attempts: 1, studentId, by: s.id })
    fx.audit('admissions.convert', 'application', applicationId, { student: studentId, matched })
    fx.audit('students.create_from_admission', 'student', studentId, { application: a!.registrationNo })
    fx.event('admission.student_converted', { applicationId, studentId })
    fx.notify({ type: 'account', id: a!.ownerAccountId }, { title: `${d.fullName} terdaftar sebagai siswa`, body: 'Akun Anda kini terhubung sebagai orang tua/wali di portal.', link: '/portal/keluarga' })
    return { studentId, repeated: false }
  })
}

export async function reenrollDocs(db: Db, ids: string[]) {
  if (!ids.length) return []
  return db.select().from(files).where(inArray(files.id, ids))
}
export type { ChecklistItem }
