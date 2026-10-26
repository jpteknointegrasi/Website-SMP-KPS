import type { GlobalConfig } from 'payload'
import { adminOnly, anyone } from '../access/roles'

/**
 * Feature flags. Read on the server for every route, API endpoint, navigation item and job they guard
 * (see lib/flags.ts). Turning a flag off disables the feature, not only its button.
 */
export const FLAG_DEFAULTS = {
  calendarMonthView: true,
  interestForm: false,
  schoolVisits: false,
  studentWorks: false,
  mediaHub: true,
  socialAutoImport: false,
  visitorAnalytics: false,
  fullAdmissions: false,
} as const
export type FlagName = keyof typeof FLAG_DEFAULTS

const flag = (name: FlagName, label: string, description: string, locked = false) => ({
  name,
  type: 'checkbox' as const,
  label,
  defaultValue: FLAG_DEFAULTS[name],
  admin: { description, readOnly: locked },
})

export const FeatureFlags: GlobalConfig = {
  slug: 'feature-flags',
  label: 'Fitur Aktif',
  admin: { group: 'Pengaturan', description: 'Hanya Admin Teknis. Mematikan fitur menutup halaman, API dan job terkait — bukan hanya menyembunyikan tombol.' },
  access: { read: anyone, update: adminOnly },
  versions: { max: 20 },
  fields: [
    flag('calendarMonthView', 'Kalender bulanan di /agenda', 'Tab "Kalender" (grid bulan). Mati = hanya daftar.'),
    flag('interestForm', 'Form minat calon orang tua', 'Aktifkan setelah petugas penerimaan siap menindaklanjuti. Mati = /pendaftaran/minat dan API ditutup.'),
    flag('schoolVisits', 'Kunjungan sekolah / open house', 'Aktifkan setelah slot kunjungan disetujui. Mati = /kunjungan, API pemesanan dan job pelepasan kuota ditutup.'),
    flag('studentWorks', 'Karya siswa', 'Aktifkan setelah ada karya dengan persetujuan publikasi.'),
    flag('mediaHub', 'Video & media sosial', 'Halaman /media, section beranda dan blok media. Section otomatis tersembunyi bila belum ada konten terbit.'),
    flag('socialAutoImport', 'Impor otomatis media sosial', 'Belum diimplementasikan (butuh API resmi & kredensial). Tetap mati.', true),
    flag('visitorAnalytics', 'Statistik pengunjung agregat', 'Hitungan halaman & klik tombol tanpa data pribadi.'),
    flag('fullAdmissions', 'Pendaftaran & seleksi lengkap (P2)', 'Belum dibangun. Lihat P2_ADMISSIONS_BACKLOG.md. Tetap mati.', true),
  ],
}
