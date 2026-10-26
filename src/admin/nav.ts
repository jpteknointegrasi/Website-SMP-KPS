/**
 * Admin sidebar structure in one place: group, order, plural label, and which items
 * only the Technical Admin sees. Affects admin display only (no database schema change).
 */
import type { CollectionConfig, GlobalConfig } from 'payload'
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
  'media-items': { group: G.gallery, plural: 'Video & KPS TV' },
  'social-accounts': { group: G.gallery, plural: 'Akun Media Sosial' },
  documents: { group: G.gallery, plural: 'Dokumen & Unduhan' },

  'admissions-cycles': { group: G.admissions, plural: 'Siklus Penerimaan (PPDB)' },
  leads: { group: G.admissions, plural: 'Minat Calon Orang Tua' },
  'visit-sessions': { group: G.admissions, plural: 'Jadwal Kunjungan' },
  'visit-bookings': { group: G.admissions, plural: 'Pemesanan Kunjungan' },

  'contact-messages': { group: G.inbox, plural: 'Pesan dari Formulir Kontak' },

  users: { group: G.settings, plural: 'Pengguna' },
  'private-files': { group: G.settings, plural: 'Berkas Privat (bukti internal)' },
  'analytics-daily': { group: G.settings, plural: 'Statistik Pengunjung' },
  redirects: { group: G.settings, plural: 'Pengalihan URL', adminOnly: true },
  'audit-logs': { group: G.settings, plural: 'Log Audit', adminOnly: true },
}

export const GLOBAL_NAV: Record<string, Entry> = {
  homepage: { group: G.home },
  navigation: { group: G.home, plural: 'Menu & Footer' },
  'site-settings': { group: G.settings, plural: 'Identitas & Kontak Sekolah' },
  'feature-flags': { group: G.settings, plural: 'Fitur Aktif', adminOnly: true },
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

export function arrangeGlobals(list: GlobalConfig[]): GlobalConfig[] {
  const order = Object.keys(GLOBAL_NAV)
  return [...list]
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
    .map((g) => {
      const e = GLOBAL_NAV[g.slug]
      if (!e) return g
      return {
        ...g,
        label: e.plural ?? g.label,
        admin: { ...g.admin, group: e.group, ...(e.adminOnly ? { hidden: hideUnlessAdmin } : {}) },
      }
    })
}
