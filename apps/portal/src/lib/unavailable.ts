import { isLive, type SchoolInfo } from '@sekolahku/core'

/** Why the portal cannot open on this address (shown instead of the sign-in or home page). */
export function unavailableMessage(school: SchoolInfo | null | undefined) {
  if (!school || !isLive(school)) return 'Alamat ini tidak terhubung ke sekolah yang aktif.'
  if (school.app.plan === 'none') return 'Layanan SatuSekolah App belum tersedia untuk sekolah ini.'
  if (school.app.status === 'paused') return 'SatuSekolah App sekolah ini sedang dijeda. Silakan hubungi pihak sekolah.'
  return 'Portal sekolah sedang disiapkan. Silakan coba lagi nanti.'
}
