import Link from 'next/link'
import { ActionForm, Check, Field, Flash, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Buat akun' }

export default async function Daftar({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  return (
    <>
      <h1>Buat akun pendaftar</h1>
      <p className="muted">Untuk orang tua/wali calon siswa. Satu akun dapat mendaftarkan lebih dari satu anak.</p>
      <Flash sp={sp} />
      <ActionForm action="akun.daftar" back="/daftar" op>
        <Field name="nama" label="Nama lengkap orang tua/wali" required autoComplete="name" maxLength={120} />
        <Field name="email" label="Email" type="email" required autoComplete="email" hint="Tautan verifikasi dan informasi penting dikirim ke email ini." />
        <Field name="sandi" label="Kata sandi" type="password" required autoComplete="new-password" hint="Minimal 10 karakter." />
        <Field name="sandi2" label="Ulangi kata sandi" type="password" required autoComplete="new-password" />
        <Check name="setuju" label="Saya menyetujui data yang saya isi diproses sekolah untuk keperluan layanan pendidikan dan penerimaan siswa." />
        <Submit>Buat akun</Submit>
      </ActionForm>
      <p className="small" style={{ marginTop: 14 }}>
        Sudah punya akun? <Link href="/masuk">Masuk</Link>
      </p>
    </>
  )
}
