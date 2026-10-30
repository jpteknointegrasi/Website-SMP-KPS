import type { Metadata, Viewport } from 'next'
import React from 'react'
import './platform.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'SatuSekolah', template: '%s · SatuSekolah' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#0B2356', width: 'device-width', initialScale: 1 }

/** Platform pages (sign-up form and Super Admin console): their own shell, never a school's website. */
export default function PlatformRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <a href="#main" className="skip">
          Lewati ke konten utama
        </a>
        {children}
      </body>
    </html>
  )
}
