/** Family home sections: latest report card, extracurricular consent requests. */
import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { activities, activityMembers } from '@/db/schema'
import { familyWidget } from './widgets'
import { releasedReports } from './reports/service'
import { linkedChildren } from './scope'
import { fmtDate } from '@/server/time'
import { Card, LinkBtn, Notice } from '@/ui/kit'

familyWidget({
  order: 5,
  mod: 'ekskul',
  render: async (ctx, s) => {
    if (s.self || !(await linkedChildren(ctx)).some((c) => c.studentId === s.studentId)) return null
    const rows = await ctx.db.select({ name: activities.name }).from(activityMembers).innerJoin(activities, eq(activities.id, activityMembers.activityId)).where(and(eq(activityMembers.studentId, s.studentId), eq(activityMembers.status, 'applied')))
    if (!rows.length) return null
    return (
      <Notice tone="warn" title="Persetujuan ekstrakurikuler">
        {s.name} mendaftar {rows.map((r) => r.name).join(', ')}. <Link href={`/keluarga/ekskul?anak=${s.studentId}`}>Tinjau</Link>
      </Notice>
    )
  },
})

familyWidget({
  order: 50,
  mod: 'nilai_rapor',
  render: async (ctx, s) => {
    if (!s.canViewAcademic) return null
    const r = await releasedReports(ctx, s.studentId)
    const last = r.latest[0]
    if (!last) return null
    return (
      <Card title="Rapor terbaru">
        <p>
          Semester {last.term} {last.v.snapshot.year} · {last.v.snapshot.homeroom}
        </p>
        <p className="small muted">Dirilis {fmtDate(last.c.releasedAt ?? last.v.createdAt, ctx.tz)}</p>
        <LinkBtn href={`/keluarga/rapor/${last.v.id}`} icon="file">
          Lihat rapor
        </LinkBtn>
      </Card>
    )
  },
})
