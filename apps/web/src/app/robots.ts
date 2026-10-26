import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/** Per school: the sitemap URL uses the address of the school being crawled. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const SITE = await siteUrl()
  // Staging/preview: set NOINDEX=true to block all crawling.
  if (process.env.NOINDEX === 'true') return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cari', '/pratinjau', '/pratinjau-bingkai', '/kunjungan/batal', '/setup'] }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
