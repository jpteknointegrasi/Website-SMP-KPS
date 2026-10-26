import { notFound } from 'next/navigation'
import { staffPage } from '@/server/request'
import { assertCanReadStudent, loadStudent } from '@/modules/students/service'
import { CorrectionForm } from '@/ui/correction-form'
import { Card, Flash, PageHead, type SP } from '@/ui/kit'
import { hasPerm } from '@/server/context'

export const metadata = { title: 'Usulan koreksi data' }

export default async function RequestCorrection({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/siswa/${id}/koreksi`)
  const sp = await searchParams
  const s = /^[0-9a-f-]{36}$/.test(id) ? await loadStudent(ctx.db, id) : null
  if (!s) notFound()
  await assertCanReadStudent(ctx, id)
  return (
    <>
      <PageHead title={`Usulkan koreksi: ${s.person.fullName}`} sub="Centang data yang perlu diubah, isi nilai baru, jelaskan alasannya dan lampirkan dokumen pendukung." crumbs={[[s.person.fullName, `/staf/siswa/${id}`], ['Usulan koreksi']]} />
      <Flash sp={sp} />
      <Card>
        <CorrectionForm studentId={id} values={{ ...s.person, ...s.student } as never} back={`/staf/siswa/${id}/koreksi`} sensitive={hasPerm(ctx, 'students.write')} />
      </Card>
    </>
  )
}
