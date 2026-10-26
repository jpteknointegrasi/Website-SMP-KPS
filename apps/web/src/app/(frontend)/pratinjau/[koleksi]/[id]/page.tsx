import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { payloadClient } from '@/lib/payload'
import { isStaff } from '@/access/roles'
import { PageHeader, Container } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { Img } from '@/components/ui/Img'
import { MediaEmbed } from '@/components/media/MediaCard'
import { FaqList } from '@/components/content/FaqList'
import { formatDate, formatEventWhen } from '@/lib/format'
import type { Media, MediaItem, Faq } from '@/payload-types'

export const metadata = { title: 'Pratinjau draf', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Collections that can be previewed as draft (staff only, never cached, never indexed). */
const PREVIEWABLE = ['posts', 'announcements', 'events', 'media-items', 'student-works', 'faqs'] as const

type P = { params: Promise<{ koleksi: string; id: string }> }

export default async function Page({ params }: P) {
  const { koleksi, id } = await params
  if (!(PREVIEWABLE as readonly string[]).includes(koleksi) || !/^\d+$/.test(id)) notFound()
  const payload = await payloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!isStaff(user)) notFound()
  // the user's own permissions apply (contributors only see what they may read); draft = latest saved version
  const doc = (await payload
    .findByID({ collection: koleksi as 'posts', id: Number(id), draft: true, depth: 2, overrideAccess: false, user })
    .catch(() => null)) as Record<string, unknown> | null
  if (!doc) notFound()
  const title = String(doc.title ?? '')
  const cover = doc.cover && typeof doc.cover === 'object' ? (doc.cover as Media) : null
  return (
    <>
      <div className="preview-bar" role="status">Pratinjau draf — belum tentu sama dengan versi yang terbit. Status: {String(doc._status ?? '-')} · {String(doc.workflowStatus ?? '')}</div>
      <PageHeader title={title} lead={(doc.excerpt as string) ?? undefined} crumbs={[{ label: 'Pratinjau' }]}>
        <div className="article-meta">
          {koleksi === 'events' && doc.startAt ? <span>{formatEventWhen(doc as never)}</span> : null}
          {koleksi === 'posts' && doc.publishedAt ? <span>{formatDate(doc.publishedAt as string)}</span> : null}
        </div>
      </PageHeader>
      <section className="section">
        <Container className="layout-2">
          <div>
            {koleksi === 'media-items' ? <MediaEmbed m={doc as unknown as MediaItem} /> : null}
            {koleksi === 'faqs' ? <FaqList items={[doc as unknown as Faq]} open={String(doc.slug)} /> : null}
            {cover ? (
              <figure className="article-cover">
                <Img media={cover} sizes="(min-width: 1024px) 860px, 100vw" />
              </figure>
            ) : null}
            <RichText data={doc.content ?? doc.editorialBody} />
          </div>
        </Container>
      </section>
    </>
  )
}
