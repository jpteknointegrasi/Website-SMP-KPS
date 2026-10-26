/** Form actions of grades & report cards, promotion, counselling, extracurricular and student affairs. */
import { defineAction, type Form } from '@/server/actions'
import { fail } from '@/server/errors'
import { formFile } from '@/server/files'
import * as G from './grades/service'
import * as R from './reports/service'
import * as P from './academic/promotion'
import * as BK from './counseling/service'
import * as X from './activities/service'
import * as K from './affairs/service'

/** Collects `prefix:<id>` fields into a map id → value. */
const byId = (f: Form, prefix: string) => {
  const out = new Map<string, string>()
  for (const [k, v] of f.data.entries()) if (k.startsWith(prefix) && typeof v === 'string') out.set(k.slice(prefix.length), v.trim())
  return out
}
const num = (v: string | undefined) => {
  if (v === undefined || v === '') return null
  const n = Number(v.replace(',', '.'))
  if (!Number.isFinite(n)) fail(`Nilai tidak valid: ${v}`)
  return n
}

// ---------- grades ----------
defineAction('nilai.bobot', async (ctx, f) => {
  await G.saveGradingConfig(ctx, { weights: { formatif: f.int('formatif', { min: 0, max: 100 }) ?? 0, sumatif: f.int('sumatif', { min: 0, max: 100 }) ?? 0, sts: f.int('sts', { min: 0, max: 100 }) ?? 0, sas: f.int('sas', { min: 0, max: 100 }) ?? 0 }, passMark: f.int('kktp', { min: 0, max: 100 }) ?? 75 })
  return { message: 'Pengaturan penilaian disimpan.' }
})
defineAction('nilai.penilaian', async (ctx, f) => {
  await G.saveItem(ctx, { id: f.uuid('id'), assignmentId: f.uuid('kelas', 'Kelas?')!, kind: f.str('jenis'), title: f.str('judul', { max: 120 }), date: f.str('tanggal') || null, maxScore: f.int('maks', { min: 1, max: 1000 }) ?? 100, weight: f.int('bobot', { min: 1, max: 10 }) ?? 1 })
  return { message: 'Penilaian disimpan.' }
})
defineAction('nilai.penilaian_hapus', async (ctx, f) => {
  await G.removeItem(ctx, f.uuid('id', 'Data?')!)
  return { message: 'Penilaian dihapus.' }
})
defineAction('nilai.skor', async (ctx, f) => {
  const m = byId(f, 'n:')
  const n = await G.saveScores(ctx, f.uuid('penilaian', 'Penilaian?')!, [...m].map(([studentId, v]) => ({ studentId, score: num(v) })))
  return { message: `Nilai tersimpan (${n} perubahan).` }
})
defineAction('nilai.impor_tugas', async (ctx, f) => {
  await G.importTask(ctx, f.uuid('kelas', 'Kelas?')!, f.uuid('tugas', 'Pilih tugas.')!, f.str('jenis') || 'formatif')
  return { message: 'Nilai tugas dimasukkan ke buku nilai.' }
})
defineAction('nilai.hasil', async (ctx, f) => {
  const score = byId(f, 'akhir:')
  const reason = byId(f, 'alasan:')
  const desc = byId(f, 'desk:')
  await G.saveResults(ctx, f.uuid('kelas', 'Kelas?')!, [...desc.keys()].map((id) => ({ studentId: id, finalScore: num(score.get(id)), adjustReason: reason.get(id) || null, description: desc.get(id) || null })))
  return { message: 'Nilai rapor & deskripsi disimpan.' }
})
defineAction('nilai.kirim', async (ctx, f) => {
  await G.submitResults(ctx, f.uuid('kelas', 'Kelas?')!)
  return { message: 'Nilai dikirim ke wali kelas.' }
})
defineAction('nilai.kembalikan', async (ctx, f) => {
  await G.returnResults(ctx, f.uuid('kelas', 'Kelas?')!, f.str('catatan', { max: 1000 }))
  return { message: 'Nilai dikembalikan ke guru mapel.' }
})

