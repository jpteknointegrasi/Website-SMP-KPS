'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

type Item = { id: number; src: string; thumb: string; width: number; height: number; alt: string; caption: string }

/** Masonry gallery with an accessible lightbox: Esc closes, ←/→ navigate, focus is trapped and restored. */
export const Lightbox = ({ items }: { items: Item[] }) => {
  const [open, setOpen] = useState<number | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const close = useCallback(() => {
    setOpen(null)
    requestAnimationFrame(() => opener.current?.focus())
  }, [])
  const step = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + items.length) % items.length)), [items.length])

  useEffect(() => {
    if (open === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Tab' && dialog.current) {
        const f = Array.from(dialog.current.querySelectorAll<HTMLElement>('button'))
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus())
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, step])

  const cur = open !== null ? items[open] : null
  return (
    <>
      <ul className="gallery gallery--grid">
        {items.map((it, i) => (
          <li key={it.id} style={{ ['--i' as string]: i % 12 }}>
            <button type="button" className="gallery__btn" onClick={(e) => ((opener.current = e.currentTarget), setOpen(i))} aria-label={`Perbesar foto ${i + 1}${it.alt ? `: ${it.alt}` : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumb} alt={it.alt} width={it.width} height={it.height} loading={i < 6 ? 'eager' : 'lazy'} decoding="async" />
            </button>
            {it.caption ? <p className="gallery__cap">{it.caption}</p> : null}
          </li>
        ))}
      </ul>
      {cur ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Foto ${open! + 1} dari ${items.length}`} ref={dialog} onClick={(e) => e.target === e.currentTarget && close()}>
          <button type="button" className="lightbox__close icon-btn" onClick={close} data-autofocus aria-label="Tutup">
            <Icon name="close" />
          </button>
          {items.length > 1 ? (
            <button type="button" className="lightbox__nav lightbox__nav--prev icon-btn" onClick={() => step(-1)} aria-label="Foto sebelumnya">
              <Icon name="arrow" />
            </button>
          ) : null}
          <figure className="lightbox__fig" key={cur.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.src} alt={cur.alt} width={cur.width} height={cur.height} />
            <figcaption>
              <span>{open! + 1} / {items.length}</span>
              {cur.caption ? ` · ${cur.caption}` : ''}
            </figcaption>
          </figure>
          {items.length > 1 ? (
            <button type="button" className="lightbox__nav lightbox__nav--next icon-btn" onClick={() => step(1)} aria-label="Foto berikutnya">
              <Icon name="arrow" />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
