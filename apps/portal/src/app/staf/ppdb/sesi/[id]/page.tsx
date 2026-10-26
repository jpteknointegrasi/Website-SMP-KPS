import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq, inArray } from 'drizzle-orm'
import { applications, persons, sessionParticipants } from '@/db/schema'
import { staffPage } from '@/server/request'
import { sessionSheet } from '@/modules/admissions/selection'
import { hasPerm } from '@/server/context'
import { fmtDateTime } from '@/server/time'
import { PARTICIPANT_TONE, SCORE_TONE } from '@/ui/tones'
import { ActionButton, ActionForm, Badge, Card, Empty, Field, Flash, Notice, PageHead, Status, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Sesi seleksi' }

/** Session sheet: attendance, scores per component (assessor), locking & corrections (committee). */
export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const ctx = await staffPage(`/staf/ppdb/sesi/${id}`, ['admissions.manage', 'admissions.assess'], 'penerimaan')
  const sp = await searchParams
  const sh = await sessionSheet(ctx, id).catch((e) => {
    if (e?.code === 'not_found' || e?.code === 'forbidden') notFound()
    throw e
  })
  const s = sh.session
  const base = `/staf/ppdb/sesi/${id}`
  const isAssessor = hasPerm(ctx, 'admissions.assess')
  // verified applications that could be added
  const inSession = sh.people.map((p) => p.p.applicationId)
  const avail = sh.manager
    ? (
        await ctx.db
          .select({ id: applications.id, regNo: applications.registrationNo, name: persons.fullName, pathId: applications.pathId })
          .from(applications)
          .innerJoin(persons, eq(persons.id, applications.applicantPersonId))
          .where(and(eq(applications.cycleId, s.cycleId), eq(applications.status, 'verified')))
      ).filter((a) => !inSession.includes(a.id) && (!s.pathId || a.pathId === s.pathId))
    : []
  const busy = avail.length ? (await ctx.db.select({ a: sessionParticipants.applicationId }).from(sessionParticipants).where(and(inArray(sessionParticipants.applicationId, avail.map((a) => a.id)), inArray(sessionParticipants.state, ['scheduled', 'confirmed', 'attended'])))).map((r) => r.a) : []
  return (
    <>
      <PageHead title={s.title} sub={`${fmtDateTime(s.startsAt, ctx.tz)} – ${fmtDateTime(s.endsAt, ctx.tz)} · ${s.location}`} crumbs={[['Penerimaan', '/staf/ppdb'], ['Seleksi', `/staf/ppdb/${s.cycleId}?tab=seleksi`], [s.title]]} actions={sh.manager && s.status === 'scheduled' ? <ActionButton action="ppdb.kunci_nilai" back={base} hidden={{ sesi: id }} label="Kunci nilai sesi" icon="lock" /> : null} />
      <Flash sp={sp} />
      {s.status === 'done' ? <Notice tone="info">Nilai sesi ini sudah dikunci. Koreksi hanya oleh panitia pengelola dengan alasan (revisi tercatat).</Notice> : null}
      <Card title={`Peserta (${sh.people.length}/${s.capacity})`}>
        {sh.people.length ? (
          <ul className="list">
            {sh.people.map((p) => {
              const path = sh.paths.find((x) => x.id === p.pathId)
              const mine = sh.scores.filter((x) => x.applicationId === p.p.applicationId)
              return (
                <li key={p.p.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="grow" style={{ minWidth: 260 }}>
                    <strong>{p.name}</strong> <span className="mono small">{p.regNo}</span> <Status value={p.p.state} map={PARTICIPANT_TONE} />
                    {sh.manager ? (
                      <div className="small">
                        <Link href={`/staf/ppdb/pendaftar/${p.p.applicationId}`}>Detail pendaftar</Link>
                      </div>
                    ) : null}
                    {s.status === 'scheduled' ? (
                      <ActionForm action="ppdb.kehadiran" back={base} hidden={{ peserta: p.p.id }} className="row" >
                        <select name="status" defaultValue={p.p.state === 'scheduled' ? 'attended' : p.p.state} aria-label="Kehadiran">
                          <option value="attended">Hadir</option>
                          <option value="no_show">Tidak hadir</option>
                          <option value="rescheduled">Dijadwal ulang</option>
                          <option value="cancelled">Batal</option>
                        </select>
                        <input name="catatan" placeholder="Keterangan" aria-label="Keterangan" style={{ maxWidth: 180 }} />
                        <button className="btn btn--ghost btn--sm" type="submit">
                          Simpan
                        </button>
                      </ActionForm>
                    ) : null}
                  </div>
                  <div style={{ minWidth: 320, flex: 1 }}>
                    {isAssessor && p.p.state === 'attended' && s.status === 'scheduled' ? (
                      <ActionForm action="ppdb.nilai" back={base} hidden={{ sesi: id, pendaftar: p.p.applicationId }}>
                        {(path?.components ?? []).map((c) => {
                          const cur = mine.find((x) => x.component === c.code && x.assessorId === ctx.staff.id)
                          return (
                            <div key={c.code} className="row">
                              <label className="fld" style={{ width: 160 }}>
                                <span>
                                  {c.label} (0–{c.max})
                                </span>
                                <input name={`nilai:${c.code}`} type="number" min={0} max={c.max} step="0.01" defaultValue={cur?.score ?? ''} disabled={cur?.status === 'locked'} />
                              </label>
                              <label className="fld" style={{ flex: 1 }}>
                                <span>Catatan internal</span>
                                <input name={`catatan:${c.code}`} defaultValue={cur?.note ?? ''} disabled={cur?.status === 'locked'} />
                              </label>
                              {cur ? <Status value={cur.status} map={SCORE_TONE} /> : null}
                            </div>
                          )
                        })}
                        <div className="row">
                          <Submit tone="ghost" name="aksi" value="draf">
                            Simpan draf
                          </Submit>
                          <Submit name="aksi" value="kirim">
                            Kirim nilai
                          </Submit>
                        </div>
                      </ActionForm>
                    ) : mine.length ? (
                      <table className="t">
                        <tbody>
                          {mine.map((x) => (
                            <tr key={x.id}>
                              <td>{path?.components.find((c) => c.code === x.component)?.label ?? x.component}</td>
                              <td className="num">{x.score}</td>
                              <td>
                                <Status value={x.status} map={SCORE_TONE} /> {x.revision > 1 ? <Badge>rev {x.revision}</Badge> : null}
                              </td>
                              <td>
                                {sh.manager && x.status === 'locked' ? (
                                  <details className="more">
                                    <summary>Koreksi</summary>
                                    <ActionForm action="ppdb.koreksi_nilai" back={base} hidden={{ nilai_id: x.id }}>
                                      <Field name="nilai" type="number" label="Nilai baru" required />
                                      <Field name="alasan" label="Alasan" required />
                                      <Submit tone="ghost">Simpan koreksi</Submit>
                                    </ActionForm>
                                  </details>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <span className="small muted">Belum ada nilai.</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty icon="users">Belum ada peserta.</Empty>
        )}
      </Card>
      {sh.manager && s.status === 'scheduled' ? (
        <Card title="Tambah peserta (pendaftar terverifikasi)">
          {avail.length ? (
            <ActionForm action="ppdb.sesi_peserta" back={base} hidden={{ sesi: id }}>
              <div className="row">
                {avail.map((a) => (
                  <label key={a.id} className="check" style={{ minWidth: 240 }}>
                    <input type="checkbox" name="pendaftar" value={a.id} disabled={busy.includes(a.id)} />
                    <span>
                      {a.name} <span className="mono small">{a.regNo}</span> {busy.includes(a.id) ? <Badge>sudah terjadwal</Badge> : null}
                    </span>
                  </label>
                ))}
              </div>
              <Submit icon="plus">Tambahkan & beri tahu</Submit>
            </ActionForm>
          ) : (
            <Empty>Tidak ada pendaftar terverifikasi yang belum terjadwal.</Empty>
          )}
        </Card>
      ) : null}
    </>
  )
}
