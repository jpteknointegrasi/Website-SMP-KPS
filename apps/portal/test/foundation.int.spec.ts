/**
 * APP-01..06: foundation (accounts, idempotency, audit/outbox), Buku Induk, guardian links, corrections, import and
 * student cards against real per-school databases.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { accounts, auditEvents, files, mailLog, outboxEvents, studentCards } from '@/db/schema'
import { command } from '@/server/command'
import { processOutbox } from '@/server/outbox'
import { canReadFile } from '@/server/files'
import { changePassword, requestReset, resetPassword, signIn, signOut, signUp, verifyEmail } from '@/modules/identity/service'
import * as students from '@/modules/students/service'
import { commitImport, startImport, validateImport } from '@/modules/students/import'
import * as academic from '@/modules/academic/service'
import * as cards from '@/modules/cards/service'
import { linkedChildren } from '@/modules/scope'
import { accountFromToken, csv, ctxAccount, ctxAnon, ctxStaff, harness, pdf, png, staff, type School } from './helpers'

const h = harness('t1')
let A: School, B: School
let tu: Awaited<ReturnType<typeof staff>>, kur: Awaited<ReturnType<typeof staff>>, rev: Awaited<ReturnType<typeof staff>>
let homeroomA = ''

/** Last mail body sent to an address (development mailbox) after delivering the outbox. */
async function lastMail(s: School, to: string) {
  await processOutbox(s.db, s.school)
  const rows = await s.db.select().from(mailLog).where(eq(mailLog.to, to))
  return rows.at(-1)?.body ?? ''
}
const tokenIn = (body: string) => /[?&]t=([A-Za-z0-9_-]+)/.exec(body)?.[1] ?? ''

beforeAll(async () => {
  A = await h.school('a')
  B = await h.school('b')
  tu = await staff(A, ['tata_usaha'])
  kur = await staff(A, ['kurikulum'])
  rev = await staff(A, ['verifikator_data'])
  const k = ctxStaff(A, kur)
  const yearId = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-30' })
  await academic.activateYear(k, yearId)
  await academic.saveGradeLevel(k, { name: 'VII', ordinal: 7, final: false })
  const ov = await academic.academicOverview(k)
  homeroomA = await academic.saveHomeroom(k, { yearId, gradeLevelId: ov.levels[0]!.id, name: 'VII A', homeroomTeacherId: null, room: 'R7A', capacity: 32 })
})
afterAll(() => h.cleanup())

describe('APP-01 akun keluarga', () => {
  it('daftar → verifikasi email → masuk; email terdaftar tidak dibocorkan', async () => {
    const r = await signUp(ctxAnon(A), { name: 'Ibu Rina', email: 'Rina@Contoh.test', password: 'kata-sandi-panjang-1' })
    expect(r.created).toBe(true)
    const again = await signUp(ctxAnon(A), { name: 'Orang lain', email: 'rina@contoh.test', password: 'kata-sandi-panjang-2' })
    expect(again.created).toBe(false) // same answer to the caller; the owner gets an e-mail
    const mail = await lastMail(A, 'rina@contoh.test')
    expect(mail).toContain('sudah memiliki akun')
    const all = await A.db.select().from(mailLog).where(eq(mailLog.to, 'rina@contoh.test'))
    await verifyEmail(ctxAnon(A), tokenIn(all[0]!.body!))
    const { token } = await signIn(ctxAnon(A), { login: 'RINA@contoh.test', password: 'kata-sandi-panjang-1' })
    const acc = await accountFromToken(A, token)
    expect(acc?.emailVerified).toBe(true)
    // token of school A is meaningless in school B (separate databases)
    expect(await accountFromToken(B, token)).toBeNull()
    await expect(verifyEmail(ctxAnon(A), tokenIn(all[0]!.body!))).rejects.toThrow(/tidak berlaku/)
  })

  it('salah sandi 5x mengunci akun; pesan sama untuk login tak dikenal', async () => {
    await signUp(ctxAnon(A), { name: 'Pak Budi', email: 'budi@contoh.test', password: 'rahasia-yang-kuat-77' })
    await expect(signIn(ctxAnon(A), { login: 'tidakada@contoh.test', password: 'x'.repeat(12) })).rejects.toThrow('Email/nama pengguna atau kata sandi salah.')
    for (let i = 0; i < 5; i++) await expect(signIn(ctxAnon(A), { login: 'budi@contoh.test', password: 'salah-salah-salah' })).rejects.toThrow()
    await expect(signIn(ctxAnon(A), { login: 'budi@contoh.test', password: 'rahasia-yang-kuat-77' })).rejects.toThrow(/dikunci/)
    // reset via e-mail unlocks and signs every session out
    await requestReset(ctxAnon(A), 'budi@contoh.test')
    const mail = await lastMail(A, 'budi@contoh.test')
    await resetPassword(ctxAnon(A), tokenIn(mail), 'rahasia-baru-2026x')
    const { token } = await signIn(ctxAnon(A), { login: 'budi@contoh.test', password: 'rahasia-baru-2026x' })
    const acc = (await accountFromToken(A, token))!
    await changePassword(ctxAccount(A, acc), 'rahasia-baru-2026x', 'rahasia-ketiga-2026x')
    await signOut(ctxAccount(A, acc))
    expect(await accountFromToken(A, token)).toBeNull()
  })

  it('kata sandi lemah ditolak', async () => {
    await expect(signUp(ctxAnon(A), { name: 'X', email: 'x@contoh.test', password: '123' })).rejects.toThrow(/minimal 10/)
  })
})

