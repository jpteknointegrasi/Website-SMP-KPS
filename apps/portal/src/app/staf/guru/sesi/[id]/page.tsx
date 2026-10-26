import { staffPage } from '@/server/request'
import { lessonDetail } from '@/modules/schedule/service'
import { EDIT_DAYS, lessonRoll } from '@/modules/attendance/service'
import { addDays, fmtDateTime, fmtDayDate, today } from '@/server/time'
import { RollRows } from '@/ui/daily'
import { ActionForm, Badge, Card, Flash, Notice, PageHead, Select, Submit, TextArea, Field, LinkBtn, type SP } from '@/ui/kit'

export const metadata = { title: 'Sesi pelajaran' }

/** GRU-01 lesson session: teaching journal + lesson attendance (pre-filled from the homeroom's daily attendance). */
export default async function LessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/guru/sesi/${id}`, ['teach', 'academic.manage'], 'akademik')
  const sp = await searchParams
  const d = await lessonDetail(ctx, id)
  const roll = await lessonRoll(ctx, id)
  const locked = d.s.date < addDays(today(ctx.tz, ctx.now), -EDIT_DAYS)
  const back = `/staf/guru/sesi/${id}`
  return (
    <>
      <PageHead
        title={`${d.subject} · ${d.homeroom}`}
        sub={`${fmtDayDate(d.s.date)} · ${d.slot.label} (${d.slot.startTime}–${d.slot.endTime})`}
        crumbs={[['Kelas saya', '/staf/guru'], ['Sesi pelajaran']]}
        actions={
          <LinkBtn tone="ghost" href={`/staf/guru/kelas/${d.s.assignmentId}`}>
            Materi & tugas kelas
          </LinkBtn>
        }
      />
      <Flash sp={sp} />
      {locked ? <Notice tone="info">Sesi lebih dari {EDIT_DAYS} hari lalu: presensi hanya dapat diubah lewat koreksi oleh Waka Kurikulum.</Notice> : null}
      <div className="grid grid--side">
        <Card title="Presensi pelajaran" actions={<span className="small muted">{roll.length} siswa</span>}>
          <ActionForm action="pelajaran.presensi" back={back} hidden={{ sesi: id }}>
            <RollRows
              disabled={locked}
              rows={roll.map((r) => ({
                studentId: r.studentId,
                name: r.name,
                nis: r.nis,
                status: r.record?.status ?? (r.daily && r.daily !== 'H' ? r.daily : 'H'),
                note: r.record?.note,
                hint: r.daily && r.daily !== 'H' ? <Badge tone="warn">Harian: {r.daily}</Badge> : null,
              }))}
            />
            {!locked ? (
              <div className="f__actions">
                <Submit icon="check">Simpan presensi</Submit>
              </div>
            ) : null}
          </ActionForm>
        </Card>
        <Card title="Jurnal mengajar" actions={d.s.journalAt ? <Badge tone="ok">Terisi {fmtDateTime(d.s.journalAt, ctx.tz)}</Badge> : <Badge tone="warn">Belum diisi</Badge>}>
          <ActionForm action="pelajaran.jurnal" back={back} hidden={{ sesi: id }}>
            <Field name="topik" label="Topik / materi yang diajarkan" value={d.s.topic} required maxLength={300} />
            <Select
              name="realisasi"
              label="Realisasi rencana"
              value={d.s.realization ?? 'sesuai'}
              options={[
                ['sesuai', 'Sesuai rencana'],
                ['sebagian', 'Sebagian tercapai'],
                ['tidak', 'Tidak terlaksana'],
              ]}
            />
            <TextArea name="catatan" label="Catatan (kendala, tindak lanjut)" value={d.s.notes} rows={5} maxLength={2000} />
            <div className="f__actions">
              <Submit>Simpan jurnal</Submit>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  )
}