// ---------- report cards ----------
defineAction('rapor.catatan', async (ctx, f) => {
  const notes = byId(f, 'cat:')
  const prom = byId(f, 'naik:')
  await R.saveNotes(ctx, f.uuid('rombel', 'Rombel?')!, f.uuid('semester', 'Semester?')!, [...notes.keys()].map((id) => ({ studentId: id, notes: notes.get(id) || null, promotion: prom.get(id) || null })))
  return { message: 'Catatan wali kelas disimpan.' }
})
defineAction('rapor.ajukan', async (ctx, f) => {
  const n = await R.submitCards(ctx, f.uuid('rombel', 'Rombel?')!, f.uuid('semester', 'Semester?')!)
  return { message: `${n} rapor diajukan ke Waka Kurikulum.` }
})
defineAction('rapor.setujui', async (ctx, f) => {
  const n = await R.approveCards(ctx, f.uuid('rombel', 'Rombel?')!, f.uuid('semester', 'Semester?')!)
  return { message: `${n} rapor disetujui dan dibekukan sebagai versi resmi.` }
})
defineAction('rapor.kembalikan', async (ctx, f) => {
  await R.returnCards(ctx, f.uuid('rombel', 'Rombel?')!, f.uuid('semester', 'Semester?')!, f.str('catatan', { max: 1000 }))
  return { message: 'Rapor dikembalikan ke wali kelas.' }
})
defineAction('rapor.rilis', async (ctx, f) => {
  const n = await R.releaseCards(ctx, f.uuid('rombel', 'Rombel?')!, f.uuid('semester', 'Semester?')!)
  return { message: `${n} rapor dirilis ke siswa & orang tua.` }
})
defineAction('rapor.buka_ulang', async (ctx, f) => {
  await R.reopenCard(ctx, f.uuid('id', 'Rapor?')!, f.str('alasan', { max: 500 }))
  return { message: 'Rapor dibuka untuk perbaikan. Versi yang sudah dirilis tetap terlihat sampai versi baru dirilis.' }
})

// ---------- promotion ----------
defineAction('kenaikan.rancang', async (ctx, f) => {
  const id = await P.proposePromotion(ctx, f.uuid('dari', 'Tahun asal?')!, f.uuid('ke', 'Tahun tujuan?')!)
  return { redirect: `/staf/akademik/kenaikan?run=${id}`, message: 'Rancangan kenaikan kelas dibuat dari keputusan rapor.' }
})
defineAction('kenaikan.ubah', async (ctx, f) => {
  const dec = byId(f, 'kep:')
  const to = byId(f, 'ke:')
  await P.updateLines(ctx, f.uuid('run', 'Data?')!, [...dec].map(([studentId, decision]) => ({ studentId, decision, toHomeroomId: to.get(studentId) || null })))
  return { message: 'Rancangan diperbarui.' }
})
defineAction('kenaikan.jalankan', async (ctx, f) => {
  const n = await P.executePromotion(ctx, f.uuid('run', 'Data?')!, f.str('berlaku'))
  return { message: `Kenaikan kelas dijalankan untuk ${n} siswa.` }
})

// ---------- counselling ----------
defineAction('bk.ajukan', async (ctx, f) => {
  const id = await BK.requestCase(ctx, { studentId: f.uuid('siswa', 'Pilih siswa.')!, category: f.str('kategori'), urgency: f.str('urgensi'), request: f.str('cerita', { max: 3000 }), preferredTime: f.opt('waktu', 200) })
  return { redirect: ctx.staff ? (ctx.staff.perms.has('counseling') ? `/staf/bk/${id}` : '/staf/bk') : '/keluarga/bk', message: 'Permintaan konseling terkirim ke guru BK.' }
})
defineAction('bk.ambil', async (ctx, f) => {
  await BK.takeCase(ctx, f.uuid('id', 'Kasus?')!)
  return { message: 'Kasus Anda tangani.' }
})
defineAction('bk.tugaskan', async (ctx, f) => {
  await BK.assignCase(ctx, f.uuid('id', 'Kasus?')!, f.uuid('konselor', 'Pilih guru BK.')!)
  return { message: 'Kasus ditugaskan.' }
})
defineAction('bk.sesi', async (ctx, f) => {
  await BK.addSession(ctx, f.uuid('id', 'Kasus?')!, { date: f.str('tanggal'), mode: f.str('bentuk'), notes: f.opt('catatan', 10000), sharedSummary: f.opt('ringkasan', 2000), shareWithGuardian: f.bool('bagi_wali'), shareWithHomeroom: f.bool('bagi_walas'), followUpOn: f.str('tindak_lanjut') || null })
  return { message: 'Sesi tercatat.' }
})
defineAction('bk.tutup', async (ctx, f) => {
  await BK.closeCase(ctx, f.uuid('id', 'Kasus?')!, f.opt('ringkasan', 2000))
  return { message: 'Kasus ditutup.' }
})

