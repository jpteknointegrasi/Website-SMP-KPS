import { PORTAL_BASE_PATH, admissionsMode } from '@sekolahku/core'
import { currentTenant } from '@/lib/payload'
import { getSchoolNames } from '@/lib/queries'
import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { AppAdmissionPaths } from '@/components/sections/portal'
import { getCurrentAdmissions, getFlags, getGlobals, getLinkFlags, listFaqs } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { Icon } from '@/components/ui/Icon'
import { STATUS_LABEL } from '@/components/sections/home'
import { formatDate } from '@/lib/format'
import { admissionsCta, displayedAdmissionStatus, interestOpenFor } from '@/lib/admissions'
import { portalAdmissions } from '@/lib/portal'
import { DocumentList } from '@/components/content/DocumentList'
import { MediaEmbed } from '@/components/media/MediaCard'
import { FaqList } from '@/components/content/FaqList'
import type { Document, MediaItem } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Pendaftaran', description: `Informasi penerimaan siswa baru ${name}: status, jadwal, alur, persyaratan, minat dan kunjungan sekolah.`, alternates: { canonical: '/pendaftaran' } }))

const STATUS_TEXT: Record<string, string> = {
  unconfirmed: 'Informasi penerimaan untuk tahun ajaran ini sedang dikonfirmasi sekolah. Jadwal dan ketentuan akan diumumkan di halaman ini.',
  not_open: 'Penerimaan sudah dikonfirmasi tetapi belum dibuka. Perhatikan jadwal gelombang di bawah.',
  open: 'Penerimaan sedang dibuka.',
  closed: 'Penerimaan untuk tahun ajaran ini sudah ditutup.',
}

