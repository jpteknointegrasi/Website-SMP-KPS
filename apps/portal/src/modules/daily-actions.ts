/** Form actions of daily academics (schedule, lessons, attendance, learning), announcements and services. */
import { defineAction, type Form } from '@/server/actions'
import { fail } from '@/server/errors'
import { formFile } from '@/server/files'
import { isDate, parseLocalDateTime, today } from '@/server/time'
import type { Audience } from '@/db/schema'
import * as sch from './schedule/service'
import * as att from './attendance/service'
import * as learn from './learning/service'
import * as comms from './comms/service'
import * as svc from './services/service'

const files = async (f: Form, name: string) => {
  const out: { name: string; buffer: Buffer }[] = []
  for (const v of f.data.getAll(name)) if (v && typeof v !== 'string' && v.size > 0) out.push({ name: v.name, buffer: Buffer.from(await v.arrayBuffer()) })
  if (out.length > 5) fail('Maksimal 5 berkas sekaligus.')
  return out
}
const dt = (f: Form, name: string, tz: string) => {
  const v = f.str(name)
  if (!v) return null
  const d = parseLocalDateTime(v, tz)
  if (!d) fail('Tanggal/waktu tidak valid.', 'invalid', name)
  return d
}

// ---------- schedule ----------
defineAction('jadwal.jam', async (ctx, f) => {
  const rows = f
    .str('jam', { max: 3000 })
    .split(/\r?\n/)
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p[0])
    .map(([ord, label, start, end, kind]) => ({ ordinal: Number(ord), label: label ?? '', startTime: start ?? '', endTime: end ?? '', kind: /istirahat|break/i.test(kind ?? '') ? 'break' : 'lesson' }))
  if (rows.some((r) => !Number.isInteger(r.ordinal) || !r.label)) fail('Format baris: urutan | label | mulai | selesai | pelajaran/istirahat')
  await sch.saveSlots(ctx, rows)
  return { message: 'Jam pelajaran disimpan.' }
})
defineAction('jadwal.versi_baru', async (ctx, f) => {
  const id = await sch.newVersion(ctx, f.uuid('semester', 'Pilih semester.')!, f.opt('catatan', 300))
  return { redirect: `/staf/jadwal?versi=${id}`, message: 'Draf jadwal dibuat (disalin dari versi terakhir).' }
})
defineAction('jadwal.sel', async (ctx, f) => {
  await sch.setCell(ctx, f.uuid('versi', 'Versi tidak dikenal.')!, { homeroomId: f.uuid('rombel', 'Rombel?')!, day: f.int('hari', { required: 'Hari?', min: 1, max: 6 })!, slotId: f.uuid('jam', 'Jam?')!, assignmentId: f.uuid('penugasan'), room: f.opt('ruang', 40) })
  return { message: 'Jadwal diperbarui.' }
})
defineAction('jadwal.publikasi', async (ctx, f) => {
  const from = f.opt('berlaku', 10)
  await sch.publishVersion(ctx, f.uuid('versi', 'Versi tidak dikenal.')!, from)
  return { message: 'Jadwal dipublikasikan. Guru, siswa dan wali melihat jadwal ini.' }
})
defineAction('jadwal.pengecualian', async (ctx, f) => {
  await sch.addException(ctx, { date: f.str('tanggal'), homeroomId: f.uuid('rombel'), slotId: f.uuid('jam'), kind: f.str('jenis'), substituteTeacherId: f.uuid('pengganti'), note: f.opt('catatan', 200) })
  return { message: 'Pengecualian jadwal disimpan.' }
})
defineAction('jadwal.pengecualian_hapus', async (ctx, f) => {
  await sch.removeException(ctx, f.uuid('id', 'Data?')!)
  return { message: 'Pengecualian dihapus.' }
})
defineAction('kalender.simpan', async (ctx, f) => {
  await sch.saveEvent(ctx, { id: f.uuid('id'), title: f.str('judul'), kind: f.str('jenis') || 'kegiatan', startDate: f.str('mulai'), endDate: f.str('selesai') || f.str('mulai'), audience: f.str('sasaran') || 'all', isPublic: f.bool('publik'), description: f.opt('keterangan', 1000) })
  return { message: 'Agenda disimpan.' }
})
defineAction('kalender.hapus', async (ctx, f) => {
  await sch.removeEvent(ctx, f.uuid('id', 'Data?')!)
  return { message: 'Agenda dihapus.' }
})

