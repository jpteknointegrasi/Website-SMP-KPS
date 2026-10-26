import { and, count, eq, isNotNull } from 'drizzle-orm'
import { announcementReceipts } from '@/db/schema'
import { staffPage } from '@/server/request'
import { readAnnouncement } from '@/modules/comms/service'
import { AnnouncementView } from '@/ui/announcement'
import { ANN_TONE } from '@/ui/tones'
import { ActionButton, Card, Flash, PageHead, Stat, Status, type SP } from '@/ui/kit'

export const metadata = { title: 'Pengumuman' }

export default async function AnnouncementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/pengumuman/${id}`, [], 'pengumuman')
  const sp = await searchParams
  const d = await readAnnouncement(ctx, id)
  const back = `/staf/pengumuman/${id}`
  const stat = async (cond?: ReturnType<typeof isNotNull>) => (await ctx.db.select({ n: count() }).from(announcementReceipts).where(and(eq(announcementReceipts.announcementId, id), cond)))[0]!.n
  const stats = d.manager ? { total: await stat(), read: await stat(isNotNull(announcementReceipts.readAt)), ack: await stat(isNotNull(announcementReceipts.ackAt)) } : null
  return (
    <>
      <PageHead
        title="Pengumuman"
        crumbs={[['Pengumuman', '/staf/pengumuman'], [d.a.title]]}
        actions={
          d.manager ? (
            <span className="row">
              <Status value={d.a.status} map={ANN_TONE} />
              {d.a.status === 'draft' ? <ActionButton action="pengumuman.terbitkan" back={back} hidden={{ id }} label="Terbitkan sekarang" icon="megaphone" /> : null}
              {d.a.status !== 'archived' ? <ActionButton action="pengumuman.arsip" back={back} hidden={{ id }} label="Arsipkan" tone="ghost" /> : null}
            </span>
          ) : null
        }
      />
      <Flash sp={sp} />
      {stats ? (
        <div className="grid grid--3" style={{ marginBottom: 18 }}>
          <Stat icon="users" label="Penerima" value={stats.total} />
          <Stat icon="eye" label="Sudah membaca" value={stats.read} />
          {d.a.requiresAck ? <Stat icon="checkCircle" tone={stats.ack === stats.total ? 'ok' : 'warn'} label="Konfirmasi" value={stats.ack} /> : <Stat icon="info" label="Konfirmasi" value="Tidak diminta" />}
        </div>
      ) : null}
      <div className="narrow">
        <AnnouncementView d={d} tz={ctx.tz} back={back} />
      </div>
      {d.manager && d.a.status === 'draft' ? (
        <Card>
          <p className="small muted">Draf belum terkirim ke siapa pun. Pengumuman yang sudah terbit tidak dapat diubah; arsipkan lalu buat yang baru bila perlu koreksi.</p>
        </Card>
      ) : null}
    </>
  )
}
