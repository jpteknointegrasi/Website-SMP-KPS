import { schoolMeta } from '@/lib/meta'
import { listCollection, getGlobals } from '@/lib/queries'
import { PageHeader, Container, EmptyState, SmartLink, DemoBadge } from '@/components/ui/bits'
import { Icon } from '@/components/ui/Icon'
import type { Service } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Layanan Sekolah', description: `Tautan layanan ${name}: portal, perpustakaan, rapor dan aplikasi sekolah.`, alternates: { canonical: '/layanan' } }))

export default async function Page() {
  const [res, { settings }] = await Promise.all([listCollection('services', { sort: 'order', limit: 48, depth: 0 }), getGlobals()])
  const services = res.docs as unknown as Service[]
  // Only services with a real, safe destination are actionable; others are shown as "segera tersedia".
  const valid = (u?: string | null) => Boolean(u && (/^https:\/\//.test(u) || /^\/(?!\/)/.test(u)))
  return (
    <>
      <PageHeader title="Layanan Sekolah" lead="Akses aplikasi dan layanan yang dikelola sekolah. Sistem nilai, rapor dan pembayaran berjalan di layanan terpisah." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Layanan' }]} />
      <section className="section">
        <Container>
          {settings.portalUrl ? (
            <div className="status-panel status-panel--open" style={{ marginBottom: 28 }}>
              <strong>Portal Sekolah</strong>
              <span>Masuk ke portal resmi untuk siswa dan orang tua.</span>
              <div><a className="btn btn--teal" href={settings.portalUrl} target="_blank" rel="noopener noreferrer">Buka Portal Sekolah <span className="sr-only">(membuka tab baru)</span></a></div>
            </div>
          ) : null}
          {services.length ? (
            <ul className="cards">
              {services.map((s) => (
                <li key={s.id} id={s.slug}>
                  <div className="service">
                    <span className="service__icon"><Icon name={s.icon ?? 'link'} size={24} /></span>
                    <div>
                      <h2>{s.title} <DemoBadge show={s.isDemo} /></h2>
                      {s.excerpt ? <p>{s.excerpt}</p> : null}
                      {s.serviceStatus === 'maintenance' ? (
                        <span className="badge badge--postponed">Sedang pemeliharaan</span>
                      ) : (s.serviceStatus ?? 'active') === 'active' && valid(s.url) ? (
                        <SmartLink href={s.url!} className="arrow-link" data-cta={`layanan-${s.slug}`}>
                          Buka layanan <Icon name={/^https/.test(s.url!) ? 'external' : 'arrow'} size={16} />
                        </SmartLink>
                      ) : (
                        <span className="badge badge--ended">Segera tersedia</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Daftar layanan sedang disiapkan" text="Tautan layanan akan ditampilkan setelah alamatnya dikonfirmasi sekolah." action={{ label: 'Hubungi sekolah', href: '/kontak' }} />
          )}
        </Container>
      </section>
    </>
  )
}
