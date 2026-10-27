/**
 * Admin sidebar structure in one place: group, order, plural label, and which items
 * only the Technical Admin sees. Affects admin display only (no database schema change).
 * Platform: the former globals are per-school collections, so everything is a collection here.
 */
import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/access/roles'

type Entry = { group: string; plural?: string; adminOnly?: boolean }

const G = {
  home: 'Beranda & Halaman',
  info: 'Berita & Informasi',
  profile: 'Profil & Kesiswaan',
  gallery: 'Galeri, Video & Dokumen',
  admissions: 'Penerimaan Siswa',
  inbox: 'Kotak Masuk',
  settings: 'Pengaturan & Akses',
} as const

export const ADMIN_GROUPS = Object.values(G)

// Order in this list = order in the sidebar
export const COLLECTION_NAV: Record<string, Entry> = {
  // former globals (one document per school; tenancy/singleton.ts)
  homepage: { group: G.home, plural: 'Beranda' },
  'alumni-page': { group: G.home, plural: 'Halaman Alumni' },
  navigation: { group: G.home, plural: 'Menu & Footer' },
  pages: { group: G.home, plural: 'Halaman' },

  posts: { group: G.info, plural: 'Berita' },
  categories: { group: G.info, plural: 'Kategori Berita' },
  announcements: { group: G.info, plural: 'Pengumuman' },
  events: { group: G.info, plural: 'Agenda & Kalender' },
  'event-categories': { group: G.info, plural: 'Kategori Agenda' },
  faqs: { group: G.info, plural: 'FAQ' },
  services: { group: G.info, plural: 'Layanan & Tautan' },
  guides: { group: G.info, plural: 'Panduan' },

  staff: { group: G.profile, plural: 'Guru, Staf & Pimpinan' },
  programs: { group: G.profile, plural: 'Program Pembelajaran' },
  extracurriculars: { group: G.profile, plural: 'Ekstrakurikuler & Kegiatan' },
  facilities: { group: G.profile, plural: 'Fasilitas' },
  achievements: { group: G.profile, plural: 'Prestasi' },
  'student-works': { group: G.profile, plural: 'Karya Siswa' },
  testimonials: { group: G.profile, plural: 'Cerita Alumni' },

  media: { group: G.gallery, plural: 'Foto & Gambar' },
  albums: { group: G.gallery, plural: 'Album Galeri' },
  'media-items': { group: G.gallery, plural: 'Video & Kanal Sekolah' },
  'social-accounts': { group: G.gallery, plural: 'Akun Media Sosial' },
  documents: { group: G.gallery, plural: 'Dokumen & Unduhan' },

  'admissions-cycles': { group: G.admissions, plural: 'Siklus Penerimaan (PPDB)' },
  leads: { group: G.admissions, plural: 'Minat Calon Orang Tua' },
  'visit-sessions': { group: G.admissions, plural: 'Jadwal Kunjungan' },
  'visit-bookings': { group: G.admissions, plural: 'Pemesanan Kunjungan' },

  'contact-messages': { group: G.inbox, plural: 'Pesan dari Formulir Kontak' },

  'site-settings': { group: G.settings, plural: 'Identitas & Kontak Sekolah' },
  'feature-flags': { group: G.settings, plural: 'Fitur Aktif', adminOnly: true },
  // platform: visible to the platform Super Admin only (own access rules)
  tenants: { group: G.settings, plural: 'Sekolah (platform)' },
  users: { group: G.settings, plural: 'Pengguna' },
  'private-files': { group: G.settings, plural: 'Berkas Privat (bukti internal)' },
  'analytics-daily': { group: G.settings, plural: 'Statistik Pengunjung' },
  redirects: { group: G.settings, plural: 'Pengalihan URL', adminOnly: true },
  'audit-logs': { group: G.settings, plural: 'Log Audit', adminOnly: true },
}

const hideUnlessAdmin = ({ user }: { user: unknown }) => !isAdmin(user as never)

export function arrangeCollections(list: CollectionConfig[]): CollectionConfig[] {
  const order = Object.keys(COLLECTION_NAV)
  const missing = list.filter((c) => !COLLECTION_NAV[c.slug]).map((c) => c.slug)
  if (missing.length) throw new Error(`admin/nav.ts: koleksi belum dipetakan: ${missing.join(', ')}`)
  return [...list]
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
    .map((c) => {
      const e = COLLECTION_NAV[c.slug]
      return {
        ...c,
        labels: e.plural ? { singular: c.labels?.singular ?? e.plural, plural: e.plural } : c.labels,
        admin: { ...c.admin, group: e.group, ...(e.adminOnly ? { hidden: hideUnlessAdmin } : {}) },
      }
    })
}
