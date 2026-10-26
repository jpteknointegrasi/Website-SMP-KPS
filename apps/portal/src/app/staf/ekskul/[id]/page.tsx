import { eq } from 'drizzle-orm'
import { terms as termsT } from '@/db/schema'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { activityDetail, evaluationsOf, MEMBER_STATUS, PREDICATES } from '@/modules/activities/service'
import { staffOptions } from '@/modules/academic/service'
import { currentTerm } from '@/modules/scope'
import { fmtDate, today } from '@/server/time'
import { ActionButton, ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, Select, sp1, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Kegiatan' }

export default async function ActivityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/ekskul/${id}`, ['activities.manage', 'activities.coach'], 'ekskul')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'anggota'
  const d = await activityDetail(ctx, id)
  const a = d.a
  const active = d.members.filter((m) => m.m.status === 'active')
  const waiting = d.members.filter((m) => ['applied', 'consented'].includes(m.m.status))
  const term = await currentTerm(ctx)
  const allTerms = await ctx.db.select().from(termsT).where(eq(termsT.yearId, a.yearId))
  const termId = allTerms.find((t) => t.id === sp1(sp, 'semester'))?.id ?? term?.id ?? allTerms[0]?.id
  const evals = tab === 'nilai' && termId ? await evaluationsOf(ctx.db, id, termId) : []
  const manage = hasPerm(ctx, 'activities.manage')
  const staff = tab === 'atur' && manage ? await staffOptions(ctx) : []
  const base = `/staf/ekskul/${id}`
  const tabs: [string, string][] = [
    [`Anggota & pendaftar${waiting.length ? ` (${waiting.length})` : ''}`, `${base}?tab=anggota`],
    ['Pertemuan & kehadiran', `${base}?tab=pertemuan`],
    ['Penilaian rapor', `${base}?tab=nilai`],
  ]
  if (manage) tabs.push(['Pengaturan', `${base}?tab=atur`])
  return (
    <>
      <PageHead title={a.name} sub={[a.schedule, a.location, a.capacity ? `kuota ${a.capacity}` : null].filter(Boolean).join(' · ') || undefined} crumbs={[['Ekstrakurikuler', '/staf/ekskul'], [a.name]]} />
      <Flash sp={sp} />
      <Tabs current={`${base}?tab=${tab}`} items={tabs} />
      {tab === 'anggota' ? (
        <div className="grid grid--2">
          <Card title={`Pendaftar (${waiting.length})`}>
            {waiting.length ? (
              <ul className="list">
                {waiting.map(({ m, name }) => (
                  <li key={m.id} style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div className="grow">
                      <strong>{name}</strong> <Badge tone={m.status === 'consented' ? 'info' : 'warn'}>{MEMBER_STATUS[m.status as keyof typeof MEMBER_STATUS]}</Badge>
                      {m.motivation ? <div className="small muted">“{m.motivation}”</div> : null}
                    </div>
                    <ActionForm action="ekskul.putuskan" back={base} hidden={{ id: m.id }} className="row">
                      {m.status === 'applied' ? <Check name="izin_tertulis" label="Izin tertulis diterima" /> : null}
                      <Submit name="keputusan" value="terima" tone="ok">
                        Terima
                      </Submit>
                      <Submit name="keputusan" value="tolak" tone="ghost">
                        Tolak
                      </Submit>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="inbox">Tidak ada pendaftar baru.</Empty>
            )}
          </Card>
          <Card title={`Anggota (${active.length}${a.capacity ? `/${a.capacity}` : ''})`}>
            {active.length ? (
              <ul className="list">
                {active.map(({ m, name, nis }) => (
                  <li key={m.id}>
                    <span className="grow">
                      <strong>{name}</strong>
                      <div className="small muted">{nis ?? '—'}</div>
                    </span>
                    <ActionButton action="ekskul.keluar" back={base} hidden={{ id: m.id }} label="Keluarkan" tone="danger-ghost" small />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="users">Belum ada anggota.</Empty>
            )}
          </Card>
        </div>
      ) : null}
      {tab === 'pertemuan' ? (
        <div className="grid grid--side">
          <Card title="Riwayat pertemuan" flush>
            {d.sessions.length ? (
              <table className="t">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Materi</th>
                    <th className="num">Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  {d.sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="nowrap">{fmtDate(s.date)}</td>
                      <td>{s.topic ?? '—'}</td>
                      <td className="num">
                        {Object.values(s.attendance).filter((v) => v === 'H').length}/{Object.keys(s.attendance).length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty icon="calendar">Belum ada pertemuan tercatat.</Empty>
            )}
          </Card>
          <Card title="Catat pertemuan">
            {active.length ? (
              <ActionForm action="ekskul.pertemuan" back={`${base}?tab=pertemuan`} hidden={{ kegiatan: id }}>
                <Field name="tanggal" label="Tanggal" type="date" value={today(ctx.tz, ctx.now)} max={today(ctx.tz, ctx.now)} required />
                <Field name="materi" label="Materi / kegiatan" />
                <table className="t">
                  <tbody>
                    {active.map(({ m, name }) => (
                      <tr key={m.id}>
                        <td>{name}</td>
                        <td>
                          <select name={`h:${m.studentId}`} defaultValue="H" aria-label={`Kehadiran ${name}`}>
                            <option value="H">Hadir</option>
                            <option value="S">Sakit</option>
                            <option value="I">Izin</option>
                            <option value="A">Alpa</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Submit>Simpan pertemuan</Submit>
              </ActionForm>
            ) : (
              <p className="small muted">Belum ada anggota aktif.</p>
            )}
          </Card>
        </div>
      ) : null}
      {tab === 'nilai' ? (
        <Card title="Penilaian untuk rapor" flush>
          <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
            <input type="hidden" name="tab" value="nilai" />
            <Select name="semester" label="Semester" value={termId} options={allTerms.map((t) => [t.id, t.name])} />
            <Submit tone="ghost">Tampilkan</Submit>
          </form>
          {active.length && termId ? (
            <ActionForm action="ekskul.nilai" back={`${base}?tab=nilai&semester=${termId}`} hidden={{ kegiatan: id, semester: termId }}>
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Anggota</th>
                      <th>Predikat</th>
                      <th style={{ minWidth: 300 }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(({ m, name }) => {
                      const e = evals.find((x) => x.studentId === m.studentId)
                      return (
                        <tr key={m.id}>
                          <td>{name}</td>
                          <td>
                            <select name={`p:${m.studentId}`} defaultValue={e?.predicate ?? ''} aria-label={`Predikat ${name}`}>
                              <option value="">—</option>
                              {PREDICATES.map((p) => (
                                <option key={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input name={`d:${m.studentId}`} defaultValue={e?.description ?? ''} maxLength={300} style={{ width: '100%' }} aria-label={`Keterangan ${name}`} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 20px 16px' }}>
                <Submit>Simpan penilaian</Submit>
              </div>
            </ActionForm>
          ) : (
            <Empty icon="users">Belum ada anggota aktif.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'atur' && manage ? (
        <Card title="Pengaturan kegiatan">
          <ActionForm action="ekskul.simpan" back={`${base}?tab=atur`} hidden={{ id }}>
            <Field name="nama" label="Nama kegiatan" value={a.name} required />
            <div className="f__row">
              <Select
                name="kategori"
                label="Jenis"
                value={a.category}
                options={[
                  ['minat', 'Pilihan'],
                  ['wajib', 'Wajib'],
                ]}
              />
              <Field name="kuota" label="Kuota" type="number" min={1} value={a.capacity} />
            </div>
            <Select name="pembina" label="Pembina" value={a.coachId} empty="— belum ditetapkan —" options={staff.map((s) => [s.id, s.name])} />
            <div className="f__row">
              <Field name="jadwal" label="Jadwal" value={a.schedule} />
              <Field name="tempat" label="Tempat" value={a.location} />
            </div>
            <TextArea name="deskripsi" label="Deskripsi" rows={3} value={a.description} />
            <Check name="izin" label="Perlu persetujuan orang tua" checked={a.requiresConsent} />
            <Select
              name="status"
              label="Status"
              value={a.status}
              options={[
                ['open', 'Pendaftaran dibuka'],
                ['closed', 'Pendaftaran ditutup'],
                ['archived', 'Arsip'],
              ]}
            />
            <Submit>Simpan</Submit>
          </ActionForm>
        </Card>
      ) : null}
    </>
  )
}
