/** Fields of the admission form (core, same for every cycle) — custom questions come from the cycle's form. */
import { checkField, FIELD, type FieldDef } from '../students/fields'
import type { FormFieldDef } from '@/db/schema'

export type AppField = FieldDef & { step: 'anak' | 'keluarga' }

const f = (key: string, over: Partial<AppField> = {}): AppField => ({ ...(FIELD[key] as FieldDef), step: 'anak', ...over })

export const APP_FIELDS: AppField[] = [
  f('fullName', { label: 'Nama lengkap calon siswa', required: true }),
  f('nickname'),
  f('gender', { required: true }),
  f('birthPlace', { required: true }),
  f('birthDate', { required: true }),
  f('religion', { required: true }),
  f('nisn', { label: 'NISN (bila ada)' }),
  f('nik', { label: 'NIK calon siswa' }),
  f('address', { required: true }),
  { key: 'originSchool', label: 'Sekolah asal', target: 'student', required: true, max: 120, step: 'anak' },
  { key: 'originNpsn', label: 'NPSN sekolah asal (bila tahu)', target: 'student', pattern: /^\d{8}$/, patternMsg: 'NPSN terdiri dari 8 digit.', step: 'anak' },
  { key: 'specialNeeds', label: 'Kebutuhan dukungan belajar (opsional)', target: 'student', type: 'textarea', max: 400, step: 'anak' },
  { key: 'guardianName', label: 'Nama orang tua/wali yang mendaftarkan', target: 'person', required: true, max: 120, step: 'keluarga' },
  { key: 'guardianRelation', label: 'Hubungan dengan calon siswa', target: 'person', type: 'select', options: ['ayah', 'ibu', 'wali'], required: true, step: 'keluarga' },
  { key: 'guardianPhone', label: 'Nomor HP/WhatsApp', target: 'person', required: true, pattern: /^[0-9+ ()-]{8,20}$/, patternMsg: 'Nomor HP tidak valid.', step: 'keluarga' },
  { key: 'guardianEmail', label: 'Email', target: 'person', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, patternMsg: 'Email tidak valid.', step: 'keluarga' },
  { key: 'guardianOccupation', label: 'Pekerjaan', target: 'person', max: 80, step: 'keluarga' },
  { key: 'fatherName', label: 'Nama ayah', target: 'person', max: 120, step: 'keluarga' },
  { key: 'motherName', label: 'Nama ibu', target: 'person', max: 120, step: 'keluarga' },
]
export const RELATION_LABEL: Record<string, string> = { ayah: 'Ayah', ibu: 'Ibu', wali: 'Wali' }

/** Fields used for this cycle (NIK only when the school requires it; data minimisation). */
export const fieldsFor = (requireNik: boolean) => APP_FIELDS.filter((x) => x.key !== 'nik' || requireNik).map((x) => (x.key === 'nik' ? { ...x, required: true } : x))

export function checkAppField(def: AppField, raw: string | null | undefined) {
  if (def.key in FIELD && def.key !== 'originSchool') return checkField({ ...def }, raw)
  const v = (raw ?? '').toString().trim()
  if (!v) return def.required ? { value: null, error: `${def.label} wajib diisi.` } : { value: null }
  if (def.max && v.length > def.max) return { value: null, error: `${def.label} terlalu panjang.` }
  if (def.options && !def.options.includes(v)) return { value: null, error: `${def.label}: pilihan tidak dikenal.` }
  if (def.pattern && !def.pattern.test(v)) return { value: null, error: def.patternMsg ?? `${def.label} tidak valid.` }
  return { value: def.key === 'guardianEmail' ? v.toLowerCase() : v }
}

export function checkCustom(def: FormFieldDef, raw: string | null | undefined): { value: string | null; error?: string } {
  const v = (raw ?? '').toString().trim()
  if (!v || (def.type === 'checkbox' && v !== 'ya')) return def.required ? { value: null, error: `${def.label} wajib diisi.` } : { value: def.type === 'checkbox' ? 'tidak' : null }
  if (v.length > 1000) return { value: null, error: `${def.label} terlalu panjang.` }
  if (def.type === 'select' && def.options && !def.options.includes(v)) return { value: null, error: `${def.label}: pilihan tidak dikenal.` }
  if (def.type === 'number' && !Number.isFinite(Number(v))) return { value: null, error: `${def.label} harus angka.` }
  if (def.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { value: null, error: `${def.label}: tanggal tidak valid.` }
  return { value: v }
}

export const APP_STATUS: Record<string, string> = {
  draft: 'Draf',
  submitted: 'Terkirim',
  under_verification: 'Sedang diverifikasi',
  needs_revision: 'Perlu perbaikan',
  resubmitted: 'Perbaikan dikirim',
  verified: 'Terverifikasi',
  rejected: 'Tidak memenuhi syarat',
  withdrawn: 'Ditarik',
}
export const CYCLE_STATUS: Record<string, string> = { draft: 'Draf', ready_for_review: 'Menunggu review', approved: 'Disetujui', open: 'Dibuka', closed: 'Ditutup', archived: 'Arsip' }
export const OUTCOME: Record<string, string> = { offered: 'Diterima', waitlisted: 'Cadangan', not_selected: 'Belum diterima' }
export const DOC_STATE: Record<string, string> = { pending: 'Menunggu verifikasi', verified: 'Terverifikasi', revision_required: 'Perlu revisi', rejected: 'Ditolak' }
