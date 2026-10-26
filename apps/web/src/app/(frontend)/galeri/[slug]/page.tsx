import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { PageHeader, Container, DemoBadge } from '@/components/ui/bits'
import { Lightbox } from '@/components/ui/Lightbox'
import { formatDate } from '@/lib/format'
import type { Album, Media } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await findBySlug<Album>('albums', (await params).slug, 0)
  if (!a) return {}
  return { title: a.title, description: a.excerpt ?? undefined, alternates: { canonical: `/galeri/${a.slug}` } }
}

export default async function Page({ params }: P) {
  const a = await findBySlug<Album>('albums', (await params).slug, 2)
  if (!a) notFound()
  const items = (a.items ?? [])
    .map((it) => ({ media: typeof it.media === 'object' ? (it.media as Media) : null, caption: it.caption }))
    .filter((it): it is { media: Media; caption: string | null | undefined } => Boolean(it.media?.url))
    .map((it) => {
      const sizes = Object.values(it.media.sizes ?? {}).filter((s) => s && (s as { url?: string }).url) as { url: string; width: number }[]
      const large = sizes.sort((x, y) => y.width - x.width)[0]
      const thumb = sizes.sort((x, y) => x.width - y.width).find((s) => s.width >= 480) ?? large
      return {
        id: it.media.id,
        src: large?.url ?? it.media.url!,
        thumb: thumb?.url ?? it.media.url!,
        width: it.media.width ?? 4,
        height: it.media.height ?? 3,
        alt: it.media.decorative ? '' : (it.media.alt ?? ''),
        caption: it.caption ?? it.media.caption ?? '',
      }
    })
  return (
    <>
      <PageHeader title={a.title} lead={a.excerpt} crumbs={[{ label: 'Galeri', href: '/galeri' }, { label: a.title }]}>
        <div className="article-meta">
          {a.eventDate ? <span>Tanggal kegiatan: {formatDate(a.eventDate)}</span> : null}
          <span>{items.length} foto</span>
          <DemoBadge show={a.isDemo} />
        </div>
      </PageHeader>
      <section className="section">
        <Container>
          <Lightbox items={items} />
        </Container>
      </section>
    </>
  )
}
