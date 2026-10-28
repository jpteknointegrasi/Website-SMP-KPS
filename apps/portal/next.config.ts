import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Satu Sekolah App. Served on every school domain under /portal: the website (apps/web) passes /portal requests
 * to this deployment (PORTAL_ORIGIN), so it shares the school's domain and staff sign-in cookie.
 */
const nextConfig: NextConfig = {
  basePath: '/portal',
  transpilePackages: ['@satusekolah/core'],
  outputFileTracingRoot: path.resolve(dirname, '../..'),
  turbopack: { root: path.resolve(dirname, '../..') },
  poweredByHeader: false,
  // development only: the portal is opened through the website on a school's host name (proxy)
  allowedDevOrigins: (process.env.PORTAL_DEV_HOSTS || 'www.smpkps.sch.id,localhost,127.0.0.1').split(',').map((h) => h.trim()),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // private data: never stored by shared caches or the browser's back/forward cache by default
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'Content-Security-Policy', value: `default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
}

export default nextConfig
