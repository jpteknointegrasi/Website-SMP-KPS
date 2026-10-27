import Link from 'next/link'
import { requireOperator } from '@/platform/session'
import { listApplications, listSchools, statsOf } from '@/platform/data'
import { LEVEL_LABEL, SCHOOL_STATUS, fmtDate, fmtDateTime, planLabel } from '@/platform/labels'

export const metadata = { title: 'Dasbor platform' }

export default async function PlatformHome() {
  await requireOperator()
  const [schools, pending] = await Promise.all([listSchools(), listApplications('pending')])
  const s = statsOf(schools, pending.length)
  return (
    <>
      <div className="head">
        <div>
          <h1>Satu platform, banyak sekolah</h1>
          <p>Terima pendaftaran sekolah baru, siapkan sekolahnya, dan pantau langganan. Super Admin tidak membuka data pribadi siswa atau keluarga sekolah mana pun.</p>
        </div>
        <a className="btn btn--ghost" href="/daftar-sekolah" target="_blank" rel="noopener">
          Formulir pendaftaran ↗
        </a>
      </div>

      <div className="stats">
        <div className={`stat${s.pending ? ' stat--warn' : ''}`}>
          <span>Menunggu tinjauan</span>
          <strong>{s.pending}</strong>
          <small>pendaftaran sekolah</small>
        </div>
        <div className="stat">
          <span>Sekolah</span>
          <strong>{s.schools}</strong>
          <small>
            {s.active} aktif · {s.trial} uji coba{s.suspended ? ` · ${s.suspended} ditangguhkan` : ''}
          </small>
        </div>
        <div className="stat">
          <span>Sekolahku Web</span>
          <strong>{s.web}</strong>
          <small>sekolah berlangganan</small>
        </div>
        <div className="stat">
          <span>Sekolahku App</span>
          <strong>{s.app}</strong>
          <small>sekolah berlangganan</small>
        </div>
        <div className="stat">
          <span>Akun staf</span>
          <strong>{s.staff}</strong>
          <small>aktif di semua sekolah</small>
        </div>
      </div>

      <div className="grid2">
        <section className="card" aria-labelledby="antrean">
          <h2 id="antrean">
            Pendaftaran menunggu <Link href="/platform/pendaftaran">Buka antrean →</Link>
          </h2>
          {pending.length ? (
            <ul className="list">
              {pending.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.schoolName}</strong>
                    <br />
                    <span className="small muted">
                      {[a.level ? LEVEL_LABEL[a.level] : null, `${a.city}, ${a.province}`, a.adminName].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="small muted nowrap">{fmtDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Semua pendaftaran sudah ditinjau.</p>
          )}
        </section>

        <section className="card" aria-labelledby="sekolah">
          <h2 id="sekolah">
            Sekolah di platform <Link href="/platform/sekolah">Lihat semua →</Link>
          </h2>
          {schools.length ? (
            <ul className="list">
              {schools.slice(0, 8).map((sc) => (
                <li key={sc.id}>
                  <span>
                    <strong>{sc.name}</strong>
                    <br />
                    <span className="small muted">
                      {sc.primaryDomain ?? 'belum ada domain'} · sejak {fmtDate(sc.createdAt)}
                    </span>
                  </span>
                  <span className="actions small">
                    <span className={`pill pill--${SCHOOL_STATUS[sc.status]?.tone}`}>{SCHOOL_STATUS[sc.status]?.label}</span>
                    <span className={`pill pill--${sc.web.on ? 'info' : 'muted'}`}>Web {sc.web.plan === 'none' ? '—' : planLabel(sc.web.plan)}</span>
                    <span className={`pill pill--${sc.app.on ? 'info' : 'muted'}`}>App {sc.app.plan === 'none' ? '—' : planLabel(sc.app.plan)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Belum ada sekolah.</p>
          )}
        </section>
      </div>

      <div className="note note--info">
        <b>Batas peran Super Admin.</b> Super Admin menyetujui sekolah, membuat akun Admin Teknis pertama, dan mengatur langganan. Akun staf lain dan perannya diatur Admin Teknis masing-masing sekolah. Semua tindakan tercatat di Audit.
      </div>
    </>
  )
}
