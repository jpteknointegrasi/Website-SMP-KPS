import { requestBranding, staffPage } from '@/server/request'
import { activeLetter } from '@/modules/services/service'
import { ActiveLetter } from '@/ui/service-request'
import { PrintButton } from '@/ui/client'
import { PageHead } from '@/ui/kit'

export const metadata = { title: 'Surat keterangan aktif' }

export default async function LetterStaff({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/layanan/${id}/surat`, ['services.process'], 'layanan')
  const d = await activeLetter(ctx, id)
  return (
    <>
      <div className="no-print">
        <PageHead title="Surat keterangan aktif" sub="Cetak di kertas A4 (skala 100%), tanda tangani dan cap." crumbs={[['Layanan TU', '/staf/layanan'], [d.r.number, `/staf/layanan/${id}`], ['Surat']]} actions={<PrintButton />} />
      </div>
      <ActiveLetter d={d} b={(await requestBranding())!} schoolName={ctx.school.name} />
    </>
  )
}
