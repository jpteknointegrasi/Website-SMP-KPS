import type { Payload, PayloadRequest } from 'payload'
import { SINGLETON_COLLECTIONS, type SingletonSlug } from './config'
import { findSingleton } from './scoped'

type TenantDoc = { id: number; name: string }

/** Starting menu for a new school. Links to features without content hide themselves (see Header). */
export const DEFAULT_NAVIGATION = {
  header: [
    { label: 'Tentang Sekolah', href: '/tentang', children: [
      { label: 'Profil Sekolah', href: '/tentang', description: 'Nilai, profil dan lingkungan' },
      { label: 'Visi & Misi', href: '/tentang/visi-misi' },
      { label: 'Sejarah', href: '/tentang/sejarah' },
      { label: 'Pimpinan & Guru', href: '/tentang/pimpinan-guru' },
      { label: 'Fasilitas', href: '/tentang/fasilitas' },
    ] },
    { label: 'Pembelajaran', href: '/pembelajaran', children: [] },
    { label: 'Kehidupan Siswa', href: '/kehidupan-siswa', children: [
      { label: 'Kegiatan & Ekstrakurikuler', href: '/kehidupan-siswa' },
      { label: 'Prestasi', href: '/prestasi' },
      { label: 'Galeri', href: '/galeri' },
      { label: 'Alumni', href: '/alumni' },
    ] },
    { label: 'Informasi', href: '/informasi', children: [
      { label: 'Berita', href: '/berita' },
      { label: 'Pengumuman', href: '/pengumuman' },
      { label: 'Agenda', href: '/agenda' },
      { label: 'Unduhan', href: '/unduhan' },
      { label: 'Layanan', href: '/layanan' },
    ] },
    { label: 'Pendaftaran', href: '/pendaftaran', children: [] },
    { label: 'Kontak', href: '/kontak', children: [] },
  ],
  footer: [
    { label: 'Profil Sekolah', href: '/tentang' },
    { label: 'Informasi', href: '/informasi' },
    { label: 'Pendaftaran', href: '/pendaftaran' },
    { label: 'Berita', href: '/berita' },
    { label: 'Agenda', href: '/agenda' },
    { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
  ],
}

export const DEFAULT_SECTIONS = [
  { type: 'search', enabled: true },
  { type: 'quickLinks', enabled: true },
  { type: 'schoolIntro', enabled: true },
  { type: 'highlights', enabled: false },
  { type: 'programs', enabled: true, limit: 3 },
  { type: 'studentLife', enabled: true, limit: 4 },
  { type: 'achievements', enabled: true },
  { type: 'announcementsAgenda', enabled: true, limit: 3 },
  { type: 'latestNews', enabled: true, limit: 3 },
  { type: 'mediaHub', enabled: false, limit: 3 },
  { type: 'facilities', enabled: false, limit: 3 },
  { type: 'communityAlumni', enabled: false },
  { type: 'admissionsCta', enabled: true },
]

const starter = (t: TenantDoc): Record<SingletonSlug, Record<string, unknown>> => ({
  'site-settings': { schoolName: t.name, contactVerified: false },
  navigation: DEFAULT_NAVIGATION,
  'feature-flags': {},
  // Saved as a draft: the hero needs a photo before it can be published. Until then the site shows a
  // neutral "being prepared" homepage.
  homepage: {
    _status: 'draft',
    hero: { eyebrow: `Selamat Datang di ${t.name}`, title: t.name, primaryHref: '/tentang', secondaryHref: '/pendaftaran', showLiveClock: true },
    quickLinks: [
      { label: 'Pendaftaran', icon: 'school', href: '/pendaftaran' },
      { label: 'Agenda', icon: 'calendar', href: '/agenda' },
      { label: 'Pengumuman', icon: 'megaphone', href: '/pengumuman' },
      { label: 'Kontak', icon: 'users', href: '/kontak' },
    ],
    intro: { heading: `Mengenal ${t.name}` },
    sections: DEFAULT_SECTIONS,
  },
})

/**
 * Creates the per-school settings documents (formerly globals) for a new school. Idempotent: documents
 * that already exist are left untouched, so it can also repair a school created without them.
 */
export async function provisionTenant(payload: Payload, tenant: TenantDoc, req?: PayloadRequest) {
  const data = starter(tenant)
  const created: string[] = []
  for (const slug of SINGLETON_COLLECTIONS) {
    const existing = await findSingleton(payload, slug, tenant.id, { depth: 0, overrideAccess: true, draft: true, req })
    if (existing) continue
    await payload.create({
      collection: slug,
      data: { ...data[slug], tenant: tenant.id } as never,
      draft: slug === 'homepage',
      overrideAccess: true,
      req,
      context: { tenantId: tenant.id, skipAudit: true },
    })
    created.push(slug)
  }
  return created
}
