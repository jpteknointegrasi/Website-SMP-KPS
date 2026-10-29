import { defineAction, type Form } from '@/server/actions'
import { fail } from '@/server/errors'
import { formFile } from '@/server/files'
import { parseLocalDateTime } from '@/server/time'
import type { ChecklistItemDef, DocumentReq, FormFieldDef, SelectionComponent } from '@/db/schema'
import * as cfg from './config'
import * as apply from './apply'
import * as review from './review'
import * as sel from './selection'
import * as dec from './decisions'
import * as re from './reenroll'
import { APP_FIELDS } from './fields'
import { createAccountFor } from './assist'
import { cancelLeadLink, requestLeadLink } from './lead-link'
import { onceCookie } from '@/server/once'

const when = (f: Form, name: string, tz: string, required?: string) => {
  const v = f.str(name)
  if (!v) return required ? fail(required, 'invalid', name) : null
  const d = parseLocalDateTime(v, tz)
  if (!d) fail('Tanggal/waktu tidak valid.', 'invalid', name)
  return d
}
const lines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p[0])
const code = (v: string, what: string) => {
  const c = v.toLowerCase().replace(/[^a-z0-9_]/g, '_')
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(c)) fail(`Kode ${what} "${v}" tidak valid (huruf kecil/angka/garis bawah).`)
  return c
}
export const parseDocs = (s: string): DocumentReq[] => lines(s).map(([c, label, req, help]) => ({ code: code(c!, 'berkas'), label: label || c!, required: /^(wajib|ya|y)$/i.test(req ?? ''), help: help || undefined }))
export const parseComponents = (s: string): SelectionComponent[] =>
  lines(s).map(([c, label, max, weight]) => {
    const m = Number(max)
    const w = Number(weight)
    if (!(m > 0) || !(w >= 0)) fail(`Komponen "${c}": nilai maksimum dan bobot harus angka.`)
    return { code: code(c!, 'komponen'), label: label || c!, max: m, weight: w }
  })
const KIND: Record<string, ChecklistItemDef['kind']> = { dokumen: 'document', konfirmasi: 'confirm', petugas: 'staff' }
export const parseChecklist = (s: string): ChecklistItemDef[] =>
  lines(s).map(([c, label, kind]) => {
    const k = KIND[(kind ?? '').toLowerCase()]
    if (!k) fail(`Butir "${c}": jenis harus dokumen / konfirmasi / petugas.`)
    return { code: code(c!, 'butir'), label: label || c!, kind: k! }
  })
const TYPES = ['text', 'textarea', 'select', 'date', 'number', 'checkbox'] as const
export const parseQuestions = (s: string): FormFieldDef[] =>
  lines(s).map(([c, label, type, req, opts]) => {
    const t = (TYPES as readonly string[]).includes(type ?? '') ? (type as FormFieldDef['type']) : 'text'
    return { key: code(c!, 'pertanyaan'), label: label || c!, type: t, required: /^(wajib|ya|y)$/i.test(req ?? ''), options: opts ? opts.split(';').map((o) => o.trim()).filter(Boolean) : undefined }
  })

