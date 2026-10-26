import { redirect } from 'next/navigation'
import { staffPage } from '@/server/request'
import { Card, Field, PageHead, sp1, Submit, type SP } from '@/ui/kit'
import { Scanner } from './scanner'

export const metadata = { title: 'Verifikasi kartu' }

/** KRT-04 verification for officers (library, gate, TU): scan the QR or type the code printed under it. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<SP> }) {
  await staffPage('/staf/kartu/verifikasi', ['cards.verify', 'cards.manage'], 'kartu')
  const sp = await searchParams
  const input = sp1(sp, 'kode')?.trim()
  if (input) {
    const m = /([A-Za-z0-9_-]{20,40})\/?$/.exec(input)
    if (m) redirect(`/v/${m[1]}`)
  }
  return (
    <>
      <PageHead title="Verifikasi kartu siswa" sub="Pindai QR pada kartu. Hasil menampilkan status terkini dan identitas pemegang untuk dicocokkan." crumbs={[['Kartu siswa'], ['Verifikasi']]} />
      <div className="grid grid--2">
        <Card title="Pindai QR">
          <Scanner />
        </Card>
        <Card title="Input manual">
          <form method="get" className="f">
            <Field name="kode" label="Tautan atau kode QR" placeholder="https://…/portal/v/…" required />
            {input ? <p className="small" style={{ color: 'var(--bad)' }}>Kode tidak dikenali.</p> : null}
            <Submit>Periksa</Submit>
          </form>
        </Card>
      </div>
    </>
  )
}
