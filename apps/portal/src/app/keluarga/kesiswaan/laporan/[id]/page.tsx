import { accountPage } from '@/server/request'
import { REPORT_CATEGORIES, REPORT_STATUS, reportView } from '@/modules/affairs/service'
import { fmtDateTime } from '@/server/time'
import { ActionForm, Badge, Card, FileField, Flash, Notice, PageHead, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Laporan' }

const ACTION: Record<string, string> = { received: 'Laporan diterima', clarification: 'Kesiswaan meminta klarifikasi', info_added: 'Informasi ditambahkan', follow_up: 'Sedang ditindaklanjuti', closed: 'Selesai' }

export default async function FamilyReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await accountPage(`/keluarga/kesiswaan/laporan/${id}`, 'kesiswaan')
  const sp = await searchParams
  const v = await reportView(ctx, id)
  const back = `/keluarga/kesiswaan/laporan/${id}`
  return (
    <>
      <PageHead title={`Laporan ${v.r.number}`} sub={REPORT_CATEGORIES[v.r.category as keyof typeof REPORT_CATEGORIES]} crumbs={[['Prestasi & laporan', '/keluarga/kesiswaan?tab=laporan'], [v.r.number]]} actions={<Badge tone={v.r.status === 'closed' ? 'ok' : 'info'}>{REPORT_STATUS[v.r.status as keyof typeof REPORT_STATUS]}</Badge>} />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <div className="stack">
          <Card title="Laporan Anda">
            <div className="prose">{v.r.description}</div>
            {v.r.outcome ? (
              <Notice tone="ok" title="Hasil penanganan">
                {v.r.outcome}
              </Notice>
            ) : null}
          </Card>
          {v.r.status === 'clarification' ? (
            <Card title="Tambahkan informasi">
              <ActionForm action="laporan.info" back={back} hidden={{ id }} files>
                <TextArea name="catatan" label="Keterangan" rows={3} />
                <FileField name="lampiran" label="Lampiran" accept=".pdf,.jpg,.jpeg,.png" />
                <Submit>Kirim</Submit>
              </ActionForm>
            </Card>
          ) : null}
        </div>
        <Card title="Perkembangan">
          <ul className="timeline">
            {v.events.map((e) => (
              <li key={e.id} className={e.action === 'closed' ? 'ok' : e.action === 'clarification' ? 'warn' : undefined}>
                <time>{fmtDateTime(e.at, ctx.tz)}</time>
                <strong>{ACTION[e.action] ?? e.action}</strong>
                {e.note ? <div className="small">{e.note}</div> : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
