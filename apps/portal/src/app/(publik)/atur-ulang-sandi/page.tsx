import { ActionForm, Field, Flash, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Atur ulang kata sandi' }

export default async function AturUlang({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const t = sp1(sp, 't') ?? ''
  return (
    <>
      <h1>Atur ulang kata sandi</h1>
      <Flash sp={sp} />
      <ActionForm action="akun.atur_ulang" back={`/atur-ulang-sandi?t=${encodeURIComponent(t)}`} hidden={{ t }}>
        <Field name="sandi" label="Kata sandi baru" type="password" required autoComplete="new-password" hint="Minimal 10 karakter." />
        <Field name="sandi2" label="Ulangi kata sandi baru" type="password" required autoComplete="new-password" />
        <Submit>Simpan kata sandi</Submit>
      </ActionForm>
    </>
  )
}
