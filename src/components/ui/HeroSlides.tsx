'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Media } from '@/payload-types'
import { Img } from './Img'
import { Icon } from './Icon'

/**
 * Crossfading hero photos with a slow Ken Burns zoom.
 * Accessibility (WCAG 2.2.2): auto-advance can be paused with a visible button, pauses on hover/focus,
 * stops while the tab is hidden, and never auto-advances with prefers-reduced-motion.
 */
export const HeroSlides = ({ slides, interval = 6 }: { slides: Media[]; interval?: number }) => {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]))
  const root = useRef<HTMLDivElement>(null)
  const ms = Math.min(15, Math.max(4, interval)) * 1000
  const running = !paused && !hold && !reduced && slides.length > 1

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    const vis = () => setHold(document.hidden)
    document.addEventListener('visibilitychange', vis)
    // warm the other photos after first paint so the crossfade never shows an empty frame
    const t = setTimeout(() => setLoaded(new Set(slides.map((_, i) => i))), 1200)
    return () => {
      mq.removeEventListener('change', on)
      document.removeEventListener('visibilitychange', vis)
      clearTimeout(t)
    }
  }, [slides])

  const go = useCallback((n: number) => setIdx((n + slides.length) % slides.length), [slides.length])

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => go(idx + 1), ms)
    return () => clearTimeout(t)
  }, [idx, running, ms, go])

  return (
    <div
      ref={root}
      className={`hero-slides ${running ? 'is-running' : 'is-paused'}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Foto kegiatan sekolah"
      style={{ ['--slide-ms' as string]: `${ms}ms` }}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(document.hidden)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !root.current?.contains(e.relatedTarget as Node) && setHold(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`hero-slide ${i === idx ? 'is-active' : ''}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} dari ${slides.length}`}
          aria-hidden={i === idx ? undefined : true}
        >
          {loaded.has(i) ? <Img media={s} priority={i === 0} sizes="(min-width: 1024px) 66vw, 100vw" className="hero__img" /> : null}
        </div>
      ))}
      {slides.length > 1 ? (
        <div className="hero-slides__controls">
          <button type="button" className="hero-slides__toggle" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? 'Putar foto bergantian' : 'Jeda foto bergantian'}>
            <Icon name={paused ? 'play' : 'pause'} size={14} />
          </button>
          <ol className="hero-slides__dots">
            {slides.map((s, i) => (
              <li key={s.id}>
                <button type="button" className={i === idx ? 'is-active' : ''} onClick={() => go(i)} aria-label={`Tampilkan foto ${i + 1}${s.alt ? `: ${s.alt}` : ''}`} aria-current={i === idx ? 'true' : undefined}>
                  <span key={i === idx ? `on-${idx}` : 'off'} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
