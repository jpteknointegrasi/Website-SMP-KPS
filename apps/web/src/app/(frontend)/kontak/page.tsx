import { schoolMeta } from '@/lib/meta'
import { getGlobals, listSocialAccounts } from '@/lib/queries'
import { PLATFORM_ICON } from '@/components/layout/Footer'
import { PageHeader, Container } from '@/components/ui/bits'
import { Icon } from '@/components/ui/Icon'
import { ContactForm } from '@/components/forms/ContactForm'

export const generateMetadata = schoolMeta(({ full }) => ({ title: 'Kontak', description: `Alamat, email, telepon dan formulir pesan ${full}.`, alternates: { canonical: '/kontak' } }))
type SP = { searchParams: Promise<{ kategori?: string; topik?: string }> }
const CATS = ['umum', 'pendaftaran', 'akademik', 'saran', 'alumni', 'kegiatan', 'kunjungan']

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const k = sp.kategori
  const topic = typeof sp.topik === 'string' && /^[a-z0-9-]{1,80}$/.test(sp.topik) ? sp.topik : undefined
  const [{ settings: s }, accounts] = await Promise.all([getGlobals(), listSocialAccounts('showOnContact').catch(() => [])])
  const socials = accounts.length
    ? accounts.map((a) => ({ url: a.profileUrl, platform: a.platform, label: a.handle || a.displayName, name: a.displayName }))
    : (s.socials ?? []).map((so) => ({ url: so.url, platform: so.platform, label: so.handle ?? so.url, name: so.platform[0].toUpperCase() + so.platform.slice(1) }))
  const tel = (v: string) => `tel:${v.replace(/[^0-9+]/g, '')}`
  return (
    <>
      <PageHeader title="Hubungi Sekolah" lead="Kami senang menerima pertanyaan, saran dan kabar dari orang tua, siswa, alumni dan masyarakat." crumbs={[{ label: 'Kontak' }]} />
      <section className="section">
        <Container className="contact-grid">
          <div>
            <h2 className="h2">Kontak resmi</h2>
            {!s.contactVerified ? <p className="note">Data kontak diambil dari website lama sekolah dan sedang dikonfirmasi ulang.</p> : null}
            <ul className="contact-list" style={{ marginTop: 20 }}>
              {s.address ? (
                <li><span className="service__icon"><Icon name="pin" size={20} /></span><span><strong>Alamat</strong><br />{s.address}</span></li>
              ) : null}
              {s.email ? (
                <li><span className="service__icon"><Icon name="mail" size={20} /></span><span><strong>Email</strong><br /><a href={`mailto:${s.email}`}>{s.email}</a></span></li>
              ) : null}
              {s.phone ? (
                <li><span className="service__icon"><Icon name="phone" size={20} /></span><span><strong>Telepon</strong><br /><a href={tel(s.phone)}>{s.phone}</a>{s.fax ? <><br /><small className="muted">Faks {s.fax}</small></> : null}</span></li>
              ) : null}
              {s.whatsapp ? (
                <li><span className="service__icon"><Icon name="phone" size={20} /></span><span><strong>WhatsApp resmi</strong><br /><a href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">{s.whatsapp}</a></span></li>
              ) : null}
              <li><span className="service__icon"><Icon name="clock" size={20} /></span><span><strong>Jam layanan</strong><br />{s.serviceHours || <span className="muted">Sedang dikonfirmasi sekolah</span>}</span></li>
              {socials.map((so) => (
                <li key={so.url}><span className="service__icon"><Icon name={PLATFORM_ICON[so.platform] ?? 'link'} size={20} /></span><span><strong>{so.name}</strong><br /><a href={so.url} target="_blank" rel="noopener noreferrer">{so.label}<span className="sr-only"> (membuka tab baru)</span></a></span></li>
              ))}
            </ul>
            {s.mapUrl ? (
              <p style={{ marginTop: 24 }}>
                <a className="btn btn--ghost" href={s.mapUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={18} /> Buka di peta</a>
              </p>
            ) : null}
          </div>
          <div>
            <h2 className="h2">Kirim pesan</h2>
            <p className="muted">Pesan diterima tim sekolah melalui kotak masuk admin. Isi minimal satu kanal balasan.</p>
            <ContactForm defaultCategory={k && CATS.includes(k) ? k : 'umum'} topic={topic} />
          </div>
        </Container>
      </section>
    </>
  )
}
