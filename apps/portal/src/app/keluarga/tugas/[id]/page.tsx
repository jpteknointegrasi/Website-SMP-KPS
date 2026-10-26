import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { taskForStudent } from '@/modules/learning/service'
import { fmtDateTime } from '@/server/time'
import { TASK_STATE_TONE } from '@/ui/tones'
import { ActionForm, Badge, Card, Empty, fileUrl, Flash, Notice, PageHead, sp1, Status, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Tugas' }

/** SIS-02 task detail: instructions & attachments, submission (student account), versions, teacher feedback. */
export default async function FamilyTask({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await accountPage(`/keluarga/tugas/${id}`, 'akademik')
  const sp = await searchParams
  const { current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  if (!current?.canViewAcademic) return <Empty icon="lock">Tugas tidak tersedia untuk akun ini.</Empty>
  const d = await taskForStudent(ctx, id, current.studentId)
  const t = d.t
  const name = (fid: string) => d.files.find((f) => f.id === fid)?.originalName ?? 'Berkas'
  const canSubmit = current.self && t.submissionType !== 'none' && t.status === 'published' && d.review?.status !== 'returned' && !(t.dueAt && ctx.now > t.dueAt && !t.allowLate)
  const back = `/keluarga/tugas/${id}?anak=${current.studentId}`
  return (
    <>
      <PageHead title={t.title} sub={`${d.subject} · tenggat ${t.dueAt ? fmtDateTime(t.dueAt, ctx.tz) : '—'}`} crumbs={[['Tugas & nilai', `/keluarga/tugas?anak=${current.studentId}`], [t.title]]} actions={<Status value={d.state} map={TASK_STATE_TONE} />} />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <div className="stack">
          <Card title="Instruksi">
            {t.instructions ? <div className="prose">{t.instructions}</div> : <p className="muted">Tidak ada instruksi tertulis.</p>}
            {t.fileIds.length ? (
              <ul className="small">
                {t.fileIds.map((f) => (
                  <li key={f}>
                    <a href={fileUrl(f)!} target="_blank" rel="noopener">
                      {name(f)}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="small muted">Nilai maksimum {t.maxScore}{t.allowLate ? ' · pengumpulan terlambat diterima dan ditandai' : ' · tidak menerima pengumpulan terlambat'}.</p>
          </Card>
          {d.review ? (
            <Card title="Umpan balik guru" actions={d.review.score !== null ? <Badge tone="ok">Nilai {Number(d.review.score)}/{t.maxScore}</Badge> : null}>
              {d.review.status === 'needs_revision' ? <Notice tone="warn">Guru meminta revisi. Kumpulkan versi baru.</Notice> : null}
              {d.review.feedback ? <div className="prose">{d.review.feedback}</div> : <p className="muted">Tidak ada catatan.</p>}
              <p className="small muted">{fmtDateTime(d.review.reviewedAt, ctx.tz)}</p>
            </Card>
          ) : null}
          {canSubmit ? (
            <Card title={d.history.length ? 'Kumpulkan versi baru' : 'Kumpulkan tugas'}>
              {t.dueAt && ctx.now > t.dueAt ? <Notice tone="warn">Tenggat sudah lewat; pengumpulan akan ditandai terlambat.</Notice> : null}
              <ActionForm action="tugas.kumpul" back={back} hidden={{ tugas: id }} files op>
                <TextArea name="jawaban" label="Jawaban / catatan" rows={6} maxLength={20000} />
                <label className="fld">
                  <span>Berkas (PDF, dokumen, foto; maks. 5)</span>
                  <input type="file" name="berkas" multiple accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" />
                </label>
                <Submit icon="upload">Kumpulkan</Submit>
              </ActionForm>
            </Card>
          ) : null}
        </div>
        <Card title="Riwayat pengumpulan">
          {d.history.length ? (
            <ul className="timeline">
              {d.history.map((h) => (
                <li key={h.id} className={h.late ? 'warn' : 'ok'}>
                  <time>{fmtDateTime(h.submittedAt, ctx.tz)}</time>
                  <strong>Versi {h.versionNo}</strong> {h.late ? <Badge tone="warn">Terlambat</Badge> : null}
                  {h.text ? <div className="small prose">{h.text.slice(0, 400)}</div> : null}
                  {h.fileIds.map((f) => (
                    <div key={f} className="small">
                      <a href={fileUrl(f)!} target="_blank" rel="noopener">
                        {name(f)}
                      </a>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">{t.submissionType === 'none' ? 'Tugas dikerjakan di kelas.' : 'Belum ada pengumpulan.'}</p>
          )}
        </Card>
      </div>
    </>
  )
}
