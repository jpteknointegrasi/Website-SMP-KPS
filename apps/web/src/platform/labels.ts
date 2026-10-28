import { PLAN_LABELS } from '@satusekolah/core'

export const SCHOOL_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: 'Aktif', tone: 'ok' },
  trial: { label: 'Uji coba', tone: 'info' },
  suspended: { label: 'Ditangguhkan', tone: 'bad' },
}
export const PRODUCT_STATUS_LABEL: Record<string, string> = { active: 'aktif', trial: 'uji coba', paused: 'dijeda' }
export const APPLICATION_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Menunggu', tone: 'warn' },
  approved: { label: 'Disetujui', tone: 'ok' },
  rejected: { label: 'Ditolak', tone: 'bad' },
}
export const LEVEL_LABEL: Record<string, string> = { tk: 'TK/PAUD', sd: 'SD/MI', smp: 'SMP/MTs', sma: 'SMA/MA', smk: 'SMK', lainnya: 'Lainnya' }
export const ZONE_LABEL: Record<string, string> = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }

export const planLabel = (plan: string) => PLAN_LABELS[plan] ?? plan

const FMT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const FMT_DAY = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
/** Platform times are shown in WIB (the operator's zone); schools keep their own zone on their own sites. */
export const fmtDateTime = (iso?: string | null) => (iso ? `${FMT.format(new Date(iso))} WIB` : '—')
export const fmtDate = (iso?: string | null) => (iso ? FMT_DAY.format(new Date(iso)) : '—')

export const AUDIT_ACTION: Record<string, string> = {
  create: 'membuat',
  update: 'mengubah',
  delete: 'menghapus',
  trash: 'membuang',
  restore: 'memulihkan',
}
export const AUDIT_COLLECTION: Record<string, string> = { tenants: 'Sekolah', 'school-applications': 'Pendaftaran', users: 'Akun' }
