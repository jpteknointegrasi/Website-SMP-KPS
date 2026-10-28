'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { ThemeToggle } from './ThemeToggle'
import type { PortalLink } from '@/lib/portal-link'

type Item = {
  label: string
  href: string
  children?: { label: string; href: string; description?: string | null }[] | null
}

export const Header = ({
  items,
  schoolName,
  logoUrl,
  portal,
}: {
  items: Item[]
  schoolName: string
  logoUrl?: string | null
  /** from lib/portal-link.ts */
  portal?: PortalLink
}) => {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const drawerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24)
      const h = document.documentElement
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)
      h.style.setProperty('--scroll-progress', String(p))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    // after clicking a menu link the link keeps focus; drop it so its dropdown doesn't stay open
    const a = document.activeElement as HTMLElement | null
    if (a && a.closest('.nav')) a.blur()
  }, [pathname])

  // Escape closes a desktop dropdown opened with the keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = document.activeElement as HTMLElement | null
      if (e.key === 'Escape' && a?.closest('.nav')) a.blur()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // focus trap + Escape for the mobile drawer; focus returns to the toggle on close
  useEffect(() => {
    if (!open) return
    const drawer = drawerRef.current
    const focusables = () => Array.from(drawer?.querySelectorAll<HTMLElement>('a, button') ?? [])
    focusables()[0]?.focus()
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const toggle = toggleRef.current
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      toggle?.focus()
    }
  }, [open])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href))

  return (
    <>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="scroll-progress" aria-hidden="true" />
        <div className="container site-header__bar">
          <Link href="/" className="brand" aria-label={`${schoolName} — Beranda`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span className="brand__box">
                <img
                  src={logoUrl}
                  alt={schoolName}
                  width={599}
                  height={149}
                  className="brand__logo"
                />
              </span>
            ) : (
              <span className="brand__text">{schoolName}</span>
            )}
          </Link>

          <nav className="nav" aria-label="Menu utama">
            <ul>
              {items.map((it) => (
                <li
                  key={it.href + it.label}
                  className={it.children?.length ? 'has-sub' : undefined}
                >
                  <Link
                    href={it.href}
                    className={isActive(it.href) ? 'is-active' : undefined}
                    aria-current={pathname === it.href ? 'page' : undefined}
                  >
                    {it.label}
                    {it.children?.length ? (
                      <Icon name="chevronDown" size={14} className="nav__chev" />
                    ) : null}
                  </Link>
                  {it.children?.length ? (
                    <div className="nav__sub">
                      <ul>
                        {it.children.map((c) => (
                          <li key={c.href + c.label}>
                            <Link href={c.href}>
                              <strong>{c.label}</strong>
                              {c.description ? <span>{c.description}</span> : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-header__actions">
            <Link href="/cari" className="icon-btn" aria-label="Cari">
              <Icon name="search" size={20} />
            </Link>
            <ThemeToggle />
            {portal ? (
              <a href={portal.href} className="btn btn--outline btn--sm hide-md" {...(portal.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {portal.label}
              </a>
            ) : null}
            <Link href="/pendaftaran" className="btn btn--gold btn--sm hide-sm">
              Pendaftaran
            </Link>
            <button
              ref={toggleRef}
              className="icon-btn menu-toggle"
              aria-expanded={open}
              aria-controls="mobile-drawer"
              onClick={() => setOpen((v) => !v)}
            >
              <Icon name={open ? 'close' : 'menu'} />
              <span className="sr-only">{open ? 'Tutup menu' : 'Buka menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Outside <header>: its backdrop-filter would make this position:fixed drawer only as tall as the header. */}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        className={`drawer ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
      >
        <div className="drawer__head">
          <span>Menu</span>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            <Icon name="close" />
            <span className="sr-only">Tutup menu</span>
          </button>
        </div>
        <ul className="drawer__list">
          {items.map((it) => (
            <li key={it.href + it.label}>
              <Link href={it.href}>{it.label}</Link>
              {it.children?.length ? (
                <ul>
                  {it.children.map((c) => (
                    <li key={c.href + c.label}>
                      <Link href={c.href}>{c.label}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="drawer__cta">
          <Link href="/pendaftaran" className="btn btn--gold">
            Informasi Pendaftaran
          </Link>
          {portal ? (
            <a href={portal.href} className="btn btn--line" {...(portal.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {portal.label}
            </a>
          ) : null}
        </div>
      </div>
    </>
  )
}
