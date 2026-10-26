/** Form actions of library, UKS, organisations and alumni. */
import { defineAction } from '@/server/actions'
import { fail } from '@/server/errors'
import { parseLocalDateTime } from '@/server/time'
import * as L from './library/service'
import * as H from './health/service'
import * as O from './organizations/service'
import * as AL from './alumni/service'

// ---------- library ----------
defineAction('pustaka.buku', async (ctx, f) => {
  await L.saveBook(ctx, { id: f.uuid('id'), code: f.str('kode', { max: 40 }), isbn: f.opt('isbn', 20), title: f.str('judul', { max: 300 }), author: f.opt('pengarang', 200), publisher: f.opt('penerbit', 200), year: f.int('tahun', { min: 1800, max: 2100 }), category: f.opt('kategori', 80), location: f.opt('rak', 80), copies: f.int('eksemplar', { min: 0, max: 1000 }) ?? 1, active: !f.has('id') || f.bool('aktif') })
  return { message: 'Data buku disimpan.' }
})
defineAction('pustaka.impor', async (ctx, f) => {
  const n = await L.importBooks(ctx, f.str('data', { max: 300_000 }))
  return { message: `${n} judul diimpor/diperbarui.` }
})
defineAction('pustaka.pinjam', async (ctx, f) => {
  const kind = f.str('peminjam_jenis')
  await L.lend(ctx, f.uuid('buku', 'Pilih buku.')!, kind === 'staf' ? { staffId: f.uuid('staf', 'Pilih staf.') } : { studentId: f.uuid('siswa', 'Pilih siswa.') }, f.int('hari', { min: 1, max: 60 }) ?? L.LOAN_DAYS)
  return { message: 'Peminjaman dicatat.' }
})
defineAction('pustaka.kembali', async (ctx, f) => {
  const a = f.oneOf('aksi', ['return', 'renew', 'lost'] as const, 'Pilih tindakan.')!
  await L.returnLoan(ctx, f.uuid('id', 'Pinjaman?')!, a, f.opt('catatan', 200))
  return { message: a === 'return' ? 'Buku dikembalikan.' : a === 'renew' ? 'Pinjaman diperpanjang.' : 'Buku ditandai hilang.' }
})

// ---------- UKS ----------
defineAction('uks.kunjungan', async (ctx, f) => {
  const at = parseLocalDateTime(f.str('waktu'), ctx.tz)
  if (!at) fail('Isi waktu kunjungan.')
  await H.recordVisit(ctx, { studentId: f.uuid('siswa', 'Pilih siswa.')!, at: at!, complaint: f.str('keluhan', { max: 1000 }), action: f.opt('tindakan', 2000), notes: f.opt('catatan', 4000), outcome: f.str('hasil'), familyNote: f.opt('pesan', 500), notifyGuardian: f.bool('beritahu'), followUpOn: f.str('tindak_lanjut') || null })
  return { message: 'Kunjungan UKS dicatat.' }
})

// ---------- organisations ----------
defineAction('org.simpan', async (ctx, f) => {
  const id = await O.saveOrg(ctx, { id: f.uuid('id'), name: f.str('nama', { max: 120 }), description: f.opt('deskripsi', 1000), advisorId: f.uuid('pembina') })
  return { redirect: `/staf/organisasi/${id}`, message: 'Organisasi disimpan.' }
})
defineAction('org.anggota', async (ctx, f) => {
  await O.setMember(ctx, f.uuid('org', 'Organisasi?')!, f.uuid('siswa', 'Pilih siswa.')!, f.str('jabatan', { max: 60 }), f.bool('pengusul'), !f.bool('nonaktif'))
  return { message: 'Keanggotaan diperbarui.' }
})
defineAction('org.proposal', async (ctx, f) => {
  await O.submitProposal(ctx, f.uuid('org', 'Organisasi?')!, { id: f.uuid('id'), title: f.str('judul', { max: 200 }), description: f.str('uraian', { max: 5000 }), startDate: f.str('mulai'), endDate: f.str('selesai') || f.str('mulai'), location: f.opt('tempat', 120), budget: f.int('anggaran', { min: 0 }), participants: f.opt('peserta', 200), isPublic: f.bool('publik') })
  return { message: 'Proposal diajukan ke pembina.' }
})
defineAction('org.putuskan', async (ctx, f) => {
  const d = f.oneOf('keputusan', ['approve', 'revision', 'reject'] as const, 'Pilih keputusan.')!
  await O.reviewProposal(ctx, f.uuid('id', 'Proposal?')!, d, f.opt('catatan', 1000))
  return { message: d === 'approve' ? 'Proposal disetujui dan masuk kalender kegiatan.' : d === 'revision' ? 'Proposal dikembalikan untuk perbaikan.' : 'Proposal ditolak.' }
})
defineAction('org.laporan', async (ctx, f) => {
  await O.reportProposal(ctx, f.uuid('id', 'Proposal?')!, f.str('laporan', { max: 5000 }))
  return { message: 'Laporan kegiatan disimpan.' }
})

// ---------- alumni ----------
defineAction('alumni.profil', async (ctx, f) => {
  await AL.saveProfile(ctx, f.uuid('siswa', 'Alumni?')!, { graduationYear: f.str('tahun'), continuingTo: f.opt('lanjut', 200), contactEmail: f.opt('email', 120), contactPhone: f.opt('telepon', 30), story: f.opt('cerita', 2000), consentContact: f.bool('izin_kontak'), consentPublic: f.bool('izin_publik') })
  return { message: 'Profil alumni disimpan.' }
})
