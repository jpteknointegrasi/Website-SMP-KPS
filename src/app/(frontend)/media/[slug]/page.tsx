import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { contentUsingMedia, findBySlug, getFlags } from '@/lib/queries'
import { PageHeader, Container } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { MediaEmbed, posterOf } from '@/components/media/MediaCard'
import { CONTENT_TYPE_LABEL, PLATFORM_LABEL } from '@/lib/media-url'
import { formatDate } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'
import type { MediaItem, SocialAccount, Event } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  if (!(await getFlags()).mediaHub) return {}
  const m = await findBySlug<MediaItem>('media-items', (await params).slug, 1)
  if (!m) return {}
  const p = posterOf(m)
  return { title: m.title, description: m.excerpt ?? undefined, alternates: { canonical: `/media/${m.slug}` }, openGraph: { images: p.url ? [p.url] : ['/og-image.jpg'] } }
}

export default async function Page({ params }: P) {
  if (!(await getFlags()).mediaHub) notFound()
  const m = await findBySlug<MediaItem>('media-items', (await params).slug, 1)
  if (!m) notFound()
  const related = await contentUsingMedia(m.id)
  const account = m.sourceAccount && typeof m.sourceAccount === 'object' ? (m.sourceAccount as SocialAccount) : null
  const events = (m.relatedEvents ?? []).filter((e): e is Event => typeof e === 'object' && e !== null)
  const platform = PLATFORM_LABEL[m.platform ?? 'web']
  return (
    <>
      <PageHeader title={m.title} lead={m.excerpt} crumbs={[{ label: 'Video & Media', href: '/media' }, { label: m.title }]}>
        <div className="article-meta">
          <span>{platform} · {m.contentType === 'podcast' ? 'Podcast' : CONTENT_TYPE_LABEL[m.contentType ?? '']}</span>
          {m.sourcePublishedAt ? <span>Terbit di sumber: {formatDate(m.sourcePublishedAt)}</span> : null}
        </div>
      </PageHeader>
      <section className="section">
        <Container className="layout-2">
          <div>
            <MediaEmbed m={m} />
            {m.editorialBody ? <div className="block"><RichText data={m.editorialBody} /></div> : null}
          </div>
          <aside>
            <div className="aside-card">
              <h2>Sumber</h2>
              <dl>
                <dt>Platform</dt>
                <dd>{platform}</dd>
                {account ? (<><dt>Akun</dt><dd><a href={account.profileUrl} target="_blank" rel="noopener noreferrer">{account.displayName}<span className="sr-only"> (membuka tab baru)</span></a></dd></>) : null}
              </dl>
              <a className="btn btn--teal" href={m.normalizedUrl ?? m.originalUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 14 }} data-cta="media-source">
                Buka di {platform} <Icon name="external" size={16} /><span className="sr-only"> (membuka tab baru)</span>
              </a>
            </div>
            {related.length || events.length ? (
              <div className="aside-card">
                <h2>Konten terkait</h2>
                <ul className="list-plain">
                  {related.map((r) => <li key={r.href}><Link href={r.href}>{r.title}</Link></li>)}
                  {events.map((e) => <li key={e.id}><Link href={`/agenda/${e.slug}`}>{e.title}</Link></li>)}
                </ul>
              </div>
            ) : null}
          </aside>
        </Container>
      </section>
    </>
  )
}
