import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { EXPORTS, overview } from '@/modules/dashboard/service'
import { fmtDate } from '@/server/time'
import { APP_TONE } from '@/ui/tones'
import { Card, Empty, Field, Flash, P, PageHead, Progress, rupiah, Select, Stat, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Dashboard pimpinan' }

const CARD: Record<string, string> = { draft: 'Draf', submitted: 'Menunggu persetujuan', approved: 'Disetujui', released: 'Dirilis' }

/** DSH-01: aggregated indicators for school leadership; purpose-bound exports. No personal lists. */
export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/dashboard', ['dashboard.view'])
  const sp = await searchParams
  const o = await overview(ctx)
  const totalCards = o.reports.reduce((a, r) => a + r.n, 0)
  return (
    <>
      <PageHead title="Dashboard pimpinan" sub="Ringkasan agregat — tanpa daftar nama. Rincian ada di modul masing-masing sesuai hak akses." />
      <Flash sp={sp} />
      <div className="grid grid--4" style={{ marginBottom: 16 }}>
        <Stat icon="users" label="Siswa aktif" value={o.students} />
        <Stat icon="checkCircle" tone={o.attendance.rate !== null && o.attendance.rate < 90 ? 'warn' : 'ok'} label="Kehadiran 30 hari" value={o.attendance.rate === null ? '—' : `${o.attendance.rate}%`} />
        <Stat icon="inbox" tone={o.services.late ? 'warn' : undefined} label="Layanan TU terbuka" value={`${o.services.n}${o.services.late ? ` (${o.services.late} lewat)` : ''}`} />
        <Stat icon="wallet" label="Tagihan belum terbayar" value={rupiah(o.finance.outstanding)} />
      </div>
      <div className="grid grid--2">
        <Card title="Siswa per tingkat">
          {o.byGrade.length ? (
            <table className="t">
              <thead>
                <tr>
                  <th>Tingkat</th>
                  <th className="num">L</th>
                  <th className="num">P</th>
                  <th className="num">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {o.byGrade.map((g) => (
                  <tr key={g.grade}>
                    <td>Kelas {g.grade}</td>
                    <td className="num">{g.l}</td>
                    <td className="num">{g.p}</td>
                    <td className="num">
                      <strong>{g.n}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty icon="users">Belum ada data.</Empty>
          )}
        </Card>
        <Card title={`Kehadiran per rombel (${fmtDate(o.attendance.from, undefined, true)} – ${fmtDate(o.attendance.to, undefined, true)})`}>
          {o.attendance.byHomeroom.length ? (
            <ul className="list">
              {o.attendance.byHomeroom.map((h) => {
                const rate = h.total ? Math.round((h.present / h.total) * 1000) / 10 : 0
                return (
                  <li key={h.homeroom}>
                    <span style={{ minWidth: 70 }}>{h.homeroom}</span>
                    <span className="grow">
                      <Progress value={rate} ok={rate >= 95} />
                    </span>
                    <span className="small nowrap">
                      {rate}% · alpa {h.absent}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty icon="checkCircle">Belum ada presensi.</Empty>
          )}
        </Card>
        <Card title={`Rapor ${o.term ? `semester ${o.term.name}` : ''}`}>
          {totalCards ? (
            <ul className="list">
              {o.reports.map((r) => (
                <li key={r.status}>
                  <span className="grow">{CARD[r.status] ?? r.status}</span>
                  <strong>{r.n}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Belum ada rapor diajukan.</p>
          )}
        </Card>
        <Card title="Penerimaan siswa baru">
          {o.ppdb.length ? (
            <ul className="list">
              {o.ppdb.map((r) => (
                <li key={r.status}>
                  <span className="grow">{APP_TONE[r.status]?.[0] ?? r.status}</span>
                  <strong>{r.n}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Tidak ada periode penerimaan berjalan.</p>
          )}
        </Card>
        <Card title="Pembelajaran & layanan (30 hari)">
          <ul className="list">
            <li>
              <span className="grow">Tugas diterbitkan</span>
              <strong>{o.learning.tasks}</strong>
            </li>
            <li>
              <span className="grow">Pengumpulan tugas</span>
              <strong>{o.learning.submissions}</strong>
            </li>
            <li>
              <span className="grow">Permintaan BK baru (jumlah saja)</span>
              <strong>{o.counseling.month}</strong>
            </li>
            <li>
              <span className="grow">Kasus BK berjalan</span>
              <strong>{o.counseling.open}</strong>
            </li>
            <li>
              <span className="grow">Pembayaran terverifikasi (total)</span>
              <strong>{rupiah(o.finance.paid)}</strong>
            </li>
          </ul>
        </Card>
        <Card title="Keterbacaan pengumuman terbaru">
          {o.announcements.length ? (
            <ul className="list">
              {o.announcements.map((a, i) => (
                <li key={i}>
                  <span className="grow small">{a.title}</span>
                  <span style={{ width: 120 }}>
                    <Progress value={a.total ? Math.round((a.read / a.total) * 100) : 0} />
                  </span>
                  <span className="small nowrap">
                    {a.read}/{a.total}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Belum ada pengumuman.</p>
          )}
        </Card>
      </div>
      {hasPerm(ctx, 'exports') ? (
        <>
          <div style={{ height: 16 }} />
          <Card title="Ekspor data (tujuan terbatas)">
            <form method="post" action={`${P}/api/ekspor`} className="f">
              <input type="hidden" name="_kembali" value="/staf/dashboard" />
              <div className="f__row">
                <Select name="jenis" label="Data" options={Object.entries(EXPORTS)} />
                <Field name="tujuan" label="Tujuan penggunaan" placeholder="Contoh: pelaporan Dapodik semester ganjil" required />
              </div>
              <div className="f__row">
                <Field name="dari" label="Dari (presensi)" type="date" />
                <Field name="sampai" label="Sampai (presensi)" type="date" />
              </div>
              <div>
                <Submit icon="download" tone="ghost">
                  Unduh CSV
                </Submit>
              </div>
              <p className="small muted">Setiap ekspor tercatat di audit bersama tujuannya. Simpan berkas hanya selama diperlukan.</p>
            </form>
          </Card>
        </>
      ) : null}
    </>
  )
}
