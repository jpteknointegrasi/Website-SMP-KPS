'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

/** Navigation link that marks itself current (exact match, or prefix for section roots). */
export function NavLink({ href, children, exact }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname()
  const current = exact ? path === href : path === href || path.startsWith(`${href}/`)
  return (
    <Link href={href} aria-current={current ? 'page' : undefined}>
      {children}
    </Link>
  )
}

/**
 * Asks for confirmation before submitting forms marked data-confirm, and disables submit buttons while a form is being
 * sent (no double submit). Pure enhancement: forms work without JavaScript.
 */
export function FormEnhancer() {
  useEffect(() => {
    const onSubmit = (e: Event) => {
      const f = e.target as HTMLFormElement
      const q = f.getAttribute('data-confirm')
      if (q && !window.confirm(q)) {
        e.preventDefault()
        return
      }
      setTimeout(() => f.querySelectorAll<HTMLButtonElement>('button[type=submit]').forEach((b) => (b.disabled = true)), 0)
    }
    document.addEventListener('submit', onSubmit)
    // pages restored from the back/forward cache must have their buttons enabled again
    const onShow = () => document.querySelectorAll<HTMLButtonElement>('button[type=submit][disabled]').forEach((b) => (b.disabled = false))
    window.addEventListener('pageshow', onShow)
    return () => {
      document.removeEventListener('submit', onSubmit)
      window.removeEventListener('pageshow', onShow)
    }
  }, [])
  return null
}

/** Print button (browser print → "Simpan sebagai PDF" gives a vector PDF). */
export function PrintButton({ label = 'Cetak / Simpan PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      {label}
    </button>
  )
}