// ---------- extracurricular ----------
defineAction('ekskul.simpan', async (ctx, f) => {
  const id = await X.saveActivity(ctx, { id: f.uuid('id'), name: f.str('nama', { max: 120 }), category: f.str('kategori'), description: f.opt('deskripsi', 1000), coachId: f.uuid('pembina'), schedule: f.opt('jadwal', 120), location: f.opt('tempat', 120), capacity: f.int('kuota', { min: 1, max: 1000 }), requiresConsent: f.bool('izin'), status: f.str('status') || 'open' })
  return { redirect: `/staf/ekskul/${id}`, message: 'Kegiatan disimpan.' }
})
defineAction('ekskul.daftar', async (ctx, f) => {
  await X.apply(ctx, f.uuid('kegiatan', 'Kegiatan?')!, f.uuid('siswa', 'Siswa?')!, f.opt('alasan', 500))
  return { message: 'Pendaftaran terkirim.' }
})
defineAction('ekskul.izin', async (ctx, f) => {
  const ok = f.str('keputusan') === 'setuju'
  await X.consent(ctx, f.uuid('id', 'Data?')!, ok)
  return { message: ok ? 'Persetujuan tercatat; menunggu keputusan pembina.' : 'Pendaftaran tidak disetujui.' }
})
defineAction('ekskul.putuskan', async (ctx, f) => {
  const ok = f.str('keputusan') === 'terima'
  await X.decide(ctx, f.uuid('id', 'Data?')!, ok, f.opt('catatan', 300), f.bool('izin_tertulis'))
  return { message: ok ? 'Diterima sebagai anggota.' : 'Pendaftaran tidak diterima.' }
})
defineAction('ekskul.keluar', async (ctx, f) => {
  await X.withdraw(ctx, f.uuid('id', 'Data?')!)
  return { message: 'Keanggotaan diakhiri.' }
})
defineAction('ekskul.pertemuan', async (ctx, f) => {
  const att: Record<string, string> = {}
  for (const [id, v] of byId(f, 'h:')) if (v) att[id] = v
  await X.recordSession(ctx, f.uuid('kegiatan', 'Kegiatan?')!, f.str('tanggal'), f.opt('materi', 300), att)
  return { message: 'Pertemuan & kehadiran dicatat.' }
})
defineAction('ekskul.nilai', async (ctx, f) => {
  const pred = byId(f, 'p:')
  const desc = byId(f, 'd:')
  await X.evaluate(ctx, f.uuid('kegiatan', 'Kegiatan?')!, f.uuid('semester', 'Semester?')!, [...pred.keys()].map((id) => ({ studentId: id, predicate: pred.get(id) || null, description: desc.get(id) || null })))
  return { message: 'Penilaian ekstrakurikuler disimpan.' }
})

// ---------- student affairs ----------
defineAction('prestasi.ajukan', async (ctx, f) => {
  await K.submitAchievement(ctx, { studentId: f.uuid('siswa', 'Pilih siswa.')!, title: f.str('judul', { max: 200 }), field: f.str('bidang'), level: f.str('tingkat'), rank: f.opt('peringkat', 60), organizer: f.opt('penyelenggara', 120), date: f.str('tanggal'), publicConsent: f.bool('publik'), file: await formFile(f.data, 'bukti') })
  return { message: ctx.staff?.perms.has('student_affairs') ? 'Prestasi dicatat (terverifikasi).' : 'Prestasi dikirim untuk diverifikasi kesiswaan.' }
})
defineAction('prestasi.verifikasi', async (ctx, f) => {
  const ok = f.str('keputusan') === 'setuju'
  await K.reviewAchievement(ctx, f.uuid('id', 'Data?')!, ok, f.opt('catatan', 300))
  return { message: ok ? 'Prestasi diverifikasi.' : 'Prestasi ditolak.' }
})
defineAction('laporan.kirim', async (ctx, f) => {
  const id = await K.submitReport(ctx, { category: f.str('kategori'), description: f.str('uraian', { max: 5000 }), occurredOn: f.str('tanggal') || null, location: f.opt('tempat', 120), hideIdentity: f.bool('rahasia'), file: await formFile(f.data, 'lampiran') })
  return { redirect: ctx.staff ? `/staf/kesiswaan/laporan/${id}` : `/keluarga/kesiswaan/laporan/${id}`, message: 'Laporan diterima. Terima kasih telah melapor.' }
})
defineAction('laporan.proses', async (ctx, f) => {
  const action = f.oneOf('aksi', ['assign', 'clarification', 'follow_up', 'close', 'note'] as const, 'Pilih tindakan.')!
  await K.processReport(ctx, f.uuid('id', 'Data?')!, action, f.opt('catatan', 3000), { assignee: f.uuid('petugas'), studentIds: f.has('siswa_terlibat') ? f.all('siswa_terlibat') : undefined })
  return { message: 'Laporan diperbarui.' }
})
defineAction('laporan.info', async (ctx, f) => {
  await K.reporterAddInfo(ctx, f.uuid('id', 'Data?')!, f.str('catatan', { max: 3000 }), await formFile(f.data, 'lampiran'))
  return { message: 'Informasi tambahan terkirim.' }
})
