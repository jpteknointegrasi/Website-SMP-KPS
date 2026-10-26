import { defineAction } from '@/server/actions'
import { fail } from '@/server/errors'
import { formFile } from '@/server/files'
import * as F from './service'

defineAction('keuangan.bayar', async (ctx, f) => {
  const amount = f.int('nominal', { required: 'Isi nominal.', min: 1 })!
  await F.submitPayment(ctx, f.uuid('tagihan', 'Tagihan tidak dikenal.')!, { amount, method: f.str('metode') || 'transfer', paidOn: f.str('tanggal'), payerName: f.opt('pembayar', 120), proof: await formFile(f.data, 'bukti') })
  return { message: 'Bukti pembayaran terkirim. Bagian keuangan akan memverifikasi.' }
})
defineAction('keuangan.verifikasi', async (ctx, f) => {
  await F.verifyPayment(ctx, f.uuid('id', 'Pembayaran tidak dikenal.')!, f.opt('referensi', 80))
  return { message: 'Pembayaran terverifikasi; kuitansi diterbitkan.' }
})
defineAction('keuangan.tolak', async (ctx, f) => {
  await F.rejectPayment(ctx, f.uuid('id', 'Pembayaran tidak dikenal.')!, f.str('alasan'))
  return { message: 'Bukti pembayaran ditolak; pembayar diminta memperbaiki.' }
})
defineAction('keuangan.tutup', async (ctx, f) => {
  const kind = f.oneOf('jenis', ['waived', 'cancelled'] as const, 'Pilih jenis.')!
  await F.closeInvoice(ctx, f.uuid('id', 'Tagihan tidak dikenal.')!, kind, f.str('alasan'))
  return { message: kind === 'waived' ? 'Tagihan dibebaskan.' : 'Tagihan dibatalkan.' }
})
defineAction('keuangan.tagihan_baru', async (ctx, f) => {
  const ids = f.all('siswa')
  if (!ids.length) fail('Pilih siswa.')
  const n = await F.createStudentInvoice(ctx, { studentIds: ids, category: f.str('kategori'), title: f.str('judul'), amount: f.int('nominal', { required: 'Isi nominal.', min: 1 })!, dueDate: f.opt('jatuh_tempo', 10) })
  return { message: `${n} tagihan dibuat.` }
})
