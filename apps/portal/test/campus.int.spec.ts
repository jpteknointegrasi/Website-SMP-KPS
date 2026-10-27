/**
 * CMP-01..06: library circulation rules, UKS restricted content, organisation proposals → calendar, alumni consent,
 * leadership dashboard & purpose-bound exports, support access (read-only, time-limited, audited).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import * as academic from '@/modules/academic/service'
import * as S from '@/modules/students/service'
import * as L from '@/modules/library/service'
import * as H from '@/modules/health/service'
import * as O from '@/modules/organizations/service'
import * as AL from '@/modules/alumni/service'
import * as D from '@/modules/dashboard/service'
import { grantSupport, revokeSupport, setModuleState } from '@/modules/admin/service'
import { signIn, signUp, verifyEmail } from '@/modules/identity/service'
import { processOutbox } from '@/server/outbox'
import { loadPlatformAdmin, loadSupport, makeCtx } from '@/server/context'
import { academicEvents, auditEvents, consents, mailLog, notifications, students, supportGrants } from '@/db/schema'
import { accountFromToken, ctxAccount, ctxAnon, ctxStaff, harness, staff, type School } from './helpers'
import type { AccountActor, StaffActor } from '@/server/context'

const h = harness('t5')
let A: School
let admin: StaffActor, pustakawan: StaffActor, uks: StaffActor, wali: StaffActor, kes: StaffActor, pembina: StaffActor, pimpinan: StaffActor
let room = '', alya = '', bima = '', citra = ''
let ortuAlya: AccountActor, ortuBima: AccountActor, siswaAlya: AccountActor
const now = new Date('2026-10-12T02:00:00Z')

async function family(email: string) {
  await signUp(ctxAnon(A), { name: email, email, password: 'rahasia-keluarga-01' })
  await processOutbox(A.db, A.school)
  const m = await A.db.select().from(mailLog).where(eq(mailLog.to, email))
  await verifyEmail(ctxAnon(A), /[?&]t=([A-Za-z0-9_-]+)/.exec(m[0]!.body!)![1]!)
  return (await accountFromToken(A, (await signIn(ctxAnon(A), { login: email, password: 'rahasia-keluarga-01' })).token))!
}

beforeAll(async () => {
  A = await h.school('campus')
  admin = await staff(A, ['school_admin'])
  pustakawan = await staff(A, ['pustakawan'])
  uks = await staff(A, ['petugas_uks'])
  wali = await staff(A, ['guru'], 'Wali')
  kes = await staff(A, ['kesiswaan'])
  pembina = await staff(A, ['guru'], 'Pembina OSIS')
  pimpinan = await staff(A, ['pimpinan'])
  const k = ctxStaff(A, admin, now)
  const y = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
  await academic.activateYear(k, y)
  await academic.saveGradeLevel(k, { name: 'VII', ordinal: 7, final: false })
  const ov = await academic.academicOverview(k)
  room = await academic.saveHomeroom(k, { yearId: y, gradeLevelId: ov.levels[0]!.id, name: 'VII A', homeroomTeacherId: wali.id, room: null, capacity: 30 })
  const t = ctxStaff(A, admin, new Date('2026-07-13T01:00:00Z'))
  alya = await S.createStudent(t, { fullName: 'Alya', nis: '1001' }, { homeroomId: room })
  bima = await S.createStudent(t, { fullName: 'Bima', nis: '1002' }, { homeroomId: room })
  citra = await S.createStudent(t, { fullName: 'Citra', nis: '1003' }, { homeroomId: room })
  ortuAlya = await family('ortu.alya@uji.test')
  await S.redeemCode(ctxAccount(A, ortuAlya), (await S.issueGuardianCode(ctxStaff(A, admin), await S.addGuardian(t, alya, { relation: 'ibu', fullName: 'Ortu Alya', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true }))).code)
  ortuBima = await family('ortu.bima@uji.test')
  await S.redeemCode(ctxAccount(A, ortuBima), (await S.issueGuardianCode(ctxStaff(A, admin), await S.addGuardian(t, bima, { relation: 'ibu', fullName: 'Ortu Bima', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true }))).code)
  const acc = await S.createAccountFor(k, { studentId: alya }, 'siswa.alya')
  siswaAlya = (await accountFromToken(A, (await signIn(ctxAnon(A), { login: acc.login, password: acc.temporaryPassword })).token))!
})
afterAll(() => h.cleanup())

describe('CMP-01 perpustakaan', () => {
  it('eksemplar habis, batas pinjam, tenggat lewat menahan pinjaman baru; keluarga hanya melihat pinjaman anaknya', async () => {
    const p = ctxStaff(A, pustakawan, now)
    await expect(L.saveBook(ctxStaff(A, wali, now), { code: 'X', isbn: null, title: 'X', author: null, publisher: null, year: null, category: null, location: null, copies: 1, active: true })).rejects.toMatchObject({ code: 'forbidden' })
    expect(await L.importBooks(p, 'B1;Laskar Pelangi;Andrea Hirata;;2005;Novel;R1;1\nB2;Bumi;Tere Liye;;2014;Novel;R1;2\nB3;Atlas;;;;Referensi;R2;1\nB4;Kamus;;;;Referensi;R2;1')).toBe(4)
    const books = await L.catalogue(A.db, null)
    const id = (c: string) => books.find((b) => b.code === c)!.id
    expect((await L.findBorrower(p, '1001'))?.id).toBe(alya)
    await L.lend(p, id('B1'), { studentId: alya })
    await expect(L.lend(p, id('B1'), { studentId: bima })).rejects.toThrow(/Semua eksemplar/)
    await L.lend(p, id('B2'), { studentId: alya })
    await L.lend(p, id('B3'), { studentId: alya })
    await expect(L.lend(p, id('B4'), { studentId: alya })).rejects.toThrow(/Batas pinjam/)
    // Bima borrows; two weeks later he is overdue and cannot borrow more
    await L.lend(p, id('B2'), { studentId: bima })
    await expect(L.lend(ctxStaff(A, pustakawan, new Date(now.getTime() + 14 * 86400_000)), id('B4'), { studentId: bima })).rejects.toThrow(/lewat tenggat/)
    expect((await L.studentLoans(ctxAccount(A, ortuAlya, now), alya))).toHaveLength(3)
    await expect(L.studentLoans(ctxAccount(A, ortuAlya, now), bima)).rejects.toMatchObject({ code: 'forbidden' })
    const loan = (await L.loans(p, { studentId: alya }))[0]!
    await L.returnLoan(p, loan.l.id, 'return', null)
    expect((await L.catalogue(A.db, 'Laskar'))[0]!.available).toBe(1)
  })
})

describe('CMP-02 UKS', () => {
  it('hanya petugas UKS; keluarga menerima hasil & pesan tanpa isi medis; wali kelas diberi tahu bila dipulangkan', async () => {
    await expect(H.visits(ctxStaff(A, admin, now), {})).rejects.toMatchObject({ code: 'forbidden' })
    await H.recordVisit(ctxStaff(A, uks, now), { studentId: alya, at: new Date(now.getTime() - 3600_000), complaint: 'RAHASIA demam tinggi', action: 'Kompres', notes: 'RAHASIA catatan', outcome: 'pulang', familyNote: 'Mohon dijemput.', notifyGuardian: false, followUpOn: null })
    const fam = await H.visitsForFamily(ctxAccount(A, ortuAlya, now), alya)
    expect(fam).toHaveLength(1)
    expect(JSON.stringify(fam)).not.toMatch(/RAHASIA/)
    expect(fam[0]).toMatchObject({ outcome: 'pulang', familyNote: 'Mohon dijemput.' })
    await expect(H.visitsForFamily(ctxAccount(A, ortuBima, now), alya)).rejects.toMatchObject({ code: 'forbidden' })
    const n = await A.db.select().from(notifications).where(and(eq(notifications.recipientType, 'staff'), eq(notifications.recipientId, wali.id)))
    expect(n.some((x) => /dipulangkan/.test(x.title))).toBe(true)
    expect(n.some((x) => /RAHASIA/.test(`${x.title}${x.body ?? ''}`))).toBe(false)
  })
})

describe('CMP-03 organisasi', () => {
  it('anggota biasa tidak dapat mengajukan; pengurus mengajukan; pembina menyetujui → masuk kalender', async () => {
    const org = await O.saveOrg(ctxStaff(A, kes, now), { name: 'OSIS', description: null, advisorId: pembina.id })
    await O.setMember(ctxStaff(A, pembina, now), org, alya, 'Ketua', true, true)
    await O.setMember(ctxStaff(A, pembina, now), org, bima, 'Anggota', false, true)
    await expect(O.setMember(ctxStaff(A, wali, now), org, citra, 'Anggota', false, true)).rejects.toMatchObject({ code: 'forbidden' })
    const proposal = { title: 'Pentas seni', description: 'Pentas seni akhir semester untuk seluruh siswa.', startDate: '2026-12-05', endDate: '2026-12-05', location: 'Aula', budget: 500000, participants: 'Semua siswa', isPublic: true }
    const pid = await O.submitProposal(ctxAccount(A, siswaAlya, now), org, proposal)
    await expect(O.submitProposal(ctxAccount(A, ortuAlya, now), org, proposal)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(O.reviewProposal(ctxStaff(A, wali, now), pid, 'approve', null)).rejects.toMatchObject({ code: 'forbidden' })
    await O.reviewProposal(ctxStaff(A, pembina, now), pid, 'approve', null)
    const [e] = await A.db.select().from(academicEvents).where(eq(academicEvents.title, 'Pentas seni (OSIS)'))
    expect(e?.isPublic).toBe(true)
    await O.reportProposal(ctxAccount(A, siswaAlya, now), pid, 'Pentas berjalan lancar dengan 200 penonton.')
  })
})

describe('CMP-04 alumni', () => {
  it('kontak hanya dengan izin; riwayat izin tercatat; cerita publik hanya dengan izin', async () => {
    await S.setStudentStatus(ctxStaff(A, admin, now), citra, 'graduated', { date: '2026-10-01', reason: 'Lulus' })
    const k = ctxStaff(A, kes, now)
    await expect(AL.saveProfile(k, citra, { graduationYear: '2026', continuingTo: 'SMA Contoh', contactEmail: 'citra@uji.test', contactPhone: null, story: null, consentContact: false, consentPublic: false })).rejects.toThrow(/izin|setuju/)
    await AL.saveProfile(k, citra, { graduationYear: '2026', continuingTo: 'SMA Contoh', contactEmail: null, contactPhone: null, story: 'Belajar di sini menyenangkan.', consentContact: false, consentPublic: false })
    expect(await AL.publicStories(A.db)).toHaveLength(0)
    await AL.saveProfile(k, citra, { graduationYear: '2026', continuingTo: 'SMA Contoh', contactEmail: 'citra@uji.test', contactPhone: null, story: 'Belajar di sini menyenangkan.', consentContact: true, consentPublic: true })
    expect((await AL.publicStories(A.db))[0]).toMatchObject({ name: 'Citra', story: 'Belajar di sini menyenangkan.' })
    const [st] = await A.db.select().from(students).where(eq(students.id, citra))
    expect((await A.db.select().from(consents).where(eq(consents.personId, st!.personId))).length).toBe(4)
    await expect(AL.saveProfile(k, alya, { graduationYear: '2026', continuingTo: null, contactEmail: null, contactPhone: null, story: null, consentContact: false, consentPublic: false })).rejects.toMatchObject({ code: 'not_found' })
  })
})

describe('CMP-05 dashboard & ekspor', () => {
  it('agregat untuk pimpinan; ekspor wajib hak & tujuan, teraudit, aman dari formula', async () => {
    const o = await D.overview(ctxStaff(A, pimpinan, now))
    expect(o.students).toBe(2)
    await expect(D.overview(ctxStaff(A, wali, now))).rejects.toMatchObject({ code: 'forbidden' })
    await expect(D.exportCsv(ctxStaff(A, pimpinan, now), 'siswa', 'Pelaporan semester')).rejects.toMatchObject({ code: 'forbidden' })
    const ex = ctxStaff(A, admin, now)
    await expect(D.exportCsv(ex, 'siswa', 'x')).rejects.toThrow(/tujuan/)
    await S.updateStudent(ctxStaff(A, admin, now), bima, { fullName: '=HYPERLINK("http://x")' }, null).catch(() => null)
    const f = await D.exportCsv(ex, 'siswa', 'Pelaporan Dapodik semester ganjil')
    expect(f.body.startsWith('﻿NIS,NISN,Nama')).toBe(true)
    expect(f.body).not.toMatch(/\n[^\n]*,=HYPERLINK/)
    const audit = await A.db.select().from(auditEvents).where(eq(auditEvents.action, 'exports.download'))
    expect(audit[0]?.meta).toMatchObject({ purpose: 'Pelaporan Dapodik semester ganjil' })
  })
})

describe('CMP-06 akses bantuan teknis', () => {
  it('hanya dengan izin sekolah, terbatas waktu, hanya melihat, tercatat; dapat dicabut', async () => {
    const op = { id: 99, email: 'operator@platform.test', name: 'Operator', role: 'superadmin', schoolId: null } as never
    expect(await loadSupport(A.db, op, now)).toBeNull()
    await grantSupport(ctxStaff(A, admin, now), { email: 'operator@platform.test', reason: 'Membantu impor data siswa', hours: 2, scope: 'data_siswa' })
    const sup = await loadSupport(A.db, op, now)
    expect(sup?.support).toBeTruthy()
    expect(sup!.perms.has('counseling')).toBe(false)
    expect(sup!.perms.has('students.read')).toBe(true)
    const sctx = makeCtx({ school: A.school, db: A.db, staff: sup, now })
    await expect(L.saveBook(sctx, { code: 'Z', isbn: null, title: 'Z', author: null, publisher: null, year: null, category: null, location: null, copies: 1, active: true })).rejects.toMatchObject({ code: 'forbidden' })
    expect((await A.db.select().from(auditEvents).where(eq(auditEvents.action, 'support.access'))).length).toBe(1)
    expect(await loadSupport(A.db, op, new Date(now.getTime() + 3 * 3600_000))).toBeNull()
    const [g] = await A.db.select().from(supportGrants)
    await revokeSupport(ctxStaff(A, admin, now), g!.id)
    expect(await loadSupport(A.db, op, now)).toBeNull()
  })
})

describe('PLT-01 Super Admin platform di App sekolah (tata kelola)', () => {
  it('mengatur modul & melihat agregat, tanpa data pribadi/BK/UKS; tidak bisa memberi akses bantuan ke dirinya; tercatat', async () => {
    const sa = { id: 98, email: 'super@platform.test', name: 'Super', role: 'superadmin', schoolId: null } as never
    expect(await loadPlatformAdmin(A.db, { ...(sa as object), role: 'admin' } as never, now)).toBeNull()
    const pa = await loadPlatformAdmin(A.db, sa, now)
    expect(pa?.platform).toBe(true)
    expect(pa?.support).toBeUndefined()
    for (const p of ['settings.manage', 'staff.manage', 'audit.view', 'dashboard.view'] as const) expect(pa!.perms.has(p)).toBe(true)
    for (const p of ['students.read', 'family.manage', 'finance.manage', 'counseling', 'health.manage', 'roles.restricted'] as const) expect(pa!.perms.has(p)).toBe(false)
    const pctx = makeCtx({ school: A.school, db: A.db, staff: pa, now })
    await expect(D.overview(pctx)).resolves.toBeTruthy()
    await expect(setModuleState(pctx, 'perpustakaan', 'pilot')).resolves.toBeUndefined()
    await expect(S.listStudents(pctx, {})).rejects.toMatchObject({ code: 'forbidden' })
    await expect(grantSupport(pctx, { email: 'super@platform.test', reason: 'Membuka data siswa sendiri', hours: 2, scope: 'data_siswa' })).rejects.toMatchObject({ code: 'forbidden' })
    expect((await A.db.select().from(auditEvents).where(eq(auditEvents.action, 'platform.access'))).length).toBe(1)
    // the school's own "data siswa" grant adds the student register (read) — still nothing restricted
    await grantSupport(ctxStaff(A, admin, now), { email: 'super@platform.test', reason: 'Membantu impor data siswa', hours: 2, scope: 'data_siswa' })
    const withGrant = await loadPlatformAdmin(A.db, sa, now)
    expect(withGrant!.perms.has('students.read')).toBe(true)
    expect(withGrant!.perms.has('counseling')).toBe(false)
  })
})
