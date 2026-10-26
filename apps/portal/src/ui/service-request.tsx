/** Service request views shared by staff and family pages: summary, timeline, and the printable active-student letter. */
import type { activeLetter, requestView } from '@/modules/services/service'
import type { Branding } from '@/server/settings'
import { fmtDate, fmtDateTime } from '@/server/time'
import { SERVICE_TONE } from './tones'
import { Card, fileUrl, P, publicFileUrl, Status } from './kit'

type View = Awaited<ReturnType<typeof requestView>>

const ACTION_LABEL: Record<string, string> = { submitted: 'Permohonan diajukan', assigned: 'Diproses petugas', needs_info: 'Petugas meminta informasi', info_added: 'Informasi ditambahkan', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan', note: 'Catatan internal' }

export function RequestSummary({ v, tz }: { v: View; tz: string }) {
  const r = v.r
  return (
    <Card title={v.type.name} actions={<Status value={r.status} map={SERVICE_TONE} />}>
      <table className="doc__kv" style={{ width: '100%' }}>
        <tbody>
          <tr>
            <th>Nomor</th>
            <td className="mono">{r.number}</td>
          </tr>
          <tr>
            <th>Siswa</th>
            <td>{v.student ? `${v.student}${v.nis ? ` (NIS ${v.nis})` : ''}` : '—'}</td>
          </tr>
          <tr>
            <th>Pemohon</th>
            <td>{r.requesterName ?? '—'}</td>
          </tr>
          <tr>
            <th>Diajukan</th>
            <td>{fmtDateTime(r.createdAt, tz)}</td>
          </tr>
          <tr>
            <th>Target selesai</th>
            <td>{r.dueAt ? fmtDate(r.dueAt, tz) : '—'}</td>
          </tr>
          {v.type.questions.map((q) => (
            <tr key={q.key}>
              <th>{q.label}</th>
              <td>{r.answers[q.key] || '—'}</td>
            </tr>
          ))}
          {r.outputNo ? (
            <tr>
              <th>Nomor dokumen</th>
              <td>{r.outputNo}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  )
}

export function RequestTimeline({ v, tz }: { v: View; tz: string }) {
  return (
    <Card title="Riwayat">
      <ul className="timeline">
        {v.events.map((e) => (
          <li key={e.id} className={e.action === 'completed' ? 'ok' : e.action === 'needs_info' || e.internal ? 'warn' : undefined}>
            <time>{fmtDateTime(e.at, tz)}</time>
            <strong>{ACTION_LABEL[e.action] ?? e.action}</strong>
            {e.internal ? <span className="small muted"> (tidak terlihat pemohon)</span> : null}
            <div className="small muted">{e.actorName}</div>
            {e.note ? <div className="small">{e.note}</div> : null}
            {e.fileId ? (
              <a className="small" href={fileUrl(e.fileId)!} target="_blank" rel="noopener">
                Lihat berkas
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** A4 "Surat Keterangan Aktif" generated from the student register at completion time. */
export function ActiveLetter({ d, b, schoolName }: { d: Awaited<ReturnType<typeof activeLetter>>; b: Branding; schoolName: string }) {
  const logo = publicFileUrl(b.logoFileId) ?? `${P}/icon.svg`
  const name = b.shortName || schoolName
  return (
    <article className="doc">
      <header className="doc__head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" />
        <div>
          <strong>{name.toUpperCase()}</strong>
          {b.city ? <span>{b.city.toUpperCase()}</span> : null}
          <small>{b.address || '[Alamat sekolah]'}</small>
          <small>{[b.phone, b.email].filter(Boolean).join(' · ') || '[Kontak sekolah]'}</small>
        </div>
      </header>
      <h2 className="doc__title" style={{ textDecoration: 'underline' }}>
        SURAT KETERANGAN AKTIF
      </h2>
      <p className="doc__sub">Nomor: {d.r.outputNo || d.r.number}</p>
      <p style={{ marginTop: 18 }}>Yang bertanda tangan di bawah ini, Kepala {name}, menerangkan bahwa:</p>
      <table className="doc__kv" style={{ margin: '10px 0 10px 20px', width: 'calc(100% - 20px)' }}>
        <tbody>
          {[
            ['Nama', d.student.name],
            ['NIS / NISN', `${d.student.nis ?? '—'} / ${d.student.nisn ?? '—'}`],
            ['Tempat, tanggal lahir', `${d.student.birthPlace ?? '—'}, ${fmtDate(d.student.birthDate)}`],
            ['Kelas', d.homeroom ?? '—'],
            ['Tahun ajaran', d.year ?? '—'],
          ].map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        adalah benar siswa {name} yang {d.student.status === 'active' ? 'masih aktif mengikuti kegiatan belajar' : 'tercatat'} pada tahun ajaran {d.year ?? '—'}.
      </p>
      <p>Surat keterangan ini dibuat untuk keperluan: {d.r.answers.keperluan || d.r.purpose || '—'}.</p>
      <p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
      <footer className="doc__sign">
        <div>
          {b.city || '…………'}, {fmtDate(d.date)}
          <br />
          Kepala Sekolah
          <div style={{ height: 72 }} />
          <strong>{b.principalName || '(………………………)'}</strong>
          {b.principalNip ? <div>NIP {b.principalNip}</div> : null}
        </div>
      </footer>
      <p className="doc__foot">
        Dokumen dibuat sistem portal {schoolName} dari permohonan {d.r.number}. Sah setelah ditandatangani dan dicap sekolah.
      </p>
    </article>
  )
}
