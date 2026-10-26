import { staffPage } from '@/server/request'
import { REPORT_CATEGORIES, REPORT_STATUS, reportView } from '@/modules/affairs/service'
import { activeYear, homeroomStudents } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { fmtDate, fmtDateTime, today } from '@/server/time'
import { ActionForm, Badge, Card, fileUrl, FileField, Flash, Notice, PageHead, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Laporan kesiswaan' }

const ACTION: Record<string, string> = { received: 'Laporan diterima', assigned: 'Ditangani petugas', clarification: 'Klarifikasi diminta', info_added: 'Informasi ditambahkan', follow_up: 'Ditindaklanjuti', closed: 'Selesai', note: 'Catatan internal' }

export default async function AffairsReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/kesiswaan/laporan/${id}`, ['student_affairs', 'teach'], 'kesiswaan')
  const sp = await searchParams
  const v = await reportView(ctx, id)
  const r = v.r
  const back = `/staf/kesiswaan/laporan/${id}`
  const year = v.handler ? await activeYear(ctx.db) : null
  const pool: [string, string][] = []
  if (v.handler && year) for (const h of await homeroomsOfYear(ctx, year.id)) for (const s of await homeroomStudents(ctx.db, h.h.id, today(ctx.tz, ctx.now))) pool.push([s.studentId, `${s.name} (${h.h.name})`])
  return (
    <>
      <PageHead title={`Laporan ${r.number}`} sub={`${REPORT_CATEGORIES[r.category as keyof typeof REPORT_CATEGORIES]} · ${fmtDateTime(r.createdAt, ctx.tz)}`} crumbs={[['Kesiswaan', '/staf/kesiswaan?tab=laporan'], [r.number]]} actions={<Badge tone={r.status === 'closed' ? 'ok' : 'warn'}>{REPORT_STATUS[r.status as keyof typeof REPORT_STATUS]}</Badge>} />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <div className="stack">
          <Card title="Uraian">
            <div className="prose">{r.description}</div>
            <p className="small muted">
              {r.occurredOn ? `Kejadian ${fmtDate(r.occurredOn)}` : 'Tanggal tidak disebut'}
              {r.location ? ` · ${r.location}` : ''} · pelapor: {v.handler ? `${r.reporterName ?? '—'}${r.hideIdentity ? ' (identitas dirahasiakan dari pihak lain)' : ''}` : 'Anda'}
            </p>
            {v.files.map((f) => (
              <div key={f.id} className="small">
                <a href={fileUrl(f.id)!} target="_blank" rel="noopener">
                  {f.originalName}
                </a>
              </div>
            ))}
            {v.involved.length ? <p className="small">Siswa terlibat: {v.involved.map((s) => s.name).join(', ')}</p> : null}
            {r.outcome ? (
              <Notice tone="ok" title="Hasil">
                {r.outcome}
              </Notice>
            ) : null}
          </Card>
          <Card title="Riwayat">
            <ul className="timeline">
              {v.events.map((e) => (
                <li key={e.id} className={e.internal ? 'warn' : e.action === 'closed' ? 'ok' : undefined}>
                  <time>{fmtDateTime(e.at, ctx.tz)}</time>
                  <strong>{ACTION[e.action] ?? e.action}</strong> <span className="small muted">{e.actorName}</span>
                  {e.internal ? <span className="small muted"> (internal)</span> : null}
                  {e.note ? <div className="small">{e.note}</div> : null}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="stack">
          {v.handler && r.status !== 'closed' ? (
            <Card title="Tindak lanjut">
              <ActionForm action="laporan.proses" back={back} hidden={{ id }}>
                <TextArea name="catatan" label="Keterangan" rows={3} />
                <div className="f__actions">
                  <Submit name="aksi" value="follow_up">Tindak lanjuti</Submit>
                  <Submit name="aksi" value="clarification" tone="ghost">
                    Minta klarifikasi pelapor
                  </Submit>
                  <Submit name="aksi" value="note" tone="ghost">
                    Catatan internal
                  </Submit>
                </div>
              </ActionForm>
              {pool.length ? (
                <ActionForm action="laporan.proses" back={back} hidden={{ id, aksi: 'note' }}>
                  <label className="fld">
                    <span>Siswa terlibat (internal)</span>
                    <select name="siswa_terlibat" multiple defaultValue={r.studentIds} size={6}>
                      {pool.map(([k, n]) => (
                        <option key={k} value={k}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input type="hidden" name="catatan" value="Data siswa terlibat diperbarui." />
                  <Submit tone="ghost">Simpan siswa terlibat</Submit>
                </ActionForm>
              ) : null}
              <hr className="divider" />
              <ActionForm action="laporan.proses" back={back} hidden={{ id, aksi: 'close' }} confirm="Tutup laporan ini?">
                <TextArea name="catatan" label="Hasil penanganan (terlihat pelapor)" rows={3} required />
                <Submit tone="ok">Tutup laporan</Submit>
              </ActionForm>
            </Card>
          ) : null}
          {v.mine && r.status === 'clarification' ? (
            <Card title="Tambahkan informasi">
              <ActionForm action="laporan.info" back={back} hidden={{ id }} files>
                <TextArea name="catatan" label="Keterangan" rows={3} />
                <FileField name="lampiran" label="Lampiran" accept=".pdf,.jpg,.jpeg,.png" />
                <Submit>Kirim</Submit>
              </ActionForm>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}
