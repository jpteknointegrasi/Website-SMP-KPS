import Link from 'next/link'
import { staffPage } from '@/server/request'
import { gradebook, importableTasks, KINDS } from '@/modules/grades/service'
import { fmtDate, fmtDateTime } from '@/server/time'
import { ActionButton, ActionForm, Badge, Card, Empty, Field, Flash, Notice, PageHead, Select, sp1, Submit, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Buku nilai' }

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(1))

/** GRD-01 grade book of one class & subject: items × students, score entry per item, term results & submission. */
export default async function Gradebook({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/nilai/${id}`, ['teach', 'academic.manage'], 'nilai_rapor')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'buku'
  const b = await gradebook(ctx, id)
  const locked = b.submission?.status === 'submitted'
  const sel = b.items.find((i) => i.id === sp1(sp, 'item')) ?? null
  const tasks = tab === 'buku' && !locked ? await importableTasks(ctx, id) : []
  const base = `/staf/nilai/${id}`
  const back = `${base}?tab=${tab}${sel ? `&item=${sel.id}` : ''}`
  const missing = b.rows.filter((r) => !r.result?.finalScore || !r.result?.description).length
  return (
    <>
      <PageHead title={`${b.assignment.subject} · ${b.assignment.homeroom}`} sub={`Pengampu: ${b.assignment.teacher}`} crumbs={[['Buku nilai', '/staf/nilai'], [`${b.assignment.subject} ${b.assignment.homeroom}`]]} />
      <Flash sp={sp} />
      {locked ? (
        <Notice tone="ok" title="Nilai sudah dikirim ke wali kelas">
          Dikirim {fmtDateTime(b.submission!.submittedAt, ctx.tz)}. Perubahan memerlukan pengembalian oleh wali kelas.
        </Notice>
      ) : b.submission?.status === 'returned' ? (
        <Notice tone="warn" title="Dikembalikan wali kelas">
          {b.submission.returnNote}
        </Notice>
      ) : null}
      <Tabs
        current={`${base}?tab=${tab}`}
        items={[
          ['Buku nilai', `${base}?tab=buku`],
          [`Nilai rapor & deskripsi${missing ? ` (${missing} belum)` : ''}`, `${base}?tab=hasil`],
        ]}
      />
      {tab === 'buku' ? (
        <div className="stack">
          <Card title="Nilai per penilaian" flush actions={sel ? <Link href={`${base}?tab=buku`}>Selesai mengisi</Link> : <span className="small muted">Klik judul kolom untuk mengisi nilai</span>}>
            {sel ? <ActionForm action="nilai.skor" back={back} hidden={{ penilaian: sel.id }} id="skor" className="inline">{null}</ActionForm> : null}
            {b.rows.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Siswa</th>
                      {b.items.map((i) => (
                        <th key={i.id} className="num" style={i.id === sel?.id ? { background: 'var(--info-bg)' } : undefined}>
                          <Link href={`${base}?tab=buku&item=${i.id}`} title={`${KINDS[i.kind as keyof typeof KINDS]} · maks ${i.maxScore} · bobot ${i.weight}`}>
                            {i.title}
                          </Link>
                          <div className="small muted" style={{ fontWeight: 400 }}>
                            {i.kind.toUpperCase()} · /{i.maxScore}
                          </div>
                        </th>
                      ))}
                      <th className="num">Olahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r) => (
                      <tr key={r.studentId}>
                        <td>
                          <strong>{r.name}</strong>
                          <div className="small muted">{r.nis ?? '—'}</div>
                        </td>
                        {b.items.map((i) => (
                          <td key={i.id} className="num" style={i.id === sel?.id ? { background: 'var(--info-bg)' } : undefined}>
                            {i.id === sel?.id && !locked ? (
                              <input form="skor" name={`n:${r.studentId}`} type="number" min={0} max={i.maxScore} step="0.5" defaultValue={r.scores.get(i.id) ?? ''} aria-label={`Nilai ${r.name}`} style={{ width: 76, textAlign: 'right' }} />
                            ) : (
                              fmt(r.scores.get(i.id))
                            )}
                          </td>
                        ))}
                        <td className="num">
                          <strong>{fmt(r.computed)}</strong>
                          {r.computed !== null && r.computed < b.cfg.passMark ? <div><Badge tone="warn">di bawah KKTP</Badge></div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="users">Belum ada siswa di rombel ini.</Empty>
            )}
            {sel && !locked ? (
              <div className="row" style={{ padding: '12px 20px' }}>
                <button className="btn" type="submit" form="skor">
                  Simpan nilai “{sel.title}”
                </button>
                <span className="small muted">Kosongkan bila belum dinilai.</span>
              </div>
            ) : null}
          </Card>
          {!locked ? (
            <div className="grid grid--2">
              <Card title={sel ? `Ubah penilaian: ${sel.title}` : 'Tambah penilaian'}>
                <ActionForm action="nilai.penilaian" back={back} hidden={{ kelas: id, id: sel?.id }} key={sel?.id ?? 'baru'}>
                  <Field name="judul" label="Nama penilaian" value={sel?.title} required maxLength={120} />
                  <div className="f__row">
                    <Select name="jenis" label="Jenis" value={sel?.kind ?? 'sumatif'} options={Object.entries(KINDS)} />
                    <Field name="tanggal" label="Tanggal" type="date" value={sel?.date} />
                  </div>
                  <div className="f__row">
                    <Field name="maks" label="Nilai maksimum" type="number" min={1} max={1000} value={sel?.maxScore ?? 100} />
                    <Field name="bobot" label="Bobot dalam jenisnya" type="number" min={1} max={10} value={sel?.weight ?? 1} />
                  </div>
                  <div className="f__actions">
                    <Submit>{sel ? 'Simpan perubahan' : 'Tambah'}</Submit>
                  </div>
                </ActionForm>
                {sel ? (
                  <div style={{ marginTop: 10 }}>
                    <ActionButton action="nilai.penilaian_hapus" back={`${base}?tab=buku`} hidden={{ id: sel.id }} label="Hapus penilaian ini" tone="danger-ghost" small />
                  </div>
                ) : null}
              </Card>
              <Card title="Ambil dari tugas">
                {tasks.length ? (
                  <ActionForm action="nilai.impor_tugas" back={back} hidden={{ kelas: id }}>
                    <Select name="tugas" label="Tugas yang sudah dinilai" options={tasks.map((t) => [t.id, `${t.title}${t.dueAt ? ` (${fmtDate(t.dueAt, ctx.tz, true)})` : ''}`])} />
                    <Select name="jenis" label="Masuk sebagai" value="formatif" options={Object.entries(KINDS)} />
                    <Submit tone="ghost">Masukkan ke buku nilai</Submit>
                  </ActionForm>
                ) : (
                  <p className="small muted">Tidak ada tugas yang belum dimasukkan.</p>
                )}
              </Card>
            </div>
          ) : null}
        </div>
      ) : null}
      {tab === 'hasil' ? (
        <Card title="Nilai rapor & capaian kompetensi" flush>
          <ActionForm action="nilai.hasil" back={`${base}?tab=hasil`} hidden={{ kelas: id }} id="hasil" className="inline">
            {null}
          </ActionForm>
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th className="num">Olahan</th>
                  <th style={{ width: 110 }}>Nilai rapor</th>
                  <th style={{ minWidth: 360 }}>Deskripsi capaian</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => {
                  const final = r.result?.finalScore === null || r.result?.finalScore === undefined ? null : Number(r.result.finalScore)
                  const adjusted = final !== null && r.computed !== null && Math.abs(final - r.computed) >= 0.5
                  return (
                    <tr key={r.studentId} style={{ verticalAlign: 'top' }}>
                      <td>
                        <strong>{r.name}</strong>
                      </td>
                      <td className="num">{fmt(r.computed)}</td>
                      <td>
                        <input form="hasil" name={`akhir:${r.studentId}`} type="number" min={0} max={100} step="0.5" defaultValue={adjusted ? final! : ''} placeholder={r.computed === null ? '—' : String(Math.round(r.computed))} disabled={locked} aria-label={`Nilai rapor ${r.name}`} style={{ width: 90 }} />
                        <input form="hasil" name={`alasan:${r.studentId}`} defaultValue={r.result?.adjustReason ?? ''} placeholder="Alasan bila diubah" disabled={locked} aria-label={`Alasan ${r.name}`} style={{ width: 150, marginTop: 4 }} />
                      </td>
                      <td>
                        <textarea form="hasil" name={`desk:${r.studentId}`} rows={2} defaultValue={r.result?.description ?? ''} maxLength={1000} disabled={locked} placeholder="Contoh: Menunjukkan penguasaan yang baik dalam …; perlu bimbingan dalam …" aria-label={`Deskripsi ${r.name}`} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!locked ? (
            <div className="row" style={{ padding: '12px 20px' }}>
              <button className="btn btn--ghost" type="submit" form="hasil">
                Simpan
              </button>
              <ActionForm action="nilai.kirim" back={`${base}?tab=hasil`} hidden={{ kelas: id }} className="inline" confirm="Kirim nilai ke wali kelas? Setelah dikirim, nilai terkunci.">
                <Submit icon="arrowRight">Kirim ke wali kelas</Submit>
              </ActionForm>
              <span className="small muted">Kosongkan nilai rapor untuk memakai nilai olahan. Simpan dahulu sebelum mengirim.</span>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  )
}
