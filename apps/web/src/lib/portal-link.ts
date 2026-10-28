import { PORTAL_BASE_PATH } from '@satusekolah/core'

export type PortalLink = { href: string; label: string; external: boolean } | null

/**
 * The header's portal button. With Satu Sekolah App active the school's own portal (/portal on its domain) is the one
 * entrance: "Masuk Portal", always /portal — a URL typed in Pengaturan cannot redirect it elsewhere. Without the App
 * the school's own portal URL (Pengaturan → Tautan & Sosial) is used, if any. Pure: unit-tested.
 */
export function portalLink(opts: { appActive: boolean; portalUrl?: string | null }): PortalLink {
  if (opts.appActive) return { href: PORTAL_BASE_PATH, label: 'Masuk Portal', external: false }
  const url = opts.portalUrl?.trim()
  if (!url) return null
  return { href: url, label: 'Portal Sekolah', external: !url.startsWith('/') }
}
