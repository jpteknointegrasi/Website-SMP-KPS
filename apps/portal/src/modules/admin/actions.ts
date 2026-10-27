import { and, eq, isNull } from 'drizzle-orm'
import { notifications } from '@/db/schema'
import { defineAction } from '@/server/actions'
import { formFile } from '@/server/files'
import { retryDead } from '@/server/outbox'
import { requireStaff } from '@/server/context'
import { addStaff, grantSupport, revokeSupport, saveBranding, setModuleState, setStaffRoles, updateStaff } from './service'

defineAction('staf.tambah', async (ctx, f) => {
  const id = await addStaff(ctx, { email: f.str('email'), name: f.str('nama'), displayName: f.opt('gelar'), nip: f.opt('nip'), position: f.opt('jabatan'), roles: f.all('peran') })
  return { redirect: `/staf/pengaturan/staf/${id}`, message: 'Staf ditambahkan. Peran berlaku saat staf masuk dengan akun CMS ber-email sama.' }
})
defineAction('staf.ubah', async (ctx, f) => {
  const id = f.uuid('id', 'Staf tidak dikenal.')!
  await updateStaff(ctx, id, { displayName: f.opt('gelar'), nip: f.opt('nip'), position: f.opt('jabatan'), active: f.bool('aktif') })
  return { message: 'Data staf disimpan.' }
})
defineAction('staf.peran', async (ctx, f) => {
  await setStaffRoles(ctx, f.uuid('id', 'Staf tidak dikenal.')!, f.all('peran'))
  return { message: 'Peran staf diperbarui.' }
})
defineAction('pengaturan.branding', async (ctx, f) => {
  await saveBranding(
    ctx,
    {
      shortName: f.str('nama_singkat', { max: 80 }),
      city: f.str('kota', { max: 60 }),
      address: f.str('alamat', { max: 300 }),
      phone: f.str('telepon', { max: 40 }),
      email: f.str('email', { max: 120 }),
      principalName: f.str('kepala', { max: 120 }),
      principalNip: f.str('nip_kepala', { max: 40 }),
      primary: f.str('warna_utama') || undefined,
      navy: f.str('warna_navy') || undefined,
    },
    { logo: await formFile(f.data, 'logo'), hero: await formFile(f.data, 'foto') },
  )
  return { message: 'Pengaturan sekolah disimpan.' }
})
defineAction('pengaturan.modul', async (ctx, f) => {
  await setModuleState(ctx, f.str('modul'), f.str('status'))
  return { message: 'Status modul diperbarui.' }
})
defineAction('bantuan.beri', async (ctx, f) => {
  await grantSupport(ctx, { email: f.str('email'), reason: f.str('alasan'), hours: f.int('jam', { required: 'Isi durasi.' })!, scope: f.str('cakupan') === 'data_siswa' ? 'data_siswa' : 'operasional' })
  return { message: 'Akses bantuan diberikan dan tercatat di audit.' }
})
defineAction('bantuan.cabut', async (ctx, f) => {
  await revokeSupport(ctx, f.uuid('id', 'Data tidak dikenal.')!)
  return { message: 'Akses bantuan dicabut.' }
})
defineAction('outbox.ulang', async (ctx, f) => {
  requireStaff(ctx, 'audit.view')
  await retryDead(ctx.db, f.int('id', { required: 'Data tidak dikenal.' })!)
  return { message: 'Pengiriman dijadwalkan ulang.' }
})
defineAction('notifikasi.baca', async (ctx) => {
  const r = ctx.staff ? { t: 'staff', id: ctx.staff.id } : ctx.account ? { t: 'account', id: ctx.account.id } : null
  if (r)
    await ctx.db
      .update(notifications)
      .set({ readAt: ctx.now })
      .where(and(eq(notifications.recipientType, r.t), eq(notifications.recipientId, r.id), isNull(notifications.readAt)))
  return { message: 'Semua notifikasi ditandai sudah dibaca.' }
})
