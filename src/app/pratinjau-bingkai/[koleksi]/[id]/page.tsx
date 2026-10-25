import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { payloadClient } from '@/lib/payload'
import { isStaff } from '@/access/roles'

export const metadata = { title: 'Pratinjau desktop & HP', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Side-by-side desktop (1280) and phone (390) preview of a draft. Same-origin iframes only. */
export default async function Page({ params }: { params: Promise<{ koleksi: string; id: string }> }) {
  const { koleksi, id } = await params
  if (!/^[a-z-]{2,30}$/.test(koleksi) || !/^\d+$/.test(id)) notFound()
  const payload = await payloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!isStaff(user)) notFound()
  const src = `/pratinjau/${koleksi}/${id}`
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16, gridTemplateColumns: 'minmax(0,1fr) 410px', alignItems: 'start' }}>
      <section>
        <h2 style={{ font: '700 14px system-ui', margin: '0 0 8px' }}>Desktop (1280 px, diperkecil)</h2>
        <div style={{ width: '100%', aspectRatio: '1280 / 900', overflow: 'hidden', border: '1px solid #dfe6eb', borderRadius: 12 }}>
          <iframe src={src} title="Pratinjau desktop" style={{ width: 1280, height: 900, border: 0, transform: 'scale(var(--s, .6))', transformOrigin: '0 0' }} />
        </div>
      </section>
      <section>
        <h2 style={{ font: '700 14px system-ui', margin: '0 0 8px' }}>HP (390 px)</h2>
        <iframe src={src} title="Pratinjau HP" style={{ width: 390, height: 780, border: '1px solid #dfe6eb', borderRadius: 24 }} />
      </section>
      <script dangerouslySetInnerHTML={{ __html: "(()=>{const f=()=>{document.querySelectorAll('section:first-child > div').forEach(d=>d.style.setProperty('--s',String(d.clientWidth/1280)))};f();addEventListener('resize',f)})()" }} />
    </div>
  )
}
