import { defineAction, type Form } from '@/server/actions'
import { fail } from '@/server/errors'
import { formFile } from '@/server/files'
import { isDate, today } from '@/server/time'
import { STUDENT_FIELDS } from './fields'
import { onceCookie } from '@/server/once'
import * as S from './service'
import { cancelImport, commitImport, startImport, validateImport, IMPORT_TARGETS } from './import'
import * as A from '../academic/service'

/** Identity fields present in the submitted form (sensitive ones only when the form contained them). */
const identity = (f: Form) => {
  const out: Record<string, string | null> = {}
  for (const d of STUDENT_FIELDS) if (f.data.has(d.key)) out[d.key] = f.str(d.key)
  return out
}

defineAction('siswa.tambah', async (ctx, f) => {
  const id = await S.createStudent(ctx, identity(f), { homeroomId: f.uuid('rombel'), key: f.opKey })
  return { redirect: `/staf/siswa/${id}`, message: 'Siswa ditambahkan ke Buku Induk.' }
})
defineAction('siswa.ubah', async (ctx, f) => {
  const id = f.uuid('id', 'Siswa tidak dikenal.')!
  await S.updateStudent(ctx, id, identity(f), f.version)
  return { redirect: `/staf/siswa/${id}`, message: 'Data siswa disimpan. Status verifikasi direset untuk ditinjau ulang.' }
})
defineAction('siswa.verifikasi', async (ctx, f) => {
  await S.verifyStudent(ctx, f.uuid('id', 'Siswa tidak dikenal.')!)
  return { message: 'Data siswa ditandai terverifikasi.' }
})
defineAction('siswa.status', async (ctx, f) => {
  const date = f.str('tanggal') || today(ctx.tz, ctx.now)
  if (!isDate(date)) fail('Tanggal tidak valid.')
  await S.setStudentStatus(ctx, f.uuid('id', 'Siswa tidak dikenal.')!, f.str('status'), { date, reason: f.opt('alasan') })
  return { message: 'Status siswa diperbarui.' }
})
defineAction('siswa.rombel', async (ctx, f) => {
  const date = f.str('tanggal') || today(ctx.tz, ctx.now)
  if (!isDate(date)) fail('Tanggal tidak valid.')
  await S.moveStudent(ctx, f.uuid('id', 'Siswa tidak dikenal.')!, f.uuid('rombel', 'Pilih rombel.')!, date)
  return { message: 'Penempatan rombel disimpan.' }
})
defineAction('siswa.dokumen', async (ctx, f) => {
  const file = await formFile(f.data, 'berkas')
  if (!file) fail('Pilih berkas yang akan diunggah.')
  await S.addStudentDocument(ctx, f.uuid('id', 'Siswa tidak dikenal.')!, f.str('jenis'), file!, f.opt('catatan', 200))
  return { message: 'Dokumen diunggah.' }
})
defineAction('wali.tambah', async (ctx, f) => {
  await S.addGuardian(ctx, f.uuid('id', 'Siswa tidak dikenal.')!, {
    relation: f.str('hubungan'),
    fullName: f.str('nama'),
    phone: f.opt('telepon', 30),
    email: f.opt('email', 120),
    occupation: f.opt('pekerjaan', 80),
    education: f.opt('pendidikan', 60),
    nik: f.opt('nik', 20),
    isPrimary: f.bool('utama'),
  })
  return { message: 'Data orang tua/wali ditambahkan (terverifikasi petugas).' }
})
defineAction('wali.ubah', async (ctx, f) => {
  await S.updateGuardianPerson(ctx, f.uuid('link', 'Data tidak dikenal.')!, { fullName: f.str('nama', { required: 'Isi nama.' }), phone: f.opt('telepon', 30), email: f.opt('email', 120), occupation: f.opt('pekerjaan', 80), education: f.opt('pendidikan', 60) })
  return { message: 'Data wali disimpan.' }
})
defineAction('wali.izin', async (ctx, f) => {
  const validTo = f.opt('berlaku_sampai', 10)
  if (validTo && !isDate(validTo)) fail('Tanggal tidak valid.')
  await S.setLinkPermissions(ctx, f.uuid('link', 'Data tidak dikenal.')!, { canViewAcademic: f.bool('akademik'), canViewFinance: f.bool('keuangan'), isPrimary: f.bool('utama'), validTo })
  return { message: 'Hak akses wali diperbarui.' }
})
defineAction('wali.cabut', async (ctx, f) => {
  await S.revokeLink(ctx, f.uuid('link', 'Data tidak dikenal.')!, f.str('alasan'))
  return { message: 'Relasi wali dicabut. Akses portal wali ke siswa ini berhenti.' }
})
defineAction('wali.kode', async (ctx, f) => {
  const link = f.uuid('link', 'Data tidak dikenal.')!
  const r = await S.issueGuardianCode(ctx, link)
  // the code is shown once on the next page (never stored in plain text)
  return { message: 'Kode aktivasi dibuat. Berikan kepada wali; kode hanya tampil sekali.', cookies: [onceCookie({ kind: 'code', code: r.code, link })] }
})
defineAction('akun.buat_untuk', async (ctx, f) => {
  const r = await S.createAccountFor(ctx, { linkId: f.uuid('link') ?? undefined, studentId: f.uuid('siswa') ?? undefined }, f.str('login', { required: 'Isi nama pengguna/email.' }))
  return { message: 'Akun dibuat. Catat kata sandi sementara; hanya tampil sekali.', cookies: [onceCookie({ kind: 'password', login: r.login, password: r.temporaryPassword })] }
})
defineAction('akun.reset_staf', async (ctx, f) => {
  const r = await S.resetAccountPassword(ctx, f.uuid('akun', 'Akun tidak dikenal.')!)
  return { message: 'Kata sandi sementara dibuat; hanya tampil sekali.', cookies: [onceCookie({ kind: 'password', login: r.login, password: r.temporaryPassword })] }
})
defineAction('akun.status', async (ctx, f) => {
  await S.setAccountStatus(ctx, f.uuid('akun', 'Akun tidak dikenal.')!, f.str('aktif') === '1')
  return { message: 'Status akun diperbarui.' }
})
defineAction('akun.kode', async (ctx, f) => {
  const r = await S.redeemCode(ctx, f.str('kode', { required: 'Isi kode aktivasi.' }))
  return { redirect: '/keluarga', message: r.kind === 'student' ? 'Akun siswa terhubung.' : 'Akun Anda terhubung dengan data siswa.' }
})
defineAction('koreksi.ajukan', async (ctx, f) => {
  const studentId = f.uuid('id', 'Siswa tidak dikenal.')!
  const changes: Record<string, string> = {}
  for (const d of STUDENT_FIELDS) {
    const v = f.data.get(`baru_${d.key}`)
    if (typeof v === 'string' && v.trim() !== '' && f.bool(`ubah_${d.key}`)) changes[d.key] = v
    else if (f.bool(`ubah_${d.key}`) && typeof v === 'string') changes[d.key] = ''
  }
  await S.requestCorrection(ctx, studentId, changes, f.str('alasan'), await formFile(f.data, 'bukti'))
  return { message: 'Usulan koreksi dikirim untuk ditinjau petugas.' }
})
defineAction('koreksi.putuskan', async (ctx, f) => {
  const d = f.oneOf('keputusan', ['approve', 'reject', 'needs_info'] as const, 'Pilih keputusan.')!
  await S.reviewCorrection(ctx, f.uuid('id', 'Usulan tidak dikenal.')!, d, f.opt('catatan', 500), f.version)
  return { redirect: '/staf/siswa/koreksi', message: d === 'approve' ? 'Perubahan disetujui dan diterapkan ke Buku Induk.' : d === 'reject' ? 'Usulan ditolak.' : 'Pengusul diminta melengkapi informasi.' }
})
defineAction('impor.unggah', async (ctx, f) => {
  const file = await formFile(f.data, 'berkas')
  if (!file) fail('Pilih berkas Excel (.xlsx) atau CSV.')
  const id = await startImport(ctx, file!)
  return { redirect: `/staf/siswa/impor/${id}`, message: 'Berkas dibaca. Periksa pemetaan kolom.' }
})
defineAction('impor.petakan', async (ctx, f) => {
  const id = f.uuid('id', 'Impor tidak dikenal.')!
  const mapping: Record<string, string> = {}
  for (const [k, v] of f.data.entries()) if (k.startsWith('kolom:') && typeof v === 'string' && v && IMPORT_TARGETS.some((t) => t.key === v)) mapping[k.slice(6)] = v
  const s = await validateImport(ctx, id, mapping)
  return { redirect: `/staf/siswa/impor/${id}?langkah=3`, message: `Validasi selesai: ${s.valid} valid, ${s.review} perlu review, ${s.error} galat.` }
})
defineAction('impor.konfirmasi', async (ctx, f) => {
  const id = f.uuid('id', 'Impor tidak dikenal.')!
  const r = await commitImport(ctx, id, f.opKey)
  return { redirect: `/staf/siswa/impor/${id}?langkah=4`, message: `${r.created} siswa diimpor ke Buku Induk.` }
})
defineAction('impor.batal', async (ctx, f) => {
  await cancelImport(ctx, f.uuid('id', 'Impor tidak dikenal.')!)
  return { redirect: '/staf/siswa/impor', message: 'Impor dibatalkan.' }
})