// ---------- configuration ----------
defineAction('ppdb.periode_baru', async (ctx, f) => {
  const id = await cfg.createCycle(ctx, { code: f.str('kode'), name: f.str('nama'), targetYear: f.str('tahun'), targetGrade: f.str('tingkat') })
  return { redirect: `/staf/ppdb/${id}?tab=pengaturan`, message: 'Periode dibuat dengan jalur Reguler bawaan. Lengkapi pengaturannya.' }
})
defineAction('ppdb.periode_ubah', async (ctx, f) => {
  await cfg.updateCycle(
    ctx,
    f.uuid('id', 'Periode tidak dikenal.')!,
    {
      name: f.str('nama', { required: 'Isi nama.' }),
      openAt: when(f, 'buka', ctx.tz),
      closeAt: when(f, 'tutup', ctx.tz),
      selectionEnabled: f.bool('seleksi'),
      offerDays: f.int('hari_penawaran', { min: 1, max: 60 }) ?? 14,
      reenrollDays: f.int('hari_daftar_ulang', { min: 1, max: 90 }) ?? 21,
      requireNik: f.bool('wajib_nik'),
      info: f.opt('info', 5000),
      dataNotice: f.opt('pemberitahuan', 3000),
      helpContact: f.opt('kontak', 300),
    },
    f.version,
  )
  return { message: 'Pengaturan periode disimpan.' }
})
defineAction('ppdb.formulir', async (ctx, f) => {
  await cfg.saveForm(ctx, f.uuid('id', 'Periode tidak dikenal.')!, parseQuestions(f.str('pertanyaan', { max: 8000 })))
  return { message: 'Pertanyaan tambahan formulir disimpan (versi baru).' }
})
defineAction('ppdb.gelombang', async (ctx, f) => {
  await cfg.saveWave(ctx, f.uuid('id', 'Periode tidak dikenal.')!, { id: f.uuid('gelombang'), name: f.str('nama', { required: 'Isi nama gelombang.' }), openAt: when(f, 'buka', ctx.tz, 'Isi waktu buka.')!, closeAt: when(f, 'tutup', ctx.tz, 'Isi waktu tutup.')! })
  return { message: 'Gelombang disimpan.' }
})
defineAction('ppdb.jalur', async (ctx, f) => {
  await cfg.savePath(ctx, f.uuid('id', 'Periode tidak dikenal.')!, {
    id: f.uuid('jalur'),
    name: f.str('nama', { required: 'Isi nama jalur.' }),
    description: f.opt('deskripsi', 1000),
    quota: f.int('kuota', { required: 'Isi kuota.', min: 0, max: 5000 })!,
    registrationFee: f.int('biaya_daftar', { min: 0 }) ?? 0,
    reenrollFee: f.int('biaya_daftar_ulang', { min: 0 }) ?? 0,
    documents: parseDocs(f.str('berkas', { max: 4000 })),
    components: parseComponents(f.str('komponen', { max: 2000 })),
    checklist: parseChecklist(f.str('checklist', { max: 3000 })),
    active: f.has('aktif_ada') ? f.bool('aktif') : true,
  })
  return { message: 'Jalur disimpan.' }
})
defineAction('ppdb.status', async (ctx, f) => {
  await cfg.setCycleStatus(ctx, f.uuid('id', 'Periode tidak dikenal.')!, f.str('ke'), f.opt('alasan', 500))
  return { message: 'Status periode diperbarui.' }
})

