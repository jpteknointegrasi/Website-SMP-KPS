import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { placementOn } from '@/modules/scope'
import { eventsBetween, lessonsOn, publishedVersion, slots as loadSlots, termOn, weekGrid } from '@/modules/schedule/service'
import { addDays, clock, fmtDate, fmtDayDate, today, weekday } from '@/server/time'
import { Agenda, WeekGrid } from '@/ui/daily'
import { ChildPicker } from '@/ui/child-picker'
import { Badge, Card, Empty, Flash, Notice, PageHead, sp1, type SP } from '@/ui/kit'

export const metadata = { title: 'Jadwal' }

/** SIS-01/WLI-01 timetable: today (with changes), the week, and upcoming school calendar. */
export default async function FamilySchedule({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/jadwal', 'akademik')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const d = today(ctx.tz, ctx.now)
  const p = current?.canViewAcademic ? await placementOn(ctx.db, current.studentId, d) : null
  const term = await termOn(ctx.db, d)
  const v = term ? await publishedVersion(ctx.db, term.id) : null
  const slotRows = await loadSlots(ctx.db)
  const cells = v && p ? await weekGrid(ctx.db, v.id, p.homeroomId) : []
  const todayL = p ? await lessonsOn(ctx.db, d, { homeroomId: p.homeroomId }) : { lessons: [], holiday: null }
  const events = await eventsBetween(ctx.db, d, addDays(d, 60), 'families')
  const days = cells.some((c) => c.e.day === 6) ? 6 : 5
  return (
    <>
      <PageHead title="Jadwal pelajaran" sub={p ? `${current!.name} · ${fmtDayDate(d)}` : fmtDayDate(d)} />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/jadwal" />
      {!current ? <Empty icon="users">Belum ada siswa yang terhubung dengan akun ini.</Empty> : null}
      {current && !current.canViewAcademic ? <Notice tone="info">Akses akademik untuk anak ini tidak diberikan pada akun Anda. Hubungi tata usaha bila perlu.</Notice> : null}
      {current && current.canViewAcademic && !p ? <Notice tone="info">Siswa belum ditempatkan di rombel.</Notice> : null}
      {p ? (
        <div className="grid grid--side">
          <div className="stack">
            <Card title="Hari ini">
              {todayL.holiday ? <Empty icon="calendar">Libur: {todayL.holiday}</Empty> : todayL.lessons.length ? <Agenda lessons={todayL.lessons} show="homeroom" now={clock(ctx.now, ctx.tz)} /> : <Empty icon="calendar">Tidak ada pelajaran hari ini.</Empty>}
            </Card>
            <Card title="Jadwal mingguan">{cells.length ? <WeekGrid slots={slotRows} cells={cells} days={days} today={weekday(d)} /> : <Empty icon="calendar">Jadwal semester ini belum dipublikasikan.</Empty>}</Card>
          </div>
          <Card title="Agenda sekolah">
            {events.length ? (
              <ul className="list">
                {events.slice(0, 12).map((e) => (
                  <li key={e.id} style={{ alignItems: 'flex-start' }}>
                    <span className="small nowrap" style={{ minWidth: 92 }}>
                      <strong>{fmtDate(e.startDate, undefined, true)}</strong>
                      {e.endDate !== e.startDate ? <div className="muted">s.d. {fmtDate(e.endDate, undefined, true)}</div> : null}
                    </span>
                    <span className="grow">
                      {e.title} {e.kind === 'libur' ? <Badge tone="warn">Libur</Badge> : e.kind === 'ujian' ? <Badge tone="info">Asesmen</Badge> : null}
                      {e.description ? <div className="small muted">{e.description}</div> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Belum ada agenda dalam 60 hari ke depan.</p>
            )}
          </Card>
        </div>
      ) : null}
    </>
  )
}
