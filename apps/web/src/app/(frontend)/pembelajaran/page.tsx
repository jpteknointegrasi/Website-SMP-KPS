import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState, DemoBadge } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import { HexPlaceholder } from '@/components/sections/home'
import type { Program, Media } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Pembelajaran', description: `Pendekatan dan program pembelajaran ${name}.`, alternates: { canonical: '/pembelajaran' } }))

export default async function Page() {
  const res = await listCollection('programs', { sort: 'order', limit: 24 })
  const items = res.docs as Program[]
  return (
    <>
      <PageHeader title="Belajar dengan Makna" lead="Pendekatan dan program pembelajaran yang mengembangkan pengetahuan, karakter dan potensi setiap siswa." crumbs={[{ label: 'Pembelajaran' }]} />
      <section className="section">
        <Container>
          {items.length ? (
            <ul className="programs">
              {items.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/pembelajaran/${p.slug}`} className="program">
                    <div className="program__media">{p.cover ? <Img media={p.cover as Media} sizes="(min-width:1024px) 380px, 100vw" /> : <HexPlaceholder seed={i} />}</div>
                    <div className="program__body">
                      <h2 style={{ fontSize: '1.2rem' }}>{p.title} <DemoBadge show={p.isDemo} /></h2>
                      {p.excerpt ? <p>{p.excerpt}</p> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Program sedang disiapkan" text="Daftar program akan dimuat setelah disahkan sekolah." />
          )}
        </Container>
      </section>
    </>
  )
}