// ---------- applicant ----------
defineAction('ppdb.mulai', async (ctx, f) => {
  const [cycleId, pathId] = f.str('pilihan', { required: 'Pilih periode & jalur.' }).split(':')
  if (!cycleId || !pathId || !/^[0-9a-f-]{36}$/.test(cycleId) || !/^[0-9a-f-]{36}$/.test(pathId)) fail('Pilihan tidak sah.')
  const id = await apply.startApplication(ctx, { cycleId: cycleId!, pathId: pathId!, childName: f.str('nama_anak') })
  return { redirect: `/keluarga/penerimaan/${id}?langkah=anak`, message: 'Draf pendaftaran dibuat. Lengkapi data lalu kirim.' }
})
defineAction('ppdb.simpan', async (ctx, f) => {
  const id = f.uuid('id', 'Pendaftaran tidak dikenal.')!
  const values: Record<string, string> = {}
  for (const d of APP_FIELDS) if (f.has(d.key)) values[d.key] = f.str(d.key)
  for (const [k, v] of f.data.entries()) if (k.startsWith('q_') && typeof v === 'string') values[k] = v
  // unchecked checkboxes of custom questions are not sent: mark the ones rendered on the form
  for (const k of f.all('_q')) if (!(k in values)) values[k] = ''
  await apply.saveApplicationData(ctx, id, values, f.version)
  const next = f.opt('lanjut', 40)
  return { redirect: next ? `${f.str('_kembali').split('?')[0]}?langkah=${next}` : undefined, message: 'Data tersimpan.' }
})
defineAction('ppdb.berkas', async (ctx, f) => {
  const file = await formFile(f.data, 'berkas')
  if (!file) fail('Pilih berkas.')
  await apply.uploadApplicationDocument(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.str('kode'), file!)
  return { message: 'Berkas diunggah.' }
})
defineAction('ppdb.kirim', async (ctx, f) => {
  const id = f.uuid('id', 'Pendaftaran tidak dikenal.')!
  const r = await apply.submitApplication(ctx, id, { confirm: f.bool('setuju'), key: f.opKey })
  const back = ctx.staff ? `/staf/ppdb/pendaftar/${id}` : `/keluarga/penerimaan/${id}`
  return { redirect: back, message: r.resubmitted ? 'Perbaikan terkirim. Panitia akan memeriksa kembali.' : `Pendaftaran terkirim. Nomor pendaftaran: ${r.registrationNo}.` }
})
defineAction('ppdb.tarik', async (ctx, f) => {
  await apply.withdrawApplication(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.str('alasan'))
  return { message: 'Pendaftaran ditarik.' }
})
defineAction('ppdb.tautkan_minat', async (ctx, f) => {
  await requestLeadLink(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.bool('setuju'))
  return { message: 'Permintaan penautan dicatat. Sekolah akan mencocokkannya dengan formulir minat di website.' }
})
defineAction('ppdb.batal_tautkan_minat', async (ctx, f) => {
  await cancelLeadLink(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!)
  return { message: 'Permintaan penautan dibatalkan.' }
})
defineAction('ppdb.jawab_penawaran', async (ctx, f) => {
  const accept = f.str('jawaban') === 'terima'
  await dec.respondToOffer(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, accept, f.opt('alasan', 300))
  return { message: accept ? 'Penawaran dikonfirmasi. Lengkapi daftar ulang sebelum tenggat.' : 'Penawaran ditolak. Terima kasih atas konfirmasinya.' }
})
defineAction('ppdb.daftar_ulang_butir', async (ctx, f) => {
  await re.completeItem(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.str('kode'), await formFile(f.data, 'berkas'))
  return { message: 'Butir daftar ulang tersimpan.' }
})
defineAction('ppdb.daftar_ulang_kirim', async (ctx, f) => {
  await re.submitReenrollment(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!)
  return { message: 'Daftar ulang dikirim untuk disahkan panitia.' }
})

// ---------- committee ----------
defineAction('ppdb.periksa', async (ctx, f) => {
  await review.startReview(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!)
  return { message: 'Pemeriksaan dimulai; pendaftaran ini tercatat atas nama Anda.' }
})
defineAction('ppdb.periksa_berkas', async (ctx, f) => {
  await review.reviewDocument(ctx, f.uuid('dok', 'Berkas tidak dikenal.')!, f.oneOf('hasil', ['verified', 'revision_required', 'rejected', 'pending'] as const, 'Pilih hasil.')!, f.opt('catatan', 500))
  return { message: 'Hasil pemeriksaan berkas disimpan.' }
})
defineAction('ppdb.minta_perbaikan', async (ctx, f) => {
  await review.requestRevision(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, { fields: f.all('kolom'), docs: f.all('dok'), note: f.str('catatan'), due: when(f, 'tenggat', ctx.tz) }, f.version)
  return { message: 'Permintaan perbaikan dikirim ke pendaftar.' }
})
defineAction('ppdb.verifikasi', async (ctx, f) => {
  await review.verifyApplication(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.version)
  return { message: 'Pendaftaran terverifikasi.' }
})
defineAction('ppdb.tolak', async (ctx, f) => {
  await review.rejectApplication(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.str('alasan'))
  return { message: 'Pendaftaran ditolak secara administratif.' }
})
defineAction('ppdb.buka_kembali', async (ctx, f) => {
  await review.reopenApplication(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.str('alasan'))
  return { message: 'Pendaftaran dibuka kembali untuk diperiksa.' }
})
defineAction('ppdb.bantu', async (ctx, f) => {
  const [cycleId, pathId] = f.str('pilihan', { required: 'Pilih periode & jalur.' }).split(':')
  if (!cycleId || !pathId || !/^[0-9a-f-]{36}$/.test(cycleId) || !/^[0-9a-f-]{36}$/.test(pathId)) fail('Pilihan tidak sah.')
  if (f.str('alasan').length < 5) fail('Tuliskan alasan pendaftaran dibantu.')
  if (!f.str('nama_anak')) fail('Isi nama calon siswa.')
  const r = await createAccountFor(ctx, { login: f.str('login'), name: f.str('nama_wali', { required: 'Isi nama orang tua/wali.' }) })
  const id = await apply.startApplication(ctx, { cycleId: cycleId!, pathId: pathId!, childName: f.str('nama_anak'), forAccountId: r.accountId, assistedReason: f.str('alasan') })
  return { redirect: `/staf/ppdb/pendaftar/${id}`, message: 'Akun keluarga & draf pendaftaran dibuat. Lengkapi data bersama keluarga.', cookies: r.temporaryPassword ? [onceCookie({ kind: 'password', login: r.login, password: r.temporaryPassword })] : [] }
})

