import type { MetadataRoute } from 'next'
import { currentTenant, siteUrl } from '@/lib/payload'
import { hasProduct } from '@sekolahku/core'

export const dynamic = 'force-dynamic'

/** Per school: the sitemap URL uses the address of the school being crawled. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const school = await currentTenant()
  if (!school || !hasProduct(school, 'web')) return { rules: [{ userAgent: '*', disallow: '/' }] }
  const SITE = await siteUrl()
  // Staging/preview: set NOINDEX=true to block all crawling.
  if (process.env.NOINDEX === 'true') return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [
      // `/agenda?…` filter/month combinations are effectively infinite — a crawler trap. Only `/agenda` itself is crawlable.
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cari', '/pratinjau', '/pratinjau-bingkai', '/kunjungan/batal', '/setup', '/agenda?'] },
      // Meta's AI-training crawler hammered /agenda (~82K req/12h, Oct 2026); also denied in the Vercel firewall.
      { userAgent: 'meta-externalagent', disallow: '/' },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
