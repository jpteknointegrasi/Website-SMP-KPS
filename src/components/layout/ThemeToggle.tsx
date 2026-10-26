'use client'
import React, { useEffect, useState } from 'react'
import { THEME_KEY } from '@/lib/theme'

const Sun = () => (
  <svg className="theme-toggle__sun" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
)
const Moon = () => (
  <svg className="theme-toggle__moon" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
)

export const ThemeToggle = () => {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    const d = document.documentElement
    setDark(d.dataset.theme === 'dark')
    // follow device changes made while the page is open (when the visitor hasn't chosen)
    const obs = new MutationObserver(() => setDark(d.dataset.theme === 'dark'))
    obs.observe(d, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const toggle = () => {
    const d = document.documentElement
    const next = d.dataset.theme === 'dark' ? 'light' : 'dark'
    d.classList.add('theme-switching') // no colour animations on hundreds of elements at once
    d.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    window.setTimeout(() => d.classList.remove('theme-switching'), 50)
  }

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      aria-pressed={dark ?? undefined}
      aria-label="Mode malam"
      title={dark ? 'Ganti ke mode siang' : 'Ganti ke mode malam'}
    >
      <Sun />
      <Moon />
    </button>
  )
}
