'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Pointer effects for the homepage, via event delegation (one listener, no per-card JS):
 *  - [data-fx="tilt"]   : 3D tilt + spotlight following the cursor
 *  - [data-fx="magnet"] : button drifts slightly toward the cursor
 * Off for touch devices and prefers-reduced-motion.
 */
export const PointerFX = () => {
  useEffect(() => {
    if (reduced() || !finePointer()) return
    let active: HTMLElement | null = null
    let raf = 0
    let last: PointerEvent | null = null
    const reset = (el: HTMLElement) => {
      el.style.removeProperty('--rx')
      el.style.removeProperty('--ry')
      el.style.removeProperty('--mx')
      el.style.removeProperty('--my')
      el.style.removeProperty('--tx')
      el.style.removeProperty('--ty')
      el.classList.remove('fx-on')
    }
    const apply = () => {
      raf = 0
      if (!active || !last) return
      const r = active.getBoundingClientRect()
      const x = (last.clientX - r.left) / r.width
      const y = (last.clientY - r.top) / r.height
      if (active.dataset.fx === 'tilt') {
        active.style.setProperty('--rx', `${(0.5 - y) * 7}deg`)
        active.style.setProperty('--ry', `${(x - 0.5) * 9}deg`)
        active.style.setProperty('--mx', `${x * 100}%`)
        active.style.setProperty('--my', `${y * 100}%`)
      } else {
        active.style.setProperty('--tx', `${(x - 0.5) * 12}px`)
        active.style.setProperty('--ty', `${(y - 0.5) * 10}px`)
      }
    }
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-fx]') ?? null
      if (el !== active) {
        if (active) reset(active)
        active = el
        active?.classList.add('fx-on')
      }
      last = e
      if (active && !raf) raf = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      if (active) reset(active)
      active = null
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])
  return null
}

/** Number that counts up the first time it scrolls into view. */
export const CountOnView = ({ value, duration = 1400 }: { value: number; duration?: number }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState<number>(value)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || value === 0 || !('IntersectionObserver' in window)) return
    setN(0)
    let raf = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration)
          setN(Math.round(value * (1 - Math.pow(1 - p, 4))))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])
  return (
    <span ref={ref} aria-label={String(value)}>
      <span aria-hidden="true">{n.toLocaleString('id-ID')}</span>
    </span>
  )
}

/** Floating "back to top" button with a ring that fills as the page is read. */
export const BackToTop = () => {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const max = document.documentElement.scrollHeight - window.innerHeight
        setP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => {
      window.removeEventListener('scroll', on)
      cancelAnimationFrame(raf)
    }
  }, [])
  const C = 2 * Math.PI * 22
  return (
    <button
      type="button"
      className={`to-top ${p > 0.12 ? 'is-visible' : ''}`}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' })
        document.getElementById('main')?.focus({ preventScroll: true })
      }}
      aria-label="Kembali ke atas"
      tabIndex={p > 0.12 ? 0 : -1}
    >
      <svg viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="22" className="to-top__track" />
        <circle cx="25" cy="25" r="22" className="to-top__ring" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - p) }} />
      </svg>
      <Icon name="arrow" size={20} />
    </button>
  )
}

/** Small animated scroll cue under the hero; jumps to the next section. */
export const ScrollCue = ({ target = '#beranda-lanjut' }: { target?: string }) => (
  <a href={target} className="scroll-cue" aria-label="Gulir ke konten berikutnya">
    <span className="scroll-cue__mouse" aria-hidden="true">
      <span className="scroll-cue__wheel" />
    </span>
  </a>
)
