/**
 * Parses and normalises curated video / social media URLs.
 *
 * Security model: editors give a URL, never HTML. We parse it with the WHATWG URL parser, accept https only,
 * match hostnames exactly against an allowlist (so `youtube.com.evil.example` is not YouTube), and build any
 * embed URL ourselves from a validated provider id. Nothing here fetches the URL.
 */

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'whatsapp' | 'web'
export type ContentType = 'video' | 'short' | 'podcast' | 'playlist' | 'social_post' | 'channel' | 'external_article'

export type ParsedMediaUrl =
  | {
      ok: true
      platform: Platform
      /** detected type; `podcast` is never detected (it's an editorial label on top of `video`) */
      contentType: ContentType
      providerId: string | null
      normalizedUrl: string
      /** true when we can render the provider's official player for this item */
      embeddable: boolean
      hint?: string
    }
  | { ok: false; error: string }

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const YT_SHORT_HOSTS = new Set(['youtu.be'])
const IG_HOSTS = new Set(['instagram.com', 'www.instagram.com'])
const TT_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'])
const FB_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch'])
const WA_HOSTS = new Set(['whatsapp.com', 'www.whatsapp.com', 'chat.whatsapp.com'])

const YT_ID = /^[A-Za-z0-9_-]{11}$/
const YT_LIST = /^[A-Za-z0-9_-]{10,64}$/
const TRACKING = /^(utm_[a-z]+|fbclid|gclid|igshid|igsh|si|feature|ab_channel|pp|_r|is_from_webapp|sender_device|ref|ref_src)$/i

/** Hosts that must never be linked/embedded: loopback, private ranges, bare IPs, internal names. */
export const isUnsafeHost = (host: string) => {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (!h.includes('.')) return true // localhost, intranet names
  if (/^[0-9.]+$/.test(h) || h.includes(':')) return true // IPv4/IPv6 literals
  if (/(^|\.)(local|localhost|internal|lan|home|corp|intranet|test|invalid|example)$/.test(h)) return true
  return false
}

const parseTime = (t: string | null) => {
  if (!t) return null
  if (/^\d+$/.test(t)) return Number(t)
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t)
  if (!m || !m[0]) return null
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

/** Removes tracking parameters but keeps meaningful ones (v, list, t/start, index). */
const clean = (u: URL, keep: string[] = []) => {
  const out = new URL(u.origin + u.pathname.replace(/\/+$/, '') || '/')
  u.searchParams.forEach((v, k) => {
    if (keep.includes(k) && !TRACKING.test(k)) out.searchParams.set(k, v)
  })
  out.hash = ''
  return out.toString()
}

