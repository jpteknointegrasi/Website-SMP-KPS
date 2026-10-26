import { accountPage } from '@/server/request'
import { requestView } from '@/modules/services/service'
import { RequestSummary, RequestTimeline } from '@/ui/service-request'
import { ActionButton, ActionForm, Card, fileUrl, FileField, Flash, LinkBtn, Notice, PageHead, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Permohonan layanan' }

export default async function FamilyService({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await accountPage(`/keluarga/layanan/${id}`, 'layanan')
  const sp = await searchParams
  const v = await requestView(ctx, id)
  const back = `/keluarga/layanan/${id}`
  const last = [...v.events].reverse().find((e) => e.action === 'needs_info')
  return (
    <>
      <PageHead title={`Permohonan ${v.r.number}`} crumbs={[['Layanan sekolah', '/keluarga/layanan'], [v.r.number]]} />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <div className="stack">
          {v.r.status === 'completed' ? (
            <Notice tone="ok" title="Permohonan selesai">
              <span className="row">
                {v.type.code === 'ket_aktif' ? (
                  <LinkBtn href={`/keluarga/layanan/${id}/surat`} icon="print">
                    Lihat & cetak surat
                  </LinkBtn>
                ) : null}
                {v.r.outputFileId ? (
                  <a className="btn btn--ghost" href={fileUrl(v.r.outputFileId)!} target="_blank" rel="noopener">
                    Unduh dokumen
                  </a>
                ) : null}
              </span>
            </Notice>
          ) : null}
          {v.r.status === 'needs_info' ? (
            <Card title="Sekolah meminta informasi tambahan">
              {last?.note ? <Notice tone="warn">{last.note}</Notice> : null}
              <ActionForm action="layanan.pemohon" back={back} hidden={{ id, aksi: 'info' }} files>
                <TextArea name="catatan" label="Jawaban / keterangan" rows={3} />
                <FileField name="berkas" label="Lampiran (opsional)" accept=".pdf,.jpg,.jpeg,.png" />
                <Submit>Kirim</Submit>
              </ActionForm>
            </Card>
          ) : null}
          <RequestSummary v={v} tz={ctx.tz} />
          {['submitted', 'needs_info'].includes(v.r.status) ? <ActionButton action="layanan.pemohon" back={back} hidden={{ id, aksi: 'cancel' }} label="Batalkan permohonan" tone="danger-ghost" small /> : null}
        </div>
        <RequestTimeline v={v} tz={ctx.tz} />
      </div>
    </>
  )
}
