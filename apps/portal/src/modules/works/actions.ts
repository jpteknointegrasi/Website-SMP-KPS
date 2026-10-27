import { defineAction, type Form } from '@/server/actions'
import { fail } from '@/server/errors'
import * as W from './service'

const images = async (f: Form) => {
  const out: { name: string; buffer: Buffer }[] = []
  for (const v of f.data.getAll('foto')) if (v && typeof v !== 'string' && v.size > 0) out.push({ name: v.name, buffer: Buffer.from(await v.arrayBuffer()) })
  if (out.length > 6) fail('Maksimal 6 gambar.')
  return out
}

defineAction('karya.usul', async (ctx, f) => {
  await W.propose(
    ctx,
    { studentId: f.uuid('siswa', 'Pilih siswa.')!, title: f.str('judul', { max: 140 }), category: f.str('kategori'), description: f.str('deskripsi', { max: 3000 }), publicName: f.str('nama_publik', { max: 80 }), mentorPublic: f.opt('pembimbing', 80), submissionId: f.uuid('kiriman'), fileIds: f.all('berkas_kiriman') },
    await images(f),
  )
  return { redirect: '/staf/karya', message: 'Usulan dikirim; orang tua diminta izin publikasi.' }
})
defineAction('karya.izin', async (ctx, f) => {
  const ok = f.str('keputusan') === 'setuju'
  await W.decideConsent(ctx, f.uuid('id', 'Karya?')!, ok, f.opt('catatan', 300))
  return { message: ok ? 'Izin publikasi tercatat. Karya akan ditinjau redaksi website sebelum tampil.' : 'Karya tidak akan dipublikasikan.' }
})
defineAction('karya.tarik', async (ctx, f) => {
  await W.withdraw(ctx, f.uuid('id', 'Karya?')!)
  return { message: 'Izin ditarik. Karya disembunyikan dari website pada sinkronisasi berikutnya.' }
})
