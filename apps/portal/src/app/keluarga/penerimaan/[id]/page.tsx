import Link from 'next/link'
import { notFound } from 'next/navigation'
import { accountPage } from '@/server/request'
import { applicationView, progressOf } from '@/modules/admissions/apply'
import { hasProduct } from '@satusekolah/core'
import { BillsPanel, DocsPanel, LeadLinkPanel, ReenrollPanel, ResultPanel, RevisionNotice, SelectionPanel, StatusSummary, StepForm, SubmitPanel } from '@/ui/application'
import { ActionForm, Card, Field, Flash, LinkBtn, PageHead, sp1, Steps, Submit, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Pendaftaran' }

/** ADM-01/ADM-02: one child's application — step form while draft/revision, then status, result and re-enrolment. */
export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const ctx = await accountPage(`/keluarga/penerimaan/${id}`, 'penerimaan')
  const sp = await searchParams
  const v = await applicationView(ctx, id).catch((e) => {
    if (e?.code === 'not_found' || e?.code === 'forbidden') notFound()
    throw e
  })
  const base = `/keluarga/penerimaan/${id}`
  const editing = v.editable !== null
  const step = (sp1(sp, 'langkah') as 'anak' | 'keluarga' | 'berkas' | 'kirim' | undefined) ?? (editing ? 'anak' : undefined)
  const prog = progressOf(v)
  const web = hasProduct(ctx.school, 'web')
  return (
    <>
      <PageHead
        title={v.app.data.fullName || 'Pendaftaran'}
        sub={`${v.cycle.name} · Jalur ${v.path.name}`}
        crumbs={[['Penerimaan siswa baru', '/keluarga/penerimaan'], [v.app.data.fullName || 'Pendaftaran']]}
        actions={v.app.registrationNo ? <LinkBtn href={`${base}/bukti`} tone="ghost" icon="print">Bukti pendaftaran</LinkBtn> : null}
      />
      <Flash sp={sp} />
      <Card>
        <Steps items={['Daftar', 'Berkas', 'Seleksi', 'Hasil', 'Daftar ulang']} current={prog} />
      </Card>
      <RevisionNotice v={v} tz={ctx.tz} />
      {editing ? (
        <>
          <Tabs
            current={`${base}?langkah=${step}`}
            items={[
              ['1. Data calon siswa', `${base}?langkah=anak`],
              ['2. Data keluarga', `${base}?langkah=keluarga`],
              ['3. Berkas', `${base}?langkah=berkas`],
              ['4. Cek & kirim', `${base}?langkah=kirim`],
            ]}
          />
          {step === 'anak' ? (
            <Card title="Data identitas calon siswa">
              <StepForm v={v} step="anak" back={`${base}?langkah=anak`} next="keluarga" />
            </Card>
          ) : null}
          {step === 'keluarga' ? (
            <Card title="Data keluarga">
              <StepForm v={v} step="keluarga" back={`${base}?langkah=keluarga`} next="berkas" />
            </Card>
          ) : null}
          {step === 'berkas' ? (
            <Card title="Unggah berkas persyaratan" actions={<Link href={`${base}?langkah=kirim`}>Lanjut ke cek & kirim →</Link>}>
              <DocsPanel v={v} back={`${base}?langkah=berkas`} />
            </Card>
          ) : null}
          {step === 'kirim' ? (
            <Card title="Cek & kirim">
              <SubmitPanel v={v} back={`${base}?langkah=kirim`} />
            </Card>
          ) : null}
          {web && step === 'kirim' ? <LeadLinkPanel v={v} back={`${base}?langkah=kirim`} tz={ctx.tz} /> : null}
        </>
      ) : (
        <div className="grid grid--side">
          <div>
            <ResultPanel v={v} back={base} tz={ctx.tz} canAnswer />
            <ReenrollPanel v={v} back={base} tz={ctx.tz} family />
            <SelectionPanel v={v} tz={ctx.tz} />
            <Card title="Berkas">
              <DocsPanel v={v} back={base} />
            </Card>
          </div>
          <div>
            <Card title="Ringkasan">
              <StatusSummary v={v} tz={ctx.tz} />
              {v.app.status === 'rejected' && v.app.rejectReason ? <p className="small" style={{ marginTop: 10 }}>Keterangan: {v.app.rejectReason}</p> : null}
            </Card>
            <BillsPanel v={v} back={base} canPay />
            {web ? <LeadLinkPanel v={v} back={base} tz={ctx.tz} /> : null}
            {v.cycle.helpContact ? (
              <Card title="Bantuan">
                <p className="small">{v.cycle.helpContact}</p>
              </Card>
            ) : null}
          </div>
        </div>
      )}
      {!['withdrawn', 'rejected'].includes(v.app.status) && !(v.reenroll?.status === 'verified') ? (
        <details className="more" style={{ marginTop: 8 }}>
          <summary>Tarik pendaftaran</summary>
          <Card>
            <ActionForm action="ppdb.tarik" back={base} hidden={{ id }} confirm="Tarik pendaftaran ini? Tindakan ini tidak dapat dibatalkan dari portal.">
              <Field name="alasan" label="Alasan" required />
              <Submit tone="danger">Tarik pendaftaran</Submit>
            </ActionForm>
          </Card>
        </details>
      ) : null}
    </>
  )
}
