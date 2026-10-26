import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requestCtx } from '@/server/request'
import { safePath } from '@/server/paths'
import { ActionForm, Field, Flash, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Masuk' }

export default async function Masuk({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const ctx = await requestCtx()
  if (ctx?.account) redirect('/')
  const lanjut = safePath(sp1(sp, 'lanjut')) ?? ''
  return (
    <>
      <h1>Masuk ke portal</h1>
      <p className="muted">Untuk calon siswa/orang tua, orang tua/wali siswa, dan siswa.</p>
      <Flash sp={sp} />
      <ActionForm action="akun.masuk" back={`/masuk${lanjut ? `?lanjut=${encodeURIComponent(lanjut)}` : ''}`} hidden={{ lanjut }}>
        <Field name="login" label="Email atau nama pengguna" autoComplete="username" required />
        <Field name="sandi" label="Kata sandi" type="password" autoComplete="current-password" required />
        <Submit>Masuk</Submit>
      </ActionForm>
      <p className="row row--between small" style={{ marginTop: 14 }}>
        <Link href="/lupa-sandi">Lupa kata sandi?</Link>
        <Link href="/daftar">Buat akun pendaftar</Link>
      </p>
      <hr className="divider" />
      <p className="small muted">
        Guru dan staf sekolah: <Link href={`/masuk-staf${lanjut ? `?lanjut=${encodeURIComponent(lanjut)}` : ''}`}>masuk dengan akun staf</Link>.
      </p>
    </>
  )
}
