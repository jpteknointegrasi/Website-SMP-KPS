import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { academicYears, gradeLevels, homerooms } from '@/db/schema'
import { staffPage } from '@/server/request'
import { listPromotionRuns, promotionRun } from '@/modules/academic/promotion'
import { fmtDate, fmtDateTime } from '@/server/time'
import { ActionForm, Badge, Card, Empty, Field, Flash, Notice, PageHead, Select, sp1, Stat, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Kenaikan kelas' }

const DEC: Record<string, string> = { naik: 'Naik', tinggal: 'Tinggal', lulus: 'Lulus', keluar: 'Keluar' }

/** Year rollover: draft from report decisions, adjust per student, execute once into the next school year. */
export default async function Promotion({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/akademik/kenaikan', ['academic.manage'])
  const sp = await searchParams
  const years = await ctx.db.select().from(academicYears).orderBy(asc(academicYears.startDate))
  const runs = await listPromotionRuns(ctx)
  const runId = sp1(sp, 'run') ?? runs.find((r) => r.status === 'draft')?.id
  const run = runId ? await promotionRun(ctx, runId) : null
  const targets = run ? await ctx.db.select({ h: homerooms, g: gradeLevels }).from(homerooms).innerJoin(gradeLevels, eq(gradeLevels.id, homerooms.gradeLevelId)).where(eq(homerooms.yearId, run.toYearId)).orderBy(asc(gradeLevels.ordinal), asc(homerooms.name)) : []
  const yname = (id: string) => years.find((y) => y.id === id)?.name ?? '—'
  const back = run ? `/staf/akademik/kenaikan?run=${run.id}` : '/staf/akademik/kenaikan'
  const active = years.find((y) => y.status === 'active')
  const next = years.find((y) => active && y.startDate > active.startDate)
  return (
    <>
      <PageHead title="Kenaikan kelas & kelulusan" sub="Memindahkan siswa ke tahun ajaran berikutnya berdasarkan keputusan rapor semester akhir." crumbs={[['Data akademik', '/staf/akademik'], ['Kenaikan kelas']]} />
      <Flash sp={sp} />
      {!run ? (
        <div className="grid grid--side">
          <Card title="Riwayat">
            {runs.length ? (
              <ul className="list">
                {runs.map((r) => (
                  <li key={r.id}>
                    <Link className="grow" href={`/staf/akademik/kenaikan?run=${r.id}`}>
                      {yname(r.fromYearId)} → {yname(r.toYearId)}
                      <div className="small muted">{r.lines.length} siswa · {r.executedAt ? `dijalankan ${fmtDateTime(r.executedAt, ctx.tz)}` : 'draf'}</div>
                    </Link>
                    {r.status === 'executed' ? <Badge tone="ok">Dijalankan</Badge> : <Badge tone="draft">Draf</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="grad">Belum pernah dijalankan.</Empty>
            )}
          </Card>
          <Card title="Buat rancangan">
            <ActionForm action="kenaikan.rancang" back={back}>
              <Select name="dari" label="Dari tahun ajaran" value={active?.id} options={years.map((y) => [y.id, y.name])} />
              <Select name="ke" label="Ke tahun ajaran" value={next?.id} options={years.map((y) => [y.id, y.name])} />
              <Submit>Susun rancangan</Submit>
            </ActionForm>
            <p className="small muted" style={{ marginTop: 10 }}>Buat rombel tahun ajaran tujuan terlebih dahulu di Data akademik. Rancangan memakai keputusan naik/tinggal/lulus dari rapor semester akhir; tingkat akhir tanpa keputusan dianggap lulus.</p>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid--4" style={{ marginBottom: 16 }}>
            {(['naik', 'tinggal', 'lulus', 'keluar'] as const).map((k) => (
              <Stat key={k} icon={k === 'lulus' ? 'grad' : k === 'naik' ? 'arrowRight' : 'users'} label={DEC[k]!} value={run.lines.filter((l) => l.decision === k).length} />
            ))}
          </div>
          {run.status === 'executed' ? (
            <Notice tone="ok" title="Sudah dijalankan">
              Berlaku mulai {fmtDate(run.effectiveDate)} · {fmtDateTime(run.executedAt, ctx.tz)}.
            </Notice>
          ) : null}
          <Card title={`${yname(run.fromYearId)} → ${yname(run.toYearId)}`} flush>
            <ActionForm action="kenaikan.ubah" back={back} hidden={{ run: run.id }} id="baris" className="inline">
              {null}
            </ActionForm>
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Rombel asal</th>
                    <th>Keputusan</th>
                    <th>Rombel tujuan</th>
                  </tr>
                </thead>
                <tbody>
                  {run.lines.map((l) => (
                    <tr key={l.studentId}>
                      <td>{l.name}</td>
                      <td>{l.fromHomeroom}</td>
                      <td>
                        <select form="baris" name={`kep:${l.studentId}`} defaultValue={l.decision} disabled={run.status !== 'draft'} aria-label={`Keputusan ${l.name}`}>
                          {Object.entries(DEC).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select form="baris" name={`ke:${l.studentId}`} defaultValue={l.toHomeroomId ?? ''} disabled={run.status !== 'draft'} aria-label={`Rombel tujuan ${l.name}`}>
                          <option value="">—</option>
                          {targets.map((t) => (
                            <option key={t.h.id} value={t.h.id}>
                              {t.h.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {run.status === 'draft' ? (
              <div className="row" style={{ padding: '12px 20px' }}>
                <button className="btn btn--ghost" type="submit" form="baris">
                  Simpan rancangan
                </button>
                <ActionForm action="kenaikan.jalankan" back={back} hidden={{ run: run.id }} className="row" confirm="Jalankan kenaikan kelas? Tindakan ini memindahkan seluruh siswa dan tidak dapat diulang.">
                  <Field name="berlaku" label="Berlaku mulai" type="date" value={years.find((y) => y.id === run.toYearId)?.startDate} required />
                  <Submit tone="ok" icon="check">
                    Jalankan
                  </Submit>
                </ActionForm>
              </div>
            ) : null}
          </Card>
        </>
      )}
    </>
  )
}
