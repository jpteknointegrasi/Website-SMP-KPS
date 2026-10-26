import { accountPage, requestBranding } from '@/server/request'
import { reportVersion } from '@/modules/reports/service'
import { localDate } from '@/server/time'
import { ReportDoc } from '@/ui/report-card'
import { PrintButton } from '@/ui/client'
import { PageHead, publicFileUrl } from '@/ui/kit'

export const metadata = { title: 'Rapor' }

export default async function FamilyReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await accountPage(`/keluarga/rapor/${id}`, 'nilai_rapor')
  const r = await reportVersion(ctx, id)
  const b = (await requestBranding())!
  return (
    <>
      <div className="no-print">
        <PageHead title={`Rapor ${r.v.snapshot.term} ${r.v.snapshot.year}`} sub={r.v.snapshot.student.name} crumbs={[['Rapor', `/keluarga/rapor?anak=${r.c.studentId}`], [`${r.v.snapshot.term} ${r.v.snapshot.year}`]]} actions={<PrintButton />} />
      </div>
      <ReportDoc s={r.v.snapshot} logo={publicFileUrl(b.logoFileId)} version={r.v.versionNo} date={localDate(r.c.releasedAt ?? r.v.createdAt, ctx.tz)} />
    </>
  )
}
