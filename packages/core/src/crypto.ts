/**
 * Sealing secrets kept in the platform database (e.g. a school's App database URL). AES-256-GCM with a key derived
 * from PLATFORM_SECRET (falls back to PAYLOAD_SECRET). Format: "v1.<iv>.<tag>.<ciphertext>" (base64url).
 * Rotating PLATFORM_SECRET requires re-sealing; there is deliberately no plaintext fallback.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const keyFrom = (secret?: string) => {
  const s = secret ?? process.env.PLATFORM_SECRET ?? process.env.PAYLOAD_SECRET
  if (!s || s.length < 16) throw new Error('PLATFORM_SECRET (≥ 16 karakter) belum diatur.')
  return createHash('sha256').update(`sekolahku-secrets:${s}`).digest()
}

export const isSealed = (v: unknown): v is string => typeof v === 'string' && /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/.test(v)

export function sealSecret(plain: string, secret?: string) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

export function openSecret(sealed: string, secret?: string) {
  if (!isSealed(sealed)) throw new Error('Nilai rahasia tidak dalam format tersegel.')
  const [, iv, tag, ct] = sealed.split('.')
  const d = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(iv!, 'base64url'))
  d.setAuthTag(Buffer.from(tag!, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(ct!, 'base64url')), d.final()]).toString('utf8')
}

/** "postgres://user:****@host/db" — for logs and screens; never shows the password. */
export const redactUrl = (url: string) => url.replace(/\/\/([^:/@]+):[^@]*@/, '//$1:****@')