export default async function Page() {
  const { name, city } = await getSchoolNames()
  const [cycle, { settings }, flags, linkFlags, faqs] = await Promise.all([getCurrentAdmissions(), getGlobals(), getFlags(), getLinkFlags(), listFaqs({ category: 'pendaftaran', limit: 12 })])
  const visitsOn = linkFlags.schoolVisits // only when an open visit slot exists
  // one official process only (lib/admissions.ts admissionsCta): with Sekolahku App the portal, its open/closed state
  // read from the App itself; otherwise the external system, when open AND a valid https URL exists
  const viaPortal = admissionsMode(await currentTenant()) === 'app'
  const appCycles = viaPortal ? ((await portalAdmissions())?.cycles ?? []) : []
  const cta = admissionsCta({ mode: viaPortal ? 'app' : 'web', portalPath: PORTAL_BASE_PATH, cycle, appCycles })
  const status = displayedAdmissionStatus(viaPortal ? 'app' : 'web', cycle?.admissionStatus, appCycles)
  const openExternal = cta?.kind === 'external'
  const openPortal = cta?.kind === 'portal' && cta.open
  const portalButton =
    cta?.kind === 'portal' ? (
      <div>
        <a className={`btn ${cta.open ? 'btn--gold btn--lg' : 'btn--ghost'}`} href={cta.href} data-cta="daftar-portal">
          {cta.label}
        </a>
      </div>
    ) : null
  // same rule as /pendaftaran/minat and POST /api/leads/submit
  const interestOn = flags.interestForm && interestOpenFor(cycle)
  const docs = (cycle?.infoDocuments ?? []).filter((d): d is Document => typeof d === 'object' && d !== null)
  const videos = (cycle?.videos ?? []).filter((v): v is MediaItem => typeof v === 'object' && v !== null)

  return (
    <>
      <PageHeader title="Informasi Pendaftaran" lead={`Penerimaan siswa baru ${city ? `${name} ${city}` : name}.`} crumbs={[{ label: 'Pendaftaran' }]} />
      <section className="section">
        <Container className="layout-2">
          <div>
            {!cycle ? (
              <>
                {/* with Sekolahku App the portal is reachable even before the website publishes a cycle */}
                {portalButton ? (
                  <div className={`status-panel ${openPortal ? 'status-panel--open' : ''}`} role="status">
                    <strong>{openPortal ? 'Penerimaan sedang dibuka di Portal Penerimaan.' : 'Informasi penerimaan ada di Portal Penerimaan.'}</strong>
                    {portalButton}
                  </div>
                ) : null}
                {viaPortal ? <AppAdmissionPaths /> : null}
                <EmptyState title="Informasi pendaftaran belum diterbitkan" text="Silakan hubungi sekolah untuk informasi penerimaan siswa baru." action={{ label: 'Hubungi sekolah', href: '/kontak?kategori=pendaftaran' }} />
              </>
            ) : (
              <>
                <div className={`status-panel ${openExternal || openPortal ? 'status-panel--open' : ''}`} role="status">
                  <span className="muted">Tahun ajaran {cycle.academicYear}{cycle.levels ? ` · ${cycle.levels}` : ''}</span>
                  <strong>Status: {STATUS_LABEL[status]}</strong>
                  <span>{cycle.intro || STATUS_TEXT[status]}</span>
                  {cta?.kind === 'external' ? (
                    <div>
                      <a className="btn btn--gold btn--lg" href={cta.href} target="_blank" rel="noopener noreferrer" data-cta="daftar-sistem-resmi">
                        {cta.label} <Icon name="external" size={18} />
                        <span className="sr-only"> (membuka tab baru)</span>
                      </a>
                    </div>
                  ) : null}
                  {portalButton}
                </div>

                {viaPortal ? <AppAdmissionPaths /> : null}
                {interestOn || visitsOn ? (
                  <div className="next-steps">
                    {interestOn ? (
                      <Link className="next-step" href="/pendaftaran/minat" data-cta="cta-minat">
                        <Icon name="heart" size={22} />
                        <span>
                          <strong>{status === 'closed' ? 'Minat untuk siklus berikutnya' : 'Saya tertarik'}</strong>
                          <small>Titipkan minat, bukan pendaftaran resmi. Petugas akan menghubungi Anda.</small>
                        </span>
                      </Link>
                    ) : null}
                    {visitsOn ? (
                      <Link className="next-step" href="/kunjungan" data-cta="cta-kunjungan">
                        <Icon name="school" size={22} />
                        <span>
                          <strong>Kunjungi sekolah</strong>
                          <small>Pilih jadwal kunjungan atau open house yang tersedia.</small>
                        </span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {cycle.waves?.length ? (
                  <div className="block">
                    <h2>Jadwal gelombang</h2>
                    <ul className="list-rows">
                      {cycle.waves.map((w) => (
                        <li key={w.id ?? w.name} className="row-link" style={{ cursor: 'default' }}>
                          <strong>
                            {w.name} {w.waveStatus && w.waveStatus !== 'unconfirmed' ? <span className={`badge ${w.waveStatus === 'open' ? '' : 'badge--ended'}`}>{STATUS_LABEL[w.waveStatus]}</span> : null}
                          </strong>
                          <span>{[w.start && formatDate(w.start), w.end && formatDate(w.end)].filter(Boolean).join(' – ') || 'Jadwal menyusul'}</span>
                          {typeof w.capacity === 'number' && w.capacity > 0 ? <span>Kapasitas: {w.capacity}</span> : null}
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

                {docs.length ? (
                  <div className="block">
                    <h2>Dokumen informasi</h2>
                    <DocumentList docs={docs} />
                  </div>
                ) : null}

                {videos.length ? (
                  <div className="block">
                    <h2>Kenali sekolah</h2>
                    {videos.map((v) => <MediaEmbed key={v.id} m={v} />)}
                  </div>
                ) : null}

                {cycle.faqs?.length || faqs.length ? (
                  <div className="block faq">
                    <h2>Pertanyaan umum</h2>
                    {cycle.faqs?.map((f) => (
                      <details key={f.id ?? f.question}>
                        <summary>{f.question}</summary>
                        <p>{f.answer}</p>
                      </details>
                    ))}
                    <FaqList items={faqs} />
                    <p className="muted"><Link href="/faq?kategori=pendaftaran">Semua FAQ pendaftaran</Link></p>
                  </div>
                ) : null}

                {!cycle.waves?.length && !cycle.steps?.length && !cycle.requirements?.length ? (
                  <p className="note">Jadwal, alur dan persyaratan tahun ajaran {cycle.academicYear} akan dimuat setelah dikonfirmasi sekolah.</p>
                ) : null}
              </>
            )}
          </div>
          <div>
            <div className="aside-card">
              <h2>Tanya pendaftaran</h2>
              {cycle?.contactNote ? <p>{cycle.contactNote}</p> : null}
              <dl>
                {settings.email ? (<><dt>Email</dt><dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd></>) : null}
                {settings.phone ? (<><dt>Telepon</dt><dd><a href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`}>{settings.phone}</a></dd></>) : null}
                {settings.serviceHours ? (<><dt>Jam layanan</dt><dd>{settings.serviceHours}</dd></>) : null}
              </dl>
              <Link className="btn btn--teal" href="/kontak?kategori=pendaftaran" style={{ marginTop: 16 }} data-cta="tanya-pendaftaran">
                Kirim pertanyaan
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
