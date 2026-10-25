import type { Metadata, Viewport } from 'next'
import React from 'react'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'
import './styles.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getGlobals } from '@/lib/queries'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'SMP Nasional KPS Balikpapan', template: '%s · SMP Nasional KPS' },
  description: 'Website resmi SMP Nasional KPS Balikpapan: profil, pembelajaran, kehidupan siswa, berita, pengumuman, agenda dan informasi pendaftaran.',
  openGraph: { type: 'website', locale: 'id_ID', siteName: 'SMP Nasional KPS' },
  icons: { icon: '/brand/icon.svg' },
  robots: process.env.NOINDEX === 'true' ? { index: false, follow: false } : undefined,
}

export const viewport: Viewport = { themeColor: '#142A46', width: 'device-width', initialScale: 1 }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings, nav } = await getGlobals()
  const logo = settings.logo && typeof settings.logo === 'object' ? (settings.logo as Media) : null
  return (
    <html lang="id">
      <body>
        <a href="#main" className="skip-link">
          Lewati ke konten utama
        </a>
        <Header
          items={(nav.header ?? []).map((h) => ({ label: h.label, href: h.href, children: h.children ?? [] }))}
          schoolName={settings.schoolName}
          logoUrl={logo?.url}
          portalUrl={settings.portalUrl || null}
        />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer settings={settings} nav={nav} />
      </body>
    </html>
  )
}
