import { and, eq, inArray } from 'drizzle-orm'
import { activityMembers } from '@/db/schema'
import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { forStudent, MEMBER_STATUS } from '@/modules/activities/service'
import { linkedChildren } from '@/modules/scope'
import { ChildPicker } from '@/ui/child-picker'
import { ActionButton, ActionForm, Badge, Card, Empty, Flash, Notice, PageHead, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Ekstrakurikuler' }

/** EKS-02: catalogue with membership state; students apply, guardians apply or give consent. */
export default async function FamilyActivities({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/ekskul', 'ekskul')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const rows = current ? await forStudent(ctx, current.studentId) : []
  const kids = (await linkedChildren(ctx)).map((k) => k.studentId)
  const pending = kids.length ? await ctx.db.select().from(activityMembers).where(and(inArray(activityMembers.studentId, kids), eq(activityMembers.status, 'applied'))) : []
  const back = `/keluarga/ekskul${current ? `?anak=${current.studentId}` : ''}`
  return (
    <>
      <PageHead title="Ekstrakurikuler" sub={current?.name} />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/ekskul" />
      {pending.length && !current?.self ? (
        <Notice tone="warn" title="Menunggu persetujuan Anda">
          {rows
            .filter((r) => pending.some((p) => p.activityId === r.a.id && p.studentId === current?.studentId))
            .map((r) => (
              <ActionForm key={r.a.id} action="ekskul.izin" back={back} hidden={{ id: r.member!.id }} className="row">
                <span className="grow">
                  {current?.name} mendaftar <strong>{r.a.name}</strong>
                  {r.member?.motivation ? ` — “${r.member.motivation}”` : ''}
                </span>
                <Submit name="keputusan" value="setuju" tone="ok">
                  Setujui
                </Submit>
                <Submit name="keputusan" value="tolak" tone="ghost">
                  Tidak setuju
                </Submit>
              </ActionForm>
            ))}
        </Notice>
      ) : null}
      {current ? (
        rows.length ? (
          <div className="grid grid--2">
            {rows.map((r) => (
              <Card key={r.a.id} title={r.a.name} actions={r.member ? <Badge tone={r.member.status === 'active' ? 'ok' : r.member.status === 'rejected' || r.member.status === 'withdrawn' ? 'muted' : 'warn'}>{MEMBER_STATUS[r.member.status as keyof typeof MEMBER_STATUS]}</Badge> : r.a.category === 'wajib' ? <Badge tone="brand">Wajib</Badge> : null}>
                {r.a.description ? <p className="small">{r.a.description}</p> : null}
                <p className="small muted">
                  {[r.a.schedule, r.a.location, r.coach ? `Pembina: ${r.coach}` : null, r.a.capacity ? `${r.members}/${r.a.capacity} anggota` : `${r.members} anggota`].filter(Boolean).join(' · ')}
                </p>
                {r.member?.status === 'active' && r.sessions ? (
                  <p className="small">
                    Kehadiran: {r.attended}/{r.sessions} pertemuan
                  </p>
                ) : null}
                {!r.member || ['rejected', 'withdrawn'].includes(r.member.status) ? (
                  r.a.status === 'open' ? (
                    <ActionForm action="ekskul.daftar" back={back} hidden={{ kegiatan: r.a.id, siswa: current.studentId }} className="row">
                      <input name="alasan" placeholder="Alasan ingin ikut (opsional)" aria-label="Alasan" maxLength={500} className="grow" />
                      <Submit tone="ghost">Daftar</Submit>
                    </ActionForm>
                  ) : (
                    <p className="small muted">Pendaftaran ditutup.</p>
                  )
                ) : ['applied', 'consented', 'active'].includes(r.member.status) ? (
                  <ActionButton action="ekskul.keluar" back={back} hidden={{ id: r.member.id }} label={r.member.status === 'active' ? 'Berhenti' : 'Batalkan pendaftaran'} tone="danger-ghost" small />
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Empty icon="ball">Belum ada kegiatan untuk tahun ajaran ini.</Empty>
        )
      ) : (
        <Empty icon="users">Belum ada siswa yang terhubung.</Empty>
      )}
    </>
  )
}
