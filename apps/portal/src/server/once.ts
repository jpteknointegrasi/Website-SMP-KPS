/**
 * One-time secrets (activation code, temporary password) are shown on the next page only: carried in a sealed,
 * HttpOnly, 2-minute cookie — never in the URL (history, logs) and never stored in plain text.
 */
import { openSecret, sealSecret } from '@satusekolah/core'

export const ONCE_COOKIE = 'sekolahku_sekali'
export type OnceValue = { kind: 'code'; code: string; link?: string } | { kind: 'password'; login: string; password: string }

export const onceCookie = (v: OnceValue) => ({ name: ONCE_COOKIE, value: encodeURIComponent(sealSecret(JSON.stringify(v))), maxAge: 120 })
export function readOnce(raw: string | undefined): OnceValue | null {
  if (!raw) return null
  try {
    return JSON.parse(openSecret(decodeURIComponent(raw))) as OnceValue
  } catch {
    return null
  }
}
