import { accountPage, requestBranding } from '@/server/request'
import { activeLetter } from '@/modules/services/service'
import { ActiveLetter } from '@/ui/service-request'
import { PrintButton } from '@/ui/client'
import { PageHead } from '@/ui/kit'

export const metadata = { title: 'Surat keterangan aktif' }

export default async function LetterFamily({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await accountPage(`/keluarga/layanan/${id}/surat`, 'layanan')
  const d = await activeLetter(ctx, id)
  return (
    <>
      <div className="no-print">
        <PageHead title="Surat keterangan aktif" sub="Surat sah setelah ditandatangani dan dicap sekolah. Ambil versi bertanda tangan di tata usaha bila diperlukan." crumbs={[['Layanan sekolah', '/keluarga/layanan'], [d.r.number, `/keluarga/layanan/${id}`], ['Surat']]} actions={<PrintButton />} />
      </div>
      <ActiveLetter d={d} b={(await requestBranding())!} schoolName={ctx.school.name} />
    </>
  )
}
