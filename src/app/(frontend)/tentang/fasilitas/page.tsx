import Link from 'next/link'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import { HexPlaceholder } from '@/components/sections/home'
import type { Facility, Media } from '@/payload-types'

export const metadata = { title: 'Fasilitas', alternates: { canonical: '/tentang/fasilitas' } }
const AV: Record<string, string> = { available: 'Tersedia', renovation: 'Sedang direnovasi', planned: 'Rencana' }

export default async function Page() {
  const res = await listCollection('facilities', { sort: 'order', limit: 48 })
  const items = res.docs as Facility[]
  return (
    <>
      <PageHeader title="Fasilitas" lead="Ruang belajar dan kegiatan di SMP Nasional KPS." crumbs={[{ label: 'Tentang KPS', href: '/tentang' }, { label: 'Fasilitas' }]} />
      <section className="section">
        <Container>
          {items.length ? (
            <ul className="programs">
              {items.map((f, i) => (
                <li key={f.id}>
                  <Link href={`/tentang/fasilitas/${f.slug}`} className="program">
                    <div className="program__media">{f.cover ? <Img media={f.cover as Media} sizes="380px" /> : <HexPlaceholder seed={i} />}</div>
                    <div className="program__body">
                      <span className={`badge ${f.availability !== 'available' ? 'badge--postponed' : ''}`}>{AV[f.availability]}</span>
                      <h2 style={{ fontSize: '1.2rem', marginTop: 8 }}>{f.title}</h2>
                      {f.excerpt ? <p>{f.excerpt}</p> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Daftar fasilitas sedang disiapkan" text="Foto dan keterangan fasilitas akan dimuat setelah tersedia dokumentasi resmi terbaru." action={{ label: 'Hubungi sekolah', href: '/kontak' }} />
          )}
        </Container>
      </section>
    </>
  )
}
