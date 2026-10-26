import Link from 'next/link'
import { requestBranding, staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { cardPreview } from '@/modules/reports/service'
import { fmtDateTime, localDate } from '@/server/time'
import { ReportDoc } from '@/ui/report-card'
import { PrintButton } from '@/ui/client'
import { ActionForm, Badge, Card, Field, Flash, PageHead, publicFileUrl, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Pratinjau rapor' }

/** Report card of one student: current snapshot (DRAF until approved), version history, re-open for correction. */
export default async function CardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/rapor/kartu/${id}`, ['teach', 'reports.review', 'reports.release'], 'nilai_rapor')
  const sp = await searchParams
  const d = await cardPreview(ctx, id)
  const b = (await requestBranding())!
  const v = d.versions.find((x) => x.id === sp1(sp, 'versi'))
  const snap = v?.snapshot ?? d.snapshot
  const official = Boolean(v) || ['approved', 'released'].includes(d.card.status)
  const back = `/staf/rapor/kartu/${id}`
  return (
    <>
      <div className="no-print">
        <PageHead title={`Rapor ${snap.student.name}`} sub={`${snap.homeroom} · ${snap.term} ${snap.year}`} crumbs={[['Rapor', '/staf/rapor'], [snap.homeroom, `/staf/rapor/${d.card.homeroomId}?semester=${d.card.termId}`], [snap.student.name]]} actions={<PrintButton />} />
        <Flash sp={sp} />
        <div className="grid grid--3" style={{ marginBottom: 16 }}>
          <Card title="Versi">
            {d.versions.length ? (
              <ul className="list">
                {d.versions.map((x) => (
                  <li key={x.id}>
                    <Link className="grow" href={`${back}?versi=${x.id}`}>
                      Versi {x.versionNo}
                      <div className="small muted">
                        {fmtDateTime(x.createdAt, ctx.tz)}
                        {x.reason ? ` · ${x.reason}` : ''}
                      </div>
                    </Link>
                    {x.released ? <Badge tone="ok">Dirilis</Badge> : <Badge tone="info">Disetujui</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Belum ada versi resmi (rapor belum disetujui).</p>
            )}
          </Card>
          {hasPerm(ctx, 'reports.review') && ['approved', 'released'].includes(d.card.status) ? (
            <Card title="Perbaikan rapor">
              <ActionForm action="rapor.buka_ulang" back={back} confirm="Buka rapor ini untuk perbaikan?">
                <input type="hidden" name="id" value={id} />
                <Field name="alasan" label="Alasan perbaikan" required />
                <Submit tone="ghost">Buka untuk perbaikan</Submit>
              </ActionForm>
              <p className="small muted">Versi yang sudah dirilis tetap terlihat keluarga sampai versi perbaikan dirilis.</p>
            </Card>
          ) : null}
        </div>
      </div>
      <ReportDoc s={snap} logo={publicFileUrl(b.logoFileId)} version={v?.versionNo ?? (official ? d.card.versionNo : undefined)} date={d.card.releasedAt ? localDate(d.card.releasedAt, ctx.tz) : null} draft={!official} />
    </>
  )
}