describe('APP-02 jalur tindakan', () => {
  it('kunci operasi yang sama mengembalikan hasil pertama; isi berbeda ditolak', async () => {
    const c = ctxStaff(A, tu)
    const id1 = await students.createStudent(c, { fullName: 'Alya Putri' }, { key: 'op-alya-0001' })
    const id2 = await students.createStudent(ctxStaff(A, tu), { fullName: 'Alya Putri' }, { key: 'op-alya-0001' })
    expect(id2).toBe(id1)
    await expect(students.createStudent(ctxStaff(A, tu), { fullName: 'Bukan Alya' }, { key: 'op-alya-0001' })).rejects.toThrow(/isi berbeda/)
    const audit = await A.db.select().from(auditEvents).where(eq(auditEvents.objectId, id1))
    expect(audit.filter((a) => a.action === 'students.create')).toHaveLength(1)
  })
  it('tanpa izin ditolak di server', async () => {
    const guru = await staff(A, ['guru'])
    await expect(students.createStudent(ctxStaff(A, guru), { fullName: 'X' })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(students.listStudents(ctxAnon(A), {})).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})

describe('APP-03 Buku Induk', () => {
  let sid = ''
  it('validasi, keunikan NIS/NISN, kelengkapan dihitung', async () => {
    const c = ctxStaff(A, tu)
    await expect(students.createStudent(c, { fullName: 'Citra', nisn: '123' })).rejects.toThrow(/10 digit/)
    sid = await students.createStudent(c, { fullName: 'Citra Lestari', nis: '26001', nisn: '0123456789', gender: 'p', birthPlace: 'Balikpapan', birthDate: '14/07/2012', religion: 'islam', address: 'Jl. Contoh' }, { homeroomId: homeroomA })
    await expect(students.createStudent(c, { fullName: 'Lain', nis: '26001' })).rejects.toThrow(/NIS 26001 sudah dipakai/)
    const d = await students.getStudent(c, sid)
    expect(d.person.gender).toBe('P')
    expect(d.person.birthDate).toBe('2012-07-14')
    expect(d.person.religion).toBe('Islam')
    expect(d.placement?.homeroom).toBe('VII A')
    expect(d.completeness.missing).toEqual(['Pasfoto', 'Data orang tua/wali'])
    await students.addStudentDocument(c, sid, 'pasfoto', png(), null)
    await students.addGuardian(c, sid, { relation: 'ibu', fullName: 'Ibu Citra', phone: '0811', email: null, occupation: null, education: null, nik: null, isPrimary: true })
    expect((await students.getStudent(c, sid)).completeness.percent).toBe(100)
  })
  it('versi kedaluwarsa ditolak (perubahan bersamaan)', async () => {
    const c = ctxStaff(A, tu)
    const v = (await students.getStudent(c, sid)).student.version
    await students.updateStudent(c, sid, { nickname: 'Citra' }, String(v))
    await expect(students.updateStudent(c, sid, { nickname: 'Cit' }, String(v))).rejects.toMatchObject({ code: 'conflict' })
  })
  it('koreksi data: berlaku hanya setelah disetujui; pengusul tidak meninjau sendiri; data berubah → konflik', async () => {
    const c = ctxStaff(A, tu)
    const id = await students.requestCorrection(c, sid, { birthPlace: 'Samarinda' }, 'Sesuai akta kelahiran', pdf())
    expect((await students.getStudent(c, sid)).person.birthPlace).toBe('Balikpapan')
    const tuRev = await staff(A, ['tata_usaha', 'verifikator_data'])
    const own = await students.requestCorrection(ctxStaff(A, tuRev), sid, { nickname: 'Ci' }, 'Panggilan', null)
    await expect(students.reviewCorrection(ctxStaff(A, tuRev), own, 'approve', null, null)).rejects.toThrow(/petugas lain/)
    await students.reviewCorrection(ctxStaff(A, rev), id, 'approve', null, null)
    expect((await students.getStudent(c, sid)).person.birthPlace).toBe('Samarinda')
    const stale = await students.requestCorrection(c, sid, { birthPlace: 'Bontang' }, 'Usulan lama', null)
    await students.updateStudent(c, sid, { birthPlace: 'Tenggarong' }, null)
    await expect(students.reviewCorrection(ctxStaff(A, rev), stale, 'approve', null, null)).rejects.toMatchObject({ code: 'conflict' })
  })
})

describe('APP-04 relasi wali & akses keluarga', () => {
  it('kode aktivasi sekali pakai menghubungkan akun ke anak; dicabut → akses hilang', async () => {
    const c = ctxStaff(A, tu)
    const sid = await students.createStudent(c, { fullName: 'Daffa Ramadhan', nis: '26002' })
    const link = await students.addGuardian(c, sid, { relation: 'ayah', fullName: 'Pak Daffa', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true })
    const { code } = await students.issueGuardianCode(c, link)
    await signUp(ctxAnon(A), { name: 'Pak Daffa', email: 'ayah.daffa@contoh.test', password: 'rahasia-ayah-0001' })
    const { token } = await signIn(ctxAnon(A), { login: 'ayah.daffa@contoh.test', password: 'rahasia-ayah-0001' })
    const acc = (await accountFromToken(A, token))!
    expect(await linkedChildren(ctxAccount(A, acc))).toHaveLength(0)
    await expect(students.getStudent(ctxAccount(A, acc), sid)).rejects.toMatchObject({ code: 'forbidden' })
    await students.redeemCode(ctxAccount(A, acc), code.toLowerCase().replace(/-/g, ' '))
    expect((await linkedChildren(ctxAccount(A, acc))).map((x) => x.name)).toEqual(['Daffa Ramadhan'])
    await expect(students.redeemCode(ctxAccount(A, acc), code)).rejects.toThrow(/tidak berlaku/)
    // another family cannot see the child
    await signUp(ctxAnon(A), { name: 'Orang Lain', email: 'lain@contoh.test', password: 'rahasia-tetangga-1' })
    const other = (await accountFromToken(A, (await signIn(ctxAnon(A), { login: 'lain@contoh.test', password: 'rahasia-tetangga-1' })).token))!
    await expect(students.getStudent(ctxAccount(A, other), sid)).rejects.toMatchObject({ code: 'forbidden' })
    await students.revokeLink(c, link, 'Hak asuh berubah')
    expect(await linkedChildren(ctxAccount(A, acc))).toHaveLength(0)
  })
  it('akun dibuat sekolah wajib ganti sandi; berkas siswa hanya untuk yang berhak', async () => {
    const c = ctxStaff(A, tu)
    const sid = await students.createStudent(c, { fullName: 'Eka Saputra', nis: '26003' })
    const { login, temporaryPassword } = await students.createAccountFor(c, { studentId: sid }, 'eka.saputra')
    const { token, mustChangePassword } = await signIn(ctxAnon(A), { login, password: temporaryPassword })
    expect(mustChangePassword).toBe(true)
    const acc = (await accountFromToken(A, token))!
    await students.addStudentDocument(c, sid, 'akta', pdf(), null)
    const d = await students.getStudent(ctxAccount(A, acc), sid)
    const f = (await A.db.select().from(files).where(eq(files.id, d.docs[0]!.file.id)))[0]!
    expect(await canReadFile(ctxAccount(A, acc), f)).toBe(true)
    expect(await canReadFile(ctxAnon(A), f)).toBe(false)
    expect(await canReadFile(ctxStaff(A, await staff(A, ['guru'])), f)).toBe(false)
  })
})

describe('APP-05 impor Excel/CSV', () => {
  it('pemetaan otomatis, validasi, hanya baris valid yang masuk', async () => {
    const c = ctxStaff(A, await staff(A, ['tata_usaha']))
    const id = await startImport(c, csv('NIS;Nama Siswa;JK;Tanggal Lahir;Rombel;Nama Ibu\n27001;Fajar Nugroho;L;03-02-2013;VII A;Ibu Fajar\n26001;Duplikat NIS;P;2013-01-01;VII A;\n27002;;L;2013-01-01;;\n27003;Gita Ananda;P;31/02/2013;;\n27004;Hana Putri;P;2013-05-05;IX Z;'))
    const sum = await validateImport(c, id, { NIS: 'nis', 'Nama Siswa': 'fullName', JK: 'gender', 'Tanggal Lahir': 'birthDate', Rombel: 'homeroom', 'Nama Ibu': 'motherName' })
    expect(sum).toEqual({ valid: 1, review: 2, error: 2 })
    const r = await commitImport(c, id)
    expect(r.created).toBe(1)
    const list = await students.listStudents(c, { q: 'Fajar' })
    expect(list.rows[0]?.homeroom).toBe('VII A')
    expect(list.rows[0]?.guardians).toBe(1)
    await expect(commitImport(c, id)).rejects.toThrow(/sudah dikonfirmasi/)
  })
})

describe('APP-06 kartu siswa QR', () => {
  it('template disetujui → terbit (yang belum lengkap dilewati) → verifikasi publik minimum', async () => {
    const c = ctxStaff(A, tu)
    const ready = await students.createStudent(c, { fullName: 'Bima Pratama', nis: '26010' })
    await students.addStudentDocument(c, ready, 'pasfoto', png(), null)
    const noPhoto = await students.createStudent(c, { fullName: 'Tanpa Foto', nis: '26011' })
    await expect(cards.issueCards(c, [ready])).rejects.toThrow(/template/)
    const tid = await cards.saveTemplateDraft(c, 'Kartu Siswa', cards.DEFAULT_CARD)
    await cards.approveTemplate(c, tid)
    const r = await cards.issueCards(c, [ready, noPhoto])
    expect(r.issued).toHaveLength(1)
    expect(r.skipped[0]?.reasons).toContain('Pasfoto belum ada')
    const [card] = await A.db.select().from(studentCards).where(eq(studentCards.studentId, ready))
    expect(card!.tokenHash).toHaveLength(64)
    const [printable] = await cards.cardsForPrint(c, [card!.id])
    expect(printable!.qr).toContain('<svg')
    const token = /\/portal\/v\/([A-Za-z0-9_-]+)/.exec(cards.verifyUrl(c, (await import('@sekolahku/core')).openSecret(card!.tokenSealed)))![1]!
    const pub = await cards.verifyToken(ctxAnon(A), token)
    expect(pub).toMatchObject({ found: true, valid: true, status: 'Berlaku', detail: null })
    const staffView = await cards.verifyToken(ctxStaff(A, await staff(A, ['pustakawan'])), token)
    expect(staffView.found && staffView.detail?.name).toBe('Bima Pratama')
    // the same token means nothing at another school
    expect((await cards.verifyToken(ctxAnon(B), token)).found).toBe(false)
    // lost → deactivated at once; approved replacement issues a new card
    const req = await cards.requestReplacement(c, ready, 'hilang', null, true)
    expect((await cards.verifyToken(ctxAnon(A), token)).valid).toBe(false)
    await cards.decideReplacement(c, req, true)
    const all = await A.db.select().from(studentCards).where(eq(studentCards.studentId, ready))
    expect(all.filter((x) => x.status === 'active')).toHaveLength(1)
  })
})

describe('APP-07 outbox', () => {
  it('event tersimpan bersama perubahan dan terkirim setelahnya', async () => {
    const c = ctxStaff(A, tu)
    await command(c, 'uji.event', {}, async (_tx, fx) => fx.event('uji.tanpa_konsumen', { a: 1 }))
    await processOutbox(A.db, A.school)
    const rows = await A.db.select().from(outboxEvents).where(eq(outboxEvents.type, 'uji.tanpa_konsumen'))
    expect(rows[0]?.processedAt).toBeTruthy()
    expect(await A.db.select().from(accounts)).not.toHaveLength(0)
  })
})
