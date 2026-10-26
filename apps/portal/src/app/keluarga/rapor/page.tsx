import Link from 'next/link'
import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { releasedReports } from '@/modules/reports/service'
import { fmtDateTime } from '@/server/time'
import { ChildPicker } from '@/ui/child-picker'
import { Badge, Card, Empty, Flash, Notice, PageHead, sp1, type SP } from '@/ui/kit'

export const metadata = { title: 'Rapor' }

/** RPT-02: released report cards of the selected student (latest version per term, older versions listed). */
export default async function FamilyReports({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/rapor', 'nilai_rapor')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const r = current?.canViewAcademic ? await releasedReports(ctx, current.studentId) : null
  return (
    <>
      <PageHead title="Rapor" sub={current?.name} />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/rapor" />
      {current && !current.canViewAcademic ? <Notice tone="info">Akses akademik untuk anak ini tidak diberikan pada akun Anda.</Notice> : null}
      {r ? (
        <Card flush>
          {r.latest.length ? (
            <ul className="list" style={{ padding: '4px 20px' }}>
              {r.latest.map(({ v, term }) => {
                const older = r.all.filter((x) => x.c.id === v.reportCardId && x.v.id !== v.id)
                return (
                  <li key={v.id} style={{ alignItems: 'flex-start' }}>
                    <Link className="grow" href={`/keluarga/rapor/${v.id}`}>
                      <strong>
                        Semester {term} {v.snapshot.year}
                      </strong>
                      <div className="small muted">
                        {v.snapshot.homeroom} · dirilis {fmtDateTime(v.createdAt, ctx.tz)}
                        {v.versionNo > 1 ? ` · versi ${v.versionNo} (diperbarui)` : ''}
                      </div>
                      {older.length ? <div className="small muted">Versi sebelumnya: {older.map((o) => `v${o.v.versionNo}`).join(', ')}</div> : null}
                    </Link>
                    <Badge tone="ok">Lihat & cetak</Badge>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty icon="file">Belum ada rapor yang dirilis.</Empty>
          )}
        </Card>
      ) : null}
    </>
  )
}
