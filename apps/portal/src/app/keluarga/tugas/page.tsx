import Link from 'next/link'
import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { tasksForStudent } from '@/modules/learning/service'
import { fmtDateTime } from '@/server/time'
import { TASK_STATE_TONE } from '@/ui/tones'
import { ChildPicker } from '@/ui/child-picker'
import { Card, Empty, Flash, Notice, PageHead, sp1, Stat, Status, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Tugas & nilai' }

/** SIS-02 / WLI-01: tasks of the current class with personal status, scores and feedback. */
export default async function FamilyTasks({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/tugas', 'akademik')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const rows = current?.canViewAcademic ? await tasksForStudent(ctx, current.studentId) : []
  const view = sp1(sp, 'lihat') ?? 'aktif'
  const shown = rows.filter((r) => (view === 'aktif' ? ['belum', 'terlambat', 'revisi'].includes(r.state) : view === 'selesai' ? ['terkumpul', 'dinilai', 'di_kelas'].includes(r.state) : true))
  const q = (v: string) => `/keluarga/tugas?lihat=${v}${current ? `&anak=${current.studentId}` : ''}`
  return (
    <>
      <PageHead title="Tugas & nilai" sub={current ? current.name : undefined} />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/tugas" />
      {current && !current.canViewAcademic ? <Notice tone="info">Akses akademik untuk anak ini tidak diberikan pada akun Anda.</Notice> : null}
      {current?.canViewAcademic ? (
        <>
          <div className="grid grid--3" style={{ marginBottom: 18 }}>
            <Stat icon="clipboard" tone={rows.some((r) => r.state === 'belum') ? 'warn' : 'ok'} label="Belum dikumpulkan" value={rows.filter((r) => r.state === 'belum').length} />
            <Stat icon="alert" tone={rows.some((r) => r.state === 'terlambat' || r.state === 'revisi') ? 'bad' : undefined} label="Terlambat / perlu revisi" value={rows.filter((r) => r.state === 'terlambat' || r.state === 'revisi').length} />
            <Stat icon="checkCircle" tone="ok" label="Sudah dinilai" value={rows.filter((r) => r.state === 'dinilai').length} />
          </div>
          {!current.self ? <p className="small muted">Pengumpulan tugas dilakukan siswa dari akunnya sendiri. Orang tua dapat memantau status dan umpan balik guru.</p> : null}
          <Tabs
            current={q(view)}
            items={[
              ['Perlu dikerjakan', q('aktif')],
              ['Selesai', q('selesai')],
              ['Semua', q('semua')],
            ]}
          />
          <Card flush>
            {shown.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Tugas</th>
                      <th>Tenggat</th>
                      <th>Status</th>
                      <th className="num">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.t.id}>
                        <td>
                          <Link href={`/keluarga/tugas/${r.t.id}?anak=${current.studentId}`}>
                            <strong>{r.t.title}</strong>
                          </Link>
                          <div className="small muted">{r.subject}</div>
                        </td>
                        <td className="nowrap">{r.t.dueAt ? fmtDateTime(r.t.dueAt, ctx.tz) : '—'}</td>
                        <td>
                          <Status value={r.state} map={TASK_STATE_TONE} />
                        </td>
                        <td className="num">{r.review?.score !== null && r.review?.score !== undefined ? `${Number(r.review.score)}/${r.t.maxScore}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="checkCircle">{view === 'aktif' ? 'Tidak ada tugas yang perlu dikerjakan.' : 'Belum ada tugas.'}</Empty>
            )}
          </Card>
        </>
      ) : null}
    </>
  )
}
