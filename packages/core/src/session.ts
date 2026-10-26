/**
 * Staff sign-in shared by both products. Staff sign in once on the school's website CMS (Payload); because the
 * portal lives on the same domain under /portal, the browser sends the same `payload-token` cookie and the portal
 * accepts it here. This module only checks the token's signature and expiry; callers must also confirm the session
 * still exists and the account is active (registry.staffSession), so a logout or deactivation takes effect at once.
 */
import { createHash, createHmac, timingSafeEqual } from 'crypto'

export const STAFF_COOKIE = 'payload-token'

export type StaffToken = { id: number; collection: string; sid?: string; email?: string; exp: number; iat?: number }

/** The HMAC key Payload derives from PAYLOAD_SECRET (payload/dist/index.js: sha256(secret).hex.slice(0, 32)). */
export const payloadJwtKey = (payloadSecret = process.env.PAYLOAD_SECRET || '') =>
  createHash('sha256').update(payloadSecret).digest('hex').slice(0, 32)

const b64 = (s: string) => Buffer.from(s, 'base64url')

/** Verifies an HS256 Payload token; returns its claims or null (bad signature, expired, malformed). */
export function verifyStaffToken(token: string | undefined | null, opts: { secret?: string; now?: number } = {}): StaffToken | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, sig] = parts as [string, string, string]
  try {
    const header = JSON.parse(b64(h).toString('utf8')) as { alg?: string }
    if (header.alg !== 'HS256') return null
    const expected = createHmac('sha256', payloadJwtKey(opts.secret)).update(`${h}.${p}`).digest()
    const given = b64(sig)
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
    const claims = JSON.parse(b64(p).toString('utf8')) as StaffToken
    const now = Math.floor((opts.now ?? Date.now()) / 1000)
    if (typeof claims.exp !== 'number' || claims.exp <= now) return null
    if (claims.collection !== 'users' || typeof claims.id !== 'number') return null
    return claims
  } catch {
    return null
  }
}

/** Reads a cookie value from a Cookie header. */
export const cookieValue = (cookieHeader: string | null | undefined, name: string) => {
  for (const part of (cookieHeader ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}
