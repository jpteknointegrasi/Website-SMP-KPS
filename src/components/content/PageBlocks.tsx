import React from 'react'
import Link from 'next/link'
import type { Page, Media, Faq, Event, MediaItem, StudentWork, Guide, Post } from '@/payload-types'
import { RichText } from '../ui/RichText'
import { Img } from '../ui/Img'
import { SmartLink } from '../ui/bits'
import { FaqList } from './FaqList'
import { MediaEmbed } from '../media/MediaCard'
import { getFlags, listFaqs, listUpcomingEvents } from '@/lib/queries'
import { formatDate, formatEventWhen, WORK_CATS } from '@/lib/format'

// related documents that are unpublished come back as bare ids (access rules), so they are dropped here
const objs = <T,>(v: unknown): T[] => (Array.isArray(v) ? v.filter((x): x is T => typeof x === 'object' && x !== null) : [])

export async function PageBlocks({ blocks }: { blocks?: Page['layout'] }) {
  const list = blocks ?? []
  const flags = await getFlags()
  // data for blocks that pull "latest" content
  const extra = await Promise.all(
    list.map(async (b) => {
      if (b.blockType === 'faqBlock' && !objs(b.items).length && b.category) return listFaqs({ category: b.category, limit: 8 })
      if (b.blockType === 'eventsBlock' && !objs(b.items).length) return (await listUpcomingEvents(3)).docs
      return null
    }),
  )
  return (
  <>
    {list.map((b, i) => {
      switch (b.blockType) {
        case 'richText':
          return (
            <div className="block" key={i}>
              <RichText data={b.content} />
            </div>
          )
        case 'imageText':
          return (
            <div className={`block image-text ${b.imageSide === 'left' ? 'image-text--left' : ''}`} key={i}>
              <div>
                {b.heading ? <h2>{b.heading}</h2> : null}
                <RichText data={b.content} />
              </div>
              <div className="image-text__media">
                <Img media={b.image as Media} sizes="(min-width: 1024px) 560px, 100vw" />
              </div>
            </div>
          )
        case 'values':
          return (
            <div className="block" key={i}>
              {b.heading ? <h2>{b.heading}</h2> : null}
              <ul className="values-grid">
                {(b.items ?? []).map((it) => (
                  <li key={it.id ?? it.title}>
                    <h3>{it.title}</h3>
                    {it.text ? <p>{it.text}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
        case 'cta':
          return (
            <div className="block cta-block" key={i}>
              <h2>{b.heading}</h2>
              {b.text ? <p>{b.text}</p> : null}
              {b.href && b.label ? (
                <SmartLink href={b.href} className="btn btn--gold">
                  {b.label}
                </SmartLink>
              ) : null}
            </div>
          )
        case 'highlightBanner': {
          const post = b.post && typeof b.post === 'object' ? (b.post as Post) : null
          const img = (b.image && typeof b.image === 'object' ? (b.image as Media) : null) ?? (post?.cover && typeof post.cover === 'object' ? (post.cover as Media) : null)
          return (
            <section className="block hl-banner" key={i} aria-labelledby={`hl-${i}`}>
              {img ? (
                <div className="hl-banner__media">
                  <Img media={img} sizes="(min-width: 1024px) 420px, 100vw" />
                </div>
              ) : null}
              <div className="hl-banner__body">
                {b.eyebrow ? <p className="hl-banner__eyebrow">{b.eyebrow}</p> : null}
                <h2 id={`hl-${i}`}>{b.heading}</h2>
                {b.text ? <p>{b.text}</p> : null}
                {post ? (
                  <Link className="hl-banner__post" href={`/berita/${post.slug}`} data-cta="sorotan-berita">
                    <small>Berita{post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ''}</small>
                    <strong>{post.title}</strong>
                    <span>Baca berita →</span>
                  </Link>
                ) : null}
                {b.linkHref ? (
                  <SmartLink href={b.linkHref} className="btn btn--gold" data-cta="sorotan-tautan">
                    {b.linkLabel || 'Selengkapnya'}
                  </SmartLink>
                ) : null}
              </div>
            </section>
          )
        }
        case 'faqBlock': {
          const items = objs<Faq>(b.items).length ? objs<Faq>(b.items) : ((extra[i] as Faq[] | null) ?? [])
          return items.length ? (
            <div className="block faq" key={i}>
              {b.heading ? <h2>{b.heading}</h2> : null}
              <FaqList items={items} />
            </div>
          ) : null
        }
        case 'eventsBlock': {
          const items = objs<Event>(b.items).length ? objs<Event>(b.items) : ((extra[i] as Event[] | null) ?? [])
          return items.length ? (
            <div className="block" key={i}>
              {b.heading ? <h2>{b.heading}</h2> : null}
              <ul className="list-rows">
                {items.map((e) => (
                  <li key={e.id}>
                    <Link className="row-link" href={`/agenda/${e.slug}`}>
                      <strong>{e.title}</strong>
                      <span>{formatEventWhen(e)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        }
        case 'mediaBlock': {
          const items = flags.mediaHub ? objs<MediaItem>(b.items) : []
          return items.length ? (
            <div className="block" key={i}>
              {b.heading ? <h2>{b.heading}</h2> : null}
              {items.map((m) => <MediaEmbed key={m.id} m={m} />)}
            </div>
          ) : null
        }
        case 'worksBlock': {
          const items = flags.studentWorks ? objs<StudentWork>(b.items) : []
          return items.length ? (
            <div className="block" key={i}>
              {b.heading ? <h2>{b.heading}</h2> : null}
              <ul className="list-rows">
                {items.map((w) => (
                  <li key={w.id}>
                    <Link className="row-link" href={`/karya-siswa/${w.slug}`}>
                      <strong>{w.title}</strong>
                      <span>{WORK_CATS[w.category]}{w.year ? ` · ${w.year}` : ''}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        }
        case 'guideBlock': {
          const g = typeof b.guide === 'object' && b.guide ? (b.guide as Guide) : null
          return g ? (
            <div className="block" key={i}>
              <h2>{g.title}</h2>
              {g.steps?.length ? (
                <ol className="steps">
                  {g.steps.map((st) => (
                    <li key={st.id ?? st.title}>
                      <div>
                        <h3>{st.title}</h3>
                        {st.detail ? <p>{st.detail}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
              <p><Link href={`/panduan/${g.slug}`}>Panduan lengkap</Link></p>
            </div>
          ) : null
        }
        case 'admissionsCta':
          return (
            <div className="block cta-block" key={i}>
              <h2>{b.heading ?? 'Mari Mengenal KPS Lebih Dekat'}</h2>
              {b.text ? <p>{b.text}</p> : null}
              <SmartLink href="/pendaftaran" className="btn btn--gold" data-cta="blok-pendaftaran">Informasi Pendaftaran</SmartLink>
            </div>
          )
        default:
          return null
      }
    })}
  </>
  )
}
