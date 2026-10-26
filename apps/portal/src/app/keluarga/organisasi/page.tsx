import { accountPage } from '@/server/request'
import { myOrgs, orgDetail, PROPOSAL_STATUS } from '@/modules/organizations/service'
import { fmtDate } from '@/server/time'
import { ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, sp1, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Organisasi' }

/** ORG-02 student: organisations the student belongs to; officers submit proposals and reports. */
export default async function FamilyOrgs({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/organisasi', 'organisasi')
  const sp = await searchParams
  const mine = await myOrgs(ctx)
  const cur = mine.find((m) => m.o.id === sp1(sp, 'org')) ?? mine[0]
  const d = cur ? await orgDetail(ctx, cur.o.id) : null
  const myProposals = d ? d.proposals.filter((p) => p.submittedById === ctx.account.id) : []
  const back = cur ? `/keluarga/organisasi?org=${cur.o.id}` : '/keluarga/organisasi'
  return (
    <>
      <PageHead title="Organisasi siswa" sub={cur ? `${cur.o.name} · ${cur.m.position}` : undefined} />
      <Flash sp={sp} />
      {!cur ? (
        <Empty icon="flag">Anda belum terdaftar sebagai anggota organisasi siswa. Pengurus didaftarkan oleh pembina.</Empty>
      ) : (
        <div className="grid grid--side">
          <Card title="Proposal kegiatan">
            {d!.proposals.length ? (
              <ul className="timeline">
                {d!.proposals.map((p) => (
                  <li key={p.id} className={p.status === 'approved' || p.status === 'reported' ? 'ok' : 'warn'}>
                    <time>
                      {fmtDate(p.startDate)} · {p.submittedByName}
                    </time>
                    <strong>{p.title}</strong> <Badge tone={p.status === 'approved' || p.status === 'reported' ? 'ok' : p.status === 'rejected' ? 'bad' : 'warn'}>{PROPOSAL_STATUS[p.status as keyof typeof PROPOSAL_STATUS]}</Badge>
                    {p.reviewNote ? <div className="small">Catatan pembina: {p.reviewNote}</div> : null}
                    {p.status === 'approved' && myProposals.includes(p) ? (
                      <ActionForm action="org.laporan" back={back} hidden={{ id: p.id }}>
                        <TextArea name="laporan" label="Laporan kegiatan" rows={3} required />
                        <Submit tone="ghost">Kirim laporan</Submit>
                      </ActionForm>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="flag">Belum ada proposal.</Empty>
            )}
          </Card>
          {cur.m.canPropose ? (
            <Card title="Ajukan proposal">
              <ActionForm action="org.proposal" back={back} hidden={{ org: cur.o.id }} op>
                <Field name="judul" label="Nama kegiatan" required />
                <TextArea name="uraian" label="Tujuan & rencana kegiatan" rows={5} required />
                <div className="f__row">
                  <Field name="mulai" label="Mulai" type="date" required />
                  <Field name="selesai" label="Selesai" type="date" />
                </div>
                <div className="f__row">
                  <Field name="tempat" label="Tempat" />
                  <Field name="anggaran" label="Perkiraan anggaran (Rp)" type="number" min={0} />
                </div>
                <Field name="peserta" label="Peserta" placeholder="Seluruh siswa kelas VII" />
                <Check name="publik" label="Usulkan tampil di agenda website sekolah" />
                <Submit>Ajukan ke pembina</Submit>
              </ActionForm>
            </Card>
          ) : (
            <Card title="Anggota">
              <p className="small muted">Pengajuan proposal dilakukan pengurus yang ditunjuk pembina.</p>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
