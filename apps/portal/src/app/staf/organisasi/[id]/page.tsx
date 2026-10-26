import { staffPage } from '@/server/request'
import { orgDetail, PROPOSAL_STATUS } from '@/modules/organizations/service'
import { activeYear, homeroomStudents } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { fmtDate, today } from '@/server/time'
import { ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, rupiah, Select, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Organisasi' }

export default async function OrgPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/organisasi/${id}`, ['organizations.manage', 'teach'], 'organisasi')
  const sp = await searchParams
  const d = await orgDetail(ctx, id)
  const back = `/staf/organisasi/${id}`
  const year = await activeYear(ctx.db)
  const pool: [string, string][] = []
  if (d.manage && year) for (const h of await homeroomsOfYear(ctx, year.id)) for (const s of await homeroomStudents(ctx.db, h.h.id, today(ctx.tz, ctx.now))) pool.push([s.studentId, `${s.name} (${h.h.name})`])
  return (
    <>
      <PageHead title={d.o.name} sub={d.o.description ?? undefined} crumbs={[['Organisasi', '/staf/organisasi'], [d.o.name]]} />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <Card title="Proposal kegiatan">
          {d.proposals.length ? (
            <ul className="timeline">
              {d.proposals.map((p) => (
                <li key={p.id} className={p.status === 'approved' || p.status === 'reported' ? 'ok' : p.status === 'submitted' ? 'warn' : undefined}>
                  <time>
                    {fmtDate(p.startDate)}
                    {p.endDate !== p.startDate ? ` – ${fmtDate(p.endDate)}` : ''} · {p.submittedByName}
                  </time>
                  <strong>{p.title}</strong> <Badge tone={p.status === 'approved' || p.status === 'reported' ? 'ok' : p.status === 'rejected' ? 'bad' : 'warn'}>{PROPOSAL_STATUS[p.status as keyof typeof PROPOSAL_STATUS]}</Badge>
                  <div className="small prose">{p.description}</div>
                  <div className="small muted">
                    {[p.location, p.participants, p.budget ? `anggaran ${rupiah(p.budget)}` : null, p.isPublic ? 'minta tampil di agenda website' : null].filter(Boolean).join(' · ')}
                  </div>
                  {p.reviewNote ? <div className="small">Catatan: {p.reviewNote}</div> : null}
                  {p.report ? <div className="small">Laporan: {p.report}</div> : null}
                  {d.manage && p.status === 'submitted' ? (
                    <ActionForm action="org.putuskan" back={back} hidden={{ id: p.id }} className="row">
                      <input name="catatan" placeholder="Catatan" aria-label="Catatan" />
                      <Submit name="keputusan" value="approve" tone="ok">
                        Setujui
                      </Submit>
                      <Submit name="keputusan" value="revision" tone="ghost">
                        Minta perbaikan
                      </Submit>
                      <Submit name="keputusan" value="reject" tone="ghost">
                        Tolak
                      </Submit>
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="flag">Belum ada proposal.</Empty>
          )}
        </Card>
        <div className="stack">
          <Card title={`Pengurus & anggota (${d.members.filter((m) => m.m.active).length})`}>
            <ul className="list">
              {d.members.map(({ m, name }) => (
                <li key={m.id}>
                  <span className="grow">
                    <strong>{name}</strong>
                    <div className="small muted">
                      {m.position}
                      {m.canPropose ? ' · dapat mengajukan proposal' : ''}
                      {!m.active ? ' · nonaktif' : ''}
                    </div>
                  </span>
                </li>
              ))}
            </ul>
            {d.manage ? (
              <ActionForm action="org.anggota" back={back} hidden={{ org: id }}>
                <Select name="siswa" label="Siswa" options={pool} required />
                <Field name="jabatan" label="Jabatan" placeholder="Ketua, Sekretaris, Anggota…" />
                <Check name="pengusul" label="Dapat mengajukan proposal" />
                <Check name="nonaktif" label="Nonaktifkan" />
                <Submit tone="ghost">Simpan anggota</Submit>
              </ActionForm>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  )
}
