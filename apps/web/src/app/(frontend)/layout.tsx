import type { Metadata, Viewport } from 'next'
import React from 'react'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'
import './styles.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getFlags, getGlobals, getLinkFlags, hrefAllowed, listSocialAccounts } from '@/lib/queries'
import { Analytics } from '@/components/ui/Analytics'
import type { Media } from '@/payload-types'
import { currentTenant, siteUrl } from '@/lib/payload'
import { PORTAL_BASE_PATH, hasProduct } from '@sekolahku/core'

const NoWebsite = ({ name, portal }: { name: string; portal: boolean }) => (
  <html lang="id">
    <body>
      <main id="main" style={{ maxWidth: 560, margin: '15vh auto', padding: '0 16px', textAlign: 'center' }}>
        <h1>{name}</h1>
        {portal ? (
          <p>
            <a href={PORTAL_BASE_PATH}>Masuk ke portal sekolah</a>
          </p>
        ) : (
          <p>Website sekolah ini belum aktif.</p>
        )}
      </main>
    </body>
  </html>
)

const NoSchool = () => (
  <html lang="id">
    <body>
      <main id="main" style={{ maxWidth: 560, margin: '15vh auto', padding: '0 16px', textAlign: 'center' }}>
        <h1>Website sekolah tidak ditemukan</h1>
        <p>Alamat ini belum terhubung ke sekolah yang aktif. Periksa kembali alamat yang Anda ketik.</p>
      </main>
    </body>
  </html>
)

export const dynamic = 'force-dynamic'

/** Title, description and share image come from the school's settings (Pengaturan Sekolah). */
export async function generateMetadata(): Promise<Metadata> {
  const school = await currentTenant()
  const robots = process.env.NOINDEX === 'true' ? { index: false, follow: false } : undefined
  if (!school) return { title: 'Sekolah tidak ditemukan', robots: { index: false, follow: false } }
  if (!hasProduct(school, 'web')) return { title: school.name, robots: { index: false, follow: false } }
  const [{ settings }, site] = await Promise.all([getGlobals(), siteUrl()])
  const name = settings.schoolName || school.name
  const full = settings.city ? `${name} ${settings.city}` : name
  const og = settings.ogImage && typeof settings.ogImage === 'object' ? (settings.ogImage as Media) : null
  const logo = settings.logo && typeof settings.logo === 'object' ? (settings.logo as Media) : null
  const image = og?.url ?? logo?.url
  return {
    metadataBase: new URL(site),
    title: { default: full, template: `%s · ${name}` },
    description: settings.shortProfile || `Website resmi ${full}: profil, pembelajaran, kehidupan siswa, berita, pengumuman, agenda dan informasi pendaftaran.`,
    openGraph: { type: 'website', locale: 'id_ID', siteName: name, images: image ? [{ url: image, alt: full }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', images: image ? [image] : undefined },
    icons: { icon: '/brand/icon.svg' },
    robots,
  }
}

export const viewport: Viewport = { themeColor: '#142A46', width: 'device-width', initialScale: 1 }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Unknown or suspended address: no school content at all.
  const school = await currentTenant()
  if (!school) return <NoSchool />
  // School without (an active) Sekolahku Web: no website; the portal stays reachable if it has Sekolahku App.
  if (!hasProduct(school, 'web')) return <NoWebsite name={school.name} portal={hasProduct(school, 'app')} />
  const [{ settings, nav }, flags, linkFlags] = await Promise.all([getGlobals(), getFlags(), getLinkFlags()])
  const accounts = await listSocialAccounts('showInFooter').catch(() => [])
  // links to switched-off features are removed (the routes themselves also return 404)
  const header = (nav.header ?? [])
    .filter((h) => hrefAllowed(h.href, linkFlags))
    .map((h) => ({ label: h.label, href: h.href, children: (h.children ?? []).filter((c) => hrefAllowed(c.href, linkFlags)) }))
  const navFiltered = { ...nav, footer: (nav.footer ?? []).filter((f) => hrefAllowed(f.href, linkFlags)) }
  const logo = settings.logo && typeof settings.logo === 'object' ? (settings.logo as Media) : null
  return (
    <html lang="id">
      <body>
        <a href="#main" className="skip-link">
          Lewati ke konten utama
        </a>
        <Header
          items={header}
          schoolName={settings.schoolName}
          logoUrl={logo?.url}
          portalUrl={settings.portalUrl || (hasProduct(school, 'app') ? PORTAL_BASE_PATH : null)}
        />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer settings={settings} nav={navFiltered} accounts={accounts} />
        {flags.visitorAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
