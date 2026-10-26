import type { Metadata, Viewport } from 'next'
import React from 'react'
import { portalSchool } from '@/lib/context'
import { ServiceWorker } from './sw'
import './portal.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const school = await portalSchool()
  return {
    title: { default: school ? `Portal ${school.name}` : 'Portal sekolah', template: `%s · ${school ? `Portal ${school.name}` : 'Portal'}` },
    robots: { index: false, follow: false },
  }
}

export const viewport: Viewport = { themeColor: '#0B2356', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <a href="#main" className="skip">
          Lewati ke konten utama
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
