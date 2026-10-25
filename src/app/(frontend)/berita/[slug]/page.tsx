import { getSchoolNames } from '@/lib/queries'
import { siteUrl } from '@/lib/payload'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findBySlug, relatedPosts } from '@/lib/queries'
import { PageHeader, Container } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import { RichText } from '@/components/ui/RichText'
import { RelatedMedia } from '@/components/content/Detail'
import { PostCard } from '@/components/sections/home'
import { formatDate } from '@/lib/format'
import type { Post, Media, Category } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await findBySlug<Post>('posts', (await params).slug)
  if (!p) return {}
  const cover = p.cover && typeof p.cover === 'object' ? (p.cover as Media) : null
  return {
    title: p.seo?.title ?? p.title,
    description: p.seo?.description ?? p.excerpt ?? undefined,
    alternates: { canonical: `/berita/${p.slug}` },
    openGraph: { type: 'article', publishedTime: p.publishedAt ?? undefined, locale: 'id_ID', siteName: (await getSchoolNames()).name, images: cover?.sizes?.large?.url ? [cover.sizes.large.url] : undefined },
    twitter: { card: 'summary_large_image', images: [cover?.sizes?.large?.url ?? '/og-image.jpg'] },
  }
}

export default async function Page({ params }: P) {
  const { name } = await getSchoolNames()
  const p = await findBySlug<Post>('posts', (await params).slug)
  if (!p) notFound()
  const cover = p.cover && typeof p.cover === 'object' ? (p.cover as Media) : null
  const related = await relatedPosts(p)
  const cats = (p.categories ?? []).filter((c): c is Category => typeof c === 'object')
  const gallery = (p.gallery ?? []).filter((g): g is Media => typeof g === 'object')
  const SITE = await siteUrl()
  const url = `${SITE}/berita/${p.slug}`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: p.title,
    datePublished: p.publishedAt,
    dateModified: p.updatedAt,
    image: cover?.sizes?.large?.url ? [`${SITE}${cover.sizes.large.url}`] : undefined,
    publisher: { '@type': 'Organization', name },
  }
  return (
    <>
      <PageHeader title={p.title} crumbs={[{ label: 'Berita', href: '/berita' }, { label: p.title }]}>
        <div className="article-meta">
          <time dateTime={p.publishedAt ?? undefined}>{formatDate(p.publishedAt)}</time>
          {p.authorName ? <span>Oleh {p.authorName}</span> : null}
          {cats.map((c) => <Link key={c.id} href={`/berita?kategori=${c.slug}`} style={{ color: 'var(--gold-2)' }}>{c.title}</Link>)}
        </div>
      </PageHeader>
      <article className="section">
        <Container>
          {cover ? (
            <figure className="article-cover">
              <Img media={cover} priority sizes="(min-width: 1280px) 1200px, 100vw" />
              {p.coverCaption || cover.caption ? <figcaption>{p.coverCaption ?? cover.caption}</figcaption> : null}
            </figure>
          ) : null}
          {p.excerpt ? <p className="lead">{p.excerpt}</p> : null}
          <RichText data={p.content} />
          <RelatedMedia items={p.relatedMedia} />
          {gallery.length ? (
            <ul className="gallery" style={{ marginTop: 32 }}>
              {gallery.map((g) => <li key={g.id}><figure><Img media={g} sizes="380px" />{g.caption ? <figcaption>{g.caption}</figcaption> : null}</figure></li>)}
            </ul>
          ) : null}
          <div className="share">
            <strong>Bagikan:</strong>
            <a className="chip" href={`https://wa.me/?text=${encodeURIComponent(`${p.title} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a className="chip" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
          {p.sourceUrl ? <p className="source-note">Artikel ini dimigrasikan dari website lama sekolah. Sumber asli: <a href={p.sourceUrl} rel="noopener noreferrer">{p.sourceUrl}</a></p> : null}
        </Container>
      </article>
      {related.length ? (
        <section className="section section--ivory">
          <Container>
            <h2 className="h2">Berita terkait</h2>
            <div className="cards">{related.map((r, i) => <PostCard key={r.id} p={r} i={i} />)}</div>
          </Container>
        </section>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </>
  )
}
