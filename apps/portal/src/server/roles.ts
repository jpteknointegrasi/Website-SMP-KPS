/**
 * App roles of school staff and what each may do (Blueprint §25, §41.5). Roles are given in the App by the school's
 * App admin; the CMS "Admin Teknis" is the App admin by default. Attribute rules (own class, own assignment, assigned
 * case, linked child) are checked on top of these permissions in each module — hiding a menu is never authorization.
 *
 * Restricted content is deliberately NOT part of the admin role: counselling notes (BK) and health records (UKS)
 * belong to their officers only (§13.3, §22).
 */
export const PERMISSIONS = {
  'settings.manage': 'Pengaturan App, branding & modul',
  'staff.manage': 'Staf & peran App',
  'audit.view': 'Melihat log audit',
  'students.read': 'Melihat Buku Induk',
  'students.write': 'Mengubah data siswa',
  'students.import': 'Impor data siswa',
  'students.review': 'Menyetujui koreksi data siswa',
  'students.print': 'Mencetak Buku Induk',
  'family.manage': 'Akun keluarga & relasi wali',
  'cards.manage': 'Template & penerbitan kartu siswa',
  'cards.verify': 'Verifikasi kartu siswa',
  'academic.manage': 'Data akademik, rombel, jadwal',
  'teach': 'Ruang kerja guru',
  'reports.review': 'Review & setujui rapor',
  'reports.release': 'Merilis rapor',
  'admissions.manage': 'Mengelola periode penerimaan',
  'admissions.verify': 'Verifikasi berkas pendaftar',
  'admissions.assess': 'Menilai seleksi',
  'admissions.approve': 'Menyetujui hasil seleksi',
  'admissions.release': 'Merilis hasil seleksi',
  'admissions.reenroll': 'Mengesahkan daftar ulang',
  'admissions.convert': 'Konversi pendaftar menjadi siswa',
  'finance.manage': 'Tagihan & keuangan',
  'finance.verify': 'Verifikasi pembayaran',
  'services.process': 'Memproses layanan TU',
  'announcements.publish': 'Menerbitkan pengumuman',
  'counseling': 'Layanan BK (kasus ditugaskan)',
  'counseling.coordinate': 'Koordinasi BK (antrean & penugasan)',
  'activities.manage': 'Ekstrakurikuler',
  'student_affairs': 'Kesiswaan',
  'library.manage': 'Perpustakaan',
  'health.manage': 'UKS',
  'organizations.manage': 'Organisasi & kegiatan siswa',
  'alumni.manage': 'Alumni & komunitas',
  'dashboard.view': 'Dashboard & laporan pimpinan',
  'exports': 'Ekspor data (tujuan terbatas)',
} as const
export type Permission = keyof typeof PERMISSIONS

const ALL = Object.keys(PERMISSIONS) as Permission[]
const RESTRICTED: Permission[] = ['counseling', 'counseling.coordinate', 'health.manage']

export const ROLES: Record<string, { label: string; group: string; perms: Permission[] }> = {
  school_admin: { label: 'Admin App Sekolah', group: 'Tata kelola', perms: ALL.filter((p) => !RESTRICTED.includes(p)) },
  pimpinan: { label: 'Pimpinan (Kepala/Waka)', group: 'Tata kelola', perms: ['dashboard.view', 'students.read', 'reports.review', 'audit.view'] },
  tata_usaha: {
    label: 'Tata Usaha (Administrasi Siswa)',
    group: 'Administrasi',
    perms: ['students.read', 'students.write', 'students.import', 'students.print', 'family.manage', 'cards.manage', 'cards.verify', 'services.process'],
  },
  verifikator_data: { label: 'Verifikator Data Siswa', group: 'Administrasi', perms: ['students.read', 'students.review', 'family.manage'] },
  keuangan: { label: 'Keuangan', group: 'Administrasi', perms: ['finance.manage', 'finance.verify', 'students.read'] },
  kurikulum: { label: 'Waka Kurikulum', group: 'Akademik', perms: ['academic.manage', 'students.read', 'reports.review', 'reports.release', 'dashboard.view'] },
  guru: { label: 'Guru', group: 'Akademik', perms: ['teach'] },
  kesiswaan: { label: 'Waka Kesiswaan', group: 'Kesiswaan', perms: ['student_affairs', 'activities.manage', 'organizations.manage', 'alumni.manage', 'students.read'] },
  bk: { label: 'Guru BK / Konselor', group: 'Kesiswaan', perms: ['counseling', 'students.read'] },
  koordinator_bk: { label: 'Koordinator BK', group: 'Kesiswaan', perms: ['counseling', 'counseling.coordinate', 'students.read'] },
  pembina: { label: 'Pembina Ekstrakurikuler', group: 'Kesiswaan', perms: [] },
  humas: { label: 'Humas / Komunikasi', group: 'Layanan', perms: ['announcements.publish'] },
  pustakawan: { label: 'Pustakawan', group: 'Layanan', perms: ['library.manage', 'cards.verify'] },
  petugas_uks: { label: 'Petugas UKS', group: 'Layanan', perms: ['health.manage'] },
  panitia_pengelola: { label: 'Panitia PPDB — Pengelola periode', group: 'Penerimaan', perms: ['admissions.manage', 'admissions.verify'] },
  panitia_verifikator: { label: 'Panitia PPDB — Verifikator berkas', group: 'Penerimaan', perms: ['admissions.verify'] },
  panitia_penilai: { label: 'Panitia PPDB — Penilai seleksi', group: 'Penerimaan', perms: ['admissions.assess'] },
  panitia_penyetuju: { label: 'Panitia PPDB — Penyetuju hasil', group: 'Penerimaan', perms: ['admissions.approve'] },
  panitia_publikasi: { label: 'Panitia PPDB — Perilis hasil', group: 'Penerimaan', perms: ['admissions.release'] },
  operator_siswa: { label: 'Operator Daftar Ulang & Konversi', group: 'Penerimaan', perms: ['admissions.reenroll', 'admissions.convert', 'students.read'] },
}
export type AppRole = keyof typeof ROLES
export const isRole = (r: string): r is AppRole => r in ROLES

/** CMS role → App roles held implicitly (the school's Admin Teknis administers the App). */
export const IMPLICIT_ROLES: Record<string, AppRole[]> = { admin: ['school_admin'] }

export function permissionsOf(roles: Iterable<string>) {
  const out = new Set<Permission>()
  for (const r of roles) for (const p of ROLES[r]?.perms ?? []) out.add(p)
  return out
}
