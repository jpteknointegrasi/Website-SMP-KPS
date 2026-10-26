import { staffPage } from '@/server/request'
import { requestView } from '@/modules/services/service'
import { RequestSummary, RequestTimeline } from '@/ui/service-request'
import { ActionForm, Card, Field, FileField, Flash, LinkBtn, Notice, PageHead, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Permohonan layanan' }

/** LAY-01 staff detail: take, ask for information, complete with output document, reject, internal note. */
export default async function ServiceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/layanan/${id}`, ['services.process'], 'layanan')
  const sp = await searchParams
  const v = await requestView(ctx, id)
  const back = `/staf/layanan/${id}`
  const closed = ['completed', 'rejected', 'cancelled'].includes(v.r.status)
  const auto = v.type.code === 'ket_aktif'
  return (
    <>
      <PageHead
        title={`Permohonan ${v.r.number}`}
        crumbs={[['Layanan TU', '/staf/layanan'], [v.r.number]]}
        actions={
          auto && v.r.status === 'completed' ? (
            <LinkBtn href={`/staf/layanan/${id}/surat`} icon="print">
              Cetak surat
            </LinkBtn>
          ) : null
        }
      />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <div className="stack">
          <RequestSummary v={v} tz={ctx.tz} />
          <RequestTimeline v={v} tz={ctx.tz} />
        </div>
        <div className="stack">
          {!closed ? (
            <>
              {v.r.status === 'submitted' ? (
                <Card title="Mulai proses">
                  <ActionForm action="layanan.proses" back={back} hidden={{ id, aksi: 'take' }}>
                    <p className="small muted">Menandai permohonan sedang Anda tangani.</p>
                    <Submit>Ambil & proses</Submit>
                  </ActionForm>
                </Card>
              ) : null}
              <Card title="Selesaikan">
                <ActionForm action="layanan.proses" back={back} hidden={{ id, aksi: 'complete' }} files op>
                  {auto ? <Notice tone="info">Surat keterangan aktif dibuat otomatis dari Buku Induk setelah selesai; unggah PDF hanya bila memakai surat bertanda tangan elektronik.</Notice> : null}
                  <Field name="nomor" label="Nomor surat/dokumen (opsional)" maxLength={80} />
                  <FileField name="hasil" label={auto ? 'Dokumen hasil (PDF, opsional)' : 'Dokumen hasil (PDF)'} accept="application/pdf" required={!auto && v.type.category === 'surat'} />
                  <TextArea name="catatan" label="Pesan untuk pemohon" rows={2} />
                  <Submit tone="ok" icon="check">
                    Tandai selesai
                  </Submit>
                </ActionForm>
              </Card>
              <Card title="Perlu informasi / tolak">
                <ActionForm action="layanan.proses" back={back} hidden={{ id }}>
                  <TextArea name="catatan" label="Keterangan untuk pemohon" rows={3} required />
                  <div className="f__actions">
                    <Submit name="aksi" value="needs_info" tone="ghost">
                      Minta informasi
                    </Submit>
                    <Submit name="aksi" value="reject" tone="danger">
                      Tolak
                    </Submit>
                  </div>
                </ActionForm>
              </Card>
            </>
          ) : null}
          <Card title="Catatan internal">
            <ActionForm action="layanan.proses" back={back} hidden={{ id, aksi: 'note' }}>
              <TextArea name="catatan" label="Catatan (hanya terlihat petugas)" rows={2} required />
              <Submit tone="ghost">Simpan catatan</Submit>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  )
}
