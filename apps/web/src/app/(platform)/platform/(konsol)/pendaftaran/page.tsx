import Link from 'next/link'
import { requireOperator } from '@/platform/session'
import { listApplications } from '@/platform/data'
import { rejectApplication } from '@/platform/actions'
import { suggestSlug } from '@/platform/validation'
import { PLATFORM_ROOT_DOMAIN } from '@/tenancy/config'
import { APPLICATION_LABEL, LEVEL_LABEL, ZONE_LABEL, fmtDateTime } from '@/platform/labels'
import type { SchoolApplication } from '@/payload-types'
import { packageLabel } from '@sekolahku/core'
import { ApproveForm } from './approve'

export const metadata = { title: 'Pendaftaran sekolah' }

const TABS = [
  ['pending', 'Menunggu'],
  ['approved', 'Disetujui'],
  ['rejected', 'Ditolak'],
  ['semua', 'Semua'],
] as const

function Facts({ a }: { a: SchoolApplication }) {
  const pkg = a.package ?? (a.wantApp ? 'lengkap' : 'gratis')
  return (
    <dl className="facts">
      <dt>Jenjang</dt>
      <dd>{a.level ? LEVEL_LABEL[a.level] : '—'}</dd>
      <dt>NPSN</dt>
      <dd>{a.npsn || '—'}</dd>
      <dt>Lokasi</dt>
      <dd>
        {a.city}, {a.province} ({a.timezone ? (ZONE_LABEL[a.timezone] ?? a.timezone) : 'WIB'})
      </dd>
      <dt>Domain</dt>
      <dd>{a.domain || '—'}</dd>
      <dt>Paket</dt>
      <dd>
        {packageLabel(pkg)}
        {pkg === 'lengkap' ? <span className="pill pill--warn" style={{ marginLeft: 6 }}>Pengajuan demo</span> : null}
      </dd>
      <dt>Pengelola</dt>
      <dd>
        {a.adminName}
        {a.adminPosition ? ` (${a.adminPosition})` : ''} · <a href={`mailto:${a.adminEmail}`}>{a.adminEmail}</a>
        {a.adminPhone ? ` · ${a.adminPhone}` : ''}
      </dd>
      {a.note ? (
        <>
          <dt>Catatan</dt>
          <dd style={{ whiteSpace: 'pre-line' }}>{a.note}</dd>
        </>
      ) : null}
      {a.status !== 'pending' ? (
        <>
          <dt>Keputusan</dt>
          <dd>
            {fmtDateTime(a.decidedAt)}
            {a.decisionNote ? ` — ${a.decisionNote}` : ''}
          </dd>
        </>
      ) : null}
    </dl>
  )
}

export default async function Pendaftaran({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOperator()
  const raw = (await searchParams).status
  const tab = TABS.some(([k]) => k === raw) ? (raw as string) : 'pending'
  const apps = await listApplications(tab === 'semua' ? undefined : (tab as SchoolApplication['status']))
  return (
    <>
      <div className="head">
        <div>
          <h1>Pendaftaran sekolah</h1>
          <p>Setujui untuk membuat sekolah, akun Admin Teknis pertama dan langganan uji coba sekaligus. Tolak dengan alasan yang jelas; alasan dikirim ke pendaftar bila email aktif.</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Status pendaftaran">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/platform/pendaftaran?status=${k}`} aria-current={tab === k ? 'page' : undefined}>
            {l}
          </Link>
        ))}
      </nav>
      {apps.length === 0 ? <p className="empty">Tidak ada pendaftaran di sini.</p> : null}
      {apps.map((a) => {
        const st = APPLICATION_LABEL[a.status]!
        return (
          <article key={a.id} className="card" aria-labelledby={`app-${a.id}`}>
            <div className="head" style={{ marginBottom: 4 }}>
              <div>
                <h2 id={`app-${a.id}`}>{a.schoolName}</h2>
                <p className="small">
                  <span className="mono">{a.reference}</span> · diajukan {fmtDateTime(a.createdAt)}
                </p>
              </div>
              <span className={`pill pill--${st.tone}`}>{st.label}</span>
            </div>
            <Facts a={a} />
            {a.status === 'pending' ? (
              <>
                <details className="decide">
                  <summary>Setujui pendaftaran…</summary>
                  <ApproveForm
                    rootDomain={PLATFORM_ROOT_DOMAIN}
                    d={{
                      applicationId: a.id,
                      slug: suggestSlug(a.shortName ?? '', a.schoolName, a.city),
                      name: a.schoolName,
                      timezone: a.timezone || 'Asia/Jakarta',
                      domain: a.domain ?? '',
                      package: a.package ?? (a.wantApp ? 'lengkap' : 'gratis'),
                    }}
                  />
                </details>
                <details className="decide">
                  <summary>Tolak pendaftaran…</summary>
                  <form className="f" action={rejectApplication}>
                    <input type="hidden" name="applicationId" value={a.id} />
                    <label className="fld">
                      <span>Alasan penolakan *</span>
                      <textarea name="decisionNote" required maxLength={1000} placeholder="mis. Data sekolah tidak dapat diverifikasi (NPSN tidak ditemukan)." />
                    </label>
                    <div className="actions">
                      <button className="btn btn--bad" type="submit">
                        Tolak pendaftaran
                      </button>
                    </div>
                  </form>
                </details>
              </>
            ) : a.status === 'approved' && a.tenant ? (
              <p className="small">
                <Link href={`/platform/sekolah#sekolah-${typeof a.tenant === 'number' ? a.tenant : a.tenant.id}`}>Lihat sekolah →</Link>
              </p>
            ) : null}
          </article>
        )
      })}
    </>
  )
}
