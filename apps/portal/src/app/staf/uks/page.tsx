import { staffPage } from '@/server/request'
import { OUTCOMES, visits } from '@/modules/health/service'
import { activeYear, homeroomStudents } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { fmtDateTime, localDate, toLocalInput, today } from '@/server/time'
import { ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, Select, sp1, Stat, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'UKS' }

/** UKS-01 (restricted): record visits; families get outcome + family note only. */
export default async function Health({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/uks', ['health.manage'], 'uks')
  const sp = await searchParams
  const list = await visits(ctx, { since: new Date(ctx.now.getTime() - 60 * 86400_000) })
  const year = await activeYear(ctx.db)
  const pool: [string, string][] = []
  if (year) for (const h of await homeroomsOfYear(ctx, year.id)) for (const s of await homeroomStudents(ctx.db, h.h.id, today(ctx.tz, ctx.now))) pool.push([s.studentId, `${s.name} (${h.h.name})`])
  const todayN = list.filter((v) => localDate(v.v.at, ctx.tz) === today(ctx.tz, ctx.now)).length
  return (
    <>
      <PageHead title="UKS" sub="Catatan kesehatan bersifat terbatas — hanya petugas UKS. Orang tua menerima hasil kunjungan dan pesan yang Anda tulis untuk mereka." />
      <Flash sp={sp} />
      <div className="grid grid--3" style={{ marginBottom: 16 }}>
        <Stat icon="medical" label="Kunjungan hari ini" value={todayN} />
        <Stat icon="calendar" label="60 hari terakhir" value={list.length} />
        <Stat icon="alert" tone="warn" label="Dipulangkan/dirujuk" value={list.filter((v) => v.v.outcome === 'pulang' || v.v.outcome === 'rujuk').length} />
      </div>
      <div className="grid grid--side">
        <Card title="Kunjungan terbaru" flush>
          {list.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Siswa</th>
                    <th>Keluhan / tindakan</th>
                    <th>Hasil</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ v, name }) => (
                    <tr key={v.id} style={{ verticalAlign: 'top' }}>
                      <td className="nowrap small">{fmtDateTime(v.at, ctx.tz)}</td>
                      <td>{name}</td>
                      <td className="small">
                        {v.complaint}
                        {v.action ? <div className="muted">{v.action}</div> : null}
                      </td>
                      <td>
                        <Badge tone={v.outcome === 'kembali_kelas' ? 'ok' : 'warn'}>{OUTCOMES[v.outcome as keyof typeof OUTCOMES]}</Badge>
                        {v.guardianNotified ? <div className="small muted">orang tua diberi tahu</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="medical">Belum ada kunjungan.</Empty>
          )}
        </Card>
        <Card title="Catat kunjungan">
          <ActionForm action="uks.kunjungan" back="/staf/uks" op>
            <Select name="siswa" label="Siswa" options={pool} required />
            <Field name="waktu" label="Waktu" type="datetime-local" value={toLocalInput(ctx.now, ctx.tz)} required />
            <TextArea name="keluhan" label="Keluhan (terbatas)" rows={2} required />
            <TextArea name="tindakan" label="Tindakan / pertolongan pertama (terbatas)" rows={2} />
            <Select name="hasil" label="Hasil" options={Object.entries(OUTCOMES)} />
            <TextArea name="pesan" label="Pesan untuk orang tua (tanpa diagnosis)" rows={2} />
            <Check name="beritahu" label="Beri tahu orang tua (otomatis bila dipulangkan/dirujuk)" />
            <Field name="tindak_lanjut" label="Tindak lanjut (opsional)" type="date" />
            <Submit>Simpan</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  )
}
