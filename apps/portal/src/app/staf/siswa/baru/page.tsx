import { staffPage } from '@/server/request'
import { activeYear } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { ActionForm, Card, Flash, PageHead, Select, Submit, type SP } from '@/ui/kit'
import { StudentFields } from '@/ui/student-form'

export const metadata = { title: 'Tambah siswa' }

export default async function NewStudent({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/siswa/baru', ['students.write'], 'buku_induk')
  const sp = await searchParams
  const year = await activeYear(ctx.db)
  const rooms = year ? await homeroomsOfYear(ctx, year.id) : []
  return (
    <>
      <PageHead title="Tambah siswa" sub="Masukkan data dari dokumen resmi (akta, KK, ijazah). Data dapat dilengkapi kemudian." crumbs={[['Administrasi siswa', '/staf/siswa'], ['Buku Induk', '/staf/siswa/daftar'], ['Tambah']]} />
      <Flash sp={sp} />
      <Card>
        <ActionForm action="siswa.tambah" back="/staf/siswa/baru" op>
          <StudentFields sensitive />
          <Select name="rombel" label={`Rombel ${year ? `(${year.name})` : ''}`} empty="— belum ditempatkan —" options={rooms.map((r) => [r.h.id, r.h.name])} hint={year ? undefined : 'Belum ada tahun ajaran aktif (Data akademik).'} />
          <div className="f__actions">
            <Submit icon="plus">Simpan ke Buku Induk</Submit>
          </div>
        </ActionForm>
      </Card>
    </>
  )
}
