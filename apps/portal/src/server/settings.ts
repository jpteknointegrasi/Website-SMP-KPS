/** App settings of the school (branding, modules, numbering). Stored as key → JSON in the school's database. */
import { eq } from 'drizzle-orm'
import { settings } from '@/db/schema'
import type { Db } from './command'

export type Branding = {
  shortName: string // "SMP Nasional KPS"
  city: string // "Balikpapan"
  logoFileId: string | null
  heroFileId: string | null
  address: string
  phone: string
  email: string
  principalName: string
  principalNip: string
  primary: string // brand blue
  navy: string
}
export const DEFAULT_BRANDING: Branding = {
  shortName: '',
  city: '',
  logoFileId: null,
  heroFileId: null,
  address: '',
  phone: '',
  email: '',
  principalName: '',
  principalNip: '',
  primary: '#087BF0',
  navy: '#0B2356',
}

/** Modules and their readiness stage (MOD-01). Staff use a module from "configuring"; families from "pilot"/"active". */
export const MODULES = [
  { code: 'buku_induk', label: 'Data & Buku Induk', stage: 1, desc: 'Data siswa, rombel dan buku induk' },
  { code: 'kartu', label: 'Kartu Siswa QR', stage: 2, desc: 'Template, penerbitan, kartu digital dan verifikasi' },
  { code: 'penerimaan', label: 'Penerimaan Siswa Baru', stage: 3, desc: 'Pendaftaran, berkas, seleksi, hasil, daftar ulang' },
  { code: 'akademik', label: 'Akademik Harian', stage: 4, desc: 'Jadwal, materi, tugas, presensi dan izin' },
  { code: 'nilai_rapor', label: 'Nilai & Rapor', stage: 5, desc: 'Buku nilai, kelengkapan dan rilis rapor' },
  { code: 'pengumuman', label: 'Pengumuman', stage: 4, desc: 'Pengumuman terarah dan notifikasi' },
  { code: 'layanan', label: 'Layanan TU', stage: 6, desc: 'Surat dan permohonan administrasi' },
  { code: 'keuangan', label: 'Keuangan', stage: 6, desc: 'Tagihan, bukti bayar dan alokasi' },
  { code: 'bk', label: 'Bimbingan & Konseling', stage: 6, desc: 'Konsultasi, sesi dan ringkasan berbagi' },
  { code: 'ekskul', label: 'Ekstrakurikuler', stage: 6, desc: 'Katalog, peserta, kehadiran dan evaluasi' },
  { code: 'kesiswaan', label: 'Kesiswaan', stage: 6, desc: 'Prestasi, laporan dan tindak lanjut' },
  { code: 'perpustakaan', label: 'Perpustakaan', stage: 6, desc: 'Katalog dan peminjaman' },
  { code: 'uks', label: 'UKS', stage: 6, desc: 'Kunjungan dan tindak lanjut (terbatas)' },
  { code: 'organisasi', label: 'Organisasi & Kegiatan', stage: 6, desc: 'OSIS, proposal dan kalender kegiatan' },
  { code: 'alumni', label: 'Alumni & Komunitas', stage: 6, desc: 'Data kelulusan dan cerita alumni (dengan izin)' },
] as const
export type ModuleCode = (typeof MODULES)[number]['code']
export const MODULE_STATES = { planned: 'Direncanakan', configuring: 'Konfigurasi', pilot: 'Pilot', active: 'Aktif' } as const
export type ModuleState = keyof typeof MODULE_STATES
export type ModuleMap = Record<ModuleCode, ModuleState>
export const DEFAULT_MODULES = Object.fromEntries(MODULES.map((m) => [m.code, 'planned'])) as ModuleMap

export async function getSetting<T>(db: Db, key: string, fallback: T): Promise<T> {
  const [r] = await db.select({ v: settings.value }).from(settings).where(eq(settings.key, key)).limit(1)
  return r ? ({ ...(fallback as object), ...(r.v as object) } as T) : fallback
}
export async function putSetting(db: Db, key: string, value: unknown, by: string) {
  await db
    .insert(settings)
    .values({ key, value: value as never, updatedBy: by })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as never, updatedBy: by, updatedAt: new Date() } })
}

export const getBranding = (db: Db) => getSetting(db, 'branding', DEFAULT_BRANDING)
export const getModules = (db: Db) => getSetting(db, 'modules', DEFAULT_MODULES)

/** Module usable by staff (anything past "planned") / by families (pilot or active). */
export const moduleOpen = (m: ModuleMap, code: ModuleCode, who: 'staff' | 'family') =>
  who === 'staff' ? m[code] !== 'planned' : m[code] === 'active' || m[code] === 'pilot'
