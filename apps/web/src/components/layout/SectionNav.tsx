'use client'
import React, { useEffect, useState } from 'react'

/**
 * Sticky in-page menu (stays under the site header while scrolling).
 * Marks the section currently in view and keeps that link visible on narrow screens.
 */
export const SectionNav = ({ items, label }: { items: { id: string; label: string }[]; label: string }) => {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => Boolean(e))
    if (!els.length) return
    const onScroll = () => {
      // the last section whose top has passed the line just under the sticky bars
      const line = 160
      let cur: string | null = null
      for (const el of els) if (el.getBoundingClientRect().top - line <= 0) cur = el.id
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      setActive(atEnd ? els[els.length - 1]!.id : cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [items])

  useEffect(() => {
    if (!active) return
    const link = document.querySelector<HTMLElement>(`.section-nav a[href="#${active}"]`)
    const bar = link?.closest('ul')
    if (link && bar && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: link.offsetLeft - 16, behavior: 'smooth' })
  }, [active])

  return (
    <nav className="section-nav" aria-label={label}>
      <div className="container">
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`} aria-current={active === i.id ? 'location' : undefined}>
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
