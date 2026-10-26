'use client'
import { useEffect } from 'react'

/**
 * Registers the portal's service worker (installable PWA). The worker caches only static build files and icons;
 * pages and data always come from the network, so nothing private stays on a shared device (Blueprint §28).
 */
export function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/portal/sw.js', { scope: '/portal/' }).catch(() => {})
  }, [])
  return null
}
