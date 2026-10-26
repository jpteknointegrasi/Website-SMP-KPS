import Link from 'next/link'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { homeroomReport, PROMOTION } from '@/modules/reports/service'
import { currentTerm } from '@/modules/scope'
import { fmtDateTime } from '@/server/time'
import { ActionButton, ActionForm, Badge, Card, Empty, Flash, Notice, PageHead, sp1, Stat, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Rapor rombel' }

const CARD: Record<string, [string, 'muted' | 'warn' | 'info' | 'ok']> = { draft: ['Draf', 'muted'], submitted: ['Diajukan', 'warn'], approved: ['Disetujui', 'info'], released: ['Dirilis', 'ok'] }

/** RPT-01 one homeroom: subject completeness, homeroom notes & promotion, submit → approve → release. */
export default async function HomeroomReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/rapor/${id}`, ['teach', 'reports.review', 'reports.release'], 'nilai_rapor')
  const sp = await searchParams
  const termId = sp1(sp, 'semester') ?? (await currentTerm(ctx))?.id
  if (!termId) return <Empty icon="file">Belum ada semester aktif.</Empty>
  const r = await homeroomReport(ctx, id, termId)
  const isWali = r.homeroom.h.homeroomTeacherId === ctx.staff.id
  const back = `/staf/rapor/${id}?semester=${termId}`
  const count = (s: string) => r.students.filter((p) => (p.card?.status ?? 'draft') === s).length
  const drafts = count('draft')
  const lastRelease = r.students.reduce<Date | null>((m, p) => (p.card?.releasedAt && (!m || p.card.releasedAt > m) ? p.card.releasedAt : m), null)
  const returned = r.students.find((p) => p.card?.returnNote && p.card.status === 'draft')?.card?.returnNote
  return (
    <>
      <PageHead title={`Rapor ${r.homeroom.h.name}`} sub={`Semester ${r.term.name} ${r.homeroom.year} · wali kelas ${r.homeroom.teacher ?? '—'}`} crumbs={[['Rapor', `/staf/rapor?semester=${termId}`], [r.homeroom.h.name]]} />
      <Flash sp={sp} />
      {returned ? (
        <Notice tone="warn" title="Catatan perbaikan">
          {returned}
        </Notice>
      ) : null}
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Stat icon="list" tone={r.complete ? 'ok' : 'warn'} label="Mapel terkirim" value={`${r.subjects.filter((s) => s.submission?.status === 'submitted').length}/${r.subjects.length}`} />
        <Stat icon="edit" label="Draf" value={drafts} />
        <Stat icon="clock" tone={count('submitted') ? 'warn' : undefined} label="Menunggu persetujuan" value={count('submitted')} />
        <Stat icon="checkCircle" tone={count('released') === r.students.length && r.students.length ? 'ok' : undefined} label="Dirilis" value={count('released')} />
      </div>
      <div className="grid grid--side">
        <div className="stack">
          <Card title="Catatan wali kelas" flush>
            <ActionForm action="rapor.catatan" back={back} hidden={{ rombel: id, semester: termId }} id="catatan" className="inline">
              {null}
            </ActionForm>
            {r.students.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Siswa</th>
                      <th style={{ minWidth: 320 }}>Catatan</th>
                      {r.last ? <th>Keputusan</th> : null}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.students.map((p) => {
                      const editable = (isWali || hasPerm(ctx, 'academic.manage')) && (p.card?.status ?? 'draft') === 'draft'
                      return (
                        <tr key={p.studentId} style={{ verticalAlign: 'top' }}>
                          <td>
                            <strong>{p.name}</strong>
                            <div className="small muted">{p.nis ?? '—'}</div>
                            {p.card ? (
                              <Link className="small" href={`/staf/rapor/kartu/${p.card.id}`}>
                                Pratinjau
                              </Link>
                            ) : null}
                          </td>
                          <td>
                            <textarea form="catatan" name={`cat:${p.studentId}`} rows={2} defaultValue={p.card?.notes ?? ''} maxLength={1000} disabled={!editable} aria-label={`Catatan ${p.name}`} />
                          </td>
                          {r.last ? (
                            <td>
                              <select form="catatan" name={`naik:${p.studentId}`} defaultValue={p.card?.promotion ?? ''} disabled={!editable} aria-label={`Keputusan ${p.name}`}>
                                <option value="">—</option>
                                {Object.entries(PROMOTION)
                                  .filter(([k]) => (r.homeroom.grade.final ? k !== 'naik' : k !== 'lulus'))
                                  .map(([k, v]) => (
                                    <option key={k} value={k}>
                                      {v}
                                    </option>
                                  ))}
                              </select>
                            </td>
                          ) : null}
                          <td>
                            <Badge tone={CARD[p.card?.status ?? 'draft']![1]}>{CARD[p.card?.status ?? 'draft']![0]}</Badge>
                            {p.card?.versionNo ? <div className="small muted">versi {p.card.versionNo}</div> : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="users">Belum ada siswa.</Empty>
            )}
            {drafts && (isWali || hasPerm(ctx, 'academic.manage')) ? (
              <div className="row" style={{ padding: '12px 20px' }}>
                <button className="btn btn--ghost" type="submit" form="catatan">
                  Simpan catatan
                </button>
                {isWali ? (
                  <ActionForm action="rapor.ajukan" back={back} hidden={{ rombel: id, semester: termId }} className="inline" confirm="Ajukan rapor ke Waka Kurikulum? Simpan catatan terlebih dahulu.">
                    <Submit icon="arrowRight">Ajukan rapor</Submit>
                  </ActionForm>
                ) : null}
                {!r.complete ? <span className="small muted">Pengajuan aktif setelah semua mapel mengirim nilai.</span> : null}
              </div>
            ) : null}
          </Card>
        </div>
        <div className="stack">
          <Card title="Kelengkapan nilai mapel">
            <ul className="list">
              {r.subjects.map((s) => (
                <li key={s.a.id} style={{ flexWrap: 'wrap' }}>
                  <span className="grow">
                    <strong>{s.subject.name}</strong>
                    <div className="small muted">{s.teacher}</div>
                  </span>
                  {s.submission?.status === 'submitted' ? (
                    <>
                      <Badge tone="ok">Terkirim</Badge>
                      {isWali || hasPerm(ctx, 'reports.review') ? (
                        <details className="more">
                          <summary className="small">Kembalikan</summary>
                          <ActionForm action="nilai.kembalikan" back={back} hidden={{ kelas: s.a.id }}>
                            <TextArea name="catatan" label="Yang perlu diperbaiki" rows={2} required />
                            <Submit tone="ghost">Kembalikan ke guru</Submit>
                          </ActionForm>
                        </details>
                      ) : null}
                    </>
                  ) : s.submission?.status === 'returned' ? (
                    <Badge tone="warn">Dikembalikan</Badge>
                  ) : (
                    <Badge tone="muted">Belum</Badge>
                  )}
                </li>
              ))}
            </ul>
            {!r.subjects.length ? <Empty icon="list">Belum ada penugasan mengajar di rombel ini.</Empty> : null}
          </Card>
          {hasPerm(ctx, 'reports.review', 'reports.release') ? (
            <Card title="Persetujuan & rilis">
              {count('submitted') && hasPerm(ctx, 'reports.review') ? (
                <div className="stack">
                  <ActionButton action="rapor.setujui" back={back} hidden={{ rombel: id, semester: termId }} label={`Setujui ${count('submitted')} rapor`} icon="check" tone="ok" />
                  <details className="more">
                    <summary>Kembalikan ke wali kelas</summary>
                    <ActionForm action="rapor.kembalikan" back={back} hidden={{ rombel: id, semester: termId }}>
                      <TextArea name="catatan" label="Catatan perbaikan" rows={2} required />
                      <Submit tone="ghost">Kembalikan</Submit>
                    </ActionForm>
                  </details>
                </div>
              ) : null}
              {count('approved') && hasPerm(ctx, 'reports.release') ? (
                <ActionForm action="rapor.rilis" back={back} hidden={{ rombel: id, semester: termId }} confirm="Rilis rapor ke siswa dan orang tua?">
                  <p className="small muted">{count('approved')} rapor sudah disetujui dan siap dirilis. Siswa & orang tua (dengan akses akademik) mendapat notifikasi.</p>
                  <Submit icon="megaphone">Rilis rapor</Submit>
                </ActionForm>
              ) : null}
              {!count('submitted') && !count('approved') ? <p className="small muted">Tidak ada rapor yang menunggu tindakan.</p> : null}
              {lastRelease ? <p className="small muted">Terakhir dirilis {fmtDateTime(lastRelease, ctx.tz)}.</p> : null}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}
