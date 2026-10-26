import Link from 'next/link'
import { accountPage } from '@/server/request'
import { familyStudents } from '@/modules/family'
import { ActionButton, ActionForm, Badge, Card, Field, Flash, PageHead, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Akun saya' }

export default async function Account({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/akun')
  const sp = await searchParams
  const kids = await familyStudents(ctx)
  return (
    <>
      <PageHead title="Akun saya" />
      <Flash sp={sp} />
      <div className="grid grid--2">
        <Card title="Profil akun">
          <dl className="kv">
            <dt>Nama</dt>
            <dd>{ctx.account.name}</dd>
            <dt>Login</dt>
            <dd>{ctx.account.login}</dd>
            <dt>Email</dt>
            <dd>
              {ctx.account.email ?? '—'} {ctx.account.email ? ctx.account.emailVerified ? <Badge tone="ok">Terverifikasi</Badge> : <Badge tone="warn">Belum diverifikasi</Badge> : null}
            </dd>
            <dt>Terhubung dengan</dt>
            <dd>{kids.length ? kids.map((k) => k.name).join(', ') : '—'}</dd>
          </dl>
          <div className="row" style={{ marginTop: 14 }}>
            <Link className="btn btn--ghost" href="/akun/sandi">
              Ganti kata sandi
            </Link>
            {ctx.account.email && !ctx.account.emailVerified ? <ActionButton action="akun.kirim_ulang_verifikasi" back="/akun" label="Kirim ulang verifikasi" tone="ghost" /> : null}
          </div>
        </Card>
        <Card title="Hubungkan dengan data siswa">
          <p className="muted">Masukkan kode aktivasi yang diberikan sekolah (untuk orang tua/wali atau siswa).</p>
          <ActionForm action="akun.kode" back="/akun">
            <Field name="kode" label="Kode aktivasi" placeholder="XXXX-XXXX-XXXX" required />
            <Submit>Hubungkan</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  )
}