// ---------- lessons ----------
defineAction('pelajaran.buka', async (ctx, f) => {
  const date = f.str('tanggal') || today(ctx.tz, ctx.now)
  if (!isDate(date)) fail('Tanggal tidak valid.')
  const id = await sch.openLesson(ctx, f.uuid('jadwal', 'Jadwal tidak dikenal.')!, date)
  return { redirect: `/staf/guru/sesi/${id}` }
})
defineAction('pelajaran.jurnal', async (ctx, f) => {
  await sch.saveJournal(ctx, f.uuid('sesi', 'Sesi?')!, { topic: f.str('topik', { max: 300 }), notes: f.opt('catatan', 2000), realization: f.str('realisasi') })
  return { message: 'Jurnal mengajar disimpan.' }
})
defineAction('pelajaran.presensi', async (ctx, f) => {
  const entries = [...f.data.keys()].filter((k) => k.startsWith('st:')).map((k) => ({ studentId: k.slice(3), status: f.str(k), note: f.opt(`cat:${k.slice(3)}`, 200) }))
  await att.saveLessonAttendance(ctx, f.uuid('sesi', 'Sesi?')!, entries)
  return { message: 'Presensi pelajaran disimpan.' }
})

// ---------- attendance ----------
defineAction('presensi.harian', async (ctx, f) => {
  const entries = [...f.data.keys()].filter((k) => k.startsWith('st:')).map((k) => ({ studentId: k.slice(3), status: f.str(k), note: f.opt(`cat:${k.slice(3)}`, 200) }))
  const n = await att.saveDaily(ctx, f.uuid('rombel', 'Rombel?')!, f.str('tanggal'), entries)
  return { message: `Presensi tersimpan (${n} perubahan).` }
})
defineAction('izin.ajukan', async (ctx, f) => {
  await att.requestLeave(ctx, { studentId: f.uuid('siswa', 'Pilih anak.')!, kind: f.str('jenis'), fromDate: f.str('dari'), toDate: f.str('sampai') || f.str('dari'), reason: f.str('alasan', { max: 1000 }), file: await formFile(f.data, 'bukti') })
  return { message: 'Pengajuan izin terkirim ke wali kelas.' }
})
defineAction('izin.putuskan', async (ctx, f) => {
  const ok = f.str('keputusan') === 'setuju'
  await att.decideLeave(ctx, f.uuid('id', 'Data?')!, ok, f.opt('catatan', 300))
  return { message: ok ? 'Izin disetujui; presensi disesuaikan.' : 'Izin ditolak.' }
})
defineAction('presensi.koreksi', async (ctx, f) => {
  await att.requestCorrection(ctx, f.uuid('siswa', 'Siswa?')!, f.str('tanggal'), f.str('status'), f.str('alasan'))
  return { message: 'Usulan koreksi presensi dikirim.' }
})
defineAction('presensi.koreksi_putuskan', async (ctx, f) => {
  await att.reviewCorrection(ctx, f.uuid('id', 'Data?')!, f.str('keputusan') === 'setuju', f.opt('catatan', 300))
  return { message: 'Koreksi presensi diproses.' }
})

// ---------- learning ----------
defineAction('materi.simpan', async (ctx, f) => {
  const assignmentId = f.uuid('kelas', 'Kelas?')!
  await learn.saveMaterial(
    ctx,
    { id: f.uuid('id'), assignmentId, title: f.str('judul', { max: 200 }), unit: f.opt('topik', 120), body: f.opt('isi', 20000), links: f.str('tautan', { max: 2000 }).split(/\s+/).filter(Boolean), publish: f.str('aksi') === 'terbit' },
    await files(f, 'berkas'),
  )
  return { message: f.str('aksi') === 'terbit' ? 'Materi diterbitkan untuk siswa.' : 'Draf materi disimpan.' }
})
defineAction('tugas.simpan', async (ctx, f) => {
  const assignmentId = f.uuid('kelas', 'Kelas?')!
  const id = await learn.saveTask(
    ctx,
    { id: f.uuid('id'), assignmentId, title: f.str('judul', { max: 200 }), kind: f.str('jenis') || 'tugas', instructions: f.opt('instruksi', 20000), dueAt: dt(f, 'tenggat', ctx.tz), maxScore: f.int('maks', { min: 1, max: 1000 }) ?? 100, allowLate: f.bool('terlambat'), submissionType: f.str('pengumpulan'), publish: f.str('aksi') === 'terbit' },
    await files(f, 'berkas'),
  )
  return { redirect: `/staf/guru/tugas/${id}`, message: f.str('aksi') === 'terbit' ? 'Tugas diterbitkan; siswa diberi tahu.' : 'Draf tugas disimpan.' }
})
defineAction('tugas.tutup', async (ctx, f) => {
  await learn.closeTask(ctx, f.uuid('id', 'Tugas?')!)
  return { message: 'Tugas ditutup.' }
})
defineAction('tugas.nilai', async (ctx, f) => {
  await learn.reviewSubmission(ctx, f.uuid('tugas', 'Tugas?')!, f.uuid('siswa', 'Siswa?')!, { score: f.num('nilai', { min: 0 }), feedback: f.opt('umpan_balik', 3000), needsRevision: f.str('aksi') === 'revisi' })
  return { message: f.str('aksi') === 'revisi' ? 'Dikembalikan untuk revisi.' : 'Penilaian disimpan.' }
})
defineAction('tugas.kumpul', async (ctx, f) => {
  const r = await learn.submitTask(ctx, f.uuid('tugas', 'Tugas?')!, f.opt('jawaban', 20000), await files(f, 'berkas'))
  return { message: `Tugas terkumpul (versi ${r.version})${r.late ? ' — melewati tenggat' : ''}.` }
})

