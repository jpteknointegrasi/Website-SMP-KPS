import type { Tone } from './kit'
type M = Record<string, [string, Tone]>

export const STATUS_TONE: M = {
  active: ['Aktif', 'ok'],
  graduated: ['Lulus', 'info'],
  transferred_out: ['Pindah', 'muted'],
  withdrawn: ['Keluar', 'muted'],
  inactive: ['Nonaktif', 'warn'],
}
export const CORRECTION_TONE: M = {
  submitted: ['Menunggu review', 'warn'],
  needs_info: ['Perlu informasi', 'info'],
  approved: ['Disetujui', 'ok'],
  rejected: ['Ditolak', 'bad'],
  cancelled: ['Dibatalkan', 'muted'],
}
export const LINK_TONE: M = { pending: ['Menunggu verifikasi', 'warn'], active: ['Aktif', 'ok'], revoked: ['Dicabut', 'muted'] }
export const CARD_TONE: M = { active: ['Berlaku', 'ok'], revoked: ['Dicabut', 'bad'], replaced: ['Diganti', 'muted'], expired: ['Kedaluwarsa', 'warn'] }
export const TEMPLATE_TONE: M = { draft: ['Draf', 'draft'], approved: ['Disetujui', 'ok'], retired: ['Arsip', 'muted'] }
export const IMPORT_TONE: M = { uploaded: ['Diunggah', 'info'], validated: ['Siap dikonfirmasi', 'warn'], committed: ['Selesai', 'ok'], cancelled: ['Dibatalkan', 'muted'] }
export const ROW_TONE: M = { valid: ['Valid', 'ok'], review: ['Perlu review', 'warn'], error: ['Galat', 'bad'] }
export const MODULE_TONE: M = { planned: ['Direncanakan', 'muted'], configuring: ['Konfigurasi', 'warn'], pilot: ['Pilot', 'info'], active: ['Aktif', 'ok'] }
