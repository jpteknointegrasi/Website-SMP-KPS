const BASE = '/portal'

/** In-app path ("/staf/siswa?x=1") or null. Never another site, never protocol-relative. */
export function safePath(v: unknown) {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s.startsWith('/') || s.startsWith('//') || s.includes('\\') || /[\r\n]/.test(s)) return null
  const out = s.startsWith(`${BASE}/`) ? s.slice(BASE.length) : s
  return out.startsWith('//') ? null : out
}