// ---------- announcements ----------
defineAction('pengumuman.simpan', async (ctx, f) => {
  const type = f.oneOf('sasaran', ['all', 'staff', 'families', 'students', 'guardians', 'homerooms', 'grades'] as const, 'Pilih sasaran.')!
  const audience: Audience = { type, ids: type === 'homerooms' ? f.all('rombel') : type === 'grades' ? f.all('tingkat') : undefined }
  await comms.saveAnnouncement(ctx, { id: f.uuid('id'), title: f.str('judul', { max: 200 }), body: f.str('isi', { max: 20000 }), audience, publishAt: dt(f, 'terbit', ctx.tz), requiresAck: f.bool('konfirmasi'), pinned: f.bool('sematkan'), publish: f.str('aksi') === 'terbit' }, await files(f, 'berkas'))
  return { message: f.str('aksi') === 'terbit' ? 'Pengumuman diterbitkan.' : 'Draf pengumuman disimpan.' }
})
defineAction('pengumuman.arsip', async (ctx, f) => {
  await comms.archiveAnnouncement(ctx, f.uuid('id', 'Data?')!)
  return { message: 'Pengumuman diarsipkan.' }
})
defineAction('pengumuman.baca', async (ctx, f) => {
  await comms.markRead(ctx, f.uuid('id', 'Data?')!, f.bool('konfirmasi'))
  return { message: f.bool('konfirmasi') ? 'Terima kasih, konfirmasi tercatat.' : undefined }
})

// ---------- services ----------
defineAction('layanan.ajukan', async (ctx, f) => {
  const answers: Record<string, string> = {}
  for (const [k, v] of f.data.entries()) if (k.startsWith('q_') && typeof v === 'string') answers[k.slice(2)] = v.trim().slice(0, 2000)
  const id = await svc.submitRequest(ctx, { typeId: f.uuid('jenis', 'Pilih layanan.')!, studentId: f.uuid('siswa'), answers, purpose: f.opt('keperluan', 500), file: await formFile(f.data, 'berkas') })
  return { redirect: ctx.staff ? `/staf/layanan/${id}` : `/keluarga/layanan/${id}`, message: 'Permohonan terkirim.' }
})
defineAction('layanan.proses', async (ctx, f) => {
  const action = f.oneOf('aksi', ['take', 'needs_info', 'complete', 'reject', 'note'] as const, 'Pilih tindakan.')!
  await svc.processRequest(ctx, f.uuid('id', 'Data?')!, action, f.opt('catatan', 2000), { file: await formFile(f.data, 'hasil'), number: f.opt('nomor', 80) })
  return { message: 'Permohonan diperbarui.' }
})
defineAction('layanan.pemohon', async (ctx, f) => {
  const action = f.oneOf('aksi', ['info', 'cancel'] as const, 'Pilih tindakan.')!
  await svc.requesterUpdate(ctx, f.uuid('id', 'Data?')!, action, f.opt('catatan', 2000), await formFile(f.data, 'berkas'))
  return { message: action === 'info' ? 'Informasi tambahan terkirim.' : 'Permohonan dibatalkan.' }
})
defineAction('pengumuman.terbitkan', async (ctx, f) => {
  await comms.publishDraft(ctx, f.uuid('id', 'Data?')!)
  return { message: 'Pengumuman diterbitkan.' }
})
defineAction('layanan.jenis', async (ctx, f) => {
  const questions = f
    .str('pertanyaan', { max: 3000 })
    .split(/\r?\n/)
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p[0] && p[1])
    .map(([key, label, req]) => ({ key: key!.toLowerCase().replace(/[^a-z0-9_]/g, '_'), label: label!, required: /^(ya|wajib|y)$/i.test(req ?? '') }))
  await svc.saveType(ctx, { id: f.uuid('id'), code: f.str('kode'), name: f.str('nama', { max: 120 }), description: f.opt('deskripsi', 500), category: f.str('kategori') || 'surat', slaDays: f.int('sla', { min: 1, max: 60 }) ?? 3, requiresFile: f.bool('wajib_berkas'), questions, active: f.bool('aktif') })
  return { message: 'Jenis layanan disimpan.' }
})
