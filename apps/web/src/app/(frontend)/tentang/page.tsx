import { getSchoolNames } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { PageHeader, Container } from '@/components/ui/bits'
import { PageBlocks } from '@/components/content/PageBlocks'
import { Img } from '@/components/ui/Img'
import type { Page, Media } from '@/payload-types'

export async function generateMetadata(): Promise<Metadata> {
  const p = await findBySlug<Page>('pages', 'tentang')
  return { title: p?.seo?.title ?? `Tentang ${(await getSchoolNames()).short}`, description: p?.seo?.description ?? p?.excerpt ?? undefined, alternates: { canonical: '/tentang' } }
}

export default async function Tentang() {
  const { name, short } = await getSchoolNames()
  const page = await findBySlug<Page>('pages', 'tentang')
  if (!page) notFound()
  const cover = page.cover && typeof page.cover === 'object' ? (page.cover as Media) : null
  return (
    <>
      <PageHeader title={page.title} lead={page.excerpt} crumbs={[{ label: `Tentang ${short}` }]} />
      <section className="section">
        <Container>
          {cover ? (
            <figure className="article-cover">
              <Img media={cover} priority sizes="(min-width: 1280px) 1200px, 100vw" />
            </figure>
          ) : null}
          <PageBlocks blocks={page.layout} />
          <h2>Jelajahi profil sekolah</h2>
          <ul className="hub">
            {[
              ['/tentang/visi-misi', 'Visi & Misi', 'Arah dan tujuan pendidikan sekolah'],
              ['/tentang/sejarah', 'Sejarah', `Perjalanan ${name}`],
              ['/tentang/pimpinan-guru', 'Pimpinan & Guru', 'Orang-orang yang mendampingi siswa'],
              ['/tentang/fasilitas', 'Fasilitas', 'Ruang belajar dan kegiatan'],
            ].map(([href, t, d]) => (
              <li key={href}>
                <Link href={href}>
                  <strong>{t}</strong>
                  <span>{d}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
