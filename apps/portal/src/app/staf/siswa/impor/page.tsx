import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { importBatches } from '@/db/schema'
import { staffPage } from '@/server/request'
import { fmtDateTime } from '@/server/time'
import { IMPORT_TONE } from '@/ui/tones'
import { ActionForm, Card, Empty, FileField, Flash, PageHead, Status, Steps, Submit, type SP } from '@/ui/kit'
import { IMPORT_TARGETS } from '@/modules/students/import'

export const metadata = { title: 'Impor data siswa' }

/** REG-04 step 1: upload. */
export default async function ImportStart({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/siswa/impor', ['students.import'], 'buku_induk')
  const sp = await searchParams
  const history = await ctx.db.select().from(importBatches).orderBy(desc(importBatches.createdAt)).limit(20)
  return (
    <>
      <PageHead title="Impor Excel data siswa" sub="Unggah berkas, petakan kolom, periksa hasil validasi, lalu konfirmasi." crumbs={[['Administrasi siswa', '/staf/siswa'], ['Impor']]} />
      <Flash sp={sp} />
      <Steps items={['Unggah berkas', 'Pemetaan kolom', 'Pratinjau & validasi', 'Konfirmasi']} current={0} />
      <div className="grid grid--side">
        <Card title="1. Unggah berkas">
          <ActionForm action="impor.unggah" back="/staf/siswa/impor" files>
            <FileField name="berkas" label="Berkas Excel (.xlsx) atau CSV" required accept=".xlsx,.csv" hint="Baris pertama berisi judul kolom. Maksimal 5 MB / 2.000 baris." />
            <div className="f__actions">
              <Submit icon="upload">Unggah & baca</Submit>
            </div>
          </ActionForm>
          <hr className="divider" />
          <p className="small muted">
            Kolom yang dikenali otomatis: {IMPORT_TARGETS.map((t) => t.label).join(', ')}. Data belum masuk Buku Induk sebelum Anda mengonfirmasi di langkah terakhir.
          </p>
        </Card>
        <Card title="Riwayat impor">
          {history.length ? (
            <ul className="list">
              {history.map((b) => (
                <li key={b.id}>
                  <span className="grow">
                    <Link href={`/staf/siswa/impor/${b.id}`}>{fmtDateTime(b.createdAt, ctx.tz)}</Link>
                    <div className="small muted">
                      {(b.rows?.length ?? 0) || (b.summary ? Object.values(b.summary).reduce((a, n) => a + n, 0) : 0)} baris
                      {b.summary?.created !== undefined ? ` · ${b.summary.created} diimpor` : ''}
                    </div>
                  </span>
                  <Status value={b.status} map={IMPORT_TONE} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Belum ada impor.</Empty>
          )}
        </Card>
      </div>
    </>
  )
}
