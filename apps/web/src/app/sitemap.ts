import type { MetadataRoute } from 'next'
import { currentTenant, payloadClient, siteUrl } from '@/lib/payload'
import { hasProduct } from '@satusekolah/core'
import { readFlags } from '@/lib/flags'

export const dynamic = 'force-dynamic'

/** Only published, public URLs (read through public access rules: no drafts, demo or archived records). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const school = await currentTenant()
  if (!school || !hasProduct(school, 'web')) return []
  const SITE = await siteUrl()
  const statics = ['', '/tentang', '/tentang/sejarah', '/tentang/visi-misi', '/tentang/pimpinan-guru', '/tentang/fasilitas', '/pembelajaran', '/kehidupan-siswa', '/prestasi', '/informasi', '/berita', '/pengumuman', '/agenda', '/galeri', '/unduhan', '/transparansi-bos', '/panduan', '/layanan', '/alumni', '/pendaftaran', '/kontak', '/kebijakan-privasi']
  const payload = await payloadClient()
  const flags = await readFlags(payload)
  statics.push('/faq')
  if (flags.mediaHub) statics.push('/media')
  if (flags.studentWorks) statics.push('/karya-siswa')
  if (flags.schoolVisits) statics.push('/kunjungan')
  const out: MetadataRoute.Sitemap = statics.map((p) => ({ url: `${SITE}${p}`, changeFrequency: p === '' ? 'daily' : 'weekly' }))
  const map: [string, string][] = [
    ['posts', '/berita'],
    ['announcements', '/pengumuman'],
    ['events', '/agenda'],
    ['albums', '/galeri'],
    ['programs', '/pembelajaran'],
    ['extracurriculars', '/ekstrakurikuler'],
    ['facilities', '/tentang/fasilitas'],
    ['achievements', '/prestasi'],
    ['guides', '/panduan'],
    ...((flags.mediaHub ? [['media-items', '/media']] : []) as [string, string][]),
    ...((flags.studentWorks ? [['student-works', '/karya-siswa']] : []) as [string, string][]),
  ]
  for (const [collection, base] of map) {
    const res = await payload.find({ collection: collection as 'posts', limit: 500, depth: 0, overrideAccess: false, draft: false, select: { slug: true, updatedAt: true } as never })
    res.docs.forEach((d) => {
      const doc = d as unknown as { slug: string; updatedAt: string }
      out.push({ url: `${SITE}${base}/${doc.slug}`, lastModified: doc.updatedAt })
    })
  }
  return out
}
