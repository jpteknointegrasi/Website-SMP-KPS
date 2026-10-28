/** Website sections fed by the school's Satu Sekolah App (public, consented content only). Render nothing without it. */
import { portalAdmissions, portalPublic } from '@/lib/portal'
import { formatDate } from '@/lib/format'

const KIND: Record<string, string> = { ujian: 'Asesmen', libur: 'Libur', kegiatan: 'Kegiatan', rapat: 'Rapat' }
const LEVEL: Record<string, string> = { sekolah: 'Sekolah', kota: 'Kota/Kabupaten', provinsi: 'Provinsi', nasional: 'Nasional', internasional: 'Internasional' }
const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`

export async function AppCalendar() {
  const p = await portalPublic()
  const today = new Date().toISOString().slice(0, 10)
  const list = (p?.events ?? []).filter((e) => e.endDate >= today).slice(0, 10)
  if (!list.length) return null
  return (
    <div className="block">
      <h2 className="agenda-month">Kalender akademik</h2>
      <ul className="list-rows">
        {list.map((e, i) => (
          <li key={i}>
            <div className="row-link">
              <span className="row-meta">
                {formatDate(e.startDate)}
                {e.endDate !== e.startDate ? ` – ${formatDate(e.endDate)}` : ''} · {KIND[e.kind] ?? e.kind}
              </span>
              <strong>{e.title}</strong>
              {e.description ? <span>{e.description}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function AppAchievements() {
  const p = await portalPublic()
  if (!p?.achievements.length) return null
  return (
    <div className="block" style={{ marginTop: 40 }}>
      <h2 className="h2">Prestasi terbaru siswa</h2>
      <p className="muted">Diverifikasi sekolah dan ditampilkan dengan persetujuan siswa/orang tua.</p>
      <ul className="list-rows">
        {p.achievements.map((a, i) => (
          <li key={i}>
            <div className="row-link">
              <span className="row-meta">{[formatDate(a.date), LEVEL[a.level] ?? a.level, a.rank].filter(Boolean).join(' · ')}</span>
              <strong>{a.title}</strong>
              <span>{a.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function AppAlumniStories() {
  const p = await portalPublic()
  if (!p?.alumni.length) return null
  return (
    <>
      <h2 className="h2">Kabar alumni</h2>
      <ul className="cards" style={{ marginBottom: 40 }}>
        {p.alumni.map((a, i) => (
          <li key={i}>
            <figure className="quote-card">
              <blockquote>“{a.story}”</blockquote>
              <figcaption>
                <span>
                  <strong>{a.name}</strong>
                  <small>
                    Lulus {a.year}
                    {a.continuingTo ? ` · ${a.continuingTo}` : ''}
                  </small>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Paths and registration fees from the App's admission cycle (the official process when the App is used). */
export async function AppAdmissionPaths() {
  const a = await portalAdmissions()
  const c = a?.cycles[0]
  if (!c || !c.paths.length) return null
  return (
    <div className="block">
      <h2 className="h2">Jalur pendaftaran {c.targetYear}</h2>
      <ul className="list-rows">
        {c.paths.map((p) => (
          <li key={p.name}>
            <div className="row-link">
              <strong>{p.name}</strong>
              <span>{p.registrationFee ? `Biaya pendaftaran ${rupiah(p.registrationFee)}` : 'Tanpa biaya pendaftaran'}</span>
            </div>
          </li>
        ))}
      </ul>
      {c.openAt || c.closeAt ? (
        <p className="muted">
          Pendaftaran {c.openAt ? `dibuka ${formatDate(c.openAt)}` : ''}
          {c.closeAt ? ` dan ditutup ${formatDate(c.closeAt)}` : ''}.
        </p>
      ) : null}
    </div>
  )
}
