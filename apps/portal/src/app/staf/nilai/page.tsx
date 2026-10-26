import Link from 'next/link'
import { eq, inArray } from 'drizzle-orm'
import { resultSubmissions, terms as termsT } from '@/db/schema'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { DEFAULT_GRADING, gradingConfig, KINDS } from '@/modules/grades/service'
import { activeYear, currentTerm } from '@/modules/scope'
import { assignmentsOfTerm } from '@/modules/academic/service'
import { ActionForm, Badge, Card, Empty, Field, Flash, PageHead, Select, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Buku nilai' }

/** GRD-01: the teacher's classes this term with result submission state; curriculum sets grading weights. */
export default async function GradesHome({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/nilai', ['teach', 'academic.manage'], 'nilai_rapor')
  const sp = await searchParams
  const year = await activeYear(ctx.db)
  const allTerms = year ? await ctx.db.select().from(termsT).where(eq(termsT.yearId, year.id)) : []
  const term = allTerms.find((t) => t.id === sp1(sp, 'semester')) ?? (await currentTerm(ctx)) ?? allTerms[0]
  const manage = hasPerm(ctx, 'academic.manage')
  const all = term ? await assignmentsOfTerm(ctx, term.id) : []
  const mine = all.filter((a) => a.a.teacherId === ctx.staff.id)
  const list = manage && sp1(sp, 'semua') ? all : mine
  const subs = list.length ? await ctx.db.select().from(resultSubmissions).where(inArray(resultSubmissions.assignmentId, list.map((a) => a.a.id))) : []
  const cfg = await gradingConfig(ctx.db)
  return (
    <>
      <PageHead title="Buku nilai" sub={term ? `Semester ${term.name} ${year?.name ?? ''}` : 'Belum ada semester aktif.'} />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <Card
          title={manage && sp1(sp, 'semua') ? 'Semua kelas & mapel' : 'Kelas & mapel saya'}
          flush
          actions={manage ? <Link href={sp1(sp, 'semua') ? '/staf/nilai' : '/staf/nilai?semua=1'}>{sp1(sp, 'semua') ? 'Kelas saya' : 'Pantau semua kelas'}</Link> : null}
        >
          <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
            {sp1(sp, 'semua') ? <input type="hidden" name="semua" value="1" /> : null}
            <Select name="semester" label="Semester" value={term?.id} options={allTerms.map((t) => [t.id, t.name])} />
            <Submit tone="ghost">Tampilkan</Submit>
          </form>
          {list.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Rombel</th>
                    <th>Mata pelajaran</th>
                    <th>Guru</th>
                    <th>Status nilai rapor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const s = subs.find((x) => x.assignmentId === a.a.id)
                    return (
                      <tr key={a.a.id}>
                        <td>{a.homeroom}</td>
                        <td>{a.subject}</td>
                        <td className="small">{a.teacher}</td>
                        <td>{s?.status === 'submitted' ? <Badge tone="ok">Terkirim ke wali kelas</Badge> : s?.status === 'returned' ? <Badge tone="warn">Dikembalikan</Badge> : <Badge tone="muted">Belum dikirim</Badge>}</td>
                        <td className="actions">{a.a.teacherId === ctx.staff.id ? <Link href={`/staf/nilai/${a.a.id}`}>Buka</Link> : null}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="list">Tidak ada penugasan mengajar pada semester ini.</Empty>
          )}
        </Card>
        <Card title="Pengolahan nilai">
          <p className="small muted">Nilai rapor = rata-rata tertimbang per jenis penilaian (persentase terhadap nilai maksimum). Jenis berbobot 0 tidak dihitung — formatif dipakai untuk umpan balik.</p>
          {manage ? (
            <ActionForm action="nilai.bobot" back="/staf/nilai">
              <div className="f__row">
                {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((k) => (
                  <Field key={k} name={k} label={`${KINDS[k]} (%)`} type="number" min={0} max={100} value={cfg.weights[k]} />
                ))}
              </div>
              <Field name="kktp" label="KKTP (batas ketercapaian)" type="number" min={0} max={100} value={cfg.passMark} />
              <Submit>Simpan</Submit>
              <p className="small muted">Bawaan: sumatif {DEFAULT_GRADING.weights.sumatif}%, STS {DEFAULT_GRADING.weights.sts}%, SAS {DEFAULT_GRADING.weights.sas}%. Perubahan berlaku untuk perhitungan berikutnya; nilai yang sudah dikirim tidak berubah.</p>
            </ActionForm>
          ) : (
            <ul className="small">
              {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((k) => (
                <li key={k}>
                  {KINDS[k]}: {cfg.weights[k]}%
                </li>
              ))}
              <li>KKTP: {cfg.passMark}</li>
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
