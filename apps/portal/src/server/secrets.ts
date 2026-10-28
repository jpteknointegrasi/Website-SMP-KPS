/** Random tokens, hashing and password hashing (node:crypto only; scrypt for passwords). */
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

/** URL-safe random token (default 32 bytes = 256 bit). */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')
export const sha256 = (v: string | Buffer) => createHash('sha256').update(v).digest('hex')

/** Human-friendly one-time code without ambiguous characters, e.g. "K7QM-2XPA-9DTE". */
export function humanCode(groups = 3) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const b = randomBytes(groups * 4)
  return Array.from({ length: groups }, (_, g) => Array.from({ length: 4 }, (_, i) => A[b[g * 4 + i]! % A.length]).join('')).join('-')
}
export const normalizeCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(?=.)/g, '$1-')

export async function hashPassword(pw: string) {
  const salt = randomBytes(16)
  const key = await scrypt(pw, salt, 64, PARAMS)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, s, k] = stored.split('$')
  if (alg !== 'scrypt' || !s || !k) return false
  const expected = Buffer.from(k, 'base64')
  const key = await scrypt(pw, Buffer.from(s, 'base64'), expected.length, PARAMS)
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** Minimum password rule (length over complexity; common-password guard). */
export function passwordProblem(pw: string, login?: string) {
  if (pw.length < 10) return 'Kata sandi minimal 10 karakter.'
  if (pw.length > 200) return 'Kata sandi terlalu panjang.'
  if (/^(.)\1+$/.test(pw) || /^(0123456789|1234567890|password|katasandi|qwerty)/i.test(pw)) return 'Kata sandi terlalu mudah ditebak.'
  if (login && pw.toLowerCase().includes(login.toLowerCase().split('@')[0]!) && login.length > 3) return 'Kata sandi tidak boleh memuat nama login.'
  return null
}

/**
 * Constant-time check of an "Authorization: Bearer <secret>" header (cron jobs). An empty or missing secret never
 * matches; lengths are compared on SHA-256 digests so the timing reveals neither the secret nor its length.
 */
export function bearerMatches(header: string | null | undefined, secret: string | null | undefined) {
  if (!secret || !header || !header.startsWith('Bearer ')) return false
  const given = createHash('sha256').update(header.slice(7)).digest()
  const want = createHash('sha256').update(secret).digest()
  return timingSafeEqual(given, want) && header.length - 7 === secret.length
}
