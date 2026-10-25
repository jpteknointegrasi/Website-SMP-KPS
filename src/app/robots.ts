import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const SITE = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')
  // Staging/preview: set NOINDEX=true to block all crawling.
  if (process.env.NOINDEX === 'true') return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cari', '/pratinjau', '/pratinjau-bingkai', '/kunjungan/batal', '/setup'] }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
