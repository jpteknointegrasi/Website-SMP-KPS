import Link from 'next/link'
import React from 'react'
import type { Navigation, SiteSetting, Media, SocialAccount } from '@/payload-types'
import { Icon } from '../ui/Icon'

export const PLATFORM_ICON: Record<string, string> = { instagram: 'instagram', youtube: 'youtube', tiktok: 'tiktok', facebook: 'facebook', whatsapp: 'whatsapp', web: 'globe' }

export const Footer = ({ settings, nav, accounts = [] }: { settings: SiteSetting; nav: Navigation; accounts?: SocialAccount[] }) => {
  // verified official accounts; the old settings list is only a fallback while the collection is empty
  const socials = accounts.length
    ? accounts.map((a) => ({ url: a.profileUrl, platform: a.platform, label: a.handle || a.displayName }))
    : (settings.socials ?? []).map((s) => ({ url: s.url, platform: s.platform, label: s.handle || s.platform }))
  const logo = settings.logo && typeof settings.logo === 'object' ? (settings.logo as Media) : null
  const tel = settings.phone ? settings.phone.replace(/[^0-9+]/g, '') : ''
  return (
    <footer className="site-footer">
      <div className="site-footer__hex" aria-hidden="true" />
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          {logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo.url} alt={settings.schoolName} width={599} height={149} loading="lazy" className="site-footer__logo" />
          ) : (
            <strong>{settings.schoolName}</strong>
          )}
          {settings.valuesLine ? <p className="site-footer__values">{settings.valuesLine}</p> : null}
          {socials.length ? (
            <ul className="site-footer__social" aria-label="Akun resmi sekolah">
              {socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    <Icon name={PLATFORM_ICON[s.platform] ?? 'external'} size={18} />
                    <span>{s.label}</span>
                    <span className="sr-only"> ({s.platform}, membuka tab baru)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <h2 className="site-footer__h">Tautan Penting</h2>
          <ul className="site-footer__links">
            {(nav.footer ?? []).map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="site-footer__h">Kontak &amp; Layanan</h2>
          <ul className="site-footer__list">
            {settings.address ? (
              <li>
                <Icon name="pin" size={18} />
                <span>
                  {settings.address}
                  {settings.city && !settings.address.includes(settings.city) ? `, ${settings.city}` : ''}
                </span>
              </li>
            ) : null}
            {settings.email ? (
              <li>
                <Icon name="mail" size={18} />
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
            ) : null}
            {settings.phone ? (
              <li>
                <Icon name="phone" size={18} />
                <a href={`tel:${tel}`}>{settings.phone}</a>
              </li>
            ) : null}
            {settings.serviceHours ? (
              <li>
                <Icon name="clock" size={18} />
                <span>{settings.serviceHours}</span>
              </li>
            ) : null}
            <li>
              <Icon name="pin" size={18} />
              {settings.mapUrl ? (
                <a href={settings.mapUrl} target="_blank" rel="noopener noreferrer" className="site-footer__more">
                  Lokasi Sekolah <Icon name="arrow" size={15} />
                </a>
              ) : (
                <Link href="/kontak" className="site-footer__more">
                  Halaman Kontak <Icon name="arrow" size={15} />
                </Link>
              )}
            </li>
          </ul>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <span>
          © {new Date().getFullYear()} {settings.schoolName}. Semua hak dilindungi.
        </span>
        <span className="site-footer__legal">
          <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>
          {/* Pintu masuk pengelola konten: kecil & redup, tidak diindeks mesin pencari */}
          <a href="/admin" className="site-footer__admin" rel="nofollow">Admin CMS</a>
        </span>
      </div>
    </footer>
  )
}
