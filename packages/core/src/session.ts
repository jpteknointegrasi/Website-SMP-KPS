/**
 * Staff sign-in shared by both products. Staff sign in once on the school's website CMS (Payload); the portal lives on
 * the same domain under /portal, so the browser sends the same `payload-token` cookie. The portal does NOT hold the
 * CMS signing secret: it asks the website who the token belongs to (GET /api/users/me). Payload itself then checks the
 * signature, the session (a logout takes effect at once) and the account. A compromised portal therefore cannot forge
 * CMS sessions.
 */

export const STAFF_COOKIE = 'payload-token'

export type StaffMember = { id: number; name: string; email: string; role: string; schoolId: number | null }

/** Reads a cookie value from a Cookie header. */
export const cookieValue = (cookieHeader: string | null | undefined, name: string) => {
  for (const part of (cookieHeader ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

const idOf = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v && typeof (v as { id: unknown }).id === 'number' ? (v as { id: number }).id : null

/**
 * The staff member behind a CMS session token, as confirmed by the website (`webOrigin`, e.g. the website deployment's
 * internal address). Null for a missing/invalid/logged-out token, an inactive account, or when the website cannot
 * be reached (fails closed). A JWT-shaped string is required so arbitrary cookie values are never forwarded.
 */
export async function fetchStaff(token: string | null | undefined, webOrigin = process.env.WEB_ORIGIN, timeoutMs = 4000): Promise<StaffMember | null> {
  if (!token) return null
  if (!webOrigin) {
    console.warn('[staff-session] WEB_ORIGIN belum diisi: sesi staf tidak dapat diperiksa')
    return null
  }
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null
  let url: URL
  try {
    url = new URL('/api/users/me', webOrigin)
  } catch {
    console.warn('[staff-session] WEB_ORIGIN bukan URL yang valid')
    return null
  }
  try {
    const res = await fetch(url, {
      headers: { authorization: `JWT ${token}`, accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      // never log the token; status and target host are enough to diagnose
      console.warn(`[staff-session] ${url.host} menjawab HTTP ${res.status} untuk /api/users/me`)
      return null
    }
    const body = (await res.json()) as { user?: Record<string, unknown> | null }
    const u = body.user
    if (!u || typeof u.id !== 'number' || u.active === false) return null
    return { id: u.id, name: String(u.name ?? ''), email: String(u.email ?? ''), role: String(u.role ?? ''), schoolId: idOf(u.tenant) }
  } catch (e) {
    const err = e as { name?: string; message?: string; cause?: { code?: string; message?: string } }
    const why = err?.name === 'TimeoutError' ? `tidak menjawab dalam ${timeoutMs} ms` : `${err?.message ?? err}${err?.cause ? ` (${err.cause.code ?? err.cause.message})` : ''}`
    // a redirect here usually means WEB_ORIGIN points at an address that forwards elsewhere (e.g. without www)
    console.warn(`[staff-session] gagal menghubungi ${url.host}: ${why}`)
    return null
  }
}
