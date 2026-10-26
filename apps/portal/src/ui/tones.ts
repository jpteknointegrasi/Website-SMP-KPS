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
export const APP_TONE: M = {
  draft: ['Draf', 'draft'],
  submitted: ['Menunggu verifikasi', 'info'],
  under_verification: ['Sedang diverifikasi', 'info'],
  needs_revision: ['Perlu perbaikan', 'warn'],
  resubmitted: ['Perbaikan dikirim', 'info'],
  verified: ['Terverifikasi', 'ok'],
  rejected: ['Tidak memenuhi syarat', 'bad'],
  withdrawn: ['Ditarik', 'muted'],
}
export const CYCLE_TONE: M = { draft: ['Draf', 'draft'], ready_for_review: ['Menunggu review', 'warn'], approved: ['Disetujui', 'info'], open: ['Dibuka', 'ok'], closed: ['Ditutup', 'muted'], archived: ['Arsip', 'muted'] }
export const DOC_TONE: M = { pending: ['Menunggu verifikasi', 'info'], verified: ['Terverifikasi', 'ok'], revision_required: ['Perlu revisi', 'warn'], rejected: ['Ditolak', 'bad'] }
export const OUTCOME_TONE: M = { offered: ['Diterima', 'ok'], waitlisted: ['Cadangan', 'info'], not_selected: ['Belum diterima', 'muted'] }
export const BATCH_TONE: M = { proposed: ['Draf usulan', 'draft'], in_review: ['Menunggu persetujuan', 'warn'], approved: ['Disetujui, belum dirilis', 'info'], released: ['Dirilis', 'ok'], cancelled: ['Dibatalkan', 'muted'] }
export const SEAT_TONE: M = { reserved: ['Menunggu konfirmasi', 'warn'], confirmed: ['Dikonfirmasi', 'ok'], expired: ['Kedaluwarsa', 'muted'], released: ['Dilepas', 'muted'] }
export const REENROLL_TONE: M = { in_progress: ['Sedang dilengkapi', 'info'], needs_revision: ['Perlu dilengkapi', 'warn'], submitted: ['Menunggu pengesahan', 'warn'], verified: ['Disahkan', 'ok'], declined: ['Mengundurkan diri', 'muted'], expired: ['Lewat tenggat', 'bad'], cancelled: ['Dibatalkan', 'muted'] }
export const ITEM_TONE: M = { pending: ['Belum', 'muted'], done: ['Sudah diisi', 'info'], verified: ['Disahkan', 'ok'], rejected: ['Perlu diperbaiki', 'warn'], waived: ['Dikecualikan', 'info'] }
export const INVOICE_TONE: M = { unpaid: ['Belum dibayar', 'warn'], partial: ['Sebagian', 'warn'], paid: ['Lunas', 'ok'], cancelled: ['Dibatalkan', 'muted'], waived: ['Dibebaskan', 'info'] }
export const PAYMENT_TONE: M = { submitted: ['Menunggu verifikasi', 'warn'], verified: ['Terverifikasi', 'ok'], rejected: ['Ditolak', 'bad'] }
export const PARTICIPANT_TONE: M = { scheduled: ['Terjadwal', 'info'], confirmed: ['Dikonfirmasi', 'info'], attended: ['Hadir', 'ok'], no_show: ['Tidak hadir', 'bad'], rescheduled: ['Dijadwal ulang', 'warn'], cancelled: ['Batal', 'muted'] }
export const SCORE_TONE: M = { draft: ['Draf', 'draft'], submitted: ['Terkirim', 'info'], locked: ['Terkunci', 'ok'], superseded: ['Diganti', 'muted'] }
