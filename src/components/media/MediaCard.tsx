import Link from 'next/link'
import React from 'react'
import type { Media, MediaItem } from '@/payload-types'
import { CONTENT_TYPE_LABEL, PLATFORM_LABEL, embedUrlFor, youtubeThumb } from '@/lib/media-url'
import { Icon } from '../ui/Icon'
import { MediaPlayer } from './MediaPlayer'
import { formatDate } from '@/lib/format'

/** Poster for a media item: the editor's approved thumbnail, else YouTube's official thumbnail for that video. */
export const posterOf = (m: MediaItem) => {
  const t = m.thumbnail && typeof m.thumbnail === 'object' ? (m.thumbnail as Media) : null
  const url = t?.sizes?.card?.url ?? t?.url ?? (m.platform === 'youtube' && m.contentType !== 'playlist' && m.contentType !== 'channel' ? youtubeThumb(m.providerItemId) : null)
  return { url, alt: m.thumbnailAlt ?? t?.alt ?? '' }
}

const playable = (m: MediaItem) => m.displayMode === 'click_to_load_embed' && !['unavailable', 'restricted'].includes(m.availability ?? '')

const startOf = (url?: string | null) => {
  const t = url ? Number(new URL(url).searchParams.get('t')) : 0
  return Number.isFinite(t) && t > 0 ? t : null
}

/** Inline player (or link card) for detail pages and blocks. */
export const MediaEmbed = ({ m }: { m: MediaItem }) => {
  const p = posterOf(m)
  const embed = playable(m) ? embedUrlFor(m.platform ?? '', m.contentType ?? '', m.providerItemId, startOf(m.normalizedUrl)) : null
  return (
    <figure className="media-embed">
      <MediaPlayer title={m.title} embedUrl={embed} watchUrl={m.normalizedUrl ?? m.originalUrl} poster={p.url} posterAlt={p.alt} platformLabel={PLATFORM_LABEL[m.platform ?? 'web'] ?? 'sumber'} ratio={m.aspectRatio} />
      <figcaption>
        <strong>{m.title}</strong>
        {m.caption ? <span>{m.caption}</span> : null}
        {m.availability === 'unavailable' ? <span className="note">Konten ini tidak lagi tersedia di sumbernya.</span> : null}
      </figcaption>
    </figure>
  )
}

export const MediaCard = ({ m, size = 'md' }: { m: MediaItem; size?: 'md' | 'lg' }) => {
  const p = posterOf(m)
  const label = m.contentType === 'podcast' ? 'Podcast' : CONTENT_TYPE_LABEL[m.contentType ?? ''] ?? 'Media'
  const video = ['video', 'short', 'podcast', 'playlist'].includes(m.contentType ?? '')
  return (
    <article className={`mcard mcard--${size}${m.aspectRatio === '9:16' ? ' mcard--vertical' : ''}`}>
      <Link href={`/media/${m.slug}`} className="mcard__link">
        <span className="mcard__media">
          {p.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.url} alt={p.alt} loading="lazy" decoding="async" />
          ) : (
            <span className="mcard__blank" aria-hidden="true"><Icon name={video ? 'video' : 'globe'} size={34} /></span>
          )}
          {video ? <span className="mcard__play" aria-hidden="true"><Icon name="play" size={22} /></span> : null}
          <span className="mcard__badge">{PLATFORM_LABEL[m.platform ?? 'web']} · {label}</span>
        </span>
        <span className="mcard__body">
          <strong>{m.title}</strong>
          {m.caption || m.excerpt ? <span>{m.caption || m.excerpt}</span> : null}
          {m.sourcePublishedAt ? <time dateTime={m.sourcePublishedAt}>{formatDate(m.sourcePublishedAt)}</time> : null}
        </span>
      </Link>
    </article>
  )
}
