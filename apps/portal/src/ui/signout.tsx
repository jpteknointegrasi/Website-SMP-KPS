'use client'
import React from 'react'

type NavigatorLike = { serviceWorker?: { controller?: { postMessage: (m: unknown) => void } | null } }

/**
 * Asks the portal's service worker to drop every cache on this device (shared-device safety, Blueprint §28). Used by
 * both sign-outs: staff (keluar-staf) and family/student accounts.
 */
export function clearDeviceCache(nav: NavigatorLike | undefined = typeof navigator === 'undefined' ? undefined : navigator) {
  const c = nav?.serviceWorker?.controller
  if (!c) return false
  c.postMessage({ type: 'clear' })
  return true
}

/** Family/student sign-out: a plain form (works without JavaScript) that also clears the device cache when it can. */
export function AccountSignOut({ action, children }: { action: string; children: React.ReactNode }) {
  return (
    <form method="post" action={action} className="inline" onSubmit={() => void clearDeviceCache()}>
      <input type="hidden" name="_kembali" value="/masuk" />
      {children}
    </form>
  )
}
