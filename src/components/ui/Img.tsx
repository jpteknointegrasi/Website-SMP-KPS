import React from 'react'
import type { Media } from '@/payload-types'

type Props = {
  media?: Media | number | null
  sizes?: string
  className?: string
  priority?: boolean
  alt?: string
  style?: React.CSSProperties
}

/** Responsive <img> from Payload image sizes: srcset, intrinsic dimensions (no CLS) and focal point. */
export const Img = ({ media, sizes = '100vw', className, priority, alt, style }: Props) => {
  if (!media || typeof media !== 'object' || !media.url) return null
  const variants = Object.values(media.sizes ?? {})
    .filter((s): s is { url: string; width: number; height: number } => Boolean(s && (s as { url?: string }).url && (s as { width?: number }).width))
    .sort((a, b) => a.width - b.width)
  const srcSet = variants.map((v) => `${v.url} ${v.width}w`).join(', ')
  const fallback = variants.find((v) => v.width >= 768) ?? variants.at(-1)
  const altText = media.decorative ? '' : (alt ?? media.alt ?? '')
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fallback?.url ?? media.url}
      srcSet={srcSet || undefined}
      sizes={sizes}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={altText}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      style={{ objectPosition: `${media.focalX ?? 50}% ${media.focalY ?? 50}%`, ...style }}
    />
  )
}