export function parseMediaUrl(input: string): ParsedMediaUrl {
  const raw = String(input ?? '').trim()
  if (!raw) return { ok: false, error: 'URL wajib diisi.' }
  if (raw.length > 500) return { ok: false, error: 'URL terlalu panjang.' }
  if (/[<>"'\s]/.test(raw)) return { ok: false, error: 'Masukkan URL saja, bukan kode <iframe>/<script> atau teks lain.' }
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return { ok: false, error: 'Format URL tidak valid. Salin tautan lengkap yang diawali https://' }
  }
  if (u.protocol !== 'https:') return { ok: false, error: 'Hanya tautan https:// yang diterima.' }
  if (u.username || u.password) return { ok: false, error: 'URL tidak boleh berisi nama pengguna/kata sandi.' }
  if (u.port) return { ok: false, error: 'URL dengan port khusus tidak diterima.' }
  const host = u.hostname.toLowerCase()
  if (isUnsafeHost(host)) return { ok: false, error: 'Alamat ini tidak diizinkan (alamat internal/IP).' }
  const path = u.pathname
  const seg = path.split('/').filter(Boolean)

  // ---------- YouTube ----------
  if (YT_HOSTS.has(host) || YT_SHORT_HOSTS.has(host)) {
    const t = parseTime(u.searchParams.get('t') ?? u.searchParams.get('start'))
    const withTime = (id: string) => `https://www.youtube.com/watch?v=${id}${t ? `&t=${t}` : ''}`
    if (YT_SHORT_HOSTS.has(host)) {
      const id = seg[0] ?? ''
      if (!YT_ID.test(id)) return { ok: false, error: 'ID video YouTube tidak dikenali.' }
      return { ok: true, platform: 'youtube', contentType: 'video', providerId: id, normalizedUrl: withTime(id), embeddable: true }
    }
    const v = u.searchParams.get('v')
    const list = u.searchParams.get('list')
    if (seg[0] === 'watch' && v) {
      if (!YT_ID.test(v)) return { ok: false, error: 'ID video YouTube tidak dikenali.' }
      return { ok: true, platform: 'youtube', contentType: 'video', providerId: v, normalizedUrl: withTime(v), embeddable: true }
    }
    if ((seg[0] === 'embed' || seg[0] === 'live' || seg[0] === 'v') && seg[1]) {
      if (seg[1] === 'videoseries' && list && YT_LIST.test(list))
        return { ok: true, platform: 'youtube', contentType: 'playlist', providerId: list, normalizedUrl: `https://www.youtube.com/playlist?list=${list}`, embeddable: true }
      if (!YT_ID.test(seg[1])) return { ok: false, error: 'ID video YouTube tidak dikenali.' }
      return { ok: true, platform: 'youtube', contentType: 'video', providerId: seg[1], normalizedUrl: withTime(seg[1]), embeddable: true }
    }
    if (seg[0] === 'shorts' && seg[1]) {
      if (!YT_ID.test(seg[1])) return { ok: false, error: 'ID Shorts tidak dikenali.' }
      return { ok: true, platform: 'youtube', contentType: 'short', providerId: seg[1], normalizedUrl: `https://www.youtube.com/shorts/${seg[1]}`, embeddable: true }
    }
    if (seg[0] === 'playlist' && list) {
      if (!YT_LIST.test(list)) return { ok: false, error: 'ID playlist YouTube tidak dikenali.' }
      return { ok: true, platform: 'youtube', contentType: 'playlist', providerId: list, normalizedUrl: `https://www.youtube.com/playlist?list=${list}`, embeddable: true }
    }
    // channel forms: /@handle, /channel/UC…, /c/name, /user/name (+ optional /videos, /featured …)
    if (seg[0]?.startsWith('@') || ['channel', 'c', 'user'].includes(seg[0] ?? '')) {
      const handle = seg[0]!.startsWith('@') ? seg[0]! : `${seg[0]}/${seg[1] ?? ''}`
      if (!/^[@A-Za-z0-9_./-]{2,120}$/.test(handle)) return { ok: false, error: 'Alamat kanal YouTube tidak dikenali.' }
      return {
        ok: true,
        platform: 'youtube',
        contentType: 'channel',
        providerId: handle,
        normalizedUrl: `https://www.youtube.com/${handle}`,
        embeddable: false,
        hint: 'Ini tautan kanal. Pilih video tertentu untuk menampilkan pemutar; kanal tampil sebagai kartu "Kunjungi Kanal YouTube".',
      }
    }
    return { ok: false, error: 'Bentuk tautan YouTube ini belum dikenali. Gunakan tautan video, Shorts, playlist atau kanal.' }
  }

  // ---------- Instagram ----------
  if (IG_HOSTS.has(host)) {
    if ((seg[0] === 'p' || seg[0] === 'reel' || seg[0] === 'reels' || seg[0] === 'tv') && seg[1] && /^[A-Za-z0-9_-]{5,40}$/.test(seg[1])) {
      const kind = seg[0] === 'p' ? 'p' : 'reel'
      return { ok: true, platform: 'instagram', contentType: kind === 'reel' ? 'short' : 'social_post', providerId: seg[1], normalizedUrl: `https://www.instagram.com/${kind}/${seg[1]}/`, embeddable: false }
    }
    if (seg.length === 1 && /^[A-Za-z0-9_.]{1,30}$/.test(seg[0]!))
      return { ok: true, platform: 'instagram', contentType: 'channel', providerId: seg[0]!, normalizedUrl: `https://www.instagram.com/${seg[0]}/`, embeddable: false, hint: 'Ini tautan profil Instagram, ditampilkan sebagai kartu akun.' }
    return { ok: false, error: 'Bentuk tautan Instagram tidak dikenali. Gunakan tautan postingan, Reel atau profil.' }
  }

  // ---------- TikTok ----------
  if (TT_HOSTS.has(host)) {
    const vid = seg[0]?.startsWith('@') && seg[1] === 'video' && /^\d{5,25}$/.test(seg[2] ?? '') ? seg[2]! : null
    if (vid) return { ok: true, platform: 'tiktok', contentType: 'short', providerId: vid, normalizedUrl: `https://www.tiktok.com/${seg[0]}/video/${vid}`, embeddable: false }
    if (seg.length === 1 && seg[0]?.startsWith('@'))
      return { ok: true, platform: 'tiktok', contentType: 'channel', providerId: seg[0]!, normalizedUrl: `https://www.tiktok.com/${seg[0]}`, embeddable: false }
    if (host.startsWith('vm.') || host.startsWith('vt.'))
      return { ok: true, platform: 'tiktok', contentType: 'short', providerId: null, normalizedUrl: clean(u), embeddable: false, hint: 'Tautan pendek TikTok: ditampilkan sebagai kartu tautan.' }
    return { ok: false, error: 'Bentuk tautan TikTok tidak dikenali.' }
  }

  // ---------- Facebook ----------
  if (FB_HOSTS.has(host)) {
    const isVideo = host === 'fb.watch' || seg.includes('videos') || seg[0] === 'watch' || seg[0] === 'reel'
    const isPage = seg.length === 1 && !['watch', 'share', 'reel', 'story.php', 'permalink.php'].includes(seg[0] ?? '')
    return {
      ok: true,
      platform: 'facebook',
      contentType: isPage ? 'channel' : isVideo ? 'video' : 'social_post',
      providerId: null,
      normalizedUrl: clean(u, ['v', 'story_fbid', 'id']),
      embeddable: false,
    }
  }

  // ---------- WhatsApp channel / group (account link only) ----------
  if (WA_HOSTS.has(host)) {
    return { ok: true, platform: 'whatsapp', contentType: 'channel', providerId: null, normalizedUrl: clean(u), embeddable: false }
  }

  // ---------- any other https site: link card only ----------
  return { ok: true, platform: 'web', contentType: 'external_article', providerId: null, normalizedUrl: clean(u, []), embeddable: false }
}

/** Official player URL, built only from a validated id. Uses YouTube's privacy-enhanced domain. */
export const embedUrlFor = (platform: string, contentType: string, providerId?: string | null, startSeconds?: number | null) => {
  if (platform !== 'youtube' || !providerId) return null
  if (contentType === 'playlist' && YT_LIST.test(providerId)) return `https://www.youtube-nocookie.com/embed/videoseries?list=${providerId}&rel=0`
  if ((contentType === 'video' || contentType === 'short' || contentType === 'podcast') && YT_ID.test(providerId))
    return `https://www.youtube-nocookie.com/embed/${providerId}?autoplay=1&rel=0${startSeconds ? `&start=${startSeconds}` : ''}`
  return null
}

/** YouTube's own thumbnail for a video id (loaded by the visitor's browser only after the page renders). */
export const youtubeThumb = (id?: string | null) => (id && YT_ID.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null)

export const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  web: 'Tautan',
}
export const CONTENT_TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  short: 'Video pendek',
  podcast: 'Podcast',
  playlist: 'Playlist',
  social_post: 'Postingan',
  channel: 'Kanal / akun',
  external_article: 'Liputan',
}
