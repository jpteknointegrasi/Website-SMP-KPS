/**
 * Form actions. Every portal form posts to /portal/aksi/<name> (plain HTML forms: they work without JavaScript and
 * the portal's CSRF guard covers them). A handler validates, calls a module command and says where to go next.
 */
import type { Ctx } from './context'
import { fail } from './errors'
import { getModules, moduleOpen, type ModuleCode } from './settings'

export type ActionResult = { redirect?: string; message?: string; cookies?: { name: string; value: string; maxAge: number }[] } | void
export type ActionHandler = (ctx: Ctx, form: Form) => Promise<ActionResult>

const registry = new Map<string, ActionHandler>()
export function defineAction(name: string, h: ActionHandler) {
  if (registry.has(name)) throw new Error(`aksi ganda: ${name}`)
  registry.set(name, h)
}
export const getAction = (name: string) => registry.get(name)

/**
 * Module of each form action, by name prefix (same codes as the page guards). An action of a module that is closed
 * for the acting audience is refused exactly like its pages ("modul belum aktif"): hiding a page is not enough when
 * the form can be posted directly. Prefixes not listed are not module-bound: account & sign-in (akun.*), settings,
 * staff & roles, support access, notifications, outbox, and core academic data (years, homerooms, promotion), which
 * the student register itself needs. Several modules: open when any of them is (fees of an application are paid
 * through Keuangan while Penerimaan runs).
 */
export const ACTION_MODULES: Record<string, ModuleCode[]> = {
  siswa: ['buku_induk'],
  wali: ['buku_induk'],
  koreksi: ['buku_induk'],
  impor: ['buku_induk'],
  kartu: ['kartu'],
  ppdb: ['penerimaan'],
  keuangan: ['keuangan', 'penerimaan'],
  jadwal: ['akademik'],
  kalender: ['akademik'],
  pelajaran: ['akademik'],
  presensi: ['akademik'],
  izin: ['akademik'],
  materi: ['akademik'],
  tugas: ['akademik'],
  nilai: ['nilai_rapor'],
  rapor: ['nilai_rapor'],
  pengumuman: ['pengumuman'],
  layanan: ['layanan'],
  bk: ['bk'],
  ekskul: ['ekskul'],
  prestasi: ['kesiswaan'],
  laporan: ['kesiswaan'],
  karya: ['kesiswaan'],
  pustaka: ['perpustakaan'],
  uks: ['uks'],
  org: ['organisasi'],
  alumni: ['alumni'],
}
/** Action prefixes deliberately not bound to a module (see above). Every registered action is in one of the lists. */
export const UNBOUND_ACTION_PREFIXES = ['akun', 'pengaturan', 'staf', 'bantuan', 'notifikasi', 'outbox', 'akademik', 'kenaikan']
export const actionNames = () => [...registry.keys()]
export const actionModules = (name: string): ModuleCode[] => ACTION_MODULES[name.split('.')[0]!] ?? []

/**
 * Whether the action's module is open for whoever acts: staff from "Konfigurasi", families/students/applicants (and
 * anonymous visitors) from "Pilot". A signed-in staff member counts as staff.
 */
export async function actionModuleOpen(ctx: Ctx, name: string) {
  const mods = actionModules(name)
  if (!mods.length) return true
  const m = await getModules(ctx.db)
  const who = ctx.staff ? 'staff' : 'family'
  return mods.some((code) => moduleOpen(m, code, who))
}

/** Typed access to submitted fields. */
export class Form {
  constructor(public data: FormData) {}
  str(name: string, o: { required?: string; max?: number } = {}) {
    const v = this.data.get(name)
    const s = typeof v === 'string' ? v.trim() : ''
    if (!s && o.required) fail(o.required, 'invalid', name)
    if (o.max && s.length > o.max) fail(`Isian terlalu panjang (maksimal ${o.max} karakter).`, 'invalid', name)
    return s
  }
  opt(name: string, max = 2000) {
    const s = this.str(name, { max })
    return s || null
  }
  int(name: string, o: { required?: string; min?: number; max?: number } = {}) {
    const s = this.str(name, { required: o.required })
    if (!s) return null
    const n = Number(s.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(n) || !Number.isInteger(n)) fail('Isian harus berupa bilangan bulat.', 'invalid', name)
    if (o.min !== undefined && n < o.min) fail(`Nilai minimal ${o.min}.`, 'invalid', name)
    if (o.max !== undefined && n > o.max) fail(`Nilai maksimal ${o.max}.`, 'invalid', name)
    return n
  }
  num(name: string, o: { required?: string; min?: number; max?: number } = {}) {
    const s = this.str(name, { required: o.required })
    if (!s) return null
    const n = Number(s.replace(',', '.'))
    if (!Number.isFinite(n)) fail('Isian harus berupa angka.', 'invalid', name)
    if (o.min !== undefined && n < o.min) fail(`Nilai minimal ${o.min}.`, 'invalid', name)
    if (o.max !== undefined && n > o.max) fail(`Nilai maksimal ${o.max}.`, 'invalid', name)
    return n
  }
  has(name: string) {
    return this.data.has(name)
  }
  bool(name: string) {
    const v = this.data.get(name)
    return v === 'on' || v === 'true' || v === '1'
  }
  all(name: string) {
    return this.data.getAll(name).filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim())
  }
  oneOf<T extends string>(name: string, allowed: readonly T[], required?: string): T | null {
    const s = this.str(name, { required })
    if (!s) return null
    if (!allowed.includes(s as T)) fail('Pilihan tidak sah.', 'invalid', name)
    return s as T
  }
  uuid(name: string, required?: string) {
    const s = this.str(name, { required })
    if (!s) return null
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) fail('Data tidak dikenal.', 'invalid', name)
    return s
  }
  /** Operation key rendered into the form (idempotent submit). */
  get opKey() {
    const s = this.str('_op')
    return /^[A-Za-z0-9_-]{8,64}$/.test(s) ? s : null
  }
  get version() {
    return this.str('_versi') || null
  }
}
