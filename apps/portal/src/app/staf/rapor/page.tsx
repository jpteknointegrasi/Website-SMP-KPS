import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { terms as termsT } from '@/db/schema'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { reviewQueue } from '@/modules/reports/service'
import { activeYear, currentTerm, myHomerooms } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { Badge, Card, Empty, Flash, PageHead, Select, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Rapor' }

const ST: Record<string, [string, 'muted' | 'warn' | 'info' | 'ok']> = { draft: ['Draf', 'muted'], submitted: ['Menunggu persetujuan', 'warn'], approved: ['Disetujui, belum dirilis', 'info'], released: ['Dirilis', 'ok'] }

/** RPT-01 entry: homeroom teachers open their class; curriculum sees the state of every homeroom. */
export default async function ReportsHome({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/rapor', ['teach', 'reports.review', 'reports.release'], 'nilai_rapor')
  const sp = await searchParams
  const year = await activeYear(ctx.db)
  const allTerms = year ? await ctx.db.select().from(termsT).where(eq(termsT.yearId, year.id)) : []
  const term = allTerms.find((t) => t.id === sp1(sp, 'semester')) ?? (await currentTerm(ctx)) ?? allTerms[0]
  const reviewer = hasPerm(ctx, 'reports.review', 'reports.release')
  const mine = await myHomerooms(ctx)
  const rooms = reviewer && year ? (await homeroomsOfYear(ctx, year.id)).map((r) => ({ id: r.h.id, name: r.h.name, teacher: r.teacher, students: r.students })) : mine.map((m) => ({ id: m.id, name: m.name, teacher: ctx.staff.name, students: null as number | null }))
  const q = reviewer && term ? await reviewQueue(ctx, term.id) : []
  return (
    <>
      <PageHead title="Rapor" sub={term ? `Semester ${term.name} ${year?.name ?? ''} — kelengkapan nilai, catatan wali kelas, persetujuan dan rilis.` : 'Belum ada semester aktif.'} />
      <Flash sp={sp} />
      <Card>
        <form method="get" className="filters">
          <Select name="semester" label="Semester" value={term?.id} options={allTerms.map((t) => [t.id, t.name])} />
          <Submit tone="ghost">Tampilkan</Submit>
        </form>
      </Card>
      <div style={{ height: 16 }} />
      <Card title={reviewer ? 'Semua rombel' : 'Rombel perwalian saya'} flush>
        {rooms.length && term ? (
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Rombel</th>
                  <th>Wali kelas</th>
                  <th>Status rapor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => {
                  const st = q.filter((x) => x.homeroomId === r.id)
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.name}</strong>
                        {r.students !== null ? <div className="small muted">{r.students} siswa</div> : null}
                      </td>
                      <td className="small">{r.teacher ?? '—'}</td>
                      <td>
                        <span className="row">
                          {st.length ? st.map((x) => <Badge key={x.status} tone={ST[x.status]?.[1] ?? 'muted'}>{`${ST[x.status]?.[0] ?? x.status}: ${x.n}`}</Badge>) : <span className="small muted">{reviewer ? 'Belum diajukan' : ''}</span>}
                        </span>
                      </td>
                      <td className="actions">
                        <Link href={`/staf/rapor/${r.id}?semester=${term.id}`}>Buka</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="file">{reviewer ? 'Belum ada rombel.' : 'Anda bukan wali kelas pada tahun ajaran aktif. Nilai mata pelajaran diisi di Buku nilai.'}</Empty>
        )}
      </Card>
      <p className="small muted" style={{ marginTop: 12 }}>
        Rapor tidak memuat peringkat kelas. Setiap perbaikan setelah disetujui menjadi versi baru; versi lama tetap tersimpan.
      </p>
    </>
  )
}
