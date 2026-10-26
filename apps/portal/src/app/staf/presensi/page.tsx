import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { EDIT_DAYS, homeroomDay, homeroomRecap, pendingCorrections, pendingLeaves } from '@/modules/attendance/service'
import { activeYear, myHomerooms } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { addDays, fmtDate, fmtDateTime, fmtDayDate, isDate, today, weekday } from '@/server/time'
import { RecapMeter, RollRows } from '@/ui/daily'
import { ATT_TONE } from '@/ui/tones'
import { ActionForm, Badge, Card, Empty, Field, fileUrl, Flash, Notice, PageHead, Select, sp1, Stat, Status, Submit, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Presensi' }

/** ATT-01: daily homeroom attendance (edit window), leave requests from guardians, corrections, recap. */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/presensi', ['teach', 'academic.manage'], 'akademik')
  const sp = await searchParams
  const manage = hasPerm(ctx, 'academic.manage')
  const tab = sp1(sp, 'tab') ?? 'harian'
  const year = await activeYear(ctx.db)
  const mine = await myHomerooms(ctx)
  const rooms = manage && year ? (await homeroomsOfYear(ctx, year.id)).map((r) => r.h) : mine
  const rombel = rooms.find((r) => r.id === sp1(sp, 'rombel'))?.id ?? rooms[0]?.id ?? null
  const now = today(ctx.tz, ctx.now)
  const d = isDate(sp1(sp, 'tanggal')) && sp1(sp, 'tanggal')! <= now ? sp1(sp, 'tanggal')! : now
  const leaves = await pendingLeaves(ctx)
  const corrections = manage ? await pendingCorrections(ctx) : []
  const day = tab === 'harian' && rombel ? await homeroomDay(ctx, rombel, d) : []
  const from = isDate(sp1(sp, 'dari')) ? sp1(sp, 'dari')! : `${now.slice(0, 7)}-01`
  const to = isDate(sp1(sp, 'sampai')) ? sp1(sp, 'sampai')! : now
  const recap = tab === 'rekap' && rombel ? await homeroomRecap(ctx, rombel, from, to) : []
  const locked = d < addDays(now, -EDIT_DAYS)
  const recorded = day.filter((r) => r.record).length
  const q = (o: Record<string, string | null | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ tab, rombel, tanggal: d, ...o })) if (v) p.set(k, v)
    return `/staf/presensi?${p}`
  }
  const tabs: [string, string][] = [
    ['Presensi harian', q({ tab: 'harian' })],
    [`Pengajuan izin${leaves.length ? ` (${leaves.length})` : ''}`, q({ tab: 'izin' })],
    ['Rekap', q({ tab: 'rekap' })],
  ]
  if (manage) tabs.splice(2, 0, [`Koreksi${corrections.length ? ` (${corrections.length})` : ''}`, q({ tab: 'koreksi' })])
  const weekend = weekday(d) === 0
  return (
    <>
      <PageHead title="Presensi & izin" sub="Wali kelas mencatat presensi harian; izin dari orang tua menyesuaikan status setelah disetujui." />
      <Flash sp={sp} />
      <Tabs current={q({ tab })} items={tabs} />
      {!rooms.length && tab !== 'izin' ? <Empty icon="users">Anda bukan wali kelas pada tahun ajaran aktif.</Empty> : null}
      {tab === 'harian' && rombel ? (
        <div className="stack">
          <Card>
            <form method="get" className="filters">
              <input type="hidden" name="tab" value="harian" />
              <Select name="rombel" label="Rombel" value={rombel} options={rooms.map((r) => [r.id, r.name])} />
              <Field name="tanggal" label="Tanggal" type="date" value={d} max={now} />
              <Submit tone="ghost">Tampilkan</Submit>
            </form>
          </Card>
          <div className="grid grid--4">
            {(['H', 'S', 'I', 'A'] as const).map((k) => (
              <Stat key={k} icon={k === 'H' ? 'checkCircle' : k === 'A' ? 'alert' : 'info'} tone={k === 'H' ? 'ok' : k === 'A' ? 'bad' : 'warn'} label={ATT_TONE[k]![0]} value={day.filter((r) => r.record?.status === k).length} />
            ))}
          </div>
          {weekend ? <Notice tone="info">Hari Minggu — biasanya tidak ada presensi.</Notice> : null}
          {locked ? <Notice tone="warn">Lewat {EDIT_DAYS} hari: presensi tanggal ini hanya dapat diubah melalui koreksi.</Notice> : null}
          <Card title={`${rooms.find((r) => r.id === rombel)?.name} · ${fmtDayDate(d)}`} actions={<span className="small muted">{recorded ? `${recorded}/${day.length} tercatat` : 'Belum dicatat — semua diisi Hadir'}</span>}>
            {day.length ? (
              <ActionForm action="presensi.harian" back={q({})} hidden={{ rombel, tanggal: d }}>
                <RollRows
                  disabled={locked}
                  rows={day.map((r) => ({
                    studentId: r.studentId,
                    name: r.name,
                    nis: r.nis,
                    status: r.record?.status ?? (r.leave?.status === 'approved' ? (r.leave.kind === 'sakit' ? 'S' : r.leave.kind === 'dispensasi' ? 'D' : 'I') : 'H'),
                    note: r.record?.note,
                    hint: r.leave ? <Badge tone={r.leave.status === 'approved' ? 'info' : 'warn'}>{r.leave.status === 'approved' ? `Izin ${r.leave.kind}` : 'Izin diajukan'}</Badge> : null,
                  }))}
                />
                {!locked ? (
                  <div className="f__actions">
                    <Submit icon="check">Simpan presensi</Submit>
                  </div>
                ) : null}
              </ActionForm>
            ) : (
              <Empty icon="users">Tidak ada siswa di rombel ini pada tanggal tersebut.</Empty>
            )}
          </Card>
        </div>
      ) : null}
      {tab === 'izin' ? (
        <Card title="Pengajuan izin menunggu keputusan">
          {leaves.length ? (
            <ul className="list">
              {leaves.map(({ l, name }) => (
                <li key={l.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="grow">
                    <strong>{name}</strong> · <Badge tone="warn">{l.kind}</Badge> {fmtDate(l.fromDate)}
                    {l.toDate !== l.fromDate ? ` – ${fmtDate(l.toDate)}` : ''}
                    <div className="small">{l.reason}</div>
                    <div className="small muted">
                      Diajukan {fmtDateTime(l.createdAt, ctx.tz)}
                      {l.fileId ? (
                        <>
                          {' · '}
                          <a href={fileUrl(l.fileId)!} target="_blank" rel="noopener">
                            Lihat lampiran
                          </a>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <ActionForm action="izin.putuskan" back={q({ tab: 'izin' })} hidden={{ id: l.id }} className="row">
                    <input name="catatan" placeholder="Catatan (opsional)" aria-label="Catatan" style={{ maxWidth: 200 }} />
                    <Submit name="keputusan" value="setuju" tone="ok" icon="check">
                      Setujui
                    </Submit>
                    <Submit name="keputusan" value="tolak" tone="ghost">
                      Tolak
                    </Submit>
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="checkCircle">Tidak ada pengajuan izin yang menunggu.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'koreksi' && manage ? (
        <Card title="Usulan koreksi presensi">
          {corrections.length ? (
            <ul className="list">
              {corrections.map(({ c, name }) => (
                <li key={c.id} style={{ flexWrap: 'wrap' }}>
                  <div className="grow">
                    <strong>{name}</strong> · {fmtDate(c.date)} · <Status value={c.fromStatus ?? ''} map={ATT_TONE} /> → <Status value={c.toStatus} map={ATT_TONE} />
                    <div className="small">{c.reason}</div>
                  </div>
                  <ActionForm action="presensi.koreksi_putuskan" back={q({ tab: 'koreksi' })} hidden={{ id: c.id }} className="row">
                    <input name="catatan" placeholder="Catatan" aria-label="Catatan" style={{ maxWidth: 180 }} />
                    <Submit name="keputusan" value="setuju" tone="ok">
                      Terapkan
                    </Submit>
                    <Submit name="keputusan" value="tolak" tone="ghost">
                      Tolak
                    </Submit>
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="checkCircle">Tidak ada usulan koreksi.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'rekap' && rombel ? (
        <div className="stack">
          <Card>
            <form method="get" className="filters">
              <input type="hidden" name="tab" value="rekap" />
              <Select name="rombel" label="Rombel" value={rombel} options={rooms.map((r) => [r.id, r.name])} />
              <Field name="dari" label="Dari" type="date" value={from} />
              <Field name="sampai" label="Sampai" type="date" value={to} />
              <Submit tone="ghost">Tampilkan</Submit>
            </form>
          </Card>
          <Card title={`Rekap ${fmtDate(from)} – ${fmtDate(to)}`} flush>
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th style={{ minWidth: 300 }}>Kehadiran</th>
                    <th className="num">A</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.map((r) => (
                    <tr key={r.studentId}>
                      <td>
                        <strong>{r.name}</strong>
                        <div className="small muted">{r.nis ?? '—'}</div>
                      </td>
                      <td>
                        <RecapMeter r={r.recap} />
                      </td>
                      <td className="num">{r.recap.A ? <Badge tone="bad">{r.recap.A}</Badge> : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <details className="more">
            <summary>Usulkan koreksi presensi (lewat masa ubah)</summary>
            <Card>
              <ActionForm action="presensi.koreksi" back={q({ tab: 'rekap' })}>
                <Select name="siswa" label="Siswa" options={recap.map((r) => [r.studentId, r.name])} required />
                <div className="f__row">
                  <Field name="tanggal" label="Tanggal" type="date" required max={now} />
                  <Select name="status" label="Status seharusnya" options={Object.entries(ATT_TONE).map(([k, v]) => [k, v[0]])} />
                </div>
                <Field name="alasan" label="Alasan" required />
                <Submit>Kirim usulan</Submit>
              </ActionForm>
            </Card>
          </details>
        </div>
      ) : null}
    </>
  )
}
