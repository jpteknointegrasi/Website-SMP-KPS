import { defineAction } from '@/server/actions'
import { safePath } from '@/server/paths'
import { fail } from '@/server/errors'
import { changePassword, requestReset, resendVerification, resetPassword, SESSION_DAYS, signIn, signOut, signUp, verifyEmail } from './service'

const COOKIE = 'sekolahku_sesi'

defineAction('akun.masuk', async (ctx, f) => {
  const { token, mustChangePassword } = await signIn(ctx, { login: f.str('login'), password: f.str('sandi') })
  const next = safePath(f.str('lanjut'))
  return {
    redirect: mustChangePassword ? '/akun/sandi?wajib=1' : next && !next.startsWith('/masuk') ? next : '/',
    cookies: [{ name: COOKIE, value: token, maxAge: SESSION_DAYS * 86400 }],
  }
})

defineAction('akun.keluar', async (ctx) => {
  await signOut(ctx)
  return { redirect: '/masuk', message: 'Anda sudah keluar.', cookies: [{ name: COOKIE, value: '', maxAge: 0 }] }
})

defineAction('akun.daftar', async (ctx, f) => {
  if (f.str('sandi') !== f.str('sandi2')) fail('Konfirmasi kata sandi tidak sama.')
  if (!f.bool('setuju')) fail('Centang persetujuan pemrosesan data untuk melanjutkan.')
  await signUp(ctx, { name: f.str('nama', { required: 'Isi nama lengkap.', max: 120 }), email: f.str('email', { required: 'Isi email.' }), password: f.str('sandi') })
  return { redirect: '/masuk', message: 'Pendaftaran akun diterima. Kami mengirim email verifikasi — buka tautannya, lalu masuk dengan email dan kata sandi Anda.' }
})

defineAction('akun.verifikasi', async (ctx, f) => {
  await verifyEmail(ctx, f.str('t'))
  return { redirect: ctx.account ? '/akun' : '/masuk', message: 'Email berhasil diverifikasi.' }
})

defineAction('akun.kirim_ulang_verifikasi', async (ctx) => {
  await resendVerification(ctx)
  return { message: 'Email verifikasi dikirim ulang.' }
})

defineAction('akun.lupa', async (ctx, f) => {
  await requestReset(ctx, f.str('email', { required: 'Isi email akun.' }))
  return { redirect: '/masuk', message: 'Bila email itu terdaftar, tautan atur ulang kata sandi sudah dikirim (berlaku 1 jam).' }
})

defineAction('akun.atur_ulang', async (ctx, f) => {
  if (f.str('sandi') !== f.str('sandi2')) fail('Konfirmasi kata sandi tidak sama.')
  await resetPassword(ctx, f.str('t'), f.str('sandi'))
  return { redirect: '/masuk', message: 'Kata sandi diperbarui. Silakan masuk.', cookies: [{ name: COOKIE, value: '', maxAge: 0 }] }
})

defineAction('akun.ganti_sandi', async (ctx, f) => {
  if (f.str('sandi') !== f.str('sandi2')) fail('Konfirmasi kata sandi tidak sama.')
  await changePassword(ctx, f.str('sandi_lama'), f.str('sandi'))
  return { redirect: '/', message: 'Kata sandi diperbarui. Sesi di perangkat lain sudah dikeluarkan.' }
})
