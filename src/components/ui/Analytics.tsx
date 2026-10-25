'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Aggregate, cookie-less counting: page path (no query string) and clicks on elements marked data-cta="id".
 * No visitor id, no form contents, no session recording. Rendered only when the feature flag is on.
 */
const send = (kind: 'pageview' | 'cta_click', key: string) => {
  try {
    const body = JSON.stringify({ kind, key })
    if (navigator.sendBeacon) navigator.sendBeacon('/api/analytics-daily/track', new Blob([body], { type: 'text/plain' }))
    else void fetch('/api/analytics-daily/track', { method: 'POST', body, keepalive: true })
  } catch {}
}

export const Analytics = () => {
  const path = usePathname()
  useEffect(() => {
    if (path) send('pageview', path)
  }, [path])
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cta]')
      if (el?.dataset.cta) send('cta_click', el.dataset.cta)
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])
  return null
}
