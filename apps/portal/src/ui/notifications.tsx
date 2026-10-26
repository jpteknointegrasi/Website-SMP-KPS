import Link from 'next/link'
import type { notifications } from '@/db/schema'
import { fmtDateTime } from '@/server/time'

export function NotificationList({ rows, tz }: { rows: (typeof notifications.$inferSelect)[]; tz: string }) {
  return (
    <ul className="list">
      {rows.map((n) => (
        <li key={n.id} style={{ fontWeight: n.readAt ? 400 : 600 }}>
          <span className="grow">
            {n.link ? <Link href={n.link.replace(/^\/portal/, '')}>{n.title}</Link> : n.title}
            {n.body ? <div className="small muted">{n.body}</div> : null}
          </span>
          <span className="small muted nowrap">{fmtDateTime(n.createdAt, tz)}</span>
        </li>
      ))}
    </ul>
  )
}
