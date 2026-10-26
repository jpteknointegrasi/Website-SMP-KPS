import { accountPage } from '@/server/request'
import { readAnnouncement } from '@/modules/comms/service'
import { AnnouncementView } from '@/ui/announcement'
import { Flash, PageHead, type SP } from '@/ui/kit'

export const metadata = { title: 'Pengumuman' }

export default async function FamilyAnnouncement({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await accountPage(`/keluarga/pengumuman/${id}`, 'pengumuman')
  const sp = await searchParams
  const d = await readAnnouncement(ctx, id)
  return (
    <>
      <PageHead title="Pengumuman" crumbs={[['Pengumuman', '/keluarga/pengumuman'], [d.a.title]]} />
      <Flash sp={sp} />
      <div className="narrow">
        <AnnouncementView d={d} tz={ctx.tz} back={`/keluarga/pengumuman/${id}`} />
      </div>
    </>
  )
}
