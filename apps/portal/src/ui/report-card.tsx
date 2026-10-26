/** A4 report card rendered from a frozen snapshot (RPT-01). No ranking is shown — by design. */
import type { ReportSnapshot } from '@/db/schema'
import { fmtDate } from '@/server/time'
import { P } from './kit'

const PROM: Record<string, string> = { naik: 'Naik ke kelas berikutnya', tinggal: 'Tinggal di kelas yang sama', lulus: 'LULUS' }

export function ReportDoc({ s, logo, version, date, draft }: { s: ReportSnapshot; logo: string | null; version?: number; date?: string | null; draft?: boolean }) {
  return (
    <article className="doc">
      {draft ? <div className="doc__draft">DRAF</div> : null}
      <header className="doc__head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo ?? `${P}/icon.svg`} alt="" />
        <div>
          <strong>{s.school.name.toUpperCase()}</strong>
          {s.school.city ? <span>{s.school.city.toUpperCase()}</span> : null}
          <small>{s.school.address || '[Alamat sekolah]'}</small>
        </div>
      </header>
      <h2 className="doc__title">LAPORAN HASIL BELAJAR</h2>
      <table className="doc__kv" style={{ width: '100%', margin: '8px 0 12px', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <th style={{ width: '17%' }}>Nama</th>
            <td>{s.student.name}</td>
            <th style={{ width: '17%', paddingLeft: 16 }}>Kelas</th>
            <td>{s.homeroom}</td>
          </tr>
          <tr>
            <th>NIS / NISN</th>
            <td>
              {s.student.nis ?? '—'} / {s.student.nisn ?? '—'}
            </td>
            <th style={{ paddingLeft: 16 }}>Semester</th>
            <td>{s.term}</td>
          </tr>
          <tr>
            <th>Sekolah</th>
            <td>{s.school.name}</td>
            <th style={{ paddingLeft: 16 }}>Tahun ajaran</th>
            <td>{s.year}</td>
          </tr>
        </tbody>
      </table>
      <h3 className="doc__h">A. Nilai & capaian kompetensi</h3>
      <table className="doc__grid">
        <thead>
          <tr>
            <th style={{ width: 28 }}>No</th>
            <th style={{ width: '26%' }}>Mata pelajaran</th>
            <th style={{ width: 56 }}>Nilai</th>
            <th>Capaian kompetensi</th>
          </tr>
        </thead>
        <tbody>
          {s.subjects.map((x, i) => (
            <tr key={x.code}>
              <td className="center">{i + 1}</td>
              <td>{x.name}</td>
              <td className="center">{x.score ?? '—'}</td>
              <td>{x.description ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="doc__h">B. Ekstrakurikuler</h3>
      <table className="doc__grid">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Kegiatan</th>
            <th style={{ width: 110 }}>Predikat</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {s.activities.length ? (
            s.activities.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.predicate ?? '—'}</td>
                <td>{a.description ?? '—'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>—</td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 className="doc__h">C. Prestasi</h3>
          <table className="doc__grid">
            <tbody>
              {s.achievements.length ? (
                s.achievements.map((a, i) => (
                  <tr key={i}>
                    <td>
                      {a.title} ({a.level}
                      {a.rank ? `, ${a.rank}` : ''})
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ width: '38%' }}>
          <h3 className="doc__h">D. Ketidakhadiran</h3>
          <table className="doc__grid">
            <tbody>
              <tr>
                <td>Sakit</td>
                <td className="center">{s.attendance.S} hari</td>
              </tr>
              <tr>
                <td>Izin</td>
                <td className="center">{s.attendance.I} hari</td>
              </tr>
              <tr>
                <td>Tanpa keterangan</td>
                <td className="center">{s.attendance.A} hari</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <h3 className="doc__h">E. Catatan wali kelas</h3>
      <div style={{ border: '1px solid #999', padding: '6px 8px', minHeight: 40 }}>{s.notes ?? '—'}</div>
      {s.promotion ? (
        <p style={{ marginTop: 10 }}>
          <strong>Keputusan:</strong> {PROM[s.promotion] ?? s.promotion}
        </p>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 12 }}>
        <div>
          Orang tua/wali
          <div style={{ height: 56 }} />
          (………………………)
        </div>
        <div>
          Wali kelas
          <div style={{ height: 56 }} />
          <strong>{s.homeroomTeacher ?? '(………………………)'}</strong>
        </div>
        <div>
          {s.school.city || '…………'}, {date ? fmtDate(date) : '……………'}
          <br />
          Kepala Sekolah
          <div style={{ height: 40 }} />
          <strong>{s.school.principal || '(………………………)'}</strong>
          {s.school.principalNip ? <div>NIP {s.school.principalNip}</div> : null}
        </div>
      </div>
      <p className="doc__foot">
        Rapor {s.term} {s.year} · {s.student.name}
        {version ? ` · versi ${version}` : ''} · dibuat dari portal sekolah
      </p>
    </article>
  )
}
