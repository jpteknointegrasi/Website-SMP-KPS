import { accountPage } from '@/server/request'
import { ActionForm, Card, Field, Flash, Notice, PageHead, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Ganti kata sandi' }

export default async function ChangePassword({ searchParams }: { searchParams: Promise<SP> }) {
  await accountPage('/akun/sandi', undefined, { allowPasswordChange: true })
  const sp = await searchParams
  return (
    <>
      <PageHead title="Ganti kata sandi" />
      <Flash sp={sp} />
      {sp1(sp, 'wajib') ? <Notice tone="warn">Akun ini dibuat sekolah dengan kata sandi sementara. Ganti kata sandi untuk melanjutkan.</Notice> : null}
      <Card>
        <ActionForm action="akun.ganti_sandi" back="/akun/sandi">
          <Field name="sandi_lama" label="Kata sandi saat ini" type="password" required autoComplete="current-password" />
          <Field name="sandi" label="Kata sandi baru" type="password" required autoComplete="new-password" hint="Minimal 10 karakter." />
          <Field name="sandi2" label="Ulangi kata sandi baru" type="password" required autoComplete="new-password" />
          <Submit>Simpan</Submit>
        </ActionForm>
      </Card>
    </>
  )
}
