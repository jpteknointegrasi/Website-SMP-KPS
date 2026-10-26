import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { decisionBatches, decisionVersions } from '@/db/schema'
import { staffPage } from '@/server/request'
import { applicationView, isAdmissionsStaff } from '@/modules/admissions/apply'
import { applicationTimeline, documentHistory } from '@/modules/admissions/review'
import { scoreSummary } from '@/modules/admissions/selection'
import { conversionCandidates } from '@/modules/admissions/reenroll'
import { fieldsFor, RELATION_LABEL } from '@/modules/admissions/fields'
import { GENDER_LABEL } from '@/modules/students/fields'
import { homeroomsOfYear } from '@/modules/academic/service'
import { academicYears, applicantStudentMappings } from '@/db/schema'
import { hasPerm } from '@/server/context'
import { ONCE_COOKIE, readOnce } from '@/server/once'
import { fmtDate, fmtDateTime } from '@/server/time'
import { APP_TONE, DOC_TONE, ITEM_TONE, OUTCOME_TONE, REENROLL_TONE, SEAT_TONE } from '@/ui/tones'
import { BillsPanel, DocsPanel, SelectionPanel, StepForm, SubmitPanel } from '@/ui/application'
import { ActionButton, ActionForm, Badge, Card, Empty, Field, fileUrl, Flash, Notice, PageHead, Select, sp1, Status, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Detail pendaftar' }

/** PAN-01/02/04 detail: verification with per-document checks, revision request, decision history, re-enrolment, conversion. */
export default async function ApplicantDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const ctx = await staffPage(`/staf/ppdb/pendaftar/${id}`, [], 'penerimaan')
  if (!isAdmissionsStaff(ctx)) notFound()
  const sp = await searchParams
  const v = await applicationView(ctx, id).catch((e) => {
    if (e?.code === 'not_found') notFound()
    throw e
  })
  const base = `/staf/ppdb/pendaftar/${id}`
  const once = readOnce((await cookies()).get(ONCE_COOKIE)?.value)
  const a = v.app
  const canVerify = hasPerm(ctx, 'admissions.verify')
  const canManage = hasPerm(ctx, 'admissions.manage')
  const history = canVerify || canManage ? await documentHistory(ctx, id) : []
  const scores = (await scoreSummary(ctx.db, [id])).get(id)
  const versions = await ctx.db.select({ v: decisionVersions, b: decisionBatches }).from(decisionVersions).innerJoin(decisionBatches, eq(decisionBatches.id, decisionVersions.batchId)).where(eq(decisionVersions.applicationId, id)).orderBy(desc(decisionVersions.versionNo))
  const timeline = await applicationTimeline(ctx, id)
  const step = sp1(sp, 'langkah') ?? 'anak'
  const assisted = a.status === 'draft' && canManage
  const [year] = await ctx.db.select().from(academicYears).where(eq(academicYears.name, v.cycle.targetYear))
  const rooms = year && hasPerm(ctx, 'admissions.convert') ? await homeroomsOfYear(ctx, year.id) : []
  const candidates = v.reenroll?.status === 'verified' && hasPerm(ctx, 'admissions.convert') ? await conversionCandidates(ctx, id) : []
  const [mapped] = await ctx.db.select({ studentId: applicantStudentMappings.studentId }).from(applicantStudentMappings).where(eq(applicantStudentMappings.applicationId, id))
  const fields = fieldsFor(v.cycle.requireNik)
  return (
    <>
      <PageHead
        title={a.data.fullName || 'Pendaftar'}
        sub={`${a.registrationNo ?? 'Draf'} · ${v.cycle.name} · ${v.path.name}`}
        crumbs={[['Penerimaan', '/staf/ppdb'], [v.cycle.name, `/staf/ppdb/${a.cycleId}?tab=pendaftar`], [a.registrationNo ?? 'Draf']]}
        actions={<Status value={a.status} map={APP_TONE} />}
      />
      <Flash sp={sp} />
      {once?.kind === 'password' ? (
        <Notice tone="info" title="Akun keluarga dibuat (kata sandi sementara tampil sekali)">
          Login <strong>{once.login}</strong> · kata sandi <span className="secret">{once.password}</span>. Serahkan langsung kepada keluarga; mereka wajib menggantinya saat masuk.
        </Notice>
      ) : null}
      {a.duplicateOf ? (
        <Notice tone="warn" title="Kemungkinan duplikat">
          Ada pendaftaran lain dengan nama & tanggal lahir sama: <Link href={`/staf/ppdb/pendaftar/${a.duplicateOf}`}>periksa</Link>. Jangan menolak otomatis (bisa kembar/saudara).
        </Notice>
      ) : null}
      {a.assistedBy ? <Notice tone="info">Pendaftaran dibantu panitia. Alasan: {a.assistedReason}</Notice> : null}

      {assisted ? (
        <>
          <Tabs current={`${base}?langkah=${step}`} items={[['Data calon siswa', `${base}?langkah=anak`], ['Data keluarga', `${base}?langkah=keluarga`], ['Berkas', `${base}?langkah=berkas`], ['Cek & kirim', `${base}?langkah=kirim`]]} />
          <Card>
            {step === 'anak' ? <StepForm v={v} step="anak" back={`${base}?langkah=anak`} next="keluarga" /> : null}
            {step === 'keluarga' ? <StepForm v={v} step="keluarga" back={`${base}?langkah=keluarga`} next="berkas" /> : null}
            {step === 'berkas' ? <DocsPanel v={v} back={`${base}?langkah=berkas`} /> : null}
            {step === 'kirim' ? <SubmitPanel v={v} back={`${base}?langkah=kirim`} /> : null}
          </Card>
        </>
      ) : (
        <div className="grid grid--side">
          <div>
            <Card title="Data pendaftar">
              <dl className="kv">
                {fields.map((f) => (
                  <div key={f.key} style={{ display: 'contents' }}>
                    <dt>{f.label}</dt>
                    <dd>{f.key === 'gender' ? (GENDER_LABEL[a.data.gender ?? ''] ?? '—') : f.key === 'guardianRelation' ? (RELATION_LABEL[a.data.guardianRelation ?? ''] ?? '—') : f.type === 'date' ? fmtDate(a.data[f.key]) : a.data[f.key] || '—'}</dd>
                  </div>
                ))}
                {v.cycle.formFields.map((q) => (
                  <div key={q.key} style={{ display: 'contents' }}>
                    <dt>{q.label}</dt>
                    <dd>{a.answers[q.key] || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Verifikasi berkas">
              <ul className="list">
                {v.path.documents.map((d) => {
                  const cur = v.docs.latest.get(d.code)
                  const old = history.filter((h) => h.code === d.code && h.id !== cur?.d.id)
                  return (
                    <li key={d.code} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div className="grow">
                        <strong>{d.label}</strong> {d.required ? <Badge tone="info">Wajib</Badge> : <Badge>Opsional</Badge>}
                        {cur ? (
                          <div className="small">
                            <a href={fileUrl(cur.file.id)!} target="_blank" rel="noopener">
                              {cur.file.originalName}
                            </a>{' '}
                            · versi {cur.d.versionNo} · <Status value={cur.d.state} map={DOC_TONE} /> {cur.d.note ? <span className="muted">· {cur.d.note}</span> : null}
                          </div>
                        ) : (
                          <div className="small">
                            <Badge tone="warn">Belum diunggah</Badge>
                          </div>
                        )}
                        {old.length ? <div className="small muted">Versi sebelumnya: {old.map((o) => `v${o.versionNo} (${o.state})`).join(', ')}</div> : null}
                      </div>
                      {cur && canVerify && a.status === 'under_verification' ? (
                        <ActionForm action="ppdb.periksa_berkas" back={base} hidden={{ dok: cur.d.id }} className="row">
                          <select name="hasil" defaultValue={cur.d.state === 'pending' ? 'verified' : cur.d.state} aria-label="Hasil">
                            <option value="verified">Sesuai</option>
                            <option value="revision_required">Perlu revisi</option>
                            <option value="rejected">Tidak sesuai</option>
                          </select>
                          <input name="catatan" placeholder="Catatan untuk pendaftar" aria-label="Catatan" style={{ maxWidth: 220 }} defaultValue={cur.d.note ?? ''} />
                          <button className="btn btn--ghost btn--sm" type="submit">
                            Simpan
                          </button>
                        </ActionForm>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </Card>
            {canVerify && a.status === 'under_verification' ? (
              <Card title="Minta perbaikan">
                <ActionForm action="ppdb.minta_perbaikan" back={base} hidden={{ id, _versi: a.version }}>
                  <div className="grid grid--2">
                    <fieldset>
                      <legend>Data yang dibuka</legend>
                      {fields.map((f) => (
                        <label key={f.key} className="check">
                          <input type="checkbox" name="kolom" value={f.key} />
                          <span>{f.label}</span>
                        </label>
                      ))}
                      {v.cycle.formFields.map((q) => (
                        <label key={q.key} className="check">
                          <input type="checkbox" name="kolom" value={`q_${q.key}`} />
                          <span>{q.label}</span>
                        </label>
                      ))}
                    </fieldset>
                    <fieldset>
                      <legend>Berkas yang dibuka</legend>
                      {v.path.documents.map((d) => (
                        <label key={d.code} className="check">
                          <input type="checkbox" name="dok" value={d.code} defaultChecked={['revision_required', 'rejected'].includes(v.docs.latest.get(d.code)?.d.state ?? '')} />
                          <span>{d.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>
                  <TextArea name="catatan" label="Catatan untuk pendaftar" required rows={2} />
                  <Field name="tenggat" type="datetime-local" label="Batas waktu perbaikan" />
                  <Submit tone="ghost">Kirim permintaan perbaikan</Submit>
                </ActionForm>
              </Card>
            ) : null}
            <div id="daftar-ulang" />
            {v.reenroll ? (
              <Card title="Daftar ulang" actions={<Status value={v.reenroll.status} map={REENROLL_TONE} />}>
                <ul className="list">
                  {v.reenroll.checklist.map((i) => (
                    <li key={i.code} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div className="grow">
                        {i.label} <Status value={i.state} map={ITEM_TONE} />
                        {i.fileId ? (
                          <>
                            {' '}
                            ·{' '}
                            <a className="small" href={fileUrl(i.fileId)!} target="_blank" rel="noopener">
                              berkas
                            </a>
                          </>
                        ) : null}
                        {i.note ? <div className="small muted">{i.note}</div> : null}
                      </div>
                      {hasPerm(ctx, 'admissions.reenroll') && ['in_progress', 'needs_revision', 'submitted'].includes(v.reenroll!.status) && i.kind !== 'payment' ? (
                        <ActionForm action="ppdb.du_periksa" back={`${base}#daftar-ulang`} hidden={{ id, kode: i.code }} className="row">
                          <select name="hasil" defaultValue="verified" aria-label="Hasil">
                            <option value="verified">Sahkan</option>
                            <option value="rejected">Perlu diperbaiki</option>
                            <option value="waived">Kecualikan</option>
                          </select>
                          <input name="catatan" placeholder="Keterangan" aria-label="Keterangan" style={{ maxWidth: 200 }} />
                          <button className="btn btn--ghost btn--sm" type="submit">
                            Simpan
                          </button>
                        </ActionForm>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {hasPerm(ctx, 'admissions.reenroll') && ['in_progress', 'needs_revision', 'submitted'].includes(v.reenroll.status) ? (
                  <div className="row" style={{ marginTop: 10 }}>
                    <ActionButton action="ppdb.du_sahkan" back={`${base}#daftar-ulang`} hidden={{ id, _versi: v.reenroll.version }} label="Sahkan daftar ulang" icon="check" />
                  </div>
                ) : null}
                {hasPerm(ctx, 'admissions.reenroll') && !['verified', 'declined', 'cancelled'].includes(v.reenroll.status) ? (
                  <details className="more" style={{ marginTop: 8 }}>
                    <summary>Perpanjang tenggat</summary>
                    <ActionForm action="ppdb.du_perpanjang" back={`${base}#daftar-ulang`} hidden={{ id }}>
                      <Field name="tenggat" type="datetime-local" label="Tenggat baru" required />
                      <Field name="alasan" label="Alasan" required />
                      <Submit tone="ghost">Perpanjang</Submit>
                    </ActionForm>
                  </details>
                ) : null}
              </Card>
            ) : null}
            {v.reenroll?.status === 'verified' && hasPerm(ctx, 'admissions.convert') ? (
              <Card title="Konversi menjadi siswa">
                {mapped ? (
                  <Notice tone="ok">
                    Sudah menjadi siswa. <Link href={`/staf/siswa/${mapped.studentId}`}>Buka data siswa</Link>
                  </Notice>
                ) : (
                  <ActionForm action="ppdb.konversi" back={base} hidden={{ id }} op confirm="Konversi pendaftar ini menjadi siswa?">
                    {candidates.length ? (
                      <Notice tone="warn" title="Ditemukan data siswa yang mungkin sama">
                        {candidates.map((c) => (
                          <label key={c.id} className="check">
                            <input type="radio" name="siswa" value={c.id} />
                            <span>
                              {c.name} · NIS {c.nis ?? '—'} · NISN {c.nisn ?? '—'} · lahir {fmtDate(c.birthDate)} · {c.status}
                            </span>
                          </label>
                        ))}
                      </Notice>
                    ) : (
                      <p className="small muted">Tidak ada data siswa yang cocok (NISN / nama + tanggal lahir).</p>
                    )}
                    <Select name="mode" label="Data siswa" value="new" options={candidates.length ? [['new', 'Buat siswa baru'], ['existing', 'Cocokkan dengan data terpilih di atas']] : [['new', 'Buat siswa baru']]} />
                    <div className="f__row">
                      <Field name="nis" label="NIS yang diberikan" />
                      <Select name="rombel" label={`Rombel ${v.cycle.targetYear}`} empty="— tempatkan nanti —" options={rooms.map((r) => [r.h.id, r.h.name])} />
                    </div>
                    {!year ? <Notice tone="bad">Tahun ajaran {v.cycle.targetYear} belum dibuat di Data akademik.</Notice> : null}
                    <p className="small muted">Yang diteruskan: identitas terverifikasi, kontak wali, tingkat & tahun masuk, pasfoto/akta/KK/SKL. Nilai seleksi dan catatan panitia tetap di modul penerimaan.</p>
                    <Submit icon="check">Konversi menjadi siswa</Submit>
                  </ActionForm>
                )}
              </Card>
            ) : null}
          </div>
          <div>
            <Card title="Tindakan">
              <div className="stack">
                {canVerify && ['submitted', 'resubmitted'].includes(a.status) ? <ActionButton action="ppdb.periksa" back={base} hidden={{ id }} label="Mulai periksa" icon="checkCircle" /> : null}
                {canVerify && a.status === 'under_verification' ? <ActionButton action="ppdb.verifikasi" back={base} hidden={{ id, _versi: a.version }} label="Tandai terverifikasi" icon="check" tone="ok" /> : null}
                {a.status === 'needs_revision' ? (
                  <Notice tone="warn">
                    Menunggu perbaikan pendaftar{a.revisionDue ? ` (s.d. ${fmtDateTime(a.revisionDue, ctx.tz)})` : ''}: {a.revisionNote}
                  </Notice>
                ) : null}
                {canManage && ['submitted', 'under_verification', 'resubmitted', 'needs_revision', 'verified'].includes(a.status) ? (
                  <details className="more">
                    <summary>Tolak administratif</summary>
                    <ActionForm action="ppdb.tolak" back={base} hidden={{ id }} confirm="Tolak pendaftaran ini secara administratif?">
                      <TextArea name="alasan" label="Alasan (dibaca pendaftar)" required rows={2} />
                      <Submit tone="danger">Tolak</Submit>
                    </ActionForm>
                  </details>
                ) : null}
                {canManage && ['verified', 'rejected'].includes(a.status) ? (
                  <details className="more">
                    <summary>Buka kembali pemeriksaan</summary>
                    <ActionForm action="ppdb.buka_kembali" back={base} hidden={{ id }}>
                      <Field name="alasan" label="Alasan" required />
                      <Submit tone="ghost">Buka kembali</Submit>
                    </ActionForm>
                  </details>
                ) : null}
              </div>
            </Card>
            <Card title="Seleksi & keputusan">
              <dl className="kv">
                <dt>Nilai akhir</dt>
                <dd>{scores?.total ?? '—'}</dd>
                {Object.entries(scores?.parts ?? {}).map(([k, val]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{v.path.components.find((c) => c.code === k)?.label ?? k}</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
                <dt>Kursi</dt>
                <dd>{v.reservation ? <Status value={v.reservation.state} map={SEAT_TONE} /> : '—'}</dd>
              </dl>
              {versions.length ? (
                <ul className="list" style={{ marginTop: 8 }}>
                  {versions.map(({ v: dv, b }) => (
                    <li key={dv.id}>
                      <span className="grow small">
                        v{dv.versionNo} · {b.title} {dv.superseded ? '(diganti)' : ''}
                      </span>
                      <Status value={dv.outcome} map={OUTCOME_TONE} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
            <SelectionPanel v={v} tz={ctx.tz} />
            <BillsPanel v={v} back={base} canPay={hasPerm(ctx, 'finance.manage')} />
            <Card title="Riwayat">
              {timeline.length ? (
                <ul className="timeline">
                  {timeline.map((t) => (
                    <li key={t.id} className={t.action.includes('revision') ? 'warn' : t.action.includes('verify') || t.action.includes('convert') ? 'ok' : ''}>
                      <time>{fmtDateTime(t.occurredAt, ctx.tz)}</time>
                      <span className="small">{t.action.replace('admissions.', '')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Belum ada riwayat.</Empty>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
