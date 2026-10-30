import { redirect } from 'next/navigation'
import { unavailableMessage } from '@/lib/unavailable'
import { portalSchool } from '@/lib/context'
import { requestCtx } from '@/server/request'

/** Portal entry: staff → staff workspace, families/students → their home, others → sign in. */
export default async function PortalHome() {
  const school = await portalSchool()
  const ctx = await requestCtx()
  if (!ctx) {
    return (
      <main id="main" className="narrow" style={{ padding: '64px 16px' }}>
        <h1>{school ? school.name : 'Portal tidak ditemukan'}</h1>
        <p>{unavailableMessage(school)}</p>
        {school ? <a href="/">Kembali ke website sekolah</a> : null}
      </main>
    )
  }
  if (ctx.staff) redirect('/staf')
  if (ctx.account) redirect('/keluarga')
  redirect('/masuk')
}
