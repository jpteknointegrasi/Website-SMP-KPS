import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { CATEGORIES, familyCases, STATUS } from '@/modules/counseling/service'
import { fmtDate, fmtDateTime } from '@/server/time'
import { ChildPicker } from '@/ui/child-picker'
import { ActionForm, Badge, Card, Empty, Field, Flash, Notice, PageHead, Select, sp1, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Konseling (BK)' }

/** BK-02 family: request counselling for oneself/child; see status and summaries shared with guardians. */
export default async function FamilyCounseling({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/bk', 'bk')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const cases = current ? await familyCases(ctx, current.studentId) : []
  return (
    <>
      <PageHead title="Bimbingan & Konseling" sub="Layanan BK bersifat rahasia. Yang dibagikan di sini hanya ringkasan yang disetujui guru BK." />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/bk" />
      {current ? (
        <div className="grid grid--side">
          <Card title="Permintaan & ringkasan">
            {cases.length ? (
              <ul className="timeline">
                {cases.map((c) => (
                  <li key={c.id} className={c.status === 'closed' ? 'ok' : undefined}>
                    <time>
                      {c.number} · {fmtDateTime(c.createdAt, ctx.tz)}
                    </time>
                    <strong>{CATEGORIES[c.category as keyof typeof CATEGORIES]}</strong> <Badge tone={c.status === 'closed' ? 'ok' : 'info'}>{STATUS[c.status as keyof typeof STATUS]}</Badge>
                    {c.request ? <div className="small muted">{c.request}</div> : null}
                    {c.summaries.map((s, i) => (
                      <div key={i} className="small">
                        <strong>{fmtDate(s.date)}:</strong> {s.text}
                      </div>
                    ))}
                    {c.closingSummary ? <div className="small">Ringkasan: {c.closingSummary}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="heart">Belum ada permintaan konseling.</Empty>
            )}
          </Card>
          <Card title={current.self ? 'Ingin bicara dengan guru BK?' : 'Ajukan konseling untuk anak'}>
            <ActionForm action="bk.ajukan" back={`/keluarga/bk?anak=${current.studentId}`} hidden={{ siswa: current.studentId }} op>
              <Select name="kategori" label="Tentang" options={Object.entries(CATEGORIES)} />
              <Select
                name="urgensi"
                label="Urgensi"
                options={[
                  ['normal', 'Biasa'],
                  ['segera', 'Perlu segera'],
                ]}
              />
              <TextArea name="cerita" label="Ceritakan singkat" rows={4} required maxLength={3000} />
              <Field name="waktu" label="Waktu yang nyaman (opsional)" placeholder="Istirahat kedua / setelah pulang" />
              <Submit>Kirim ke guru BK</Submit>
            </ActionForm>
            <Notice tone="info">Bila ada keadaan darurat atau bahaya, segera hubungi wali kelas atau pihak sekolah secara langsung.</Notice>
          </Card>
        </div>
      ) : (
        <Empty icon="users">Belum ada siswa yang terhubung.</Empty>
      )}
    </>
  )
}
