/** Family home sections of daily academics, announcements and services (SIS-01 / WLI-01). */
import Link from 'next/link'
import { familyWidget } from './widgets'
import { lessonsOn } from './schedule/service'
import { placementOn } from './scope'
import { tasksForStudent } from './learning/service'
import { recap } from './attendance/service'
import { familyFeed } from './comms/service'
import { myRequests } from './services/service'
import { clock, fmtDate, fmtDateTime, today } from '@/server/time'
import { Agenda, RecapMeter } from '@/ui/daily'
import { SERVICE_TONE, TASK_STATE_TONE } from '@/ui/tones'
import { Badge, Card, Empty, Status } from '@/ui/kit'

familyWidget({
  order: 10,
  mod: 'akademik',
  render: async (ctx, s) => {
    if (!s.canViewAcademic) return null
    const d = today(ctx.tz, ctx.now)
    const p = await placementOn(ctx.db, s.studentId, d)
    if (!p) return null
    const { lessons, holiday } = await lessonsOn(ctx.db, d, { homeroomId: p.homeroomId })
    return (
      <Card title="Jadwal hari ini" actions={<Link href={`/keluarga/jadwal?anak=${s.studentId}`}>Mingguan</Link>}>
        {holiday ? <Empty icon="calendar">Libur: {holiday}</Empty> : lessons.length ? <Agenda compact lessons={lessons} show="homeroom" now={clock(ctx.now, ctx.tz)} /> : <Empty icon="calendar">Tidak ada pelajaran hari ini.</Empty>}
      </Card>
    )
  },
})

familyWidget({
  order: 20,
  mod: 'akademik',
  render: async (ctx, s) => {
    if (!s.canViewAcademic) return null
    const rows = await tasksForStudent(ctx, s.studentId)
    const todo = rows.filter((r) => ['belum', 'terlambat', 'revisi'].includes(r.state))
    const graded = rows.filter((r) => r.state === 'dinilai').slice(-2)
    return (
      <Card title="Tugas" actions={<Link href={`/keluarga/tugas?anak=${s.studentId}`}>Semua tugas</Link>}>
        {todo.length || graded.length ? (
          <ul className="list">
            {[...todo.slice(0, 4), ...graded].map((r) => (
              <li key={r.t.id}>
                <Link className="grow" href={`/keluarga/tugas/${r.t.id}?anak=${s.studentId}`}>
                  <strong>{r.t.title}</strong>
                  <div className="small muted">
                    {r.subject} · {r.t.dueAt ? `tenggat ${fmtDateTime(r.t.dueAt, ctx.tz)}` : 'tanpa tenggat'}
                  </div>
                </Link>
                <Status value={r.state} map={TASK_STATE_TONE} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="checkCircle">Tidak ada tugas yang menunggu.</Empty>
        )}
      </Card>
    )
  },
})

familyWidget({
  order: 30,
  mod: 'akademik',
  render: async (ctx, s) => {
    if (!s.canViewAcademic) return null
    const d = today(ctx.tz, ctx.now)
    const r = await recap(ctx.db, s.studentId, `${d.slice(0, 7)}-01`, d)
    return (
      <Card title="Kehadiran bulan ini" actions={<Link href={`/keluarga/presensi?anak=${s.studentId}`}>{s.self ? 'Rincian' : 'Rincian & ajukan izin'}</Link>}>
        <RecapMeter r={r} />
      </Card>
    )
  },
})

familyWidget({
  order: 40,
  mod: 'pengumuman',
  render: async (ctx) => {
    const feed = (await familyFeed(ctx)).slice(0, 4)
    return (
      <Card title="Pengumuman" actions={<Link href="/keluarga/pengumuman">Semua</Link>}>
        {feed.length ? (
          <ul className="list">
            {feed.map(({ a, r }) => (
              <li key={a.id}>
                <Link className="grow" href={`/keluarga/pengumuman/${a.id}`}>
                  {r.readAt ? a.title : <strong>{a.title}</strong>}
                  <div className="small muted">{fmtDate(a.publishedAt, ctx.tz, true)}</div>
                </Link>
                {a.requiresAck && !r.ackAt ? <Badge tone="warn">Konfirmasi</Badge> : !r.readAt ? <Badge tone="brand">Baru</Badge> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="megaphone">Belum ada pengumuman.</Empty>
        )}
      </Card>
    )
  },
})

familyWidget({
  order: 80,
  mod: 'layanan',
  render: async (ctx) => {
    const open = (await myRequests(ctx)).filter((r) => !['completed', 'rejected', 'cancelled'].includes(r.r.status) || (r.r.closedAt && ctx.now.getTime() - r.r.closedAt.getTime() < 7 * 86_400_000))
    if (!open.length) return null
    return (
      <Card title="Layanan sekolah" actions={<Link href="/keluarga/layanan">Semua</Link>}>
        <ul className="list">
          {open.slice(0, 4).map(({ r, type }) => (
            <li key={r.id}>
              <Link className="grow" href={`/keluarga/layanan/${r.id}`}>
                {type}
                <div className="small muted mono">{r.number}</div>
              </Link>
              <Status value={r.status} map={SERVICE_TONE} />
            </li>
          ))}
        </ul>
      </Card>
    )
  },
})
