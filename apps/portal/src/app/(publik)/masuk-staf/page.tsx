import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requestCtx } from '@/server/request'
import { safePath } from '@/server/paths'
import { sp1, type SP } from '@/ui/kit'
import { StaffLoginForm } from './form'

export const metadata = { title: 'Masuk staf' }

export default async function MasukStaf({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const ctx = await requestCtx()
  const next = safePath(sp1(sp, 'lanjut'))
  if (ctx?.staff) redirect(next ?? '/staf')
  return (
    <>
      <h1>Masuk staf sekolah</h1>
      <p className="muted">Gunakan akun yang sama dengan CMS website sekolah. Akun bersama tidak diperbolehkan.</p>
      <StaffLoginForm next={`/portal${next ?? '/staf'}`} />
      <p className="small muted" style={{ marginTop: 16 }}>
        Belum punya akun staf? Minta Admin Teknis sekolah membuatkan akun di CMS. · <Link href="/masuk">Masuk sebagai siswa/orang tua</Link>
      </p>
    </>
  )
}
