import { defineAction } from '@/server/actions'
import { fail } from '@/server/errors'
import * as C from './service'

defineAction('kartu.template', async (ctx, f) => {
  const scheme = f.oneOf('skema', ['biru', 'cyan', 'kuning', 'netral'] as const) ?? 'biru'
  await C.saveTemplateDraft(ctx, f.str('nama', { max: 60 }) || 'Kartu Siswa', {
    orientation: f.oneOf('orientasi', ['landscape', 'portrait'] as const) ?? 'landscape',
    scheme,
    show: { photo: f.bool('foto'), nis: f.bool('nis'), nisn: f.bool('nisn'), entryYear: f.bool('angkatan'), homeroom: f.bool('kelas') },
    validityMonths: f.int('berlaku', { required: 'Isi masa berlaku.', min: 1, max: 72 })!,
    backText: f.str('teks_belakang', { max: 200 }),
  })
  return { message: 'Draf template disimpan.' }
})
defineAction('kartu.template_setujui', async (ctx, f) => {
  await C.approveTemplate(ctx, f.uuid('id', 'Template tidak dikenal.')!)
  return { message: 'Template disetujui dan dipakai untuk penerbitan berikutnya.' }
})
defineAction('kartu.terbitkan', async (ctx, f) => {
  const ids = f.all('siswa')
  if (!ids.length) fail('Pilih minimal satu siswa.')
  const r = await C.issueCards(ctx, ids, f.opKey)
  const skipped = r.skipped.length ? ` ${r.skipped.length} siswa dilewati (data belum lengkap atau sudah berkartu).` : ''
  return { redirect: r.issued.length ? `/staf/kartu/cetak?kartu=${r.issued.join(',')}` : undefined, message: `${r.issued.length} kartu diterbitkan.${skipped}` }
})
defineAction('kartu.tercetak', async (ctx, f) => {
  await C.markPrinted(ctx, f.all('kartu'))
  return { redirect: '/staf/kartu', message: 'Kartu ditandai sudah dicetak.' }
})
defineAction('kartu.cabut', async (ctx, f) => {
  await C.revokeCard(ctx, f.uuid('id', 'Kartu tidak dikenal.')!, f.str('alasan'))
  return { message: 'Kartu dicabut; QR-nya tidak berlaku lagi.' }
})
defineAction('kartu.ganti', async (ctx, f) => {
  await C.requestReplacement(ctx, f.uuid('siswa', 'Siswa tidak dikenal.')!, f.str('alasan'), f.opt('catatan', 300), f.bool('nonaktifkan'))
  return { message: 'Permohonan penggantian kartu dikirim.' }
})
defineAction('kartu.ganti_putuskan', async (ctx, f) => {
  await C.decideReplacement(ctx, f.uuid('id', 'Permohonan tidak dikenal.')!, f.str('keputusan') === 'setuju')
  return { message: 'Permohonan penggantian diproses.' }
})
