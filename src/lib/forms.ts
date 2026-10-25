import { randomBytes, randomInt } from 'crypto'
import type { PayloadRequest } from 'payload'

/** Bump when the privacy text shown next to the consent checkbox changes materially. */
export const CONSENT_VERSION = 'privasi-2026-10'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const IDEM_RE = /^[A-Za-z0-9-]{16,64}$/

export const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const truthy = (v: unknown) => v === true || v === 'true' || v === 'on'

/** Indonesian phone → 62xxxxxxxxxx (digits only). Returns '' when it doesn't look like a phone number. */
export const normalizePhone = (input: string) => {
  let d = input.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('0')) d = '62' + d.slice(1)
  if (!/^\d{9,15}$/.test(d)) return ''
  return d
}

export const idempotencyKeyOf = (v: unknown) => (typeof v === 'string' && IDEM_RE.test(v) ? v : null)

/** Random, non-guessable, PII-free reference (no date, no name). Unambiguous alphabet. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const makeReference = (prefix: string) => {
  let s = ''
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`
}

export const randomToken = () => randomBytes(24).toString('base64url')

export const clientIp = (req: PayloadRequest) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'

/** Spam: honeypot filled or submitted faster than a human could. */
export const looksLikeBot = (body: { website?: unknown; startedAt?: unknown }) => {
  const started = Number(body.startedAt)
  return (typeof body.website === 'string' && body.website.length > 0) || Boolean(started && Date.now() - started < 2500)
}

export const noStore = { 'cache-control': 'no-store' }
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore })

export const isUniqueViolation = (e: unknown) => {
  const m = String((e as Error)?.message ?? '') + JSON.stringify((e as { data?: unknown })?.data ?? '')
  return /unique|duplicate|already|sudah/i.test(m)
}

/** Neutralises spreadsheet formula injection (CSV/Excel). */
export const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s.replace(/"/g, '""')}"`
}

/**
 * After a failed insert, a concurrent request with the same idempotency key may still be committing.
 * Polls briefly for the winner's record instead of reporting an error to the visitor.
 */
export async function waitForKey<T>(find: () => Promise<T | undefined>, tries = 8, delayMs = 120): Promise<T | undefined> {
  for (let i = 0; i < tries; i++) {
    const hit = await find()
    if (hit) return hit
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return undefined
}
