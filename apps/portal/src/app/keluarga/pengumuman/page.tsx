import Link from 'next/link'
import { accountPage } from '@/server/request'
import { familyFeed } from '@/modules/comms/service'
import { fmtDateTime } from '@/server/time'
import { Badge, Card, Empty, Flash, PageHead, type SP } from '@/ui/kit'

export const metadata = { title: 'Pengumuman' }

export default async function FamilyAnnouncements({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/pengumuman', 'pengumuman')
  const sp = await searchParams
  const feed = await familyFeed(ctx)
  return (
    <>
      <PageHead title="Pengumuman" sub="Informasi resmi dari sekolah, wali kelas dan guru." />
      <Flash sp={sp} />
      <Card>
        {feed.length ? (
          <ul className="list">
            {feed.map(({ a, r }) => (
              <li key={a.id} className={a.pinned ? 'pin' : undefined} style={{ paddingLeft: a.pinned ? 10 : undefined }}>
                <span className="grow">
                  <Link href={`/keluarga/pengumuman/${a.id}`}>{r.readAt ? a.title : <strong>{a.title}</strong>}</Link>
                  <div className="small muted">
                    {a.createdByName ?? 'Sekolah'} · {fmtDateTime(a.publishedAt, ctx.tz)}
                  </div>
                </span>
                {!r.readAt ? <Badge tone="brand">Baru</Badge> : null}
                {a.requiresAck && !r.ackAt ? <Badge tone="warn">Perlu konfirmasi</Badge> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="megaphone">Belum ada pengumuman.</Empty>
        )}
      </Card>
    </>
  )
}
