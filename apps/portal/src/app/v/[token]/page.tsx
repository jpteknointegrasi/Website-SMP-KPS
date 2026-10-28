import { requestBranding, requestCtx } from '@/server/request'
import { verifyToken } from '@/modules/cards/service'
import { fmtDate } from '@/server/time'
import { Icon } from '@/ui/icons'
import { Avatar, fileUrl, P, publicFileUrl } from '@/ui/kit'

export const metadata = { title: 'Verifikasi kartu siswa' }

/**
 * Public result of scanning a student card QR (KRT-04). The public sees only whether the card is valid for this
 * school — no name or photo. Signed-in card verifiers also see the holder to match against the person in front of
 * them. A scan is not proof of attendance.
 */
export default async function VerifyCard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ctx = await requestCtx()
  if (!ctx) return <main className="narrow" style={{ padding: 48 }}>Portal tidak tersedia.</main>
  const b = (await requestBranding())!
  const r = await verifyToken(ctx, token)
  const ok = r.found && r.valid
  return (
    <main id="main" className="narrow" style={{ padding: '40px 16px' }}>
      <div className="auth__logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={publicFileUrl(b.logoFileId) ?? `${P}/icon.svg`} alt="" />
        <div>
          <strong>{b.shortName || ctx.school.name}</strong>
          {b.city ? <span>{b.city}</span> : null}
        </div>
      </div>
      <section className="card" aria-live="polite">
        <div className="row" style={{ gap: 14 }}>
          <span className={`stat__icon`} style={{ background: ok ? 'var(--ok-bg)' : 'var(--bad-bg)', color: ok ? 'var(--ok)' : 'var(--bad)', width: 56, height: 56 }}>
            <Icon name={ok ? 'checkCircle' : 'x'} />
          </span>
          <div>
            <h1 style={{ margin: 0 }}>{!r.found ? 'Kartu tidak dikenal' : ok ? 'Kartu berlaku' : `Kartu tidak berlaku`}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {!r.found ? 'QR ini tidak terdaftar sebagai kartu siswa sekolah ini.' : ok ? `Terdaftar sebagai kartu siswa ${ctx.school.name}.` : `Status: ${r.status}.`}
            </p>
          </div>
        </div>
        {r.found && r.detail ? (
          <>
            <hr className="divider" />
            <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
              <Avatar name={r.detail.name} src={fileUrl(r.detail.photo)} size="lg" />
              <dl className="kv" style={{ flex: 1 }}>
                <dt>Nama</dt>
                <dd>{r.detail.name}</dd>
                <dt>NIS</dt>
                <dd>{r.detail.nis ?? '—'}</dd>
                <dt>Rombel</dt>
                <dd>{r.detail.homeroom ?? '—'}</dd>
                <dt>Nomor kartu</dt>
                <dd className="mono">{r.detail.cardNo}</dd>
                <dt>Berlaku sampai</dt>
                <dd>{fmtDate(r.detail.validUntil)}</dd>
              </dl>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              Cocokkan foto dengan pemegang kartu. Hasil pindai bukan bukti kehadiran.
            </p>
          </>
        ) : r.found ? (
          <p className="small muted" style={{ marginTop: 12 }}>
            Identitas pemegang hanya ditampilkan untuk petugas sekolah yang masuk ke portal.
          </p>
        ) : null}
      </section>
      <p className="footnote">Didukung Satu Sekolah</p>
    </main>
  )
}
