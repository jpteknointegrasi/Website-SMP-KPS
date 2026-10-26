import { desc, eq, gte } from 'drizzle-orm'
import { scheduleExceptions, terms as termsT } from '@/db/schema'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { conflicts, DAY_NAMES, eventsBetween, slots as loadSlots, versionsOf, weekGrid } from '@/modules/schedule/service'
import { activeYear, currentTerm } from '@/modules/scope'
import { assignmentsOfTerm, homeroomsOfYear, staffOptions } from '@/modules/academic/service'
import { addDays, fmtDate, fmtDateTime, today, weekday } from '@/server/time'
import { WeekGrid } from '@/ui/daily'
import { VERSION_TONE } from '@/ui/tones'
import { ActionButton, ActionForm, Badge, Card, Check, Empty, Field, Flash, Notice, PageHead, Select, sp1, Status, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Jadwal & kalender' }

const EVENT_KINDS = [
  ['kegiatan', 'Kegiatan'],
  ['ujian', 'Ujian/asesmen'],
  ['libur', 'Libur'],
  ['rapat', 'Rapat'],
] as const

/** ACA-01: time slots, versioned timetable per term with conflict guard, date exceptions, academic calendar. */
export default async function SchedulePage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/jadwal', ['academic.manage', 'teach'], 'akademik')
  const sp = await searchParams
  const manage = hasPerm(ctx, 'academic.manage')
  const tab = sp1(sp, 'tab') ?? 'jadwal'
  const year = await activeYear(ctx.db)
  const allTerms = year ? await ctx.db.select().from(termsT).where(eq(termsT.yearId, year.id)) : []
  const cur = await currentTerm(ctx)
  const term = allTerms.find((t) => t.id === sp1(sp, 'semester')) ?? cur ?? allTerms[0] ?? null
  const slotRows = await loadSlots(ctx.db)
  const rooms = year ? await homeroomsOfYear(ctx, year.id) : []
  const rombel = rooms.find((r) => r.h.id === sp1(sp, 'rombel'))?.h.id ?? rooms[0]?.h.id ?? null
  const versions = term ? await versionsOf(ctx.db, term.id) : []
  const version = versions.find((v) => v.id === sp1(sp, 'versi')) ?? versions.find((v) => v.status === 'draft' && manage) ?? versions.find((v) => v.status === 'published') ?? versions[0] ?? null
  const cells = version && rombel ? await weekGrid(ctx.db, version.id, rombel) : []
  const clash = version ? await conflicts(ctx.db, version.id) : []
  const asg = term && rombel ? (await assignmentsOfTerm(ctx, term.id)).filter((a) => a.a.homeroomId === rombel) : []
  const editable = manage && version?.status === 'draft'
  const d = today(ctx.tz, ctx.now)
  const exceptions = tab === 'pengecualian' ? await ctx.db.select().from(scheduleExceptions).where(gte(scheduleExceptions.date, addDays(d, -30))).orderBy(desc(scheduleExceptions.date)) : []
  const staff = tab === 'pengecualian' ? await staffOptions(ctx) : []
  const events = tab === 'kalender' ? await eventsBetween(ctx.db, addDays(d, -60), addDays(d, 240), 'staff') : []
  const q = (o: Record<string, string | null | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ tab, semester: term?.id, rombel, versi: version?.id, ...o })) if (v) p.set(k, v)
    return `/staf/jadwal?${p}`
  }
  const back = q({})
  const roomName = (id: string | null) => rooms.find((r) => r.h.id === id)?.h.name ?? 'Semua rombel'
  const slotName = (id: string | null) => slotRows.find((s) => s.id === id)?.label ?? 'Sepanjang hari'
  const tabs: [string, string][] = [
    ['Jadwal pelajaran', q({ tab: 'jadwal' })],
    ['Kalender akademik', q({ tab: 'kalender' })],
  ]
  if (manage) tabs.splice(1, 0, ['Pengecualian & pengganti', q({ tab: 'pengecualian' })], ['Jam pelajaran', q({ tab: 'jam' })])
  return (
    <>
      <PageHead title="Jadwal & kalender akademik" sub={term ? `Semester ${term.name} ${year?.name ?? ''} · ${fmtDate(term.startDate, undefined, true)} – ${fmtDate(term.endDate, undefined, true)}` : 'Belum ada tahun ajaran aktif.'} />
      <Flash sp={sp} />
      <Tabs current={q({ tab })} items={tabs} />
      {tab === 'jadwal' ? (
        !term ? (
          <Empty icon="calendar">Aktifkan tahun ajaran dan semester di Data akademik terlebih dahulu.</Empty>
        ) : (
          <div className="stack">
            <Card>
              <form method="get" className="filters">
                <input type="hidden" name="tab" value="jadwal" />
                <Select name="semester" label="Semester" value={term.id} options={allTerms.map((t) => [t.id, t.name])} />
                <Select name="rombel" label="Rombel" value={rombel} options={rooms.map((r) => [r.h.id, r.h.name])} />
                {versions.length ? <Select name="versi" label="Versi" value={version?.id} options={versions.map((v) => [v.id, `Versi ${v.versionNo} · ${VERSION_TONE[v.status]?.[0] ?? v.status}`])} /> : null}
                <Submit tone="ghost">Tampilkan</Submit>
              </form>
            </Card>
            {!slotRows.length ? <Notice tone="warn" title="Jam pelajaran belum diatur">{manage ? 'Atur di tab "Jam pelajaran".' : 'Hubungi Waka Kurikulum.'}</Notice> : null}
            {version ? (
              <Card
                title={
                  <span className="row">
                    Versi {version.versionNo} <Status value={version.status} map={VERSION_TONE} />
                    {version.effectiveFrom ? <span className="small muted">berlaku mulai {fmtDate(version.effectiveFrom)}</span> : null}
                  </span>
                }
                actions={
                  manage ? (
                    version.status === 'draft' ? (
                      <ActionForm action="jadwal.publikasi" back={back} hidden={{ versi: version.id }} className="row" confirm="Publikasikan jadwal ini? Versi yang sedang berlaku akan digantikan.">
                        <input type="date" name="berlaku" aria-label="Berlaku mulai" defaultValue={d} />
                        <Submit icon="megaphone">Publikasikan</Submit>
                      </ActionForm>
                    ) : !versions.some((v) => v.status === 'draft') ? (
                      <ActionButton action="jadwal.versi_baru" back={back} hidden={{ semester: term.id }} label="Buat versi baru (revisi)" tone="ghost" icon="plus" />
                    ) : null
                  ) : null
                }
              >
                {clash.length ? (
                  <Notice tone="bad" title={`${clash.length} bentrok jadwal`}>
                    <ul>
                      {clash.map((c, i) => (
                        <li key={i}>
                          {c.kind === 'guru' ? 'Guru' : 'Ruang'} <strong>{c.who}</strong> · {DAY_NAMES[c.day]} {c.slot}: {c.homerooms.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </Notice>
                ) : null}
                {editable ? <p className="small muted">Klik sel untuk mengisi/mengubah. Bentrok guru atau ruang ditandai dan harus diselesaikan sebelum publikasi.</p> : null}
                <WeekGrid
                  slots={slotRows}
                  cells={cells}
                  today={weekday(d)}
                  edit={
                    editable
                      ? (day, s, c) => (
                          <details>
                            <summary>
                              {c ? (
                                <>
                                  <strong>{c.subject}</strong>
                                  <small>
                                    {c.teacher}
                                    {c.e.room ? ` · ${c.e.room}` : ''}
                                  </small>
                                </>
                              ) : (
                                <span className="muted">＋</span>
                              )}
                            </summary>
                            <ActionForm action="jadwal.sel" back={back} hidden={{ versi: version.id, rombel, hari: day, jam: s.id }}>
                              <strong className="small">
                                {DAY_NAMES[day]} · {s.label}
                              </strong>
                              <Select name="penugasan" label="Mapel & guru" value={c?.e.assignmentId} empty="— kosongkan —" options={asg.map((a) => [a.a.id, `${a.subject} · ${a.teacher}`])} />
                              <Field name="ruang" label="Ruang (opsional)" value={c?.e.room} maxLength={40} />
                              <Submit>Simpan</Submit>
                            </ActionForm>
                          </details>
                        )
                      : undefined
                  }
                />
                {editable && !asg.length ? <p className="small muted">Belum ada penugasan mengajar untuk rombel ini. Tambahkan di Data akademik.</p> : null}
              </Card>
            ) : (
              <Card>
                <Empty icon="calendar">Belum ada jadwal untuk semester ini.</Empty>
                {manage ? (
                  <div className="center">
                    <ActionButton action="jadwal.versi_baru" back={back} hidden={{ semester: term.id }} label="Mulai menyusun jadwal" icon="plus" />
                  </div>
                ) : null}
              </Card>
            )}
          </div>
        )
      ) : null}
      {tab === 'jam' && manage ? (
        <Card title="Jam pelajaran">
          <ActionForm action="jadwal.jam" back={q({ tab: 'jam' })}>
            <TextArea
              name="jam"
              label="Satu baris per jam: urutan | label | mulai | selesai | pelajaran/istirahat"
              rows={14}
              value={slotRows.map((s) => `${s.ordinal} | ${s.label} | ${s.startTime} | ${s.endTime} | ${s.kind === 'break' ? 'istirahat' : 'pelajaran'}`).join('\n') || '1 | Jam 1 | 07:15 | 07:55 | pelajaran\n2 | Jam 2 | 07:55 | 08:35 | pelajaran\n3 | Istirahat | 08:35 | 08:50 | istirahat'}
            />
            <p className="small muted">Jam yang sudah dipakai jadwal tidak dihapus; ubah label/waktunya saja. Waktu dalam zona sekolah.</p>
            <div className="f__actions">
              <Submit>Simpan jam pelajaran</Submit>
            </div>
          </ActionForm>
        </Card>
      ) : null}
      {tab === 'pengecualian' && manage ? (
        <div className="grid grid--side">
          <Card title="Pengecualian 30 hari terakhir & mendatang" flush>
            {exceptions.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis</th>
                      <th>Cakupan</th>
                      <th>Keterangan</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map((e) => (
                      <tr key={e.id}>
                        <td className="nowrap">{fmtDate(e.date)}</td>
                        <td>
                          <Badge tone={e.kind === 'pengganti' ? 'info' : 'warn'}>{e.kind}</Badge>
                        </td>
                        <td>
                          {roomName(e.homeroomId)} · {slotName(e.slotId)}
                        </td>
                        <td>{e.note ?? '—'}</td>
                        <td className="actions">
                          <ActionButton action="jadwal.pengecualian_hapus" back={q({ tab: 'pengecualian' })} hidden={{ id: e.id }} label="Hapus" tone="danger-ghost" small />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="calendar">Tidak ada pengecualian.</Empty>
            )}
          </Card>
          <Card title="Tambah pengecualian">
            <ActionForm action="jadwal.pengecualian" back={q({ tab: 'pengecualian' })}>
              <Field name="tanggal" label="Tanggal" type="date" value={d} required />
              <Select
                name="jenis"
                label="Jenis"
                options={[
                  ['libur', 'Libur (tidak ada pelajaran)'],
                  ['batal', 'Pelajaran ditiadakan'],
                  ['pengganti', 'Guru pengganti'],
                ]}
              />
              <Select name="rombel" label="Rombel" empty="Semua rombel" options={rooms.map((r) => [r.h.id, r.h.name])} />
              <Select name="jam" label="Jam" empty="Sepanjang hari" options={slotRows.filter((s) => s.kind === 'lesson').map((s) => [s.id, `${s.label} (${s.startTime})`])} />
              <Select name="pengganti" label="Guru pengganti (untuk jenis pengganti)" empty="—" options={staff.map((s) => [s.id, s.name])} />
              <Field name="catatan" label="Keterangan" maxLength={200} />
              <div className="f__actions">
                <Submit>Simpan</Submit>
              </div>
            </ActionForm>
          </Card>
        </div>
      ) : null}
      {tab === 'kalender' ? (
        <div className="grid grid--side">
          <Card title="Kalender akademik" flush>
            {events.length ? (
              <ul className="list" style={{ padding: '0 20px' }}>
                {events.map((e) => (
                  <li key={e.id} style={{ alignItems: 'flex-start' }}>
                    <span className="nowrap small" style={{ minWidth: 130 }}>
                      <strong>{fmtDate(e.startDate, undefined, true)}</strong>
                      {e.endDate !== e.startDate ? ` – ${fmtDate(e.endDate, undefined, true)}` : ''}
                    </span>
                    <span className="grow">
                      <strong>{e.title}</strong> <Badge tone={e.kind === 'libur' ? 'warn' : e.kind === 'ujian' ? 'info' : 'muted'}>{EVENT_KINDS.find((k) => k[0] === e.kind)?.[1] ?? e.kind}</Badge>
                      {e.isPublic ? <Badge tone="brand">Tampil di website</Badge> : null}
                      {e.description ? <div className="small muted">{e.description}</div> : null}
                      <div className="small muted">Untuk: {e.audience === 'staff' ? 'staf' : e.audience === 'families' ? 'siswa & orang tua' : 'semua'}</div>
                    </span>
                    {manage ? <ActionButton action="kalender.hapus" back={q({ tab: 'kalender' })} hidden={{ id: e.id }} label="Hapus" tone="danger-ghost" small /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="calendar">Belum ada agenda.</Empty>
            )}
          </Card>
          {manage ? (
            <Card title="Tambah agenda">
              <ActionForm action="kalender.simpan" back={q({ tab: 'kalender' })}>
                <Field name="judul" label="Judul" required maxLength={200} />
                <Select name="jenis" label="Jenis" options={EVENT_KINDS} />
                <div className="f__row">
                  <Field name="mulai" label="Mulai" type="date" required />
                  <Field name="selesai" label="Selesai" type="date" />
                </div>
                <Select
                  name="sasaran"
                  label="Untuk"
                  options={[
                    ['all', 'Semua warga sekolah'],
                    ['families', 'Siswa & orang tua'],
                    ['staff', 'Staf saja'],
                  ]}
                />
                <TextArea name="keterangan" label="Keterangan" rows={3} maxLength={1000} />
                <Check name="publik" label="Tampilkan di agenda website sekolah" />
                <div className="f__actions">
                  <Submit>Simpan agenda</Submit>
                </div>
              </ActionForm>
              <p className="small muted" style={{ marginTop: 10 }}>
                Libur pada kalender bersifat informasi. Untuk meniadakan pelajaran gunakan Pengecualian.
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}
      <p className="small muted" style={{ marginTop: 16 }}>
        Terakhir dipublikasikan: {versions.find((v) => v.status === 'published')?.publishedAt ? fmtDateTime(versions.find((v) => v.status === 'published')!.publishedAt, ctx.tz) : '—'}
      </p>
    </>
  )
}
