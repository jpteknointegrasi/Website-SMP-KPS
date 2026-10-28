/**
 * KRY-01..02: student works for the website (proposal by the student's teacher, guardian consent, server-only feed,
 * withdrawal), and support-access scope (operational grants do not read the student register).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as academic from '@/modules/academic/service'
import * as S from '@/modules/students/service'
import * as W from '@/modules/works/service'
import { grantSupport } from '@/modules/admin/service'
import { signIn, signUp, verifyEmail } from '@/modules/identity/service'
import { processOutbox } from '@/server/outbox'
import { loadPlatformAdmin, loadSupport, makeCtx } from '@/server/context'
import { isPortalSync } from '@satusekolah/core'
import { eq } from 'drizzle-orm'
import { mailLog } from '@/db/schema'
import { accountFromToken, ctxAccount, ctxAnon, ctxStaff, harness, pdf, png, staff, type School } from './helpers'
import type { AccountActor, StaffActor } from '@/server/context'

const h = harness('t7')
let A: School
let admin: StaffActor, wali: StaffActor, guru: StaffActor, kes: StaffActor
let alya = '', bima = ''
let ortuAlya: AccountActor, ortuBima: AccountActor
const now = new Date('2026-10-12T02:00:00Z')

async function family(email: string) {
  await signUp(ctxAnon(A), { name: email, email, password: 'rahasia-keluarga-01' })
  await processOutbox(A.db, A.school)
  const m = await A.db.select().from(mailLog).where(eq(mailLog.to, email))
  await verifyEmail(ctxAnon(A), /[?&]t=([A-Za-z0-9_-]+)/.exec(m[0]!.body!)![1]!)
  return (await accountFromToken(A, (await signIn(ctxAnon(A), { login: email, password: 'rahasia-keluarga-01' })).token))!
}

beforeAll(async () => {
  A = await h.school('works')
  admin = await staff(A, ['school_admin'])
  wali = await staff(A, ['guru'], 'Wali')
  guru = await staff(A, ['guru'], 'Guru lain')
  kes = await staff(A, ['kesiswaan'])
  const k = ctxStaff(A, admin, now)
  const y = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
  await academic.activateYear(k, y)
  await academic.saveGradeLevel(k, { name: 'VII', ordinal: 7, final: false })
  const ov = await academic.academicOverview(k)
  const room = await academic.saveHomeroom(k, { yearId: y, gradeLevelId: ov.levels[0]!.id, name: 'VII A', homeroomTeacherId: wali.id, room: null, capacity: 30 })
  const t = ctxStaff(A, admin, new Date('2026-07-13T01:00:00Z'))
  alya = await S.createStudent(t, { fullName: 'Alya' }, { homeroomId: room })
  bima = await S.createStudent(t, { fullName: 'Bima' }, { homeroomId: room })
  ortuAlya = await family('ortu.alya@uji.test')
  await S.redeemCode(ctxAccount(A, ortuAlya), (await S.issueGuardianCode(ctxStaff(A, admin), await S.addGuardian(t, alya, { relation: 'ibu', fullName: 'Ortu Alya', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true }))).code)
  ortuBima = await family('ortu.bima@uji.test')
  await S.redeemCode(ctxAccount(A, ortuBima), (await S.issueGuardianCode(ctxStaff(A, admin), await S.addGuardian(t, bima, { relation: 'ibu', fullName: 'Ortu Bima', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true }))).code)
})
afterAll(() => h.cleanup())

const work = { title: 'Lukisan Teluk Balikpapan', category: 'seni', description: 'Lukisan cat air karya siswa dalam pelajaran Seni Budaya.', publicName: 'Alya P., kelas VII', mentorPublic: null, submissionId: null, fileIds: [] as string[] }

describe('KRY-01 karya ke website', () => {
  it('diusulkan guru siswa; izin hanya oleh wali siswa itu; umpan hanya berisi karya berizin; dapat ditarik', async () => {
    await expect(W.propose(ctxStaff(A, guru, now), { ...work, studentId: alya }, [png()])).rejects.toMatchObject({ code: 'forbidden' })
    await expect(W.propose(ctxStaff(A, wali, now), { ...work, studentId: alya }, [pdf()])).rejects.toThrow()
    const id = await W.propose(ctxStaff(A, wali, now), { ...work, studentId: alya }, [png()])
    expect((await W.syncFeed(A.db)).works).toHaveLength(0)
    await expect(W.decideConsent(ctxAccount(A, ortuBima, now), id, true, null)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(W.decideConsent(ctxStaff(A, wali, now), id, true, 'formulir')).rejects.toMatchObject({ code: 'forbidden' })
    await W.decideConsent(ctxAccount(A, ortuAlya, now), id, true, null)
    const feed = await W.syncFeed(A.db)
    expect(feed.works.map((w) => [w.ref, w.publicName])).toEqual([[id, 'Alya P., kelas VII']])
    expect(JSON.stringify(feed)).not.toMatch(/Alya"|studentId|nis/)
    expect(await W.syncImage(A.db, id, feed.works[0]!.images[0]!)).toBeTruthy()
    expect(await W.markImported(A.db, [id])).toBe(1)
    await W.withdraw(ctxAccount(A, ortuAlya, now), id)
    const after = await W.syncFeed(A.db)
    expect(after.works).toHaveLength(0)
    expect(after.withdrawn).toEqual([id])
    expect(await W.syncImage(A.db, id, feed.works[0]!.images[0]!)).toBeNull()
    // written consent recorded by student affairs (with evidence)
    const id2 = await W.propose(ctxStaff(A, wali, now), { ...work, studentId: bima, publicName: 'Siswa kelas VII' }, [png()])
    await expect(W.decideConsent(ctxStaff(A, kes, now), id2, true, null)).rejects.toThrow(/bukti/)
    await W.decideConsent(ctxStaff(A, kes, now), id2, true, 'Formulir izin 10/10/2026')
    expect((await W.syncFeed(A.db)).works.map((w) => w.ref)).toEqual([id2])
  })
  it('sinkronisasi hanya dengan rahasia bersama', () => {
    const secret = 'rahasia-sinkron-uji-0123456789'
    expect(isPortalSync(new Headers({ 'x-sekolahku-sync': secret }), secret)).toBe(true)
    expect(isPortalSync(new Headers({ 'x-sekolahku-sync': 'salah' }), secret)).toBe(false)
    expect(isPortalSync(new Headers(), secret)).toBe(false)
    expect(isPortalSync(new Headers({ 'x-sekolahku-sync': 'pendek' }), 'pendek')).toBe(false)
  })
})

describe('KRY-02 cakupan akses bantuan', () => {
  it('izin operasional tidak membaca Buku Induk (jalur produksi: loadPlatformAdmin); izin "data siswa" hanya membaca', async () => {
    const op = { id: 5, email: 'op@platform.test', name: 'Op', role: 'superadmin', schoolId: null } as never
    await grantSupport(ctxStaff(A, admin, now), { email: 'op@platform.test', reason: 'Memeriksa antrean email sekolah', hours: 1 })
    const sup = await loadSupport(A.db, op, now)
    expect(sup?.perms.has('students.read')).toBe(false)
    expect(sup?.perms.has('audit.view')).toBe(true)
    const pa = (await loadPlatformAdmin(A.db, op, now))!
    expect(pa.perms.has('students.read')).toBe(false)
    const pctx = makeCtx({ school: A.school, db: A.db, staff: pa, now })
    await expect(S.listStudents(pctx, {})).rejects.toMatchObject({ code: 'forbidden' })
    // with a "data siswa" grant: the register is readable, but no student write and no work proposal
    await grantSupport(ctxStaff(A, admin, now), { email: 'op@platform.test', reason: 'Membantu memeriksa data siswa', hours: 2, scope: 'data_siswa' })
    const pa2 = (await loadPlatformAdmin(A.db, op, now))!
    const p2 = makeCtx({ school: A.school, db: A.db, staff: pa2, now })
    await expect(S.listStudents(p2, {})).resolves.toBeTruthy()
    await expect(S.updateStudent(p2, alya, { fullName: 'Ubah' }, null)).rejects.toMatchObject({ code: 'forbidden' })
  })
})
