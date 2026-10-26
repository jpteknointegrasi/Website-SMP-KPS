'use client'
import { useEffect } from 'react'

/** Ends the staff CMS session (shared sign-in) and clears cached static files on this device. */
export function SignOut() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage({ type: 'clear' })
    fetch('/api/users/logout', { method: 'POST', credentials: 'same-origin' })
      .catch(() => null)
      .finally(() => window.location.replace('/portal/masuk-staf'))
  }, [])
  return <p>Sedang keluar…</p>
}
