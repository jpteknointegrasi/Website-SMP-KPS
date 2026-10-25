import Link from 'next/link'
import { getCurrentAdmissions, getGlobals } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { Icon } from '@/components/ui/Icon'
import { STATUS_LABEL } from '@/components/sections/home'
import { formatDate } from '@/lib/format'

export const metadata = { title: 'Pendaftaran', description: 'Informasi penerimaan siswa baru SMP Nasional KPS: status, jadwal, alur, persyaratan dan kontak.', alternates: { canonical: '/pendaftaran' } }

export default async function Page() {
  const [cycle, { settings }] = await Promise.all([getCurrentAdmissions(), getGlobals()])
  // "Daftar" only when the school marked admissions open AND the URL is a valid https link.
  const open = cycle?.admissionStatus === 'open' && Boolean(cycle.registrationUrl?.startsWith('https://'))
  return (
    <>
      <PageHeader title="Informasi Pendaftaran" lead="Penerimaan siswa baru SMP Nasional KPS Balikpapan." crumbs={[{ label: 'Pendaftaran' }]} />
      <section className="section">
        <Container className="layout-2">
          <div>
            {!cycle ? (
              <EmptyState title="Informasi pendaftaran belum diterbitkan" text="Silakan hubungi sekolah untuk informasi penerimaan siswa baru." action={{ label: 'Hubungi sekolah', href: '/kontak?kategori=pendaftaran' }} />
            ) : (
              <>
                <div className={`status-panel ${open ? 'status-panel--open' : ''}`} role="status">
                  <span className="muted">Tahun ajaran {cycle.academicYear}</span>
                  <strong>Status: {STATUS_LABEL[cycle.admissionStatus]}</strong>
                  {cycle.intro ? <span>{cycle.intro}</span> : null}
                  {open ? (
                    <div>
                      <a className="btn btn--gold btn--lg" href={cycle.registrationUrl!} target="_blank" rel="noopener noreferrer">
                        Daftar melalui sistem resmi <Icon name="external" size={18} />
                        <span className="sr-only"> (membuka tab baru)</span>
                      </a>
                    </div>
                  ) : null}
                </div>

                {cycle.waves?.length ? (
                  <div className="block">
                    <h2>Jadwal gelombang</h2>
                    <ul className="list-rows">
                      {cycle.waves.map((w) => (
                        <li key={w.id ?? w.name} className="row-link" style={{ cursor: 'default' }}>
                          <strong>{w.name}</strong>
                          <span>{[w.start && formatDate(w.start), w.end && formatDate(w.end)].filter(Boolean).join(' – ') || 'Jadwal menyusul'}</span>
                          {w.note ? <span>{w.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {cycle.steps?.length ? (
                  <div className="block">
                    <h2>Alur pendaftaran</h2>
                    <ol className="steps">
                      {cycle.steps.map((s) => (
                        <li key={s.id ?? s.title}>
                          <div>
                            <h3>{s.title}</h3>
                            {s.detail ? <p>{s.detail}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {cycle.requirements?.length ? (
                  <div className="block prose">
                    <h2>Persyaratan</h2>
                    <ul>{cycle.requirements.map((r) => <li key={r.id ?? r.text}>{r.text}</li>)}</ul>
                  </div>
                ) : null}

                {cycle.feesApproved && cycle.fees ? (
                  <div className="block">
                    <h2>Biaya</h2>
                    <RichText data={cycle.fees} />
                  </div>
                ) : null}

                {cycle.faqs?.length ? (
                  <div className="block faq">
                    <h2>Pertanyaan umum</h2>
                    {cycle.faqs.map((f) => (
                      <details key={f.id ?? f.question}>
                        <summary>{f.question}</summary>
                        <p>{f.answer}</p>
                      </details>
                    ))}
                  </div>
                ) : null}

                {!cycle.waves?.length && !cycle.steps?.length && !cycle.requirements?.length ? (
                  <p className="note">Jadwal, alur dan persyaratan tahun ajaran {cycle.academicYear} akan dimuat setelah dikonfirmasi sekolah.</p>
                ) : null}
              </>
            )}
          </div>
          <aside>
            <div className="aside-card">
              <h2>Tanya pendaftaran</h2>
              {cycle?.contactNote ? <p>{cycle.contactNote}</p> : null}
              <dl>
                {settings.email ? (<><dt>Email</dt><dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd></>) : null}
                {settings.phone ? (<><dt>Telepon</dt><dd><a href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`}>{settings.phone}</a></dd></>) : null}
                {settings.serviceHours ? (<><dt>Jam layanan</dt><dd>{settings.serviceHours}</dd></>) : null}
              </dl>
              <Link className="btn btn--teal" href="/kontak?kategori=pendaftaran" style={{ marginTop: 16 }}>
                Kirim pertanyaan
              </Link>
            </div>
          </aside>
        </Container>
      </section>
    </>
  )
}
