import 'server-only'
import type { Metadata } from 'next'
import { getSchoolNames } from './queries'

type Names = { name: string; short: string; city: string; full: string }

/** Page metadata that mentions the school serving the request (name/short name/city from Pengaturan Sekolah). */
export const schoolMeta =
  (build: (n: Names) => Metadata) =>
  async (): Promise<Metadata> => {
    const n = await getSchoolNames()
    return build({ ...n, full: n.city ? `${n.name} ${n.city}` : n.name })
  }
