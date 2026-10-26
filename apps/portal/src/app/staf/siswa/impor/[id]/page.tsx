import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { importBatches } from '@/db/schema'
import { staffPage } from '@/server/request'
import { IMPORT_TARGETS } from '@/modules/students/import'
import { ROW_TONE } from '@/ui/tones'
import { ActionButton, ActionForm, Card, Flash, Notice, PageHead, sp1, Stat, Status, Steps, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Impor data siswa' }

/** REG-04 steps 2–4: mapping, validated preview, confirmation. */
export default async function ImportBatch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/siswa/impor/${id}`, ['students.import'], 'buku_induk')
  const sp = await searchParams
  const [b] = /^[0-9a-f-]{36}$/.test(id) ? await ctx.db.select().from(importBatches).where(eq(importBatches.id, id)) : []
  if (!b) notFound()
  const step = b.status === 'committed' ? 3 : b.status === 'validated' && sp1(sp, 'langkah') !== '2' ? 2 : 1
  const headers = b.headers ?? []
  const rows = b.rows ?? []
  const mapping = b.mapping ?? {}
  const back = `/staf/siswa/impor/${id}`
  const showRows = (b.results ?? []).slice(0, 200)
  return (
    <>
      <PageHead title="Impor Excel data siswa" crumbs={[['Administrasi siswa', '/staf/siswa'], ['Impor', '/staf/siswa/impor'], ['Batch']]} />
      <Flash sp={sp} />
      <Steps items={['Unggah berkas', 'Pemetaan kolom', 'Pratinjau & validasi', 'Konfirmasi']} current={step + (b.status === 'committed' ? 1 : 0)} />
      {b.status === 'cancelled' ? <Notice tone="warn">Impor ini dibatalkan.</Notice> : null}
      {b.status === 'committed' ? (
        <Notice tone="ok" title="Impor selesai">
          {b.summary?.created ?? 0} siswa masuk Buku Induk. Baris yang perlu review atau bergalat tidak diimpor — perbaiki berkas lalu impor ulang, atau masukkan manual.
        </Notice>
      ) : null}
      {step === 1 && b.status !== 'cancelled' ? (
        <Card title="2. Pemetaan kolom">
          <ActionForm action="impor.petakan" back={`${back}?langkah=2`} hidden={{ id }}>
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Kolom di berkas</th>
                    <th>Contoh isi</th>
                    <th>Peta ke data sistem</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => (
                    <tr key={h}>
                      <td>
                        <strong>{h}</strong>
                      </td>
                      <td className="muted small">{rows.slice(0, 2).map((r) => r[h]).filter(Boolean).join(' · ') || '—'}</td>
                      <td>
                        <select name={`kolom:${h}`} defaultValue={mapping[h] ?? ''} aria-label={`Peta kolom ${h}`}>
                          <option value="">— abaikan —</option>
                          {IMPORT_TARGETS.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="f__actions">
              <Submit>Validasi data</Submit>
            </div>
          </ActionForm>
          <div style={{ marginTop: 10 }}>
            <ActionButton action="impor.batal" back={back} hidden={{ id }} label="Batalkan impor" tone="danger-ghost" small />
          </div>
        </Card>
      ) : null}
      {step >= 2 && b.results ? (
        <>
          <div className="grid grid--3" style={{ marginBottom: 18 }}>
            <Stat icon="checkCircle" tone="ok" label="Data valid" value={b.summary?.valid ?? 0} note="Siap diimpor" />
            <Stat icon="alert" tone="warn" label="Perlu review" value={b.summary?.review ?? 0} note="Tidak ikut diimpor" />
            <Stat icon="x" tone="bad" label="Galat" value={b.summary?.error ?? 0} note="Tidak ikut diimpor" />
          </div>
          <Card title="3. Pratinjau & hasil validasi" flush>
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Baris</th>
                    {headers.filter((h) => mapping[h]).slice(0, 5).map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                    <th>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {showRows.map((r) => (
                    <tr key={r.row}>
                      <td>{r.row + 2}</td>
                      {headers.filter((h) => mapping[h]).slice(0, 5).map((h) => (
                        <td key={h}>{rows[r.row]?.[h] ?? ''}</td>
                      ))}
                      <td>
                        <Status value={r.status} map={ROW_TONE} />
                      </td>
                      <td className="small">{r.messages.join(' ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(b.results?.length ?? 0) > 200 ? <p className="small muted" style={{ padding: '8px 20px' }}>Menampilkan 200 baris pertama.</p> : null}
          </Card>
          {b.status === 'validated' ? (
            <Card title="4. Konfirmasi">
              <p>
                {b.summary?.valid ?? 0} baris valid akan dimasukkan ke Buku Induk (beserta penempatan rombel dan data orang tua bila dipetakan). Baris lain tidak diimpor.
              </p>
              <div className="row">
                <a className="btn btn--ghost" href={`/portal${back}?langkah=2`}>
                  Kembali ke pemetaan
                </a>
                <ActionForm action="impor.konfirmasi" back={back} hidden={{ id }} op className="inline" confirm={`Impor ${b.summary?.valid ?? 0} siswa ke Buku Induk?`}>
                  <Submit icon="check">Lanjutkan & impor</Submit>
                </ActionForm>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </>
  )
}
