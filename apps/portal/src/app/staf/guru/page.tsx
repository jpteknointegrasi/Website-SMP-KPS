import Link from 'next/link'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { lessonSessions } from '@/db/schema'
import { staffPage } from '@/server/request'
import { lessonsOn } from '@/modules/schedule/service'
import { myClasses } from '@/modules/learning/service'
import { pendingLeaves } from '@/modules/attendance/service'
import { myHomerooms } from '@/modules/scope'
import { staffFeed } from '@/modules/comms/service'
import { addDays, clock, fmtDate, fmtDayDate, isDate, today } from '@/server/time'
import { Agenda } from '@/ui/daily'
import { ActionForm, Badge, Card, Empty, Flash, LinkBtn, PageHead, sp1, Stat, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Kelas saya' }

/** GRU-01 teacher workspace: today's lessons (open class → journal & attendance), classes, homeroom tasks. */
export default async function TeacherHome({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/guru', ['teach', 'academic.manage'], 'akademik')
  const sp = await searchParams
  const d = isDate(sp1(sp, 'tanggal')) ? sp1(sp, 'tanggal')! : today(ctx.tz, ctx.now)
  const isToday = d === today(ctx.tz, ctx.now)
  const { lessons, holiday } = await lessonsOn(ctx.db, d, { teacherId: ctx.staff.id })
  const sessions = lessons.length ? await ctx.db.select().from(lessonSessions).where(and(eq(lessonSessions.date, d), inArray(lessonSessions.entryId, lessons.map((l) => l.entryId)))) : []
  const classes = await myClasses(ctx)
  const rooms = await myHomerooms(ctx)
  const leaves = rooms.length ? await pendingLeaves(ctx) : []
  const noJournal = await ctx.db.select({ id: lessonSessions.id, date: lessonSessions.date }).from(lessonSessions).where(and(eq(lessonSessions.teacherId, ctx.staff.id), isNull(lessonSessions.journalAt)))
  const news = (await staffFeed(ctx)).filter((r) => !r.r.readAt).slice(0, 3)
  const back = `/staf/guru?tanggal=${d}`
  return (
    <>
      <PageHead title={`Halo, ${ctx.staff.name}`} sub={`${fmtDayDate(d)} — jadwal mengajar, jurnal dan presensi kelas.`} />
      <Flash sp={sp} />
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Stat icon="calendar" label={isToday ? 'Jam mengajar hari ini' : 'Jam mengajar'} value={lessons.filter((l) => !l.cancelled).length} />
        <Stat icon="edit" tone={noJournal.length ? 'warn' : 'ok'} label="Jurnal belum diisi" value={noJournal.length} />
        <Stat icon="inbox" tone={leaves.length ? 'warn' : undefined} label="Izin menunggu (wali kelas)" value={leaves.length} href="/staf/presensi?tab=izin" />
        <Stat icon="users" label="Kelas & mapel" value={classes.length} />
      </div>
      <div className="grid grid--side">
        <div className="stack">
          <Card
            title="Jadwal mengajar"
            actions={
              <span className="row">
                <Link className="btn btn--ghost btn--sm" href={`/staf/guru?tanggal=${addDays(d, -1)}`} aria-label="Hari sebelumnya">
                  ‹
                </Link>
                <span className="small">{fmtDate(d)}</span>
                <Link className="btn btn--ghost btn--sm" href={`/staf/guru?tanggal=${addDays(d, 1)}`} aria-label="Hari berikutnya">
                  ›
                </Link>
              </span>
            }
          >
            {holiday ? <Empty icon="calendar">Libur: {holiday}</Empty> : null}
            {!holiday && !lessons.length ? <Empty icon="calendar">Tidak ada jadwal mengajar pada tanggal ini.</Empty> : null}
            {lessons.length ? (
              <Agenda
                lessons={lessons}
                now={isToday ? clock(ctx.now, ctx.tz) : undefined}
                action={(l) => {
                  const s = sessions.find((x) => x.entryId === l.entryId)
                  return s ? (
                    <span className="row">
                      {s.journalAt ? <Badge tone="ok">Jurnal terisi</Badge> : <Badge tone="warn">Jurnal belum</Badge>}
                      <LinkBtn small href={`/staf/guru/sesi/${s.id}`}>
                        Buka
                      </LinkBtn>
                    </span>
                  ) : d <= today(ctx.tz, ctx.now) ? (
                    <ActionForm action="pelajaran.buka" back={back} hidden={{ jadwal: l.entryId, tanggal: d }} className="inline">
                      <Submit icon="arrowRight">Mulai kelas</Submit>
                    </ActionForm>
                  ) : null
                }}
              />
            ) : null}
          </Card>
          <Card title="Kelas & mata pelajaran saya">
            {classes.length ? (
              <ul className="list">
                {classes.map((c) => (
                  <li key={c.a.id}>
                    <span className="grow">
                      <strong>{c.subject}</strong> · {c.homeroom}
                      <div className="small muted">
                        {c.students} siswa{c.a.hoursPerWeek ? ` · ${c.a.hoursPerWeek} JP/minggu` : ''}
                      </div>
                    </span>
                    <LinkBtn small tone="ghost" href={`/staf/guru/kelas/${c.a.id}`}>
                      Materi & tugas
                    </LinkBtn>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="users">Belum ada penugasan mengajar pada semester ini. Hubungi Waka Kurikulum.</Empty>
            )}
          </Card>
        </div>
        <div className="stack">
          {rooms.length ? (
            <Card title="Wali kelas">
              <ul className="list">
                {rooms.map((r) => (
                  <li key={r.id}>
                    <span className="grow">
                      <strong>{r.name}</strong>
                    </span>
                    <LinkBtn small href={`/staf/presensi?rombel=${r.id}`}>
                      Presensi harian
                    </LinkBtn>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card title="Pengumuman untuk staf" actions={<Link href="/staf/pengumuman">Semua</Link>}>
            {news.length ? (
              <ul className="list">
                {news.map(({ a }) => (
                  <li key={a.id}>
                    <Link className="grow" href={`/staf/pengumuman/${a.id}`}>
                      {a.title}
                    </Link>
                    <span className="small muted">{fmtDate(a.publishedAt, ctx.tz, true)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Tidak ada pengumuman baru.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
