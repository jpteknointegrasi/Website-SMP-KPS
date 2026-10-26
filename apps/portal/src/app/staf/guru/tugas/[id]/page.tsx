import { staffPage } from '@/server/request'
import { taskBoard } from '@/modules/learning/service'
import { fmtDateTime } from '@/server/time'
import { TASK_TONE } from '@/ui/tones'
import { ActionButton, ActionForm, Badge, Card, Empty, fileUrl, Flash, PageHead, Stat, Status, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Penilaian tugas' }

/** GRU-02 task board: every student of the class, latest submission (versions, late flag), score & feedback. */
export default async function TaskBoard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/guru/tugas/${id}`, ['teach', 'academic.manage'], 'akademik')
  const sp = await searchParams
  const b = await taskBoard(ctx, id)
  const t = b.task
  const back = `/staf/guru/tugas/${id}`
  const submitted = b.rows.filter((r) => r.submission).length
  const reviewed = b.rows.filter((r) => r.review).length
  const late = b.rows.filter((r) => r.submission?.late).length
  const name = (fid: string) => b.files.find((f) => f.id === fid)?.originalName ?? 'Berkas'
  return (
    <>
      <PageHead
        title={t.title}
        sub={`${b.assignment.subject} · ${b.assignment.homeroom} · tenggat ${t.dueAt ? fmtDateTime(t.dueAt, ctx.tz) : '—'} · nilai maks ${t.maxScore}`}
        crumbs={[['Kelas saya', '/staf/guru'], [`${b.assignment.subject} ${b.assignment.homeroom}`, `/staf/guru/kelas/${t.assignmentId}`], ['Tugas']]}
        actions={
          <span className="row">
            <Status value={t.status} map={TASK_TONE} />
            {t.status === 'published' ? <ActionButton action="tugas.tutup" back={back} hidden={{ id }} label="Tutup pengumpulan" tone="ghost" /> : null}
          </span>
        }
      />
      <Flash sp={sp} />
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Stat icon="users" label="Siswa" value={b.rows.length} />
        <Stat icon="upload" label="Terkumpul" value={t.submissionType === 'none' ? '—' : submitted} />
        <Stat icon="clock" tone={late ? 'warn' : undefined} label="Terlambat" value={late} />
        <Stat icon="checkCircle" tone={reviewed === b.rows.length && b.rows.length ? 'ok' : undefined} label="Dinilai" value={reviewed} />
      </div>
      {t.instructions ? (
        <Card title="Instruksi">
          <div className="prose">{t.instructions}</div>
        </Card>
      ) : null}
      <div style={{ height: 16 }} />
      <Card title="Pengumpulan & penilaian" flush>
        {b.rows.length ? (
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Pengumpulan</th>
                  <th style={{ minWidth: 320 }}>Nilai & umpan balik</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.studentId} style={{ verticalAlign: 'top' }}>
                    <td>
                      <strong>{r.name}</strong>
                      <div className="small muted">{r.nis ?? '—'}</div>
                    </td>
                    <td>
                      {r.submission ? (
                        <div className="stack small">
                          <span className="row">
                            <Badge tone="info">Versi {r.submission.versionNo}</Badge>
                            {r.submission.late ? <Badge tone="warn">Terlambat</Badge> : null}
                          </span>
                          <span className="muted">{fmtDateTime(r.submission.submittedAt, ctx.tz)}</span>
                          {r.submission.text ? <div className="prose" style={{ maxWidth: 360 }}>{r.submission.text.slice(0, 600)}</div> : null}
                          {r.submission.fileIds.map((f) => (
                            <a key={f} href={fileUrl(f)!} target="_blank" rel="noopener">
                              {name(f)}
                            </a>
                          ))}
                        </div>
                      ) : t.submissionType === 'none' ? (
                        <span className="muted small">Di kelas</span>
                      ) : (
                        <Badge tone="muted">Belum</Badge>
                      )}
                    </td>
                    <td>
                      <ActionForm action="tugas.nilai" back={back} hidden={{ tugas: id, siswa: r.studentId }} className="stack">
                        <div className="row">
                          <input name="nilai" type="number" min={0} max={t.maxScore} step="0.5" defaultValue={r.review?.score ?? ''} aria-label={`Nilai ${r.name}`} style={{ width: 90 }} />
                          {r.review ? <Badge tone={r.review.status === 'needs_revision' ? 'warn' : 'ok'}>{r.review.status === 'needs_revision' ? 'Revisi diminta' : 'Dinilai'}</Badge> : null}
                        </div>
                        <textarea name="umpan_balik" rows={2} defaultValue={r.review?.feedback ?? ''} maxLength={3000} placeholder="Umpan balik untuk siswa" aria-label={`Umpan balik ${r.name}`} />
                        <span className="row">
                          <Submit name="aksi" value="nilai">
                            Simpan
                          </Submit>
                          {r.submission ? (
                            <Submit name="aksi" value="revisi" tone="ghost">
                              Minta revisi
                            </Submit>
                          ) : null}
                        </span>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="users">Belum ada siswa di rombel ini.</Empty>
        )}
      </Card>
    </>
  )
}
