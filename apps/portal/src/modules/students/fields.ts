/**
 * Fields of the Buku Induk (student identity). One definition drives the forms, validation, correction requests and
 * Excel import mapping, so the rules are the same everywhere.
 */
export type FieldDef = {
  key: string
  label: string
  target: 'person' | 'student'
  type?: 'text' | 'date' | 'int' | 'select' | 'textarea'
  options?: readonly string[]
  pattern?: RegExp
  patternMsg?: string
  /** Shown only to permissioned staff; never in lists, logs or exports by default. */
  sensitive?: boolean
  required?: boolean
  /** Counts for data completeness. */
  complete?: boolean
  max?: number
}

export const RELIGIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'] as const
export const GENDERS = ['L', 'P'] as const
export const GENDER_LABEL: Record<string, string> = { L: 'Laki-laki', P: 'Perempuan' }

export const STUDENT_FIELDS: FieldDef[] = [
  { key: 'fullName', label: 'Nama lengkap', target: 'person', required: true, complete: true, max: 120 },
  { key: 'nickname', label: 'Nama panggilan', target: 'person', max: 60 },
  { key: 'nis', label: 'NIS', target: 'student', pattern: /^[0-9A-Za-z.\-/]{1,20}$/, patternMsg: 'NIS hanya angka/huruf, maksimal 20 karakter.', complete: true },
  { key: 'nisn', label: 'NISN', target: 'student', pattern: /^\d{10}$/, patternMsg: 'NISN terdiri dari 10 digit angka.', complete: true },
  { key: 'gender', label: 'Jenis kelamin', target: 'person', type: 'select', options: GENDERS, complete: true },
  { key: 'birthPlace', label: 'Tempat lahir', target: 'person', complete: true, max: 80 },
  { key: 'birthDate', label: 'Tanggal lahir', target: 'person', type: 'date', complete: true },
  { key: 'religion', label: 'Agama', target: 'person', type: 'select', options: RELIGIONS, complete: true },
  { key: 'nationality', label: 'Kewarganegaraan', target: 'person', max: 40 },
  { key: 'nik', label: 'NIK', target: 'person', pattern: /^\d{16}$/, patternMsg: 'NIK terdiri dari 16 digit angka.', sensitive: true },
  { key: 'familyCardNo', label: 'Nomor KK', target: 'person', pattern: /^\d{16}$/, patternMsg: 'Nomor KK terdiri dari 16 digit angka.', sensitive: true },
  { key: 'address', label: 'Alamat domisili', target: 'person', type: 'textarea', complete: true, max: 300 },
  { key: 'phone', label: 'Nomor HP siswa', target: 'person', pattern: /^[0-9+ ()-]{6,20}$/, patternMsg: 'Nomor HP tidak valid.' },
  { key: 'email', label: 'Email siswa', target: 'person', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, patternMsg: 'Email tidak valid.' },
  { key: 'entryYear', label: 'Angkatan (tahun masuk)', target: 'student', type: 'int' },
  { key: 'entryDate', label: 'Tanggal diterima', target: 'student', type: 'date' },
  { key: 'entryGrade', label: 'Diterima di tingkat', target: 'student', max: 10 },
  { key: 'originSchool', label: 'Sekolah asal', target: 'student', max: 120 },
]
export const FIELD = Object.fromEntries(STUDENT_FIELDS.map((f) => [f.key, f])) as Record<string, FieldDef>

/** Normalises and validates one value; returns the stored value (null = empty) or an error message. */
export function checkField(f: FieldDef, raw: string | null | undefined): { value: string | number | null; error?: string } {
  let v = (raw ?? '').toString().trim()
  if (!v) return f.required ? { value: null, error: `${f.label} wajib diisi.` } : { value: null }
  if (f.max && v.length > f.max) return { value: null, error: `${f.label} terlalu panjang.` }
  if (f.key === 'gender') {
    const g = v.toUpperCase()
    v = g.startsWith('L') ? 'L' : g.startsWith('P') ? 'P' : v
  }
  if (f.type === 'select' && f.options) {
    const hit = f.options.find((o) => o.toLowerCase() === v.toLowerCase())
    if (!hit) return { value: null, error: `${f.label}: pilihan tidak dikenal (${v}).` }
    v = hit
  }
  if (f.type === 'date') {
    const d = parseFlexibleDate(v)
    if (!d) return { value: null, error: `${f.label}: tanggal tidak valid (${v}).` }
    v = d
  }
  if (f.type === 'int') {
    const n = Number(v)
    if (!Number.isInteger(n) || n < 1900 || n > 2200) return { value: null, error: `${f.label} tidak valid.` }
    return { value: n }
  }
  if (f.key === 'nisn' || f.key === 'nik' || f.key === 'familyCardNo') v = v.replace(/\s/g, '')
  if (f.key === 'email') v = v.toLowerCase()
  if (f.pattern && !f.pattern.test(v)) return { value: null, error: f.patternMsg ?? `${f.label} tidak valid.` }
  return { value: v }
}

const MONTH: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 }
/** 2012-07-14 · 14/07/2012 · 14-07-2012 · 14 Juli 2012 → YYYY-MM-DD. */
export function parseFlexibleDate(v: string): string | null {
  const s = v.trim()
  let y: number, m: number, d: number
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (r) [y, m, d] = [+r[1]!, +r[2]!, +r[3]!]
  else if ((r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) [d, m, y] = [+r[1]!, +r[2]!, +r[3]!]
  else if ((r = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s))) {
    const mm = MONTH[r[2]!.slice(0, 3).toLowerCase()]
    if (!mm) return null
    ;[d, m, y] = [+r[1]!, mm, +r[3]!]
  } else return null
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const t = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === iso && y > 1900 ? iso : null
}

export const STUDENT_STATUS: Record<string, string> = {
  active: 'Aktif',
  graduated: 'Lulus',
  transferred_out: 'Pindah',
  withdrawn: 'Keluar',
  inactive: 'Nonaktif',
}
export const RELATIONS: Record<string, string> = { ayah: 'Ayah', ibu: 'Ibu', wali: 'Wali' }
export const DOC_KINDS: Record<string, string> = {
  pasfoto: 'Pasfoto',
  akta: 'Akta kelahiran',
  kk: 'Kartu keluarga',
  ijazah: 'Ijazah / SKL sekolah asal',
  rapor: 'Rapor sekolah asal',
  mutasi: 'Surat pindah / mutasi',
  lainnya: 'Dokumen lain',
}
