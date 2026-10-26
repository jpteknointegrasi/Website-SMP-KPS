import Link from 'next/link'
import { staffPage } from '@/server/request'
import { dashboardStats } from '@/modules/students/service'
import { staffQueues } from '@/modules/queues'
import '@/modules/register'
import { Icon } from '@/ui/icons'
import { Card, Empty, Flash, LinkBtn, PageHead, Stat, type SP } from '@/ui/kit'
import { hasPerm } from '@/server/context'

export const metadata = { title: 'Administrasi siswa' }

/** OPS-01 Dashboard TU — figures are computed from the Buku Induk, never typed in. */
export default async function TuDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/siswa', ['students.read'], 'buku_induk')
  const sp = await searchParams
  const s = await dashboardStats(ctx)
  const queues = (await staffQueues(ctx)).filter((q) => q.href.startsWith('/staf/siswa') || q.href.startsWith('/staf/kartu'))
  const pct = s.total ? Math.round((s.active / s.total) * 1000) / 10 : 0
  return (
    <>
      <PageHead
        title="Dashboard Administrasi Siswa"
        sub="Ringkasan data siswa dari Buku Induk."
        actions={
          <>
            {hasPerm(ctx, 'students.write') ? <LinkBtn href="/staf/siswa/baru" icon="plus">Tambah siswa</LinkBtn> : null}
            {hasPerm(ctx, 'students.import') ? <LinkBtn href="/staf/siswa/impor" tone="ghost" icon="upload">Impor Excel</LinkBtn> : null}
          </>
        }
      />
      <Flash sp={sp} />
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Stat icon="users" label="Total siswa" value={s.total.toLocaleString('id-ID')} note="Seluruh status" href="/staf/siswa/daftar?status=" />
        <Stat icon="user" tone="ok" label="Siswa aktif" value={s.active.toLocaleString('id-ID')} note={`${pct.toLocaleString('id-ID')}% dari total`} href="/staf/siswa/daftar" />
        <Stat icon="alert" tone="warn" label="Perlu verifikasi" value={s.unverified} note={`${s.incomplete} data belum lengkap`} href="/staf/siswa/daftar?kelengkapan=unverified" />
        <Stat icon="edit" tone="bad" label="Usulan koreksi" value={s.corrections} note="Menunggu keputusan" href="/staf/siswa/koreksi" />
      </div>
      <div className="grid grid--2">
        <Card title="Antrean tindakan">
          {queues.length ? (
            <ul className="list">
              {queues.map((q) => (
                <li key={q.label}>
                  <span className={`b b--${q.tone ?? 'info'}`}>
                    <Icon name={q.icon} />
                  </span>
                  <Link className="grow" href={q.href}>
                    {q.label}
                  </Link>
                  <strong>{q.count}</strong>
                </li>
              ))}
              {s.incomplete ? (
                <li>
                  <span className="b b--warn">
                    <Icon name="file" />
                  </span>
                  <Link className="grow" href="/staf/siswa/daftar?kelengkapan=incomplete">
                    Data belum lengkap
                  </Link>
                  <strong>{s.incomplete}</strong>
                </li>
              ) : null}
            </ul>
          ) : (
            <Empty icon="checkCircle">Tidak ada antrean.</Empty>
          )}
        </Card>
        <Card title="Jumlah siswa per tingkat" actions={<Link href="/staf/akademik">Data rombel</Link>}>
          {s.perLevel.length ? (
            <table className="t">
              <thead>
                <tr>
                  <th>Tingkat</th>
                  <th className="num">Siswa</th>
                  <th className="num">Rombel</th>
                </tr>
              </thead>
              <tbody>
                {s.perLevel.map((l) => (
                  <tr key={l.grade}>
                    <td>Kelas {l.grade}</td>
                    <td className="num">{l.students}</td>
                    <td className="num">{l.homerooms}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td className="num">
                    <strong>{s.perLevel.reduce((a, l) => a + l.students, 0)}</strong>
                  </td>
                  <td className="num">
                    <strong>{s.perLevel.reduce((a, l) => a + l.homerooms, 0)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <Empty>Belum ada siswa yang ditempatkan di rombel tahun ajaran aktif.</Empty>
          )}
        </Card>
      </div>
    </>
  )
}
