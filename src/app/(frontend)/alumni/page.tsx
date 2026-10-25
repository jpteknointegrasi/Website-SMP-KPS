import Link from 'next/link'
import { findBySlug, getGlobals, listCollection } from '@/lib/queries'
import { PageHeader, Container } from '@/components/ui/bits'
import { PageBlocks } from '@/components/content/PageBlocks'
import { Img } from '@/components/ui/Img'
import type { Page as CmsPage, Testimonial, Media } from '@/payload-types'

export const metadata = { title: 'Alumni', description: 'Jejaring alumni SMP Nasional KPS.', alternates: { canonical: '/alumni' } }

export default async function Page() {
  const [page, { settings }, stories] = await Promise.all([
    findBySlug<CmsPage>('pages', 'alumni'),
    getGlobals(),
    // Only stories with recorded publication consent
    listCollection('testimonials', { where: { consent: { equals: true } }, sort: '-updatedAt', limit: 6 }),
  ])
  const items = stories.docs as unknown as Testimonial[]
  return (
    <>
      <PageHeader title={page?.title ?? 'Keluarga Alumni KPS'} lead={page?.excerpt ?? 'Alumni adalah bagian dari keluarga besar SMP Nasional KPS. Tetap terhubung dengan sekolah dan sesama alumni.'} crumbs={[{ label: 'Alumni' }]} />
      <section className="section">
        <Container>
          {page ? <PageBlocks blocks={page.layout} /> : null}
          <div className="status-panel status-panel--open" style={{ margin: '8px 0 40px' }}>
            <strong>Portal Alumni</strong>
            {settings.alumniUrl ? (
              <>
                <span>Perbarui data dan temukan kabar sesama alumni melalui portal resmi.</span>
                <div><a className="btn btn--teal" href={settings.alumniUrl} target="_blank" rel="noopener noreferrer">Buka Portal Alumni <span className="sr-only">(membuka tab baru)</span></a></div>
              </>
            ) : (
              <>
                <span>Alamat portal alumni sedang disiapkan. Sementara itu, alumni dapat menghubungi sekolah untuk berbagi kabar.</span>
                <div><Link className="btn btn--teal" href="/kontak?kategori=alumni">Hubungi sekolah</Link></div>
              </>
            )}
          </div>
          {items.length ? (
            <>
              <h2 className="h2">Cerita alumni</h2>
              <ul className="cards">
                {items.map((t) => (
                  <li key={t.id}>
                    <figure className="quote-card">
                      <blockquote>“{t.quote}”</blockquote>
                      <figcaption>
                        {t.photo && typeof t.photo === 'object' ? <Img media={t.photo as Media} sizes="56px" alt="" /> : null}
                        <span><strong>{t.publicName}</strong>{t.roleLine ? <small>{t.roleLine}</small> : null}</span>
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Container>
      </section>
    </>
  )
}