// ---------- academic master data ----------
defineAction('akademik.tahun', async (ctx, f) => {
  await A.saveYear(ctx, { id: f.uuid('id'), name: f.str('nama'), startDate: f.str('mulai'), endDate: f.str('selesai') })
  return { message: 'Tahun ajaran disimpan (semester Ganjil & Genap dibuat otomatis).' }
})
defineAction('akademik.tahun_aktif', async (ctx, f) => {
  await A.activateYear(ctx, f.uuid('id', 'Tahun ajaran tidak dikenal.')!)
  return { message: 'Tahun ajaran aktif diganti.' }
})
defineAction('akademik.semester', async (ctx, f) => {
  await A.saveTerm(ctx, f.uuid('id', 'Semester tidak dikenal.')!, { startDate: f.str('mulai'), endDate: f.str('selesai'), status: f.str('status') })
  return { message: 'Semester disimpan.' }
})
defineAction('akademik.tingkat', async (ctx, f) => {
  await A.saveGradeLevel(ctx, { id: f.uuid('id'), name: f.str('nama'), ordinal: f.int('urutan', { required: 'Isi urutan.' })!, final: f.bool('akhir') })
  return { message: 'Tingkat disimpan.' }
})
defineAction('akademik.rombel', async (ctx, f) => {
  await A.saveHomeroom(ctx, {
    id: f.uuid('id'),
    yearId: f.uuid('tahun', 'Pilih tahun ajaran.')!,
    gradeLevelId: f.uuid('tingkat', 'Pilih tingkat.')!,
    name: f.str('nama'),
    homeroomTeacherId: f.uuid('wali_kelas'),
    room: f.opt('ruang', 40),
    capacity: f.int('kapasitas', { min: 1, max: 60 }),
  })
  return { message: 'Rombel disimpan.' }
})
defineAction('akademik.mapel', async (ctx, f) => {
  await A.saveSubject(ctx, { id: f.uuid('id'), code: f.str('kode'), name: f.str('nama'), group: f.opt('kelompok', 60), ordinal: f.int('urutan') ?? 0, active: f.has('aktif_ada') ? f.bool('aktif') : true })
  return { message: 'Mata pelajaran disimpan.' }
})
defineAction('akademik.penugasan', async (ctx, f) => {
  await A.saveAssignment(ctx, { termId: f.uuid('semester', 'Pilih semester.')!, homeroomId: f.uuid('rombel', 'Pilih rombel.')!, subjectId: f.uuid('mapel', 'Pilih mapel.')!, teacherId: f.uuid('guru', 'Pilih guru.')!, hoursPerWeek: f.int('jam', { min: 0, max: 40 }) })
  return { message: 'Penugasan mengajar disimpan.' }
})
defineAction('akademik.penugasan_hapus', async (ctx, f) => {
  await A.removeAssignment(ctx, f.uuid('id', 'Data tidak dikenal.')!)
  return { message: 'Penugasan dinonaktifkan.' }
})
