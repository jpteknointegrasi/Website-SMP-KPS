/**
 * PPDB-01..07: the full admission chain on a real database — cycle approval by someone else, application with
 * documents and fee, verification, selection with locked scores, decision approval within quota (concurrent
 * approvals cannot overbook), release visibility, offer, re-enrolment with verified payment, idempotent conversion.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { applicationDocuments, guardianLinks, invoices, payments, seatReservations, students } from '@/db/schema'
import * as cfg from '@/modules/admissions/config'
import * as apply from '@/modules/admissions/apply'
import * as review from '@/modules/admissions/review'
import * as sel from '@/modules/admissions/selection'
import * as dec from '@/modules/admissions/decisions'
import * as re from '@/modules/admissions/reenroll'
import * as fin from '@/modules/finance/service'
import * as academic from '@/modules/academic/service'
import { signIn, signUp, verifyEmail } from '@/modules/identity/service'
import { linkedChildren } from '@/modules/scope'
import { processOutbox } from '@/server/outbox'
import { mailLog } from '@/db/schema'
import { accountFromToken, ctxAccount, ctxAnon, ctxStaff, harness, pdf, png, staff, type School } from './helpers'
import type { AccountActor } from '@/server/context'
import { runScheduled } from '@/modules/jobs'

const h = harness('t2')
let A: School
let manager: Awaited<ReturnType<typeof staff>>, approver: Awaited<ReturnType<typeof staff>>, verifier: Awaited<ReturnType<typeof staff>>, assessor: Awaited<ReturnType<typeof staff>>
let publisher: Awaited<ReturnType<typeof staff>>, finance: Awaited<ReturnType<typeof staff>>, operator: Awaited<ReturnType<typeof staff>>
let cycleId = ''
let pathId = ''

async function family(email: string): Promise<AccountActor> {
  await signUp(ctxAnon(A), { name: `Orang Tua ${email}`, email, password: 'rahasia-keluarga-01' })
  await processOutbox(A.db, A.school)
  const mails = await A.db.select().from(mailLog).where(eq(mailLog.to, email))
  await verifyEmail(ctxAnon(A), /[?&]t=([A-Za-z0-9_-]+)/.exec(mails[0]!.body!)![1]!)
  const { token } = await signIn(ctxAnon(A), { login: email, password: 'rahasia-keluarga-01' })
  return (await accountFromToken(A, token))!
}

async function fullApplication(acc: AccountActor, child: string) {
  const id = await apply.startApplication(ctxAccount(A, acc), { cycleId, pathId, childName: child })
  await apply.saveApplicationData(
    ctxAccount(A, acc),
    id,
    { fullName: child, gender: 'P', birthPlace: 'Balikpapan', birthDate: '2014-05-05', religion: 'Islam', address: 'Jl. Contoh', originSchool: 'SD Contoh', guardianName: 'Ibu', guardianRelation: 'ibu', guardianPhone: '081234567890' },
    null,
  )
  await apply.uploadApplicationDocument(ctxAccount(A, acc), id, 'pasfoto', png())
  for (const c of ['akta', 'kk']) await apply.uploadApplicationDocument(ctxAccount(A, acc), id, c, pdf())
  return id
}

beforeAll(async () => {
  A = await h.school('ppdb')
  manager = await staff(A, ['panitia_pengelola'])
  approver = await staff(A, ['panitia_penyetuju'])
  verifier = await staff(A, ['panitia_verifikator'])
  assessor = await staff(A, ['panitia_penilai'])
  publisher = await staff(A, ['panitia_publikasi'])
  finance = await staff(A, ['keuangan'])
  operator = await staff(A, ['operator_siswa'])
  const kur = await staff(A, ['kurikulum'])
  const y = await academic.saveYear(ctxStaff(A, kur), { name: '2027/2028', startDate: '2027-07-12', endDate: '2028-06-24' })
  await academic.saveGradeLevel(ctxStaff(A, kur), { name: 'VII', ordinal: 7, final: false })
  void y
})
afterAll(() => h.cleanup())

describe('PPDB-01 periode', () => {
  it('disiapkan pengelola, disetujui orang lain, dibuka; satu jalur resmi per tahun/tingkat', async () => {
    const m = ctxStaff(A, manager)
    cycleId = await cfg.createCycle(m, { code: 'PPDB27', name: 'PPDB 2027/2028', targetYear: '2027/2028', targetGrade: 'VII' })
    const d = (await cfg.cycleDetail(A.db, cycleId))!
    pathId = d.paths[0]!.id
    await cfg.savePath(m, cycleId, { id: pathId, name: 'Reguler', description: null, quota: 2, registrationFee: 150000, reenrollFee: 500000, documents: cfg.DEFAULT_DOCUMENTS, components: cfg.DEFAULT_COMPONENTS, checklist: cfg.DEFAULT_CHECKLIST, active: true })
    await expect(cfg.setCycleStatus(m, cycleId, 'ready_for_review', null)).rejects.toThrow(/waktu buka/)
    await cfg.updateCycle(m, cycleId, { name: 'PPDB 2027/2028', openAt: new Date(Date.now() - 3600_000), closeAt: new Date(Date.now() + 30 * 86400_000), selectionEnabled: true, offerDays: 7, reenrollDays: 14, requireNik: false, info: 'Info', dataNotice: null, helpContact: null }, null)
    await cfg.setCycleStatus(m, cycleId, 'ready_for_review', null)
    await expect(cfg.setCycleStatus(ctxStaff(A, await staff(A, ['panitia_pengelola', 'panitia_penyetuju'])), cycleId, 'approved', null)).resolves.toBeUndefined()
    await cfg.setCycleStatus(ctxStaff(A, approver), cycleId, 'open', null)
    const other = await cfg.createCycle(m, { code: 'PPDB27B', name: 'Duplikat', targetYear: '2027/2028', targetGrade: 'VII' })
    await A.db.execute(`UPDATE admission_cycles SET status = 'approved', open_at = now(), close_at = now() + interval '1 day' WHERE id = '${other}'`)
    await expect(cfg.setCycleStatus(ctxStaff(A, approver), other, 'open', null)).rejects.toThrow(/Sudah ada periode terbuka/)
    expect((await cfg.publicSummary(A.db, new Date())).find((c) => c.id === cycleId)?.status).toBe('open')
  })
})

let fam1: AccountActor, fam2: AccountActor, fam3: AccountActor
let app1 = '', app2 = '', app3 = ''

describe('PPDB-02 pendaftaran & verifikasi', () => {
  it('draf → kirim (nomor resmi sekali, tagihan) → perbaikan terbatas → verifikasi setelah lunas', async () => {
    fam1 = await family('ortu1@contoh.test')
    app1 = await fullApplication(fam1, 'Alya Putri')
    await expect(apply.startApplication(ctxAccount(A, fam1), { cycleId, pathId, childName: 'alya putri' })).rejects.toThrow(/sudah punya pendaftaran/)
    const r = await apply.submitApplication(ctxAccount(A, fam1), app1, { confirm: true, key: 'kirim-0001-xx' })
    expect(r.registrationNo).toBe('PPDB27-0001')
    expect((await apply.submitApplication(ctxAccount(A, fam1), app1, { confirm: true, key: 'kirim-0001-xx' })).registrationNo).toBe('PPDB27-0001')
    await expect(apply.saveApplicationData(ctxAccount(A, fam1), app1, { address: 'Ubah' }, null)).rejects.toThrow(/tidak dapat diubah/)
    // another family cannot read it
    fam2 = await family('ortu2@contoh.test')
    await expect(apply.applicationView(ctxAccount(A, fam2), app1)).rejects.toMatchObject({ code: 'forbidden' })

    const v = ctxStaff(A, verifier)
    await review.startReview(v, app1)
    const docs = await A.db.select().from(applicationDocuments).where(eq(applicationDocuments.applicationId, app1))
    await review.reviewDocument(v, docs.find((d) => d.code === 'kk')!.id, 'revision_required', 'Foto KK buram')
    await review.requestRevision(v, app1, { fields: ['address'], docs: ['kk'], note: 'Perbaiki alamat & KK', due: new Date(Date.now() + 86400_000) }, null)
    await expect(apply.saveApplicationData(ctxAccount(A, fam1), app1, { birthPlace: 'Jakarta', address: 'Jl. Baru 1' }, null)).resolves.toBeUndefined()
    const view = await apply.applicationView(ctxAccount(A, fam1), app1)
    expect(view.app.data.birthPlace).toBe('Balikpapan') // not opened → unchanged
    expect(view.app.data.address).toBe('Jl. Baru 1')
    await expect(apply.uploadApplicationDocument(ctxAccount(A, fam1), app1, 'akta', pdf())).rejects.toThrow(/tidak sedang dibuka/)
    await apply.uploadApplicationDocument(ctxAccount(A, fam1), app1, 'kk', pdf())
    await apply.submitApplication(ctxAccount(A, fam1), app1, { confirm: true })
    await review.startReview(v, app1)
    const { latest } = await apply.currentDocuments(A.db, app1)
    for (const [, x] of latest) await review.reviewDocument(v, x.d.id, 'verified', null)
    await expect(review.verifyApplication(v, app1, null)).rejects.toThrow(/Biaya pendaftaran/)
    // payment: proof is not payment; finance verifies
    const [inv] = await A.db.select().from(invoices).where(eq(invoices.applicationId, app1))
    const pay = await fin.submitPayment(ctxAccount(A, fam1), inv!.id, { amount: 150000, method: 'transfer', paidOn: '2026-10-27', payerName: 'Ibu', proof: pdf() })
    await expect(review.verifyApplication(v, app1, null)).rejects.toThrow(/Biaya pendaftaran/)
    await fin.verifyPayment(ctxStaff(A, finance), pay, 'TRX-1')
    await review.verifyApplication(v, app1, null)
    expect((await apply.loadApplication(A.db, app1))!.status).toBe('verified')
  })

  it('pendaftar lain (untuk kuota & seleksi)', async () => {
    fam3 = await family('ortu3@contoh.test')
    app2 = await fullApplication(fam2, 'Bima Pratama')
    app3 = await fullApplication(fam3, 'Citra Lestari')
    for (const [fam, id] of [[fam2, app2], [fam3, app3]] as const) {
      await apply.submitApplication(ctxAccount(A, fam), id, { confirm: true })
      await review.startReview(ctxStaff(A, verifier), id)
      for (const [, x] of (await apply.currentDocuments(A.db, id)).latest) await review.reviewDocument(ctxStaff(A, verifier), x.d.id, 'verified', null)
      const [inv] = await A.db.select().from(invoices).where(eq(invoices.applicationId, id))
      await fin.closeInvoice(ctxStaff(A, await staff(A, ['keuangan'])), inv!.id, 'waived', 'Keringanan uji')
      await review.verifyApplication(ctxStaff(A, verifier), id, null)
    }
  })
})

describe('PPDB-03 seleksi', () => {
  it('penilai hanya sesi yang ditugaskan; nilai terkunci tidak bisa ditimpa', async () => {
    const m = ctxStaff(A, manager)
    const sid = await sel.createSession(m, { cycleId, pathId: null, title: 'Tes & wawancara', kind: 'tes', startsAt: new Date(Date.now() + 86400_000), endsAt: new Date(Date.now() + 90000_000), location: 'Aula', capacity: 3, instructions: null, assessors: [assessor.id] })
    expect(await sel.addParticipants(m, sid, [app1, app2, app3])).toBe(3)
    const other = await staff(A, ['panitia_penilai'])
    await expect(sel.sessionSheet(ctxStaff(A, other), sid)).rejects.toMatchObject({ code: 'forbidden' })
    const sheet = await sel.sessionSheet(ctxStaff(A, assessor), sid)
    for (const p of sheet.people) await sel.setParticipantState(ctxStaff(A, assessor), p.p.id, 'attended', null)
    const scores: Record<string, [number, number]> = { [app1]: [90, 80], [app2]: [70, 60], [app3]: [85, 90] }
    for (const [app, [t, w]] of Object.entries(scores)) {
      await sel.enterScore(ctxStaff(A, assessor), { applicationId: app, sessionId: sid, component: 'tes', score: t, note: 'internal', submit: true })
      await sel.enterScore(ctxStaff(A, assessor), { applicationId: app, sessionId: sid, component: 'wawancara', score: w, note: null, submit: true })
    }
    await expect(sel.enterScore(ctxStaff(A, assessor), { applicationId: app1, sessionId: sid, component: 'tes', score: 101, note: null, submit: true })).rejects.toThrow(/0–100/)
    expect(await sel.lockSessionScores(m, sid)).toBe(6)
    await expect(sel.enterScore(ctxStaff(A, assessor), { applicationId: app1, sessionId: sid, component: 'tes', score: 10, note: null, submit: true })).rejects.toThrow(/dikunci/)
    const sum = await sel.scoreSummary(A.db, [app1, app3])
    expect(sum.get(app1)!.total).toBe(86) // 90*.6 + 80*.4
    expect(sum.get(app3)!.total).toBe(87)
  })
})

describe('PPDB-04 keputusan, kuota & rilis', () => {
  it('kuota tidak terlampaui walau dua persetujuan bersamaan; hasil tak terlihat sebelum rilis', async () => {
    const m = ctxStaff(A, manager)
    const cands = await dec.decisionCandidates(m, cycleId)
    expect(cands.map((c) => c.a.id)).toEqual([app3, app1, app2])
    // two proposals that together offer 3 seats on a quota of 2
    const b1 = await dec.proposeBatch(m, { cycleId, title: 'Gel. 1 A', instructions: 'Konfirmasi dalam 7 hari', releaseAt: null, entries: [{ applicationId: app3, outcome: 'offered', reasonCode: null, internalNote: null }, { applicationId: app1, outcome: 'offered', reasonCode: null, internalNote: null }] })
    const b2 = await dec.proposeBatch(m, { cycleId, title: 'Gel. 1 B', instructions: null, releaseAt: null, entries: [{ applicationId: app2, outcome: 'offered', reasonCode: null, internalNote: null }] })
    await dec.submitBatch(m, b1)
    await dec.submitBatch(m, b2)
    await expect(dec.approveBatch(ctxStaff(A, manager), b1, null)).rejects.toMatchObject({ code: 'forbidden' })
    const results = await Promise.allSettled([dec.approveBatch(ctxStaff(A, approver), b1, null), dec.approveBatch(ctxStaff(A, approver), b2, null)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const seats = await A.db.select().from(seatReservations)
    expect(seats.filter((s) => s.state === 'reserved').length).toBeLessThanOrEqual(2)
    const approved = results[0].status === 'fulfilled' ? b1 : b2
    if (approved !== b1) {
      await dec.cancelBatch(m, b2, 'Uji ulang urutan')
      await dec.approveBatch(ctxStaff(A, approver), b1, null)
    } else await dec.cancelBatch(m, b2, 'Kuota penuh')
    // before release nothing is visible to the family
    expect((await apply.applicationView(ctxAccount(A, fam1), app1)).decision).toBeNull()
    await expect(dec.releaseBatch(ctxStaff(A, approver), b1, null)).rejects.toMatchObject({ code: 'forbidden' })
    const future = new Date(Date.now() + 3600_000)
    await dec.releaseBatch(ctxStaff(A, publisher), b1, future)
    expect((await apply.applicationView(ctxAccount(A, fam1), app1)).decision).toBeNull()
    const later = new Date(Date.now() + 7200_000)
    expect((await apply.applicationView(ctxAccount(A, fam1, later), app1)).decision?.v.outcome).toBe('offered')
    // waitlist for app2 in a new batch
    const b3 = await dec.proposeBatch(m, { cycleId, title: 'Cadangan', instructions: null, releaseAt: null, entries: [{ applicationId: app2, outcome: 'waitlisted', reasonCode: 'kuota', internalNote: null }] })
    await dec.submitBatch(m, b3)
    await dec.approveBatch(ctxStaff(A, approver), b3, null)
    await dec.releaseBatch(ctxStaff(A, publisher), b3, null)
    expect((await apply.applicationView(ctxAccount(A, fam2), app2)).decision?.v.outcome).toBe('waitlisted')
    // scheduled job notifies b1 when due
    const n = await runScheduled(A.db, A.school, later)
    expect(n.admissions).toBeGreaterThanOrEqual(1)
  })
})

describe('PPDB-05 penawaran & daftar ulang', () => {
  it('konfirmasi → checklist; bayar lewat verifikasi keuangan; disahkan petugas', async () => {
    const later = new Date(Date.now() + 7200_000)
    await expect(dec.respondToOffer(ctxAccount(A, fam2, later), app2, true, null)).rejects.toThrow(/Tidak ada penawaran/)
    await dec.respondToOffer(ctxAccount(A, fam1, later), app1, true, null)
    const v = await apply.applicationView(ctxAccount(A, fam1, later), app1)
    expect(v.reenroll?.checklist.find((i) => i.code === 'pembayaran')?.state).toBe('pending')
    await re.completeItem(ctxAccount(A, fam1), app1, 'surat_pernyataan', pdf())
    await re.completeItem(ctxAccount(A, fam1), app1, 'skl', pdf())
    await re.submitReenrollment(ctxAccount(A, fam1), app1)
    const o = ctxStaff(A, operator)
    for (const code of ['konfirmasi', 'surat_pernyataan', 'skl', 'validasi_data']) await re.reviewItem(o, app1, code, 'verified', null)
    await expect(re.reviewItem(o, app1, 'pembayaran', 'verified', null)).rejects.toThrow(/verifikasi keuangan/)
    await expect(re.verifyReenrollment(o, app1, null)).rejects.toThrow(/Pembayaran daftar ulang/)
    const [inv] = await A.db.select().from(invoices).where(eq(invoices.category, 'daftar_ulang'))
    const pay = await fin.submitPayment(ctxAccount(A, fam1), inv!.id, { amount: 500000, method: 'transfer', paidOn: '2026-10-28', payerName: null, proof: pdf() })
    await fin.verifyPayment(ctxStaff(A, finance), pay, null)
    const [p] = await A.db.select().from(payments).where(eq(payments.id, pay))
    expect(p!.receiptNo).toMatch(/^KWT-/)
    await re.verifyReenrollment(o, app1, null)
    // declining: app3 declines → seat released
    await dec.respondToOffer(ctxAccount(A, fam3, later), app3, false, 'Pindah kota')
    const seats = await A.db.select().from(seatReservations).where(eq(seatReservations.applicationId, app3))
    expect(seats[0]!.state).toBe('released')
  })
})

describe('PPDB-06 konversi menjadi siswa', () => {
  it('idempoten: diulang tidak membuat siswa kedua; wali terhubung; berkas pindah', async () => {
    const o = ctxStaff(A, operator)
    expect(await re.conversionCandidates(o, app1)).toHaveLength(0)
    const r1 = await re.convertToStudent(o, app1, { mode: 'new', nis: '27001', key: 'konversi-app1' })
    const r2 = await re.convertToStudent(ctxStaff(A, operator), app1, { mode: 'new', nis: '27001' })
    expect(r2.studentId).toBe(r1.studentId)
    expect(r2.repeated).toBe(true)
    expect(await A.db.select().from(students)).toHaveLength(1)
    const links = await A.db.select().from(guardianLinks).where(eq(guardianLinks.studentId, r1.studentId))
    expect(links[0]!.verificationMethod).toBe('admission')
    expect((await linkedChildren(ctxAccount(A, fam1))).map((c) => c.name)).toEqual(['Alya Putri'])
    await expect(re.convertToStudent(o, app2, { mode: 'new' })).rejects.toThrow(/Daftar ulang belum disahkan/)
  })
})

describe('PPDB-07 kedaluwarsa penawaran', () => {
  it('penawaran tidak dijawab sampai batas waktu → kedaluwarsa dan kursi lepas', async () => {
    const m = ctxStaff(A, manager)
    const b = await dec.proposeBatch(m, { cycleId, title: 'Promosi cadangan', instructions: null, releaseAt: null, entries: [{ applicationId: app2, outcome: 'offered', reasonCode: 'promosi', internalNote: null }] })
    await dec.submitBatch(m, b)
    await dec.approveBatch(ctxStaff(A, approver), b, null)
    await dec.releaseBatch(ctxStaff(A, publisher), b, null)
    expect((await apply.applicationView(ctxAccount(A, fam2), app2)).decision?.v.outcome).toBe('offered')
    await runScheduled(A.db, A.school, new Date(Date.now() + 8 * 86400_000))
    const seats = await A.db.select().from(seatReservations).where(eq(seatReservations.applicationId, app2))
    expect(seats.map((s) => s.state).sort()).toEqual(['expired', 'released'])
    await expect(dec.respondToOffer(ctxAccount(A, fam2, new Date(Date.now() + 9 * 86400_000)), app2, true, null)).rejects.toThrow(/tidak berlaku|Batas waktu/)
  })
})
