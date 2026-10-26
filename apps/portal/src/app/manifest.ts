import type { MetadataRoute } from 'next'
import { portalSchool } from '@/lib/context'

/** Installable PWA, named after the school whose domain it is opened on. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const school = await portalSchool()
  const name = school ? `Portal ${school.name}` : 'Portal sekolah'
  return {
    name,
    short_name: 'Portal',
    description: 'Portal sekolah: pendaftaran, belajar dan layanan.',
    start_url: '/portal',
    scope: '/portal/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#142A46',
    lang: 'id',
    icons: [{ src: '/portal/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
