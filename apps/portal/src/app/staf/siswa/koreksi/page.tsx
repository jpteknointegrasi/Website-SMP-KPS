import Link from 'next/link'
import { staffPage } from '@/server/request'
import { listCorrections } from '@/modules/students/service'
import { FIELD } from '@/modules/students/fields'
import { fmtDateTime } from '@/server/time'
import { CORRECTION_TONE } from '@/ui/tones'
import { Card, Empty, Flash, PageHead, sp1, Status, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Koreksi data siswa' }

export default async function Corrections({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/siswa/koreksi', ['students.review', 'students.write'], 'buku_induk')
  const sp = await searchParams
  const st = sp1(sp, 'status') ?? ''
  const rows = await listCorrections(ctx, st || undefined)
  return (
    <>
      <PageHead title="Usulan koreksi data siswa" sub="Tinjau dan tindak lanjuti usulan perubahan data Buku Induk." crumbs={[['Administrasi siswa', '/staf/siswa'], ['Koreksi data']]} />
      <Flash sp={sp} />
      <Tabs
        current={`/staf/siswa/koreksi${st ? `?status=${st}` : ''}`}
        items={[
          ['Menunggu', '/staf/siswa/koreksi'],
          ['Disetujui', '/staf/siswa/koreksi?status=approved'],
          ['Ditolak', '/staf/siswa/koreksi?status=rejected'],
        ]}
      />
      <Card flush>
        {rows.length ? (
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Siswa</th>
                  <th>Data yang diubah</th>
                  <th>Diajukan oleh</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, name, nis }) => (
                  <tr key={c.id}>
                    <td className="mono">{c.number}</td>
                    <td>
                      {name} <span className="muted small">{nis ?? ''}</span>
                    </td>
                    <td>{c.changes.map((x) => FIELD[x.field]?.label ?? x.field).join(', ')}</td>
                    <td>
                      {c.requestedByName} <span className="muted small">({c.requestedByType === 'staff' ? 'staf' : 'keluarga'})</span>
                    </td>
                    <td>{fmtDateTime(c.createdAt, ctx.tz)}</td>
                    <td>
                      <Status value={c.status} map={CORRECTION_TONE} />
                    </td>
                    <td className="actions">
                      <Link className="btn btn--ghost btn--sm" href={`/staf/siswa/koreksi/${c.id}`}>
                        Tinjau
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="checkCircle">Tidak ada usulan koreksi.</Empty>
        )}
      </Card>
    </>
  )
}
