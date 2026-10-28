/**
 * LIFE-01..05: grade book & results submission, report cards (approve ≠ submitter, release, versions), BK
 * restricted notes & shared summaries, extracurricular consent & capacity, achievements & reports, promotion.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import * as academic from '@/modules/academic/service'
import * as S from '@/modules/students/service'
import * as G from '@/modules/grades/service'
import * as R from '@/modules/reports/service'
import * as BK from '@/modules/counseling/service'
import * as X from '@/modules/activities/service'
import * as K from '@/modules/affairs/service'
import * as P from '@/modules/academic/promotion'
import { signIn, signUp, verifyEmail } from '@/modules/identity/service'
import { processOutbox } from '@/server/outbox'
import { enrollments, mailLog, students } from '@/db/schema'
import { accountFromToken, ctxAccount, ctxAnon, ctxStaff, harness, staff, type School } from './helpers'
import type { AccountActor, StaffActor } from '@/server/context'

const h = harness('t4')
let A: School
let kur: StaffActor, guru: StaffActor, wali: StaffActor, bk1: StaffActor, bk2: StaffActor, admin: StaffActor, kes: StaffActor, pembina: StaffActor
let y1 = '', y2 = '', term1 = '', term2 = '', room7 = '', room9 = '', next8 = ''
let mtk = '', ipa = '', mtk9 = ''
let alya = '', bima = '', dewi = ''
let ortuAlya: AccountActor, ortuBima: AccountActor, siswaAlya: AccountActor
const now = new Date('2026-12-10T02:00:00Z')

async function family(email: string) {
  await signUp(ctxAnon(A), { name: email, email, password: 'rahasia-keluarga-01' })
  await processOutbox(A.db, A.school)
  const m = await A.db.select().from(mailLog).where(eq(mailLog.to, email))
  await verifyEmail(ctxAnon(A), /[?&]t=([A-Za-z0-9_-]+)/.exec(m[0]!.body!)![1]!)
  return (await accountFromToken(A, (await signIn(ctxAnon(A), { login: email, password: 'rahasia-keluarga-01' })).token))!
}

beforeAll(async () => {
  A = await h.school('life')
  kur = await staff(A, ['kurikulum'])
  guru = await staff(A, ['guru'], 'Guru MTK')
  wali = await staff(A, ['guru'], 'Wali VII A')
  bk1 = await staff(A, ['bk'], 'BK Satu')
  bk2 = await staff(A, ['bk'], 'BK Dua')
  admin = await staff(A, ['school_admin'])
  kes = await staff(A, ['kesiswaan'])
  pembina = await staff(A, ['pembina'], 'Pembina Pramuka')
  const k = ctxStaff(A, kur, now)
  y1 = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
  y2 = await academic.saveYear(k, { name: '2027/2028', startDate: '2027-07-12', endDate: '2028-06-24' })
  await academic.activateYear(k, y1)
  for (const [n, o, f] of [['VII', 7, false], ['VIII', 8, false], ['IX', 9, true]] as const) await academic.saveGradeLevel(k, { name: n, ordinal: o, final: f })
  const ov = await academic.academicOverview(k)
  const lv = (n: string) => ov.levels.find((l) => l.name === n)!.id
  term1 = ov.terms.find((t) => t.yearId === y1 && t.ordinal === 1)!.id
  term2 = ov.terms.find((t) => t.yearId === y1 && t.ordinal === 2)!.id
  room7 = await academic.saveHomeroom(k, { yearId: y1, gradeLevelId: lv('VII'), name: 'VII A', homeroomTeacherId: wali.id, room: null, capacity: 30 })
  room9 = await academic.saveHomeroom(k, { yearId: y1, gradeLevelId: lv('IX'), name: 'IX A', homeroomTeacherId: null, room: null, capacity: 30 })
  next8 = await academic.saveHomeroom(k, { yearId: y2, gradeLevelId: lv('VIII'), name: 'VIII A', homeroomTeacherId: null, room: null, capacity: 30 })
  await academic.saveSubject(k, { code: 'MTK', name: 'Matematika', group: null, ordinal: 1, active: true })
  await academic.saveSubject(k, { code: 'IPA', name: 'IPA', group: null, ordinal: 2, active: true })
  const subs = (await academic.academicOverview(k)).subjects
  for (const t of [term1, term2]) {
    await academic.saveAssignment(k, { termId: t, homeroomId: room7, subjectId: subs[0]!.id, teacherId: guru.id, hoursPerWeek: 5 })
    await academic.saveAssignment(k, { termId: t, homeroomId: room7, subjectId: subs[1]!.id, teacherId: wali.id, hoursPerWeek: 4 })
  }
  await academic.saveAssignment(k, { termId: term2, homeroomId: room9, subjectId: subs[0]!.id, teacherId: guru.id, hoursPerWeek: 5 })
  const as = await academic.assignmentsOfTerm(k, term1)
  mtk = as.find((a) => a.subjectCode === 'MTK')!.a.id
  ipa = as.find((a) => a.subjectCode === 'IPA')!.a.id
  mtk9 = (await academic.assignmentsOfTerm(k, term2)).find((a) => a.homeroom === 'IX A')!.a.id
  const t = ctxStaff(A, (await staff(A, ['tata_usaha'])), new Date('2026-07-13T01:00:00Z'))
  alya = await S.createStudent(t, { fullName: 'Alya' }, { homeroomId: room7 })
  bima = await S.createStudent(t, { fullName: 'Bima' }, { homeroomId: room7 })
  dewi = await S.createStudent(t, { fullName: 'Dewi' }, { homeroomId: room9 })
  ortuAlya = await family('ortu.alya@uji.test')
  const l1 = await S.addGuardian(t, alya, { relation: 'ibu', fullName: 'Ortu Alya', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true })
  await S.redeemCode(ctxAccount(A, ortuAlya), (await S.issueGuardianCode(ctxStaff(A, kur.perms.has('family.manage') ? kur : admin), l1)).code)
  ortuBima = await family('ortu.bima@uji.test')
  const l2 = await S.addGuardian(t, bima, { relation: 'ibu', fullName: 'Ortu Bima', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true })
  await S.redeemCode(ctxAccount(A, ortuBima), (await S.issueGuardianCode(ctxStaff(A, admin), l2)).code)
  const acc = await S.createAccountFor(ctxStaff(A, admin), { studentId: alya }, 'siswa.alya')
  siswaAlya = (await accountFromToken(A, (await signIn(ctxAnon(A), { login: acc.login, password: acc.temporaryPassword })).token))!
})
afterAll(() => h.cleanup())

describe('LIFE-01 buku nilai', () => {
  it('hanya pengampu; bobot sumatif; kirim butuh nilai & deskripsi lengkap; wali kelas dapat mengembalikan', async () => {
    const g = ctxStaff(A, guru, now)
    await expect(G.saveItem(ctxStaff(A, wali, now), { assignmentId: mtk, kind: 'sumatif', title: 'X', date: null, maxScore: 100, weight: 1 })).rejects.toMatchObject({ code: 'forbidden' })
    const f1 = await G.saveItem(g, { assignmentId: mtk, kind: 'formatif', title: 'Kuis 1', date: '2026-09-01', maxScore: 10, weight: 1 })
    const s1 = await G.saveItem(g, { assignmentId: mtk, kind: 'sumatif', title: 'Bab 1', date: '2026-09-20', maxScore: 100, weight: 1 })
    const s2 = await G.saveItem(g, { assignmentId: mtk, kind: 'sas', title: 'SAS', date: '2026-12-01', maxScore: 50, weight: 1 })
    await G.saveScores(g, f1, [{ studentId: alya, score: 2 }, { studentId: bima, score: 10 }])
    await G.saveScores(g, s1, [{ studentId: alya, score: 80 }, { studentId: bima, score: 70 }])
    await G.saveScores(g, s2, [{ studentId: alya, score: 45 }, { studentId: bima, score: 40 }])
    await expect(G.saveScores(g, s2, [{ studentId: dewi, score: 40 }])).rejects.toThrow(/bukan anggota/)
    await expect(G.saveScores(g, s2, [{ studentId: alya, score: 51 }])).rejects.toThrow(/0–50/)
    const book = await G.gradebook(g, mtk)
    // weights: sumatif 60, sas 20 (sts empty, formatif 0) → Alya (80*60 + 90*20)/80 = 82.5
    expect(book.rows.find((r) => r.studentId === alya)!.computed).toBe(82.5)
    await expect(G.submitResults(g, mtk)).rejects.toThrow(/Lengkapi/)
    await expect(G.saveResults(g, mtk, [{ studentId: alya, finalScore: 90, adjustReason: null, description: 'x' }])).rejects.toThrow(/alasan/)
    await G.saveResults(g, mtk, [
      { studentId: alya, finalScore: null, adjustReason: null, description: 'Menguasai operasi bilangan bulat.' },
      { studentId: bima, finalScore: 76, adjustReason: 'Remedial tuntas', description: 'Perlu latihan pecahan.' },
    ])
    await G.submitResults(g, mtk)
    await expect(G.saveScores(g, s1, [{ studentId: alya, score: 81 }])).rejects.toThrow(/sudah dikirim/)
    await G.returnResults(ctxStaff(A, wali, now), mtk, 'Cek ulang deskripsi')
    await G.saveScores(g, s1, [{ studentId: alya, score: 80 }])
    await G.submitResults(g, mtk)
    // IPA by the homeroom teacher
    const w = ctxStaff(A, wali, now)
    const i1 = await G.saveItem(w, { assignmentId: ipa, kind: 'sumatif', title: 'Bab 1', date: null, maxScore: 100, weight: 1 })
    await G.saveScores(w, i1, [{ studentId: alya, score: 88 }, { studentId: bima, score: 79 }])
    await G.saveResults(w, ipa, [
      { studentId: alya, finalScore: null, adjustReason: null, description: 'Sangat baik dalam pengamatan.' },
      { studentId: bima, finalScore: null, adjustReason: null, description: 'Baik.' },
    ])
  })
})

describe('LIFE-02 ekskul & kesiswaan', () => {
  it('izin orang tua, kuota pembina, evaluasi; prestasi diverifikasi; laporan dengan catatan internal', async () => {
    const act = await X.saveActivity(ctxStaff(A, kes, now), { name: 'Pramuka', category: 'wajib', description: null, coachId: pembina.id, schedule: 'Jumat 14.00', location: null, capacity: 1, requiresConsent: true, status: 'open' })
    const m1 = await X.apply(ctxAccount(A, siswaAlya, now), act, alya, 'Suka berkemah')
    await expect(X.decide(ctxStaff(A, pembina, now), m1, true, null)).rejects.toThrow(/persetujuan orang tua/)
    await expect(X.consent(ctxAccount(A, ortuBima, now), m1, true)).rejects.toMatchObject({ code: 'forbidden' })
    await X.consent(ctxAccount(A, ortuAlya, now), m1, true)
    await expect(X.decide(ctxStaff(A, guru, now), m1, true, null)).rejects.toMatchObject({ code: 'forbidden' })
    await X.decide(ctxStaff(A, pembina, now), m1, true, null)
    const m2 = await X.apply(ctxAccount(A, ortuBima, now), act, bima, null) // guardian application = consent
    await expect(X.decide(ctxStaff(A, pembina, now), m2, true, null)).rejects.toThrow(/Kuota/)
    await X.recordSession(ctxStaff(A, pembina, now), act, '2026-12-04', 'Tali temali', { [alya]: 'H' })
    await X.evaluate(ctxStaff(A, pembina, now), act, term1, [{ studentId: alya, predicate: 'Baik', description: 'Aktif.' }])
    // achievements
    const ach = await K.submitAchievement(ctxAccount(A, ortuAlya, now), { studentId: alya, title: 'Juara 2 OSN Matematika', field: 'akademik', level: 'kota', rank: 'Juara 2', organizer: 'Dinas', date: '2026-10-05', publicConsent: true, file: null })
    await expect(K.submitAchievement(ctxAccount(A, ortuBima, now), { studentId: alya, title: 'X', field: 'akademik', level: 'kota', rank: null, organizer: null, date: '2026-10-05', publicConsent: false, file: null })).rejects.toMatchObject({ code: 'forbidden' })
    await K.reviewAchievement(ctxStaff(A, kes, now), ach, true, null)
    expect((await K.publicAchievements(A.db)).map((a) => a.title)).toEqual(['Juara 2 OSN Matematika'])
    // report with internal note
    const rep = await K.submitReport(ctxAccount(A, ortuBima, now), { category: 'perundungan', description: 'Anak saya diejek berulang kali di kantin.', occurredOn: '2026-12-01', location: 'Kantin', hideIdentity: true, file: null })
    await K.processReport(ctxStaff(A, kes, now), rep, 'note', 'Cek CCTV (internal)')
    await K.processReport(ctxStaff(A, kes, now), rep, 'clarification', 'Mohon sebutkan waktu kejadian.')
    await K.reporterAddInfo(ctxAccount(A, ortuBima, now), rep, 'Jam istirahat pertama.', null)
    const v = await K.reportView(ctxAccount(A, ortuBima, now), rep)
    expect(v.events.some((e) => e.note?.includes('internal'))).toBe(false)
    expect(v.events.map((e) => e.action)).toEqual(['received', 'clarification', 'info_added'])
    await expect(K.reportView(ctxAccount(A, ortuAlya, now), rep)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(K.reportView(ctxStaff(A, guru, now), rep)).rejects.toMatchObject({ code: 'forbidden' })
  })
})

describe('LIFE-03 rapor', () => {
  it('lengkap → diajukan wali kelas → disetujui petugas lain → dirilis; perbaikan menjadi versi baru', async () => {
    const w = ctxStaff(A, wali, now)
    await expect(R.submitCards(w, room7, term1)).rejects.toThrow(/Belum semua/)
    await G.submitResults(w, ipa)
    await R.saveNotes(w, room7, term1, [{ studentId: alya, notes: 'Pertahankan semangat belajar.', promotion: null }])
    await expect(R.saveNotes(w, room7, term1, [{ studentId: alya, notes: null, promotion: 'naik' }])).rejects.toThrow(/semester terakhir/)
    expect(await R.submitCards(w, room7, term1)).toBe(2)
    await expect(R.approveCards(ctxStaff(A, guru, now), room7, term1)).rejects.toMatchObject({ code: 'forbidden' })
    expect(await R.approveCards(ctxStaff(A, kur, now), room7, term1)).toBe(2)
    expect((await R.releasedReports(ctxAccount(A, ortuAlya, now), alya)).latest).toHaveLength(0)
    await expect(R.releaseCards(ctxStaff(A, wali, now), room7, term1)).rejects.toMatchObject({ code: 'forbidden' })
    await R.releaseCards(ctxStaff(A, kur, now), room7, term1)
    const rel = await R.releasedReports(ctxAccount(A, ortuAlya, now), alya)
    expect(rel.latest).toHaveLength(1)
    const snap = rel.latest[0]!.v.snapshot
    expect(snap.subjects.map((s) => [s.code, s.score])).toEqual([
      ['MTK', 83],
      ['IPA', 88],
    ])
    expect(snap.activities[0]).toMatchObject({ name: 'Pramuka', predicate: 'Baik' })
    expect(snap.achievements[0]?.title).toBe('Juara 2 OSN Matematika')
    expect(JSON.stringify(snap)).not.toMatch(/peringkat|ranking/i)
    await expect(R.reportVersion(ctxAccount(A, ortuBima, now), rel.latest[0]!.v.id)).rejects.toMatchObject({ code: 'not_found' })
    // correction: reopen → still old visible → re-submit/approve/release → v2
    const cardId = rel.latest[0]!.c.id
    await R.reopenCard(ctxStaff(A, kur, now), cardId, 'Salah ketik catatan wali kelas')
    expect((await R.releasedReports(ctxAccount(A, ortuAlya, now), alya)).latest[0]!.v.versionNo).toBe(1)
    await R.saveNotes(w, room7, term1, [{ studentId: alya, notes: 'Pertahankan semangat belajarmu.', promotion: null }])
    await R.submitCards(w, room7, term1)
    await R.approveCards(ctxStaff(A, kur, now), room7, term1)
    await R.releaseCards(ctxStaff(A, kur, now), room7, term1)
    const rel2 = await R.releasedReports(ctxAccount(A, ortuAlya, now), alya)
    expect(rel2.latest[0]!.v.versionNo).toBe(2)
    expect(rel2.all).toHaveLength(2)
  })
})

describe('LIFE-04 BK', () => {
  it('catatan sesi hanya konselor yang menangani; ringkasan dibagikan sesuai tanda; admin sekolah tidak bisa', async () => {
    const id = await BK.requestCase(ctxAccount(A, ortuAlya, now), { studentId: alya, category: 'belajar', urgency: 'normal', request: 'Anak sulit berkonsentrasi belajar di rumah.', preferredTime: null })
    await expect(BK.requestCase(ctxAccount(A, ortuBima, now), { studentId: alya, category: 'belajar', urgency: 'normal', request: 'xxxxxxxxxxxxxxxx', preferredTime: null })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(BK.caseList(ctxStaff(A, admin, now))).rejects.toMatchObject({ code: 'forbidden' })
    expect((await BK.caseList(ctxStaff(A, bk2, now))).map((c) => c.c.id)).toContain(id)
    await BK.takeCase(ctxStaff(A, bk1, now), id)
    await expect(BK.takeCase(ctxStaff(A, bk2, now), id)).rejects.toThrow(/konselor lain/)
    expect((await BK.caseList(ctxStaff(A, bk2, now))).map((c) => c.c.id)).not.toContain(id)
    await expect(BK.caseView(ctxStaff(A, bk2, now), id)).rejects.toMatchObject({ code: 'forbidden' })
    await BK.addSession(ctxStaff(A, bk1, now), id, { date: '2026-12-09', mode: 'tatap_muka', notes: 'RAHASIA: detail cerita siswa', sharedSummary: 'Siswa dibantu menyusun jadwal belajar.', shareWithGuardian: false, shareWithHomeroom: true, followUpOn: null })
    const hv = await BK.caseView(ctxStaff(A, wali, now), id)
    expect(hv.sessions[0]!.s.notes).toBeNull()
    expect(hv.sessions[0]!.s.sharedSummary).toMatch(/jadwal belajar/)
    expect((await BK.caseView(ctxStaff(A, bk1, now), id)).sessions[0]!.s.notes).toMatch(/RAHASIA/)
    await expect(BK.caseView(ctxStaff(A, guru, now), id)).rejects.toMatchObject({ code: 'forbidden' })
    const fam = await BK.familyCases(ctxAccount(A, ortuAlya, now), alya)
    expect(fam[0]!.summaries).toHaveLength(0) // not shared with guardian
    expect(JSON.stringify(fam)).not.toMatch(/RAHASIA/)
    await BK.closeCase(ctxStaff(A, bk1, now), id, 'Tindak lanjut di rumah dengan jadwal belajar.')
    expect((await BK.familyCases(ctxAccount(A, ortuAlya, now), alya))[0]!.closingSummary).toMatch(/jadwal/)
  })
})

describe('LIFE-05 kenaikan kelas', () => {
  it('rancangan dari keputusan rapor; dijalankan sekali; lulus menjadi alumni', async () => {
    const k = ctxStaff(A, kur, now)
    const run = await P.proposePromotion(k, y1, y2)
    const r = await P.promotionRun(k, run)
    expect(r.lines.find((l) => l.studentId === alya)).toMatchObject({ decision: 'naik', toHomeroomId: next8 })
    expect(r.lines.find((l) => l.studentId === dewi)).toMatchObject({ decision: 'lulus', toHomeroomId: null })
    await P.updateLines(k, run, [{ studentId: bima, decision: 'naik', toHomeroomId: next8 }])
    await expect(P.executePromotion(k, run, '2026-07-01')).rejects.toThrow(/tahun ajaran tujuan/)
    expect(await P.executePromotion(k, run, '2027-07-12')).toBe(3)
    await expect(P.executePromotion(k, run, '2027-07-12')).rejects.toThrow(/sudah dijalankan/)
    const [d] = await A.db.select().from(students).where(eq(students.id, dewi))
    expect(d!.status).toBe('graduated')
    const es = await A.db.select().from(enrollments).where(eq(enrollments.studentId, alya))
    expect(es.map((e) => [e.yearId === y1 ? 'y1' : 'y2', e.status, e.outcome]).sort()).toEqual([
      ['y1', 'ended', 'promoted'],
      ['y2', 'active', null],
    ])
  })
})
