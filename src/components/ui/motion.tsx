'use client'
import React, { useEffect, useRef, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Adds `is-in` when the element scrolls into view (once). Children can stagger with --i. */
export const Reveal = ({ children, as: Tag = 'div', className = '', ...rest }: { children: React.ReactNode; as?: React.ElementType; className?: string } & React.HTMLAttributes<HTMLElement>) => {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced() || !('IntersectionObserver' in window)) {
      el.classList.add('is-in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('is-in'), io.unobserve(e.target))),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

const witaParts = () => {
  const now = new Date()
  const time = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false }).format(now).replace(':', '.')
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', hour12: false }).format(now))
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'
  const day = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  return { time, greet, day }
}

/** Live WITA clock + time-of-day greeting (Balikpapan). Rendered client-side only to avoid hydration drift. */
export const LiveClock = ({ city = 'Balikpapan' }: { city?: string }) => {
  const [p, setP] = useState<ReturnType<typeof witaParts> | null>(null)
  useEffect(() => {
    setP(witaParts())
    const t = setInterval(() => setP(witaParts()), 15_000)
    return () => clearInterval(t)
  }, [])
  return (
    <p className="live-clock" aria-live="off">
      <span className="live-clock__dot" aria-hidden="true" />
      {p ? (
        <>
          <span>{p.greet}</span>
          <span className="live-clock__sep" aria-hidden="true" />
          <span>
            {p.day}, {city} <strong>{p.time}</strong> WITA
          </span>
        </>
      ) : (
        <span>{city}, WITA</span>
      )}
    </p>
  )
}

/** Ticking countdown to an ISO timestamp. */
export const Countdown = ({ to, allDay }: { to: string; allDay?: boolean | null }) => {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (now === null) return <span className="countdown" />
  const diff = new Date(to).getTime() - now
  if (diff <= 0) return <span className="countdown countdown--now">{allDay ? 'Hari ini' : 'Sedang berlangsung'}</span>
  const d = Math.floor(diff / 864e5)
  const h = Math.floor((diff % 864e5) / 36e5)
  const m = Math.floor((diff % 36e5) / 6e4)
  const s = Math.floor((diff % 6e4) / 1e3)
  const cells = [
    [d, 'hari'],
    [h, 'jam'],
    [m, 'menit'],
    [s, 'detik'],
  ] as const
  return (
    <span className="countdown" role="timer" aria-label={`${d} hari ${h} jam ${m} menit lagi`}>
      {cells.map(([v, l]) => (
        <span key={l} className="countdown__cell">
          <b>{String(v).padStart(2, '0')}</b>
          <small>{l}</small>
        </span>
      ))}
    </span>
  )
}

/**
 * Animated hexagon field — echoes the hexagonal paving of the school courtyard.
 * Tiles light up in a slow wave and respond to the pointer. Static when reduced motion is on.
 */
export const HexField = ({ cols = 14, rows = 8, className = '' }: { cols?: number; rows?: number; className?: string }) => {
  const ref = useRef<SVGSVGElement>(null)
  const r = 28
  const w = Math.sqrt(3) * r
  const hexes: { x: number; y: number; k: number }[] = []
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) hexes.push({ x: col * w + (row % 2 ? w / 2 : 0) + w / 2, y: row * r * 1.5 + r, k: row * cols + col })
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${(r - 2.5) * Math.cos(a)},${(r - 2.5) * Math.sin(a)}`
  }).join(' ')

  useEffect(() => {
    const svg = ref.current
    if (!svg || reduced()) return
    const tiles = Array.from(svg.querySelectorAll<SVGPolygonElement>('polygon'))
    let i = 0
    const tones = ['lit-gold', 'lit-teal', 'lit-soft']
    const tick = setInterval(() => {
      for (let n = 0; n < 3; n++) {
        const t = tiles[Math.floor(Math.random() * tiles.length)]
        const tone = tones[(i + n) % tones.length]
        t.classList.add(tone)
        setTimeout(() => t.classList.remove(tone), 2400)
      }
      i++
    }, 650)
    const onMove = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      const vb = svg.viewBox.baseVal
      const px = ((e.clientX - rect.left) / rect.width) * vb.width
      const py = ((e.clientY - rect.top) / rect.height) * vb.height
      tiles.forEach((t) => {
        const x = Number(t.dataset.x)
        const y = Number(t.dataset.y)
        const near = Math.hypot(px - x, py - y) < r * 2.2
        t.classList.toggle('lit-near', near)
      })
    }
    const host = svg.parentElement
    host?.addEventListener('pointermove', onMove)
    return () => {
      clearInterval(tick)
      host?.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <svg ref={ref} className={`hexfield ${className}`} viewBox={`0 0 ${cols * w + w / 2} ${rows * r * 1.5 + r / 2}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {hexes.map((h) => (
        <polygon key={h.k} points={pts} transform={`translate(${h.x} ${h.y})`} data-x={h.x} data-y={h.y} />
      ))}
    </svg>
  )
}

/** Moves children slightly with pointer & scroll to give the hero depth. */
export const Parallax = ({ children, depth = 12, className = '' }: { children: React.ReactNode; depth?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    // Touch/small screens: no parallax (it only adds jank and can push content over neighbouring text).
    if (!el || reduced() || !window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches) return
    let px = 0
    let py = 0
    let sy = 0
    let raf = 0
    const apply = () => {
      raf = 0
      el.style.transform = `translate3d(${px * depth}px, ${py * depth + sy * depth}px, 0)`
    }
    const queue = () => (raf ||= requestAnimationFrame(apply))
    const onMove = (e: PointerEvent) => {
      px = e.clientX / window.innerWidth - 0.5
      py = e.clientY / window.innerHeight - 0.5
      queue()
    }
    // Scroll offset relative to the element's own position in the viewport (-0.5..0.5), so the shift stays within ±depth px.
    const onScroll = () => {
      const r = el.getBoundingClientRect()
      sy = Math.max(-0.5, Math.min(0.5, (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight)) * 0.6
      queue()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [depth])
  return (
    <div ref={ref} className={`parallax ${className}`}>
      {children}
    </div>
  )
}
