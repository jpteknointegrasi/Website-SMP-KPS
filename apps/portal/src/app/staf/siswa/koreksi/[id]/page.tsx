import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { dataCorrections } from '@/db/schema'
import { staffPage } from '@/server/request'
import { loadStudent } from '@/modules/students/service'
import { FIELD } from '@/modules/students/fields'
import { hasPerm } from '@/server/context'
import { fmtDateTime } from '@/server/time'
import { CORRECTION_TONE } from '@/ui/tones'
import { ActionForm, Card, fileUrl, Flash, Notice, PageHead, Status, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Tinjau koreksi' }

/** REG-03 review: before/after side by side, evidence, decision with note. */
export default async function ReviewCorrection({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/siswa/koreksi/${id}`, ['students.review', 'students.write'], 'buku_induk')
  const sp = await searchParams
  const [c] = /^[0-9a-f-]{36}$/.test(id) ? await ctx.db.select().from(dataCorrections).where(eq(dataCorrections.id, id)) : []
  if (!c) notFound()
  const s = (await loadStudent(ctx.db, c.studentId))!
  const open = ['submitted', 'needs_info'].includes(c.status)
  const canDecide = hasPerm(ctx, 'students.review') && !(c.requestedByType === 'staff' && c.requestedById === ctx.staff.id)
  return (
    <>
      <PageHead title="Usulan koreksi data siswa" sub="Periksa perubahan dengan teliti sebelum menyetujui. Pastikan dokumen pendukung sesuai." crumbs={[['Koreksi data', '/staf/siswa/koreksi'], [c.number]]} />
      <Flash sp={sp} />
      <div className="grid grid--3">
        <Card title="Detail usulan">
          <dl className="kv">
            <dt>Nama siswa</dt>
            <dd>{s.person.fullName}</dd>
            <dt>NIS</dt>
            <dd className="mono">{s.student.nis ?? '—'}</dd>
            <dt>Diajukan oleh</dt>
            <dd>{c.requestedByName}</dd>
            <dt>Tanggal usulan</dt>
            <dd>{fmtDateTime(c.createdAt, ctx.tz)}</dd>
            <dt>Status</dt>
            <dd>
              <Status value={c.status} map={CORRECTION_TONE} />
            </dd>
          </dl>
        </Card>
        <Card title="Perubahan data">
          <table className="t diff">
            <thead>
              <tr>
                <th>Data</th>
                <th>Sebelum</th>
                <th>Sesudah</th>
              </tr>
            </thead>
            <tbody>
              {c.changes.map((ch) => {
                const f = FIELD[ch.field]
                const sens = f?.sensitive && !hasPerm(ctx, 'students.write')
                return (
                  <tr key={ch.field}>
                    <td>{f?.label ?? ch.field}</td>
                    <td className="before">{sens ? '••••' : (ch.before ?? '—')}</td>
                    <td className="after">{sens ? '••••' : (ch.after ?? '(dikosongkan)')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <Card title="Dokumen & penjelasan">
          {c.evidenceFileId ? (
            <p>
              <a className="btn btn--ghost btn--sm" href={fileUrl(c.evidenceFileId)!} target="_blank" rel="noopener">
                Lihat dokumen pendukung
              </a>
            </p>
          ) : (
            <p className="muted">Tanpa dokumen pendukung.</p>
          )}
          <p>{c.reason}</p>
          {c.reviewNote ? <Notice tone="info" title="Catatan peninjau">{c.reviewNote}</Notice> : null}
        </Card>
      </div>
      {open ? (
        canDecide ? (
          <Card title="Keputusan">
            <ActionForm action="koreksi.putuskan" back={`/staf/siswa/koreksi/${id}`} hidden={{ id, _versi: c.version }}>
              <TextArea name="catatan" label="Catatan untuk pengusul" hint="Wajib untuk minta perbaikan atau menolak." rows={2} />
              <div className="f__actions">
                <Submit tone="ghost" name="keputusan" value="needs_info">Minta perbaikan</Submit>
                <Submit tone="danger" name="keputusan" value="reject">Tolak</Submit>
                <Submit tone="ok" name="keputusan" value="approve" icon="check">Setujui perubahan</Submit>
              </div>
            </ActionForm>
          </Card>
        ) : (
          <Notice tone="warn">Usulan ini harus diputuskan oleh peninjau lain (pemisahan tugas).</Notice>
        )
      ) : null}
    </>
  )
}
