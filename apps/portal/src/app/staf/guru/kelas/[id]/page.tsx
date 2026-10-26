import Link from 'next/link'
import { inArray } from 'drizzle-orm'
import { files as filesT } from '@/db/schema'
import { staffPage } from '@/server/request'
import { loadAssignment, materialsOf, tasksOf } from '@/modules/learning/service'
import { journalsOf } from '@/modules/schedule/service'
import { fmtDate, fmtDateTime } from '@/server/time'
import { TASK_TONE } from '@/ui/tones'
import { ActionForm, Badge, Card, Check, Empty, Field, fileUrl, Flash, PageHead, Progress, Select, sp1, Status, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Materi & tugas' }

const KINDS = [
  ['tugas', 'Tugas'],
  ['kuis', 'Kuis'],
  ['proyek', 'Proyek'],
  ['ulangan', 'Ulangan'],
] as const

/** GRU-02 one class & subject: tasks (with submission progress), materials, teaching journal history. */
export default async function ClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/guru/kelas/${id}`, ['teach', 'academic.manage'], 'akademik')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'tugas'
  const a = await loadAssignment(ctx.db, id)
  const tasks = await tasksOf(ctx, id)
  const mats = tab === 'materi' ? await materialsOf(ctx, id) : []
  const journals = tab === 'jurnal' ? await journalsOf(ctx, id) : []
  const fids = mats.flatMap((m) => m.fileIds)
  const fileRows = fids.length ? await ctx.db.select().from(filesT).where(inArray(filesT.id, fids)) : []
  const base = `/staf/guru/kelas/${id}`
  return (
    <>
      <PageHead title={`${a.subject} · ${a.homeroom}`} sub={`Pengampu: ${a.teacher}`} crumbs={[['Kelas saya', '/staf/guru'], [`${a.subject} ${a.homeroom}`]]} />
      <Flash sp={sp} />
      <Tabs
        current={`${base}?tab=${tab}`}
        items={[
          ['Tugas & penilaian', `${base}?tab=tugas`],
          ['Materi', `${base}?tab=materi`],
          ['Jurnal mengajar', `${base}?tab=jurnal`],
        ]}
      />
      {tab === 'tugas' ? (
        <div className="grid grid--side">
          <Card title="Tugas" flush>
            {tasks.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Judul</th>
                      <th>Tenggat</th>
                      <th>Terkumpul</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <Link href={`/staf/guru/tugas/${t.id}`}>
                            <strong>{t.title}</strong>
                          </Link>
                          <div className="small muted">
                            {KINDS.find((k) => k[0] === t.kind)?.[1]} · maks {t.maxScore}
                          </div>
                        </td>
                        <td className="nowrap">{t.dueAt ? fmtDateTime(t.dueAt, ctx.tz) : '—'}</td>
                        <td style={{ minWidth: 140 }}>
                          {t.submissionType === 'none' ? (
                            <span className="small muted">di kelas · {t.reviewed} dinilai</span>
                          ) : (
                            <>
                              <Progress value={t.total ? Math.round((t.submitted / t.total) * 100) : 0} />
                              <span className="small muted">
                                {t.submitted}/{t.total} · {t.reviewed} dinilai
                              </span>
                            </>
                          )}
                        </td>
                        <td>
                          <Status value={t.status} map={TASK_TONE} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="clipboard">Belum ada tugas untuk kelas ini.</Empty>
            )}
          </Card>
          <Card title="Buat tugas baru">
            <ActionForm action="tugas.simpan" back={`${base}?tab=tugas`} hidden={{ kelas: id }} files op>
              <Field name="judul" label="Judul" required maxLength={200} />
              <div className="f__row">
                <Select name="jenis" label="Jenis" options={KINDS} value="tugas" />
                <Field name="maks" label="Nilai maksimum" type="number" value={100} min={1} max={1000} />
              </div>
              <Field name="tenggat" label="Tenggat (waktu sekolah)" type="datetime-local" />
              <TextArea name="instruksi" label="Instruksi" rows={5} maxLength={20000} />
              <Select
                name="pengumpulan"
                label="Pengumpulan"
                value="file_or_text"
                options={[
                  ['file_or_text', 'Lewat portal (teks/berkas)'],
                  ['none', 'Dikerjakan di kelas (tanpa unggahan)'],
                ]}
              />
              <Check name="terlambat" label="Terima pengumpulan setelah tenggat (ditandai terlambat)" checked />
              <label className="fld">
                <span>Lampiran (opsional, maks. 5)</span>
                <input type="file" name="berkas" multiple accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" />
              </label>
              <div className="f__actions">
                <Submit name="aksi" value="terbit" icon="megaphone">
                  Terbitkan
                </Submit>
                <Submit name="aksi" value="draf" tone="ghost">
                  Simpan draf
                </Submit>
              </div>
            </ActionForm>
          </Card>
        </div>
      ) : null}
      {tab === 'materi' ? (
        <div className="grid grid--side">
          <div className="stack">
            {mats.length ? (
              mats.map((m) => (
                <Card key={m.id} title={m.title} actions={m.status === 'published' ? <Badge tone="ok">Terbit {fmtDate(m.publishedAt, ctx.tz, true)}</Badge> : <Badge tone="draft">Draf</Badge>}>
                  {m.unit ? <p className="small muted">Topik: {m.unit}</p> : null}
                  {m.body ? <div className="prose">{m.body}</div> : null}
                  {m.links.length || m.fileIds.length ? (
                    <ul className="small">
                      {m.links.map((l) => (
                        <li key={l}>
                          <a href={l} target="_blank" rel="noopener noreferrer">
                            {l}
                          </a>
                        </li>
                      ))}
                      {m.fileIds.map((f) => (
                        <li key={f}>
                          <a href={fileUrl(f)!} target="_blank" rel="noopener">
                            {fileRows.find((x) => x.id === f)?.originalName ?? 'Lampiran'}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {m.status !== 'published' ? (
                    <ActionForm action="materi.simpan" back={`${base}?tab=materi`} hidden={{ kelas: id, id: m.id, judul: m.title, topik: m.unit, isi: m.body, tautan: m.links.join(' '), aksi: 'terbit' }} className="inline">
                      <Submit tone="ghost">Terbitkan</Submit>
                    </ActionForm>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card>
                <Empty icon="book">Belum ada materi.</Empty>
              </Card>
            )}
          </div>
          <Card title="Tambah materi">
            <ActionForm action="materi.simpan" back={`${base}?tab=materi`} hidden={{ kelas: id }} files op>
              <Field name="judul" label="Judul" required maxLength={200} />
              <Field name="topik" label="Topik / bab" maxLength={120} />
              <TextArea name="isi" label="Ringkasan / isi" rows={6} maxLength={20000} />
              <TextArea name="tautan" label="Tautan (satu per baris, https://…)" rows={2} />
              <label className="fld">
                <span>Berkas (PDF, dokumen, gambar)</span>
                <input type="file" name="berkas" multiple accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" />
              </label>
              <div className="f__actions">
                <Submit name="aksi" value="terbit">
                  Terbitkan untuk siswa
                </Submit>
                <Submit name="aksi" value="draf" tone="ghost">
                  Simpan draf
                </Submit>
              </div>
            </ActionForm>
          </Card>
        </div>
      ) : null}
      {tab === 'jurnal' ? (
        <Card title="Riwayat jurnal mengajar" flush>
          {journals.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Topik</th>
                    <th>Realisasi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((j) => (
                    <tr key={j.id}>
                      <td className="nowrap">{fmtDate(j.date)}</td>
                      <td>
                        {j.topic ?? <span className="muted">—</span>}
                        {j.notes ? <div className="small muted">{j.notes}</div> : null}
                      </td>
                      <td>{j.realization ? <Badge tone={j.realization === 'sesuai' ? 'ok' : 'warn'}>{j.realization}</Badge> : <Badge tone="warn">Belum diisi</Badge>}</td>
                      <td className="actions">
                        <Link href={`/staf/guru/sesi/${j.id}`}>Buka</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="edit">Belum ada sesi pelajaran tercatat.</Empty>
          )}
        </Card>
      ) : null}
    </>
  )
}
