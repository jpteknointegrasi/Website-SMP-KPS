import { ActionForm, Flash, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Verifikasi email' }

/** Verification is a button (POST), so link scanners in mail systems cannot use up the link. */
export default async function Verifikasi({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const t = sp1(sp, 't') ?? ''
  return (
    <>
      <h1>Verifikasi email</h1>
      <Flash sp={sp} />
      <p className="muted">Tekan tombol berikut untuk memastikan email ini milik Anda.</p>
      <ActionForm action="akun.verifikasi" back={`/verifikasi-email?t=${encodeURIComponent(t)}`} hidden={{ t }}>
        <Submit>Verifikasi email saya</Submit>
      </ActionForm>
    </>
  )
}
