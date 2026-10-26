import Link from 'next/link'
import { ActionForm, Field, Flash, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Lupa kata sandi' }

export default async function Lupa({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  return (
    <>
      <h1>Lupa kata sandi</h1>
      <p className="muted">Masukkan email akun Anda. Bila terdaftar, kami kirim tautan atur ulang yang berlaku 1 jam.</p>
      <Flash sp={sp} />
      <ActionForm action="akun.lupa" back="/lupa-sandi">
        <Field name="email" label="Email akun" type="email" required autoComplete="email" />
        <Submit>Kirim tautan</Submit>
      </ActionForm>
      <p className="small muted" style={{ marginTop: 14 }}>
        Akun dibuat oleh sekolah tanpa email? Hubungi tata usaha untuk atur ulang kata sandi. · <Link href="/masuk">Kembali</Link>
      </p>
    </>
  )
}
