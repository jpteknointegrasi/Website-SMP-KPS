import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { OUTCOMES, visitsForFamily } from '@/modules/health/service'
import { fmtDateTime } from '@/server/time'
import { ChildPicker } from '@/ui/child-picker'
import { Badge, Card, Empty, Flash, PageHead, sp1, type SP } from '@/ui/kit'

export const metadata = { title: 'Kesehatan (UKS)' }

export default async function FamilyHealth({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/uks', 'uks')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const rows = current ? await visitsForFamily(ctx, current.studentId) : []
  return (
    <>
      <PageHead title="Kunjungan UKS" sub="Pemberitahuan kunjungan ke UKS sekolah. Rincian medis disimpan terbatas oleh petugas UKS." />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/uks" />
      <Card>
        {rows.length ? (
          <ul className="list">
            {rows.map((r) => (
              <li key={r.id} style={{ alignItems: 'flex-start' }}>
                <span className="grow">
                  <strong>{fmtDateTime(r.at, ctx.tz)}</strong>
                  {r.familyNote ? <div className="small">{r.familyNote}</div> : null}
                </span>
                <Badge tone={r.outcome === 'kembali_kelas' ? 'ok' : 'warn'}>{OUTCOMES[r.outcome as keyof typeof OUTCOMES]}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="medical">Tidak ada pemberitahuan kunjungan UKS.</Empty>
        )}
      </Card>
    </>
  )
}
