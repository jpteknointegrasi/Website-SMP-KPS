import { and, desc, eq } from 'drizzle-orm'
import { notifications } from '@/db/schema'
import { accountPage } from '@/server/request'
import { ActionButton, Card, Empty, Flash, PageHead, type SP } from '@/ui/kit'
import { NotificationList } from '@/ui/notifications'

export const metadata = { title: 'Notifikasi' }

export default async function FamilyNotifications({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/notifikasi')
  const sp = await searchParams
  const rows = await ctx.db.select().from(notifications).where(and(eq(notifications.recipientType, 'account'), eq(notifications.recipientId, ctx.account.id))).orderBy(desc(notifications.createdAt)).limit(100)
  return (
    <>
      <PageHead title="Notifikasi" actions={<ActionButton action="notifikasi.baca" back="/keluarga/notifikasi" label="Tandai semua dibaca" tone="ghost" />} />
      <Flash sp={sp} />
      <Card>{rows.length ? <NotificationList rows={rows} tz={ctx.tz} /> : <Empty icon="bell">Belum ada notifikasi.</Empty>}</Card>
    </>
  )
}
