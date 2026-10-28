/**
 * Response security headers for every route (website, CMS /admin, API and the /portal rewrite). Used by
 * next.config.ts and unit-tested. Deliberately no `script-src`/`default-src`: Next.js and the Payload admin rely on
 * inline scripts and styles, so only directives that cannot break them are set.
 *  - frame-src: video players only from YouTube's privacy-enhanced domain; frame-ancestors: nobody frames this site
 *  - form-action 'self': every form posts to its own school domain (CMS login, server actions, search forms)
 *  - HSTS without `preload`: preloading is a separate, hard-to-undo decision per school domain
 */
export const CONTENT_SECURITY_POLICY = [
  "frame-src 'self' https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