// selection
defineAction('ppdb.sesi', async (ctx, f) => {
  const id = await sel.createSession(ctx, {
    cycleId: f.uuid('periode', 'Periode tidak dikenal.')!,
    pathId: f.uuid('jalur'),
    title: f.str('judul'),
    kind: f.oneOf('jenis', ['tes', 'wawancara', 'lainnya'] as const) ?? 'tes',
    startsAt: when(f, 'mulai', ctx.tz, 'Isi waktu mulai.')!,
    endsAt: when(f, 'selesai', ctx.tz, 'Isi waktu selesai.')!,
    location: f.str('tempat'),
    capacity: f.int('kapasitas', { required: 'Isi kapasitas.', min: 1, max: 1000 })!,
    instructions: f.opt('instruksi', 2000),
    assessors: f.all('penilai'),
  })
  return { redirect: `/staf/ppdb/sesi/${id}`, message: 'Sesi seleksi dibuat.' }
})
defineAction('ppdb.sesi_peserta', async (ctx, f) => {
  const n = await sel.addParticipants(ctx, f.uuid('sesi', 'Sesi tidak dikenal.')!, f.all('pendaftar'))
  return { message: `${n} peserta ditambahkan dan diberi tahu jadwalnya.` }
})
defineAction('ppdb.kehadiran', async (ctx, f) => {
  await sel.setParticipantState(ctx, f.uuid('peserta', 'Peserta tidak dikenal.')!, f.str('status'), f.opt('catatan', 300))
  return { message: 'Status peserta diperbarui.' }
})
defineAction('ppdb.nilai', async (ctx, f) => {
  const sessionId = f.uuid('sesi', 'Sesi tidak dikenal.')!
  const applicationId = f.uuid('pendaftar', 'Pendaftar tidak dikenal.')!
  const submit = f.str('aksi') === 'kirim'
  let n = 0
  for (const [k, v] of f.data.entries()) {
    if (!k.startsWith('nilai:') || typeof v !== 'string' || v.trim() === '') continue
    const component = k.slice(6)
    await sel.enterScore(ctx, { applicationId, sessionId, component, score: Number(v.replace(',', '.')), note: f.opt(`catatan:${component}`, 500), submit })
    n++
  }
  if (!n) fail('Isi minimal satu nilai.')
  return { message: submit ? 'Nilai dikirim.' : 'Nilai disimpan sebagai draf.' }
})
defineAction('ppdb.kunci_nilai', async (ctx, f) => {
  const n = await sel.lockSessionScores(ctx, f.uuid('sesi', 'Sesi tidak dikenal.')!)
  return { message: `${n} nilai dikunci.` }
})
defineAction('ppdb.koreksi_nilai', async (ctx, f) => {
  await sel.correctScore(ctx, f.uuid('nilai_id', 'Nilai tidak dikenal.')!, f.num('nilai', { required: 'Isi nilai.', min: 0 })!, f.str('alasan'))
  return { message: 'Nilai dikoreksi (revisi baru tercatat).' }
})

