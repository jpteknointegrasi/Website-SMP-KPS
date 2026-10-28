/**
 * MOD-02: module activation guards actions, not only pages — every form action is mapped to its module (or
 * explicitly unbound), and a form posted directly to a closed module's action is refused ("modul belum aktif") for
 * staff (Direncanakan) and for families (before Pilot).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import '@/modules/register'
import * as academic from '@/modules/academic/service'
import * as S from '@/modules/students/service'
import { setModuleState } from '@/modules/admin/service'
import { signIn, signUp, verifyEmail } from '@/modules/identity/service'
import { processOutbox } from '@/server/outbox'
import { ACTION_MODULES, actionModuleOpen, actionNames, UNBOUND_ACTION_PREFIXES } from '@/server/actions'
import { dispatchAction } from '@/server/dispatch'
import { MODULES } from '@/server/settings'
import { libraryBooks, mailLog } from '@/db/schema'
import { accountFromToken, ctxAccount, ctxAnon, ctxStaff, harness, staff, type School } from './helpers'
import type { AccountActor, StaffActor } from '@/server/context'

const h = harness('t9')
let A: School
let admin: StaffActor, pustakawan: StaffActor
let ortu: AccountActor
let alya = ''
const now = new Date('2026-10-12T02:00:00Z')

beforeAll(async () => {
  A = await h.school('modul')
  admin = await staff(A, ['school_admin'])
  pustakawan = await staff(A, ['pustakawan'])
  const k = ctxStaff(A, admin, now)
  const y = await academic.saveYear(k, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
  await academic.activateYear(k, y)
  await academic.saveGradeLevel(k, { name: 'VII', ordinal: 7, final: false })
  const ov = await academic.academicOverview(k)
  const room = await academic.saveHomeroom(k, { yearId: y, gradeLevelId: ov.levels[0]!.id, name: 'VII A', homeroomTeacherId: null, room: null, capacity: 30 })
  alya = await S.createStudent(ctxStaff(A, admin, new Date('2026-07-13T01:00:00Z')), { fullName: 'Alya', nis: '2001' }, { homeroomId: room })
  await signUp(ctxAnon(A), { name: 'Ortu', email: 'ortu@modul.test', password: 'rahasia-keluarga-01' })
  await processOutbox(A.db, A.school)
  const m = await A.db.select().from(mailLog).where(eq(mailLog.to, 'ortu@modul.test'))
  await verifyEmail(ctxAnon(A), /[?&]t=([A-Za-z0-9_-]+)/.exec(m[0]!.body!)![1]!)
  ortu = (await accountFromToken(A, (await signIn(ctxAnon(A), { login: 'ortu@modul.test', password: 'rahasia-keluarga-01' })).token))!
})
afterAll(() => h.cleanup())

const post = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}
const location = (r: Response) => r.headers.get('location')

describe('MOD-02 modul tertutup menolak aksi, bukan hanya halaman', () => {
  it('setiap aksi terdaftar dipetakan ke modul atau sengaja tidak terikat modul', () => {
    const codes = new Set<string>(MODULES.map((m) => m.code))
    for (const mods of Object.values(ACTION_MODULES)) for (const c of mods) expect(codes.has(c)).toBe(true)
    const unknown = actionNames().filter((n) => {
      const p = n.split('.')[0]!
      return !(p in ACTION_MODULES) && !UNBOUND_ACTION_PREFIXES.includes(p)
    })
    expect(unknown).toEqual([])
  })

  it('staf: aksi perpustakaan langsung (POST) ditolak saat Direncanakan, berjalan sejak Konfigurasi', async () => {
    const p = ctxStaff(A, pustakawan, now)
    const form = { _kembali: '/staf/perpustakaan', kode: 'M1', judul: 'Buku Uji', eksemplar: '1', aktif: 'on' }
    const r1 = await dispatchAction(p, 'pustaka.buku', post(form))
    expect(location(r1)).toBe('/portal/modul-belum-aktif')
    expect(await A.db.select().from(libraryBooks)).toHaveLength(0)
    await setModuleState(ctxStaff(A, admin, now), 'perpustakaan', 'configuring')
    const r2 = await dispatchAction(ctxStaff(A, pustakawan, now), 'pustaka.buku', post(form))
    expect(location(r2)).not.toBe('/portal/modul-belum-aktif')
    expect(await A.db.select().from(libraryBooks)).toHaveLength(1)
  })

  it('keluarga: aksi modul berstatus Konfigurasi ditolak; terbuka sejak Pilot; aksi akun selalu terbuka', async () => {
    await setModuleState(ctxStaff(A, admin, now), 'kesiswaan', 'configuring')
    const f = ctxAccount(A, ortu, now)
    const form = { _kembali: '/keluarga/kesiswaan', kategori: 'lainnya', uraian: 'Laporan uji yang cukup panjang untuk diterima.' }
    expect(location(await dispatchAction(f, 'laporan.kirim', post(form)))).toBe('/portal/modul-belum-aktif')
    expect(await actionModuleOpen(ctxStaff(A, admin, now), 'laporan.kirim')).toBe(true) // staff from Konfigurasi
    await setModuleState(ctxStaff(A, admin, now), 'kesiswaan', 'pilot')
    expect(await actionModuleOpen(ctxAccount(A, ortu, now), 'laporan.kirim')).toBe(true)
    // not module-bound: sign-in/account actions stay open whatever the modules say
    expect(await actionModuleOpen(f, 'akun.keluar')).toBe(true)
    expect(await actionModuleOpen(ctxAnon(A, now), 'akun.daftar')).toBe(true)
    // anonymous visitors count as family audience (e.g. applicants)
    expect(await actionModuleOpen(ctxAnon(A, now), 'ppdb.mulai')).toBe(false)
    void alya
  })
})
