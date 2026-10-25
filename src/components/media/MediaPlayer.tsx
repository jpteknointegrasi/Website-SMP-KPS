'use client'
import React, { useState } from 'react'

type Props = {
  title: string
  embedUrl: string | null
  watchUrl: string
  poster?: string | null
  posterAlt?: string
  platformLabel: string
  ratio?: string | null
}

/**
 * Click-to-load player: only a poster is rendered at first; the provider's iframe (and its scripts/cookies)
 * load after the visitor chooses to watch. Always offers the original link as a fallback.
 */
export const MediaPlayer = ({ title, embedUrl, watchUrl, poster, posterAlt, platformLabel, ratio }: Props) => {
  const [on, setOn] = useState(false)
  const cls = `player player--${(ratio ?? '16:9').replace(':', 'x')}`
  if (on && embedUrl)
    return (
      <div className={cls}>
        <iframe
          src={embedUrl}
          title={`Pemutar video: ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      </div>
    )
  return (
    <div className={cls}>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt={posterAlt ?? ''} loading="lazy" decoding="async" />
      ) : (
        <span className="player__blank" aria-hidden="true" />
      )}
      <div className="player__overlay">
        {embedUrl ? (
          <button type="button" className="player__play" onClick={() => setOn(true)} data-cta="media-play">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor" /></svg>
            <span>Putar video</span>
          </button>
        ) : null}
        <p className="player__note">
          {embedUrl ? `Pemutar dari ${platformLabel} baru dimuat setelah Anda menekan Putar.` : `Konten ini dibuka di ${platformLabel}.`}{' '}
          <a href={watchUrl} target="_blank" rel="noopener noreferrer">
            Buka di {platformLabel}
            <span className="sr-only"> (membuka tab baru)</span>
          </a>
        </p>
      </div>
    </div>
  )
}
