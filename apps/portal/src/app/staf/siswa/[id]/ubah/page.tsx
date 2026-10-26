import { notFound } from 'next/navigation'
import { staffPage } from '@/server/request'
import { loadStudent } from '@/modules/students/service'
import { ActionForm, Card, Flash, Notice, PageHead, Submit, type SP } from '@/ui/kit'
import { StudentFields } from '@/ui/student-form'

export const metadata = { title: 'Ubah data siswa' }

export default async function EditStudent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/siswa/${id}/ubah`, ['students.write'], 'buku_induk')
  const sp = await searchParams
  const s = /^[0-9a-f-]{36}$/.test(id) ? await loadStudent(ctx.db, id) : null
  if (!s) notFound()
  return (
    <>
      <PageHead title={`Ubah data: ${s.person.fullName}`} crumbs={[['Buku Induk', '/staf/siswa/daftar'], [s.person.fullName, `/staf/siswa/${id}`], ['Ubah']]} />
      <Flash sp={sp} />
      <Notice tone="warn">Perubahan langsung oleh TU tercatat di audit dan mengembalikan status data ke &ldquo;perlu verifikasi&rdquo;. Untuk perubahan yang perlu ditinjau orang lain, gunakan usulan koreksi.</Notice>
      <Card>
        <ActionForm action="siswa.ubah" back={`/staf/siswa/${id}/ubah`} hidden={{ id, _versi: s.student.version }}>
          <StudentFields sensitive values={{ ...s.person, ...s.student } as never} />
          <div className="f__actions">
            <Submit>Simpan perubahan</Submit>
          </div>
        </ActionForm>
      </Card>
    </>
  )
}
