/**
 * SEC-01..04 (findings of the independent audit): restricted roles cannot be self-granted nor granted by staff.manage
 * alone; guarded roles of a pre-registered e-mail are withdrawn on first binding; a homeroom teacher sees a BK case
 * only after something was shared; UKS visits stay out of the student history.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq, isNull } from 'drizzle-orm'
import * as academic from '@/modules/academic/service'
import * as S from '@/modules/students/service'
import * as BK from '@/modules/counseling/service'
import * as H from '@/modules/health/service'
import { addStaff, setStaffRoles } from '@/modules/admin/service'
import { loadStaff } from '@/server/context'
import { staffMembers, staffRoles } from '@/db/schema'
import { ctxStaff, harness, staff, type School } from './helpers'
import type { StaffActor } from '@/server/context'

const h = harness('t6')
let A: School
let admin: StaffActor, kepala: StaffActor, guru: StaffActor, wali: StaffActor, bk: StaffActor, uks: StaffActor
let alya = ''
const now = new Date('2026-10-12T02:00:00Z')

beforeAll(async () => {
  A = await h.school('sec')
  admin = await staff(A, ['school_admin'])
  kepala = await staff(A, ['pimpinan'], 'Kepala')
  guru = await staff(A, ['guru'])
  wali = await staff(A, ['guru'], 'Wali')
  bk = await staff(A, ['bk'], 'BK')
  uks = await staff(A, ['petugas_uks'])
  const k = ctxStaff(A, admin, now)
  const y = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
  await academic.activateYear(k, y)
  await academic.saveGradeLevel(k, { name: 'VII', ordinal: 7, final: false })
  const ov = await academic.academicOverview(k)
  const room = await academic.saveHomeroom(k, { yearId: y, gradeLevelId: ov.levels[0]!.id, name: 'VII A', homeroomTeacherId: wali.id, room: null, capacity: 30 })
  alya = await S.createStudent(ctxStaff(A, admin, new Date('2026-07-13T01:00:00Z')), { fullName: 'Alya' }, { homeroomId: room })
})
afterAll(() => h.cleanup())

const rolesOf = async (id: string) => (await A.db.select().from(staffRoles).where(and(eq(staffRoles.staffId, id), isNull(staffRoles.revokedAt)))).map((r) => r.role).sort()

describe('SEC-01 peran terbatas', () => {
  it('admin tidak bisa memberi dirinya/orang lain peran BK/UKS; pimpinan bisa untuk orang lain, tidak untuk diri sendiri', async () => {
    await expect(setStaffRoles(ctxStaff(A, admin, now), admin.id, ['school_admin', 'koordinator_bk'])).rejects.toThrow(/diri sendiri/)
    await expect(setStaffRoles(ctxStaff(A, admin, now), guru.id, ['guru', 'petugas_uks'])).rejects.toThrow(/pimpinan/)
    await expect(setStaffRoles(ctxStaff(A, admin, now), admin.id, ['school_admin', 'pimpinan'])).rejects.toThrow(/diri sendiri/)
    // admin edits ordinary roles; restricted ones are kept as they are
    await setStaffRoles(ctxStaff(A, admin, now), bk.id, ['guru'])
    expect(await rolesOf(bk.id)).toEqual(['bk', 'guru'])
    await setStaffRoles(ctxStaff(A, kepala, now), guru.id, ['guru', 'bk'])
    expect(await rolesOf(guru.id)).toEqual(['bk', 'guru'])
    await expect(setStaffRoles(ctxStaff(A, kepala, now), kepala.id, ['pimpinan', 'petugas_uks'])).rejects.toThrow(/diri sendiri/)
    await expect(addStaff(ctxStaff(A, admin, now), { email: 'baru@uji.test', name: 'Baru', roles: ['petugas_uks'] })).rejects.toThrow(/masuk pertama kali/)
  })
  it('peran terjaga pada email pra-daftar dicabut saat akun pertama kali terhubung', async () => {
    const [row] = await A.db.insert(staffMembers).values({ email: 'calon@uji.test', name: 'Calon' }).returning()
    await A.db.insert(staffRoles).values([{ staffId: row!.id, role: 'koordinator_bk' }, { staffId: row!.id, role: 'guru' }])
    const actor = await loadStaff(A.db, { id: 777, email: 'calon@uji.test', name: 'Calon', role: 'editor', schoolId: A.school.id } as never, now)
    expect([...actor!.roles]).toEqual(['guru'])
    expect(actor!.perms.has('counseling')).toBe(false)
  })
})

describe('SEC-02 BK & UKS', () => {
  it('wali kelas tidak melihat kasus sebelum ada ringkasan yang dibagikan; kunjungan UKS tidak muncul di riwayat siswa', async () => {
    const id = await BK.requestCase(ctxStaff(A, guru, now), { studentId: alya, category: 'pribadi', urgency: 'normal', request: 'RAHASIA permintaan dari guru untuk siswa', preferredTime: null })
    await expect(BK.caseView(ctxStaff(A, wali, now), id)).rejects.toMatchObject({ code: 'forbidden' })
    const bkActor = { ...bk, roles: new Set([...bk.roles]) }
    await BK.takeCase(ctxStaff(A, bkActor, now), id)
    await BK.addSession(ctxStaff(A, bkActor, now), id, { date: '2026-10-11', mode: 'tatap_muka', notes: 'RAHASIA', sharedSummary: 'Pendampingan berjalan.', shareWithGuardian: false, shareWithHomeroom: true, followUpOn: null })
    const v = await BK.caseView(ctxStaff(A, wali, now), id)
    expect(JSON.stringify(v)).not.toMatch(/RAHASIA/)
    expect(v.sessions).toHaveLength(1)
    await H.recordVisit(ctxStaff(A, uks, now), { studentId: alya, at: new Date(now.getTime() - 60_000), complaint: 'Pusing', action: null, notes: null, outcome: 'kembali_kelas', familyNote: null, notifyGuardian: false, followUpOn: null })
    const hist = await S.studentAudit(ctxStaff(A, admin, now), alya)
    expect(hist.some((e) => e.action.startsWith('health.') || e.action.startsWith('counseling.'))).toBe(false)
  })
})
