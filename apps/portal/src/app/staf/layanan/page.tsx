import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { serviceTypes } from '@/db/schema'
import { staffPage } from '@/server/request'
import { ensureTypes, queue, STATUS } from '@/modules/services/service'
import { fmtDate, fmtDateTime } from '@/server/time'
import { SERVICE_TONE } from '@/ui/tones'
import { ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, Select, sp1, Stat, Status, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Layanan TU' }

/** LAY-01 staff: request queue ordered by due date (SLA), history by status, service catalogue. */
export default async function ServicesQueue({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/layanan', ['services.process'], 'layanan')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'antrean'
  const status = sp1(sp, 'status')
  const rows = tab === 'antrean' ? await queue(ctx, status && STATUS[status] ? status : undefined) : []
  await ensureTypes(ctx.db)
  const types = tab === 'jenis' ? await ctx.db.select().from(serviceTypes).orderBy(asc(serviceTypes.ordinal)) : []
  const open = tab === 'antrean' && !status ? rows : await queue(ctx)
  const overdue = open.filter((r) => r.r.dueAt && r.r.dueAt < ctx.now).length
  const base = '/staf/layanan'
  const edit = types.find((t) => t.id === sp1(sp, 'ubah'))
  return (
    <>
      <PageHead title="Layanan tata usaha" sub="Permohonan surat dan layanan administrasi dari siswa, orang tua dan staf." />
      <Flash sp={sp} />
      <div className="grid grid--3" style={{ marginBottom: 18 }}>
        <Stat icon="inbox" label="Permohonan terbuka" value={open.length} />
        <Stat icon="clock" tone={overdue ? 'bad' : 'ok'} label="Lewat target waktu" value={overdue} />
        <Stat icon="alert" tone="warn" label="Menunggu informasi pemohon" value={open.filter((r) => r.r.status === 'needs_info').length} />
      </div>
      <Tabs
        current={`${base}?tab=${tab}`}
        items={[
          ['Antrean', `${base}?tab=antrean`],
          ['Jenis layanan', `${base}?tab=jenis`],
        ]}
      />
      {tab === 'antrean' ? (
        <Card flush>
          <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
            <input type="hidden" name="tab" value="antrean" />
            <Select name="status" label="Status" value={status} empty="Terbuka (belum selesai)" options={Object.entries(STATUS)} />
            <Submit tone="ghost">Saring</Submit>
          </form>
          {rows.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Nomor</th>
                    <th>Layanan</th>
                    <th>Siswa / pemohon</th>
                    <th>Target</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ r, type, student }) => (
                    <tr key={r.id}>
                      <td className="mono">
                        <Link href={`${base}/${r.id}`}>{r.number}</Link>
                      </td>
                      <td>
                        {type}
                        <div className="small muted">{fmtDateTime(r.createdAt, ctx.tz)}</div>
                      </td>
                      <td>
                        {student ?? '—'}
                        <div className="small muted">{r.requesterName}</div>
                      </td>
                      <td className="nowrap">{r.dueAt ? r.dueAt < ctx.now && !r.closedAt ? <Badge tone="bad">{fmtDate(r.dueAt, ctx.tz, true)}</Badge> : fmtDate(r.dueAt, ctx.tz, true) : '—'}</td>
                      <td>
                        <Status value={r.status} map={SERVICE_TONE} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="checkCircle">Tidak ada permohonan.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'jenis' ? (
        <div className="grid grid--side">
          <Card flush>
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Layanan</th>
                    <th>Kategori</th>
                    <th className="num">Target (hari)</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.name}</strong>
                        <div className="small muted">
                          {t.code}
                          {t.requiresFile ? ' · wajib lampiran' : ''}
                        </div>
                      </td>
                      <td>{t.category}</td>
                      <td className="num">{t.slaDays}</td>
                      <td>{t.active ? <Badge tone="ok">Aktif</Badge> : <Badge tone="muted">Nonaktif</Badge>}</td>
                      <td className="actions">
                        <Link href={`${base}?tab=jenis&ubah=${t.id}`}>Ubah</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title={edit ? `Ubah: ${edit.name}` : 'Tambah jenis layanan'}>
            <ActionForm action="layanan.jenis" back={`${base}?tab=jenis`} hidden={{ id: edit?.id }} key={edit?.id ?? 'baru'}>
              <div className="f__row">
                <Field name="kode" label="Kode" value={edit?.code} required pattern="[a-z][a-z0-9_]{1,30}" />
                <Select
                  name="kategori"
                  label="Kategori"
                  value={edit?.category ?? 'surat'}
                  options={[
                    ['surat', 'Surat'],
                    ['data', 'Data'],
                    ['konsultasi', 'Konsultasi'],
                    ['keluhan', 'Saran & keluhan'],
                    ['lainnya', 'Lainnya'],
                  ]}
                />
              </div>
              <Field name="nama" label="Nama layanan" value={edit?.name} required />
              <TextArea name="deskripsi" label="Deskripsi untuk pemohon" value={edit?.description} rows={2} />
              <Field name="sla" label="Target selesai (hari)" type="number" min={1} max={60} value={edit?.slaDays ?? 3} />
              <TextArea name="pertanyaan" label="Pertanyaan (kunci | label | wajib)" rows={3} value={edit?.questions.map((q) => `${q.key} | ${q.label} | ${q.required ? 'wajib' : ''}`).join('\n') ?? 'keperluan | Keperluan | wajib'} />
              <Check name="wajib_berkas" label="Pemohon wajib melampirkan berkas" checked={edit?.requiresFile} />
              <Check name="aktif" label="Aktif (tampil di portal)" checked={edit?.active ?? true} />
              <div className="f__actions">
                <Submit>Simpan</Submit>
              </div>
            </ActionForm>
          </Card>
        </div>
      ) : null}
    </>
  )
}