// decisions
defineAction('ppdb.usulan', async (ctx, f) => {
  const entries = f
    .all('pilih')
    .map((id) => ({ applicationId: id, outcome: f.oneOf(`hasil:${id}`, dec.OUTCOMES, 'Pilih keputusan.')!, reasonCode: f.opt(`alasan:${id}`, 100), internalNote: null }))
  const id = await dec.proposeBatch(ctx, { cycleId: f.uuid('periode', 'Periode tidak dikenal.')!, title: f.str('judul', { required: 'Isi judul usulan.' }), instructions: f.opt('instruksi', 3000), releaseAt: when(f, 'rilis', ctx.tz), entries })
  return { message: 'Usulan keputusan dibuat.', redirect: `${f.str('_kembali').split('#')[0]}#usulan-${id}` }
})
defineAction('ppdb.usulan_ajukan', async (ctx, f) => {
  await dec.submitBatch(ctx, f.uuid('id', 'Usulan tidak dikenal.')!)
  return { message: 'Usulan diajukan untuk persetujuan.' }
})
defineAction('ppdb.usulan_setujui', async (ctx, f) => {
  await dec.approveBatch(ctx, f.uuid('id', 'Usulan tidak dikenal.')!, f.version)
  return { message: 'Usulan disetujui; kursi untuk yang diterima sudah dicadangkan.' }
})
defineAction('ppdb.usulan_rilis', async (ctx, f) => {
  await dec.releaseBatch(ctx, f.uuid('id', 'Usulan tidak dikenal.')!, when(f, 'rilis', ctx.tz))
  return { message: 'Hasil dirilis. Pendaftar melihat hasil di akun masing-masing pada waktu rilis.' }
})
defineAction('ppdb.usulan_batal', async (ctx, f) => {
  await dec.cancelBatch(ctx, f.uuid('id', 'Usulan tidak dikenal.')!, f.str('alasan'))
  return { message: 'Usulan dibatalkan.' }
})

// re-enrolment & conversion
defineAction('ppdb.du_periksa', async (ctx, f) => {
  await re.reviewItem(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.str('kode'), f.oneOf('hasil', ['verified', 'rejected', 'waived'] as const, 'Pilih hasil.')!, f.opt('catatan', 300))
  return { message: 'Butir daftar ulang diperbarui.' }
})
defineAction('ppdb.du_sahkan', async (ctx, f) => {
  await re.verifyReenrollment(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, f.version)
  return { message: 'Daftar ulang disahkan. Siap dikonversi menjadi siswa.' }
})
defineAction('ppdb.du_perpanjang', async (ctx, f) => {
  await re.extendReenrollment(ctx, f.uuid('id', 'Pendaftaran tidak dikenal.')!, when(f, 'tenggat', ctx.tz, 'Isi tenggat baru.')!, f.str('alasan'))
  return { message: 'Tenggat daftar ulang diperpanjang.' }
})
defineAction('ppdb.konversi', async (ctx, f) => {
  const id = f.uuid('id', 'Pendaftaran tidak dikenal.')!
  const mode = f.oneOf('mode', ['new', 'existing'] as const, 'Pilih buat baru atau cocokkan.')!
  const r = await re.convertToStudent(ctx, id, { mode, studentId: f.uuid('siswa'), homeroomId: f.uuid('rombel'), nis: f.opt('nis', 20), key: f.opKey })
  return { redirect: `/staf/siswa/${r.studentId}`, message: r.repeated ? 'Pendaftar ini sudah dikonversi sebelumnya.' : 'Konversi berhasil: siswa, enrolmen dan relasi wali tersimpan.' }
})
