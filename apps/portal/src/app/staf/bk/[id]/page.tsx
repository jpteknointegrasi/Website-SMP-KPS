import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { CATEGORIES, caseView, counselors, MODES, STATUS } from '@/modules/counseling/service'
import { fmtDate, fmtDateTime, today } from '@/server/time'
import { ActionButton, ActionForm, Badge, Card, Check, Empty, Field, Flash, Notice, PageHead, Select, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Kasus BK' }

export default async function CaseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/bk/${id}`, ['counseling', 'counseling.coordinate', 'teach'], 'bk')
  const sp = await searchParams
  const v = await caseView(ctx, id)
  const c = v.c
  const back = `/staf/bk/${id}`
  const coord = hasPerm(ctx, 'counseling.coordinate')
  const team = coord ? await counselors(ctx.db) : []
  return (
    <>
      <PageHead title={`${c.number} · ${v.student}`} sub={`${CATEGORIES[c.category as keyof typeof CATEGORIES]} · diajukan ${fmtDateTime(c.createdAt, ctx.tz)} oleh ${c.source === 'student' ? 'siswa' : c.source === 'guardian' ? 'orang tua' : c.source === 'homeroom' ? 'wali kelas' : c.source === 'counselor' ? 'guru BK' : 'guru'}`} crumbs={[['Bimbingan & Konseling', '/staf/bk'], [c.number]]} actions={<Badge tone={c.status === 'closed' ? 'ok' : 'info'}>{STATUS[c.status as keyof typeof STATUS]}</Badge>} />
      <Flash sp={sp} />
      {v.handler ? <Notice tone="warn">Halaman ini berisi catatan rahasia. Jangan membagikan isi catatan; gunakan kolom ringkasan untuk informasi yang boleh diketahui wali kelas/orang tua.</Notice> : null}
      <div className="grid grid--side">
        <div className="stack">
          {v.handler || v.peek ? (
            <Card title="Permintaan">
              <div className="prose">{c.request}</div>
              {c.preferredTime ? <p className="small muted">Waktu yang diharapkan: {c.preferredTime}</p> : null}
              {c.urgency === 'segera' ? <Badge tone="bad">Segera</Badge> : null}
            </Card>
          ) : null}
          <Card title={v.handler ? `Sesi (${v.sessionCount})` : 'Ringkasan yang dibagikan'}>
            {v.sessions.length ? (
              <ul className="timeline">
                {v.sessions.map(({ s, counselor }) => (
                  <li key={s.id}>
                    <time>
                      {fmtDate(s.date)} · {MODES[s.mode as keyof typeof MODES]} · {counselor}
                    </time>
                    {v.handler && s.notes ? (
                      <div>
                        <span className="small muted">Catatan (rahasia):</span>
                        <div className="prose">{s.notes}</div>
                      </div>
                    ) : null}
                    {s.sharedSummary ? (
                      <div>
                        <span className="small muted">
                          Ringkasan{v.handler ? ` (dibagikan: ${[s.shareWithGuardian ? 'orang tua' : null, s.shareWithHomeroom ? 'wali kelas' : null].filter(Boolean).join(', ') || 'tidak'})` : ''}:
                        </span>
                        <div className="prose">{s.sharedSummary}</div>
                      </div>
                    ) : null}
                    {s.followUpOn ? <div className="small">Tindak lanjut: {fmtDate(s.followUpOn)}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="heart">{v.handler ? 'Belum ada sesi.' : 'Belum ada ringkasan yang dibagikan.'}</Empty>
            )}
            {c.closingSummary && (v.handler || (c.status === 'closed' && c.requestedByType === 'staff' && c.requestedById === ctx.staff.id)) ? (
              <Notice tone="ok" title="Ringkasan penutupan">
                {c.closingSummary}
              </Notice>
            ) : null}
          </Card>
        </div>
        <div className="stack">
          {v.peek ? (
            <Card title="Tangani kasus">
              <p className="small muted">Kasus belum ditangani konselor.</p>
              <ActionButton action="bk.ambil" back={back} hidden={{ id }} label="Ambil & tangani" icon="heart" />
            </Card>
          ) : null}
          {coord && c.status !== 'closed' ? (
            <Card title="Penugasan">
              <p className="small">Konselor: {v.counselor ?? '—'}</p>
              <ActionForm action="bk.tugaskan" back={back} hidden={{ id }}>
                <Select name="konselor" label="Tugaskan ke" value={c.assignedTo} options={team.map((t) => [t.id, t.name])} />
                <Submit tone="ghost">Tugaskan</Submit>
              </ActionForm>
            </Card>
          ) : null}
          {v.handler && c.status !== 'closed' ? (
            <>
              <Card title="Catat sesi">
                <ActionForm action="bk.sesi" back={back} hidden={{ id }}>
                  <div className="f__row">
                    <Field name="tanggal" label="Tanggal" type="date" value={today(ctx.tz, ctx.now)} max={today(ctx.tz, ctx.now)} required />
                    <Select name="bentuk" label="Bentuk" options={Object.entries(MODES)} />
                  </div>
                  <TextArea name="catatan" label="Catatan sesi (rahasia)" rows={5} maxLength={10000} />
                  <TextArea name="ringkasan" label="Ringkasan yang boleh dibagikan" rows={3} maxLength={2000} />
                  <Check name="bagi_walas" label="Bagikan ringkasan ke wali kelas" />
                  <Check name="bagi_wali" label="Bagikan ringkasan ke orang tua/wali" />
                  <Field name="tindak_lanjut" label="Rencana tindak lanjut (opsional)" type="date" />
                  <Submit>Simpan sesi</Submit>
                </ActionForm>
              </Card>
              <Card title="Tutup kasus">
                <ActionForm action="bk.tutup" back={back} hidden={{ id }} confirm="Tutup kasus ini?">
                  <TextArea name="ringkasan" label="Ringkasan penutupan (terlihat pemohon)" rows={3} />
                  <Submit tone="ghost">Tutup kasus</Submit>
                </ActionForm>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
