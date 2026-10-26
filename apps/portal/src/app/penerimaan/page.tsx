import Link from 'next/link'
import { requestBranding, requestCtx, requestModules } from '@/server/request'
import { publicSummary } from '@/modules/admissions/config'
import { moduleOpen } from '@/server/settings'
import { fmtDate, fmtDateTime } from '@/server/time'
import { Icon } from '@/ui/icons'
import { P, publicFileUrl, rupiah } from '@/ui/kit'

export const metadata = { title: 'Penerimaan siswa baru' }

/** PUB-02 public admissions centre: schedule, requirements and flow from the configured cycles (no applicant data). */
export default async function PublicAdmissions() {
  const ctx = await requestCtx()
  if (!ctx || !moduleOpen((await requestModules())!, 'penerimaan', 'family')) {
    return (
      <main id="main" className="narrow" style={{ padding: '64px 16px' }}>
        <h1>Penerimaan siswa baru</h1>
        <p>Informasi penerimaan belum tersedia di portal. Silakan lihat website sekolah.</p>
        <a href="/">Kembali ke website sekolah</a>
      </main>
    )
  }
  const b = (await requestBranding())!
  const cycles = await publicSummary(ctx.db, ctx.now)
  const hero = publicFileUrl(b.heroFileId)
  const cta = ctx.account ? '/keluarga/penerimaan' : '/daftar'
  return (
    <div style={{ '--brand': b.primary, '--navy': b.navy } as React.CSSProperties}>
      <header className="pubbar">
        <Link href="/penerimaan" className="pubbar__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicFileUrl(b.logoFileId) ?? `${P}/icon.svg`} alt="" />
          <span>
            <strong>{b.shortName || ctx.school.name}</strong>
            {b.city ? <small>{b.city}</small> : null}
          </span>
        </Link>
        <nav>
          <a href="#jadwal">Jadwal</a>
          <a href="#syarat">Persyaratan</a>
          <a href="#alur">Alur</a>
          <Link className="btn btn--sm" href={ctx.account ? '/keluarga/penerimaan' : '/masuk?lanjut=%2Fportal%2Fkeluarga%2Fpenerimaan'}>
            {ctx.account ? 'Pendaftaran saya' : 'Masuk / Daftar'}
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="pubhero" style={hero ? { backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.88) 38%, rgba(255,255,255,0) 70%), url(${hero})` } : undefined}>
          <div>
            <p className="eyebrow">{b.shortName || ctx.school.name}</p>
            <h1>Penerimaan Siswa Baru</h1>
            {cycles[0] ? <p className="lead">Tahun Ajaran {cycles[0].targetYear} · Kelas {cycles[0].targetGrade}</p> : null}
            {cycles.some((c) => c.status === 'open') ? (
              <Link className="btn" href={cta}>
                Daftar sekarang <Icon name="arrowRight" />
              </Link>
            ) : (
              <p className="chip">{cycles.some((c) => c.status === 'upcoming') ? 'Pendaftaran segera dibuka' : 'Pendaftaran sedang tidak dibuka'}</p>
            )}
          </div>
        </section>
        <div className="content" style={{ margin: '0 auto' }}>
          {cycles.length ? (
            cycles.map((c) => (
              <div key={c.id} className="grid grid--4" style={{ marginBottom: 24 }}>
                <section className="card" id="jadwal">
                  <h2>
                    <Icon name="calendar" className="h-ico" /> Jadwal
                  </h2>
                  <p className="small">
                    <strong>{c.name}</strong>
                    <br />
                    {fmtDateTime(c.openAt, ctx.tz)} – {fmtDateTime(c.closeAt, ctx.tz)}
                  </p>
                  {c.waves.map((w) => (
                    <p key={w.name} className="small">
                      {w.name}: {fmtDate(w.openAt, ctx.tz)} – {fmtDate(w.closeAt, ctx.tz)}
                    </p>
                  ))}
                  <p className="small">Status: {c.status === 'open' ? 'Dibuka' : c.status === 'upcoming' ? 'Segera dibuka' : 'Ditutup'}</p>
                </section>
                <section className="card" id="syarat">
                  <h2>
                    <Icon name="clipboard" className="h-ico" /> Persyaratan
                  </h2>
                  {c.paths.map((p) => (
                    <div key={p.name} className="small">
                      <strong>Jalur {p.name}</strong>
                      {p.registrationFee ? ` · biaya pendaftaran ${rupiah(p.registrationFee)}` : ' · tanpa biaya pendaftaran'}
                      <ul style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
                        {p.documents.map((d) => (
                          <li key={d.label}>
                            {d.label}
                            {d.required ? '' : ' (opsional)'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
                <section className="card" id="alur">
                  <h2>
                    <Icon name="list" className="h-ico" /> Alur
                  </h2>
                  <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>
                    <li>Buat akun & verifikasi email</li>
                    <li>Isi formulir & unggah berkas</li>
                    <li>Verifikasi berkas oleh panitia</li>
                    <li>Seleksi (bila ada)</li>
                    <li>Pengumuman di akun masing-masing</li>
                    <li>Daftar ulang</li>
                  </ol>
                </section>
                <section className="card">
                  <h2>
                    <Icon name="info" className="h-ico" /> Informasi
                  </h2>
                  {c.info ? <p className="small" style={{ whiteSpace: 'pre-line' }}>{c.info}</p> : <p className="small muted">Informasi rinci diumumkan sekolah.</p>}
                  {c.helpContact ? <p className="small">Bantuan: {c.helpContact}</p> : null}
                </section>
              </div>
            ))
          ) : (
            <p className="muted">Belum ada periode penerimaan yang diumumkan.</p>
          )}
          <p className="footnote">Hasil seleksi hanya dapat dilihat melalui akun pendaftar. Didukung Sekolahku.</p>
        </div>
      </main>
    </div>
  )
}
