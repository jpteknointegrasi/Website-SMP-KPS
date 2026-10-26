/**
 * DAY-01..06: timetable conflict guard & exceptions, lesson sessions & journal, attendance with edit window & leave,
 * tasks & submissions scoped to the class, targeted announcements, school services with internal notes.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as academic from '@/modules/academic/service'
import * as S from '@/modules/students/service'
import * as sch from '@/modules/schedule/service'
import * as att from '@/modules/attendance/service'
import * as learn from '@/modules/learning/service'
import * as comms from '@/modules/comms/service'
import * as svc from '@/modules/services/service'
import { signIn, signUp } from '@/modules/identity/service'
import { accountFromToken, ctxAccount, ctxAnon, ctxStaff, harness, pdf, staff, type School } from './helpers'
import type { AccountActor, StaffActor } from '@/server/context'
import { processOutbox } from '@/server/outbox'
import { eq } from 'drizzle-orm'
import { mailLog, timeSlots } from '@/db/schema'
import { verifyEmail } from '@/modules/identity/service'

const h = harness('t3')
let A: School
let kur: StaffActor, guruA: StaffActor, guruB: StaffActor, waliA: StaffActor, tu: StaffActor
let roomA = '', roomB = '', termId = '', mtkA = '', ipaA = '', mtkB = ''
let alya = '', bima = '', citra = ''
let ortuAlya: AccountActor, siswaAlya: AccountActor, ortuCitra: AccountActor
// a Monday inside the term, in the past week so attendance is within the window
const now = new Date('2026-08-12T02:00:00Z') // Rabu 12 Agustus 2026, 10.00 WITA
const MON = '2026-08-10'

async function family(email: string, name: string) {
  await signUp(ctxAnon(A), { name, email, password: 'rahasia-keluarga-01' })
  await processOutbox(A.db, A.school)
  const m = await A.db.select().from(mailLog).where(eq(mailLog.to, email))
  await verifyEmail(ctxAnon(A), /[?&]t=([A-Za-z0-9_-]+)/.exec(m[0]!.body!)![1]!)
  return (await accountFromToken(A, (await signIn(ctxAnon(A), { login: email, password: 'rahasia-keluarga-01' })).token))!
}

beforeAll(async () => {
  A = await h.school('day')
  kur = await staff(A, ['kurikulum', 'humas'])
  guruA = await staff(A, ['guru'], 'Guru A')
  guruB = await staff(A, ['guru'], 'Guru B')
  waliA = await staff(A, ['guru'], 'Wali A')
  tu = await staff(A, ['tata_usaha'])
  const k = ctxStaff(A, kur, now)
  const y = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
  await academic.activateYear(k, y)
  await academic.saveGradeLevel(k, { name: 'VII', ordinal: 7, final: false })
  const ov = await academic.academicOverview(k)
  termId = ov.terms.find((t) => t.yearId === y && t.ordinal === 1)!.id
  roomA = await academic.saveHomeroom(k, { yearId: y, gradeLevelId: ov.levels[0]!.id, name: 'VII A', homeroomTeacherId: waliA.id, room: 'R7A', capacity: 30 })
  roomB = await academic.saveHomeroom(k, { yearId: y, gradeLevelId: ov.levels[0]!.id, name: 'VII B', homeroomTeacherId: null, room: 'R7B', capacity: 30 })
  await academic.saveSubject(k, { code: 'MTK', name: 'Matematika', group: null, ordinal: 1, active: true })
  await academic.saveSubject(k, { code: 'IPA', name: 'IPA', group: null, ordinal: 2, active: true })
  const subs = (await academic.academicOverview(k)).subjects
  await academic.saveAssignment(k, { termId, homeroomId: roomA, subjectId: subs[0]!.id, teacherId: guruA.id, hoursPerWeek: 4 })
  await academic.saveAssignment(k, { termId, homeroomId: roomA, subjectId: subs[1]!.id, teacherId: guruB.id, hoursPerWeek: 4 })
  await academic.saveAssignment(k, { termId, homeroomId: roomB, subjectId: subs[0]!.id, teacherId: guruA.id, hoursPerWeek: 4 })
  const as = await academic.assignmentsOfTerm(k, termId)
  mtkA = as.find((a) => a.homeroom === 'VII A' && a.subjectCode === 'MTK')!.a.id
  ipaA = as.find((a) => a.homeroom === 'VII A' && a.subjectCode === 'IPA')!.a.id
  mtkB = as.find((a) => a.homeroom === 'VII B')!.a.id
  const t = ctxStaff(A, tu, new Date('2026-07-13T01:00:00Z'))
  alya = await S.createStudent(t, { fullName: 'Alya' }, { homeroomId: roomA })
  bima = await S.createStudent(t, { fullName: 'Bima' }, { homeroomId: roomA })
  citra = await S.createStudent(t, { fullName: 'Citra' }, { homeroomId: roomB })
  // families
  ortuAlya = await family('ortu.alya@uji.test', 'Ortu Alya')
  const link = await S.addGuardian(t, alya, { relation: 'ibu', fullName: 'Ortu Alya', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true })
  await S.redeemCode(ctxAccount(A, ortuAlya), (await S.issueGuardianCode(ctxStaff(A, tu), link)).code)
  ortuCitra = await family('ortu.citra@uji.test', 'Ortu Citra')
  const link2 = await S.addGuardian(t, citra, { relation: 'ibu', fullName: 'Ortu Citra', phone: null, email: null, occupation: null, education: null, nik: null, isPrimary: true })
  await S.redeemCode(ctxAccount(A, ortuCitra), (await S.issueGuardianCode(ctxStaff(A, tu), link2)).code)
  const acc = await S.createAccountFor(t, { studentId: alya }, 'siswa.alya')
  siswaAlya = (await accountFromToken(A, (await signIn(ctxAnon(A), { login: acc.login, password: acc.temporaryPassword })).token))!
})
afterAll(() => h.cleanup())

describe('DAY-01 jadwal', () => {
  it('bentrok guru menahan publikasi; pengecualian & guru pengganti berlaku per tanggal', async () => {
    const k = ctxStaff(A, kur, now)
    await sch.saveSlots(k, [
      { ordinal: 1, label: 'Jam 1', startTime: '07:00', endTime: '07:40', kind: 'lesson' },
      { ordinal: 2, label: 'Jam 2', startTime: '07:40', endTime: '08:20', kind: 'lesson' },
      { ordinal: 3, label: 'Istirahat', startTime: '08:20', endTime: '08:40', kind: 'break' },
    ])
    const sl = await A.db.select().from(timeSlots)
    const j1 = sl.find((s) => s.ordinal === 1)!.id
    const j2 = sl.find((s) => s.ordinal === 2)!.id
    const v = await sch.newVersion(k, termId, null)
    await sch.setCell(k, v, { homeroomId: roomA, day: 1, slotId: j1, assignmentId: mtkA, room: 'R7A' })
    await sch.setCell(k, v, { homeroomId: roomB, day: 1, slotId: j1, assignmentId: mtkB, room: 'R7B' }) // Guru A twice
    await sch.setCell(k, v, { homeroomId: roomA, day: 1, slotId: j2, assignmentId: ipaA, room: 'R7A' })
    await expect(sch.setCell(k, v, { homeroomId: roomA, day: 1, slotId: sl.find((s) => s.ordinal === 3)!.id, assignmentId: ipaA, room: null })).rejects.toThrow(/istirahat/)
    expect((await sch.conflicts(A.db, v)).map((c) => c.kind)).toEqual(['guru'])
    await expect(sch.publishVersion(k, v, null)).rejects.toThrow(/bentrok/)
    await sch.setCell(k, v, { homeroomId: roomB, day: 1, slotId: j2, assignmentId: mtkB, room: 'R7B' })
    await sch.setCell(k, v, { homeroomId: roomB, day: 1, slotId: j1, assignmentId: null, room: null })
    await sch.publishVersion(k, v, null)
    const mon = await sch.lessonsOn(A.db, MON, { homeroomId: roomA })
    expect(mon.lessons.map((l) => l.subject)).toEqual(['Matematika', 'IPA'])
    await sch.addException(k, { date: MON, homeroomId: roomA, slotId: j2, kind: 'pengganti', substituteTeacherId: guruA.id, note: 'Guru B dinas' })
    const teacherA = await sch.lessonsOn(A.db, MON, { teacherId: guruA.id })
    expect(teacherA.lessons.map((l) => `${l.homeroom} ${l.slot}`).sort()).toEqual(['VII A Jam 1', 'VII A Jam 2', 'VII B Jam 2'])
    await sch.addException(k, { date: '2026-08-17', homeroomId: null, slotId: null, kind: 'libur', substituteTeacherId: null, note: 'HUT RI' })
    expect((await sch.lessonsOn(A.db, '2026-08-17', { homeroomId: roomA })).holiday).toBe('HUT RI')
  })
  it('sesi pelajaran hanya oleh guru pengampu/pengganti; jurnal tersimpan', async () => {
    const mon = await sch.lessonsOn(A.db, MON, { homeroomId: roomA })
    const mtk = mon.lessons.find((l) => l.subject === 'Matematika')!
    await expect(sch.openLesson(ctxStaff(A, guruB, now), mtk.entryId, MON)).rejects.toMatchObject({ code: 'forbidden' })
    const id = await sch.openLesson(ctxStaff(A, guruA, now), mtk.entryId, MON)
    expect(await sch.openLesson(ctxStaff(A, guruA, now), mtk.entryId, MON)).toBe(id)
    await sch.saveJournal(ctxStaff(A, guruA, now), id, { topic: 'Bilangan bulat', notes: null, realization: 'sesuai' })
    await att.saveLessonAttendance(ctxStaff(A, guruA, now), id, [{ studentId: alya, status: 'H', note: null }, { studentId: citra, status: 'A', note: null }])
    const roll = await att.lessonRoll(ctxStaff(A, guruA, now), id)
    expect(roll.map((r) => r.record?.status ?? null)).toEqual(['H', null]) // Citra is not in VII A: ignored
  })
})

describe('DAY-02 presensi & izin', () => {
  it('wali kelas mengisi; bukan wali ditolak; lewat batas → koreksi', async () => {
    await expect(att.saveDaily(ctxStaff(A, guruA, now), roomA, MON, [{ studentId: alya, status: 'H', note: null }])).rejects.toMatchObject({ code: 'forbidden' })
    expect(await att.saveDaily(ctxStaff(A, waliA, now), roomA, MON, [{ studentId: alya, status: 'A', note: null }, { studentId: bima, status: 'H', note: null }])).toBe(2)
    await expect(att.saveDaily(ctxStaff(A, waliA, now), roomA, '2026-07-20', [{ studentId: alya, status: 'H', note: null }])).rejects.toThrow(/koreksi/)
    await expect(att.saveDaily(ctxStaff(A, waliA, now), roomA, '2026-08-13', [{ studentId: alya, status: 'H', note: null }])).rejects.toThrow(/mendatang/)
  })
  it('izin dari orang tua disetujui wali kelas → presensi berubah; keluarga lain tidak bisa', async () => {
    await expect(att.requestLeave(ctxAccount(A, ortuCitra, now), { studentId: alya, kind: 'sakit', fromDate: MON, toDate: MON, reason: 'Demam tinggi', file: null })).rejects.toMatchObject({ code: 'forbidden' })
    const id = await att.requestLeave(ctxAccount(A, ortuAlya, now), { studentId: alya, kind: 'sakit', fromDate: MON, toDate: '2026-08-11', reason: 'Demam tinggi', file: pdf() })
    expect((await att.pendingLeaves(ctxStaff(A, waliA, now))).map((l) => l.l.id)).toContain(id)
    expect(await att.pendingLeaves(ctxStaff(A, guruA, now))).toHaveLength(0)
    await att.decideLeave(ctxStaff(A, waliA, now), id, true, null)
    const r = await att.recap(A.db, alya, '2026-08-01', '2026-08-31')
    expect(r.S).toBe(2)
    expect(r.A).toBe(0)
  })
})

describe('DAY-03 tugas', () => {
  let task = ''
  it('guru pengampu membuat; siswa kelas lain tidak melihat; orang tua tidak bisa mengumpulkan', async () => {
    await expect(learn.saveTask(ctxStaff(A, guruB, now), { assignmentId: mtkA, title: 'X', kind: 'tugas', instructions: null, dueAt: null, maxScore: 100, allowLate: true, submissionType: 'file_or_text', publish: true }, [])).rejects.toMatchObject({ code: 'forbidden' })
    task = await learn.saveTask(ctxStaff(A, guruA, now), { assignmentId: mtkA, title: 'Operasi bilangan', kind: 'tugas', instructions: 'Kerjakan 1–10', dueAt: new Date('2026-08-11T15:00:00Z'), maxScore: 100, allowLate: true, submissionType: 'file_or_text', publish: true }, [pdf()])
    const list = await learn.tasksForStudent(ctxAccount(A, siswaAlya, now), alya)
    expect(list.map((t) => [t.t.title, t.state])).toEqual([['Operasi bilangan', 'terlambat']])
    expect(await learn.tasksForStudent(ctxAccount(A, ortuCitra, now), citra)).toHaveLength(0)
    await expect(learn.tasksForStudent(ctxAccount(A, ortuCitra, now), alya)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(learn.submitTask(ctxAccount(A, ortuAlya, now), task, 'jawaban', [])).rejects.toThrow(/akun siswa/)
    const r = await learn.submitTask(ctxAccount(A, siswaAlya, now), task, 'Jawaban saya', [pdf()])
    expect(r).toEqual({ version: 1, late: true })
    await learn.reviewSubmission(ctxStaff(A, guruA, now), task, alya, { score: 85, feedback: 'Bagus', needsRevision: false })
    await expect(learn.submitTask(ctxAccount(A, siswaAlya, now), task, 'lagi', [])).rejects.toThrow(/sudah dinilai/)
    const parent = await learn.tasksForStudent(ctxAccount(A, ortuAlya, now), alya)
    expect(parent[0]!.state).toBe('dinilai')
    expect(parent[0]!.review?.score).toBe('85.00')
  })
})

describe('DAY-04 pengumuman', () => {
  it('ke rombel: hanya keluarga rombel itu; wali kelas hanya ke rombelnya; konfirmasi baca', async () => {
    await expect(comms.saveAnnouncement(ctxStaff(A, waliA, now), { title: 'X', body: 'Y', audience: { type: 'all' }, publishAt: null, requiresAck: false, pinned: false, publish: true }, [])).rejects.toMatchObject({ code: 'forbidden' })
    const id = await comms.saveAnnouncement(ctxStaff(A, waliA, now), { title: 'Class meeting', body: 'Bawa bekal', audience: { type: 'homerooms', ids: [roomA] }, publishAt: null, requiresAck: true, pinned: false, publish: true }, [])
    expect((await comms.familyFeed(ctxAccount(A, ortuAlya, now))).map((x) => x.a.id)).toEqual([id])
    expect((await comms.familyFeed(ctxAccount(A, siswaAlya, now))).map((x) => x.a.id)).toEqual([id])
    expect(await comms.familyFeed(ctxAccount(A, ortuCitra, now))).toHaveLength(0)
    await comms.markRead(ctxAccount(A, ortuAlya, now), id, true)
    const m = await comms.manageList(ctxStaff(A, waliA, now))
    expect(m[0]!.stats).toMatchObject({ total: 2, ack: 1 })
    // reading: recipients only; opening marks read
    expect((await comms.readAnnouncement(ctxAccount(A, siswaAlya, now), id)).receipt).toBeTruthy()
    await expect(comms.readAnnouncement(ctxAccount(A, ortuCitra, now), id)).rejects.toMatchObject({ code: 'not_found' })
    expect((await comms.manageList(ctxStaff(A, waliA, now)))[0]!.stats.read).toBe(2)
  })
  it('draf hanya diterbitkan pembuatnya (atau humas); konten draf tidak terlihat penerima', async () => {
    const draft = await comms.saveAnnouncement(ctxStaff(A, kur, now), { title: 'Draf', body: 'Isi', audience: { type: 'homerooms', ids: [roomA] }, publishAt: null, requiresAck: false, pinned: false, publish: false }, [])
    await expect(comms.readAnnouncement(ctxAccount(A, ortuAlya, now), draft)).rejects.toMatchObject({ code: 'not_found' })
    await expect(comms.publishDraft(ctxStaff(A, waliA, now), draft)).rejects.toMatchObject({ code: 'forbidden' })
    await comms.publishDraft(ctxStaff(A, kur, now), draft)
    expect((await comms.familyFeed(ctxAccount(A, ortuAlya, now))).some((x) => x.a.id === draft)).toBe(true)
  })
})

describe('DAY-05 layanan TU', () => {
  it('orang tua mengajukan untuk anaknya; catatan internal tidak terlihat; selesai dengan dokumen', async () => {
    const types = await svc.catalogue(A.db)
    const aktif = types.find((t) => t.code === 'ket_aktif')!
    await expect(svc.submitRequest(ctxAccount(A, ortuCitra, now), { typeId: aktif.id, studentId: alya, answers: { keperluan: 'Beasiswa' }, purpose: null, file: null })).rejects.toMatchObject({ code: 'forbidden' })
    const id = await svc.submitRequest(ctxAccount(A, ortuAlya, now), { typeId: aktif.id, studentId: alya, answers: { keperluan: 'Beasiswa' }, purpose: 'Beasiswa daerah', file: null })
    const t = ctxStaff(A, tu, now)
    await svc.processRequest(t, id, 'take', null, { file: null, number: null })
    await svc.processRequest(t, id, 'note', 'cek data dulu (internal)', { file: null, number: null })
    await svc.processRequest(t, id, 'complete', 'Silakan unduh', { file: null, number: '421/SMP/2026' })
    const v = await svc.requestView(ctxAccount(A, ortuAlya, now), id)
    expect(v.r.status).toBe('completed')
    expect(v.events.some((e) => e.note?.includes('internal'))).toBe(false)
    expect((await svc.requestView(t, id)).events.some((e) => e.internal)).toBe(true)
    // system letter: requester and TU only
    const l = await svc.activeLetter(ctxAccount(A, ortuAlya, now), id)
    expect(l.student.name).toBe('Alya')
    expect(l.homeroom).toBe('VII A')
    await expect(svc.activeLetter(ctxAccount(A, ortuCitra, now), id)).rejects.toMatchObject({ code: 'forbidden' })
  })
})
