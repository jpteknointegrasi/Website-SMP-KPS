import { redirect } from 'next/navigation'
import { hasProduct } from '@sekolahku/core'
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
        <p>{!school ? 'Alamat ini tidak terhubung ke sekolah yang aktif.' : !hasProduct(school, 'app') ? 'Portal sekolah belum aktif untuk sekolah ini.' : 'Portal sekolah sedang disiapkan.'}</p>
        {school ? <a href="/">Kembali ke website sekolah</a> : null}
      </main>
    )
  }
  if (ctx.staff) redirect('/staf')
  if (ctx.account) redirect('/keluarga')
  redirect('/masuk')
}
