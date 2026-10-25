import React from 'react'
import type { Media, MediaItem } from '@/payload-types'
import { MediaEmbed } from '../media/MediaCard'
import { PageHeader, Container, DemoBadge } from '../ui/bits'
import { Img } from '../ui/Img'
import { RichText } from '../ui/RichText'

type Doc = {
  title: string
  excerpt?: string | null
  cover?: number | Media | null
  content?: unknown
  gallery?: (number | Media)[] | null
  isDemo?: boolean | null
  activities?: { text: string; id?: string | null }[] | null
  relatedMedia?: (number | MediaItem)[] | null
}

/** Related videos/posts (same media item reused across pages, never duplicated). */
export const RelatedMedia = ({ items }: { items?: (number | MediaItem)[] | null }) => {
  const list = (items ?? []).filter((m): m is MediaItem => typeof m === 'object' && m !== null)
  return list.length ? (
    <div className="block">
      <h2>Video &amp; media</h2>
      {list.map((m) => <MediaEmbed key={m.id} m={m} />)}
    </div>
  ) : null
}

/** Shared detail template for programs, extracurriculars, facilities. */
export const Detail = ({
  doc,
  crumbs,
  aside,
  children,
}: {
  doc: Doc
  crumbs: { label: string; href?: string }[]
  aside?: React.ReactNode
  children?: React.ReactNode
}) => {
  const cover = doc.cover && typeof doc.cover === 'object' ? doc.cover : null
  const gallery = (doc.gallery ?? []).filter((g): g is Media => typeof g === 'object')
  return (
    <>
      <PageHeader title={doc.title} lead={doc.excerpt} crumbs={crumbs}>
        <DemoBadge show={doc.isDemo} />
      </PageHeader>
      <section className="section">
        <Container className="layout-2">
          <div>
            {cover ? (
              <figure className="article-cover">
                <Img media={cover} priority sizes="(min-width: 1024px) 860px, 100vw" />
                {cover.caption ? <figcaption>{cover.caption}</figcaption> : null}
              </figure>
            ) : null}
            {children}
            <RichText data={doc.content} />
            {doc.activities?.length ? (
              <div className="block prose">
                <h2>Aktivitas</h2>
                <ul>{doc.activities.map((a) => <li key={a.id ?? a.text}>{a.text}</li>)}</ul>
              </div>
            ) : null}
            <RelatedMedia items={doc.relatedMedia} />
            {gallery.length ? (
              <>
                <h2>Galeri</h2>
                <ul className="gallery">
                  {gallery.map((g) => (
                    <li key={g.id}>
                      <figure>
                        <Img media={g} sizes="(min-width: 768px) 380px, 50vw" />
                        {g.caption ? <figcaption>{g.caption}</figcaption> : null}
                      </figure>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          {aside ? <aside>{aside}</aside> : <span />}
        </Container>
      </section>
    </>
  )
}
