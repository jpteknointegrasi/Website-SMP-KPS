import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { recap, studentDays, studentLeaves } from '@/modules/attendance/service'
import { currentTerm } from '@/modules/scope'
import { addDays, fmtDate, fmtDayDate, today } from '@/server/time'
import { RecapMeter } from '@/ui/daily'
import { ATT_TONE, LEAVE_TONE } from '@/ui/tones'
import { ChildPicker } from '@/ui/child-picker'
import { ActionForm, Card, Empty, Field, FileField, Flash, Notice, PageHead, Select, sp1, Status, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Presensi & izin' }

/** WLI-02: attendance recap and history; guardians submit sick/permission leave to the homeroom teacher. */
export default async function FamilyAttendance({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/presensi', 'akademik')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const d = today(ctx.tz, ctx.now)
  const term = await currentTerm(ctx)
  const ok = current?.canViewAcademic
  const month = ok ? await recap(ctx.db, current!.studentId, `${d.slice(0, 7)}-01`, d) : null
  const sem = ok && term ? await recap(ctx.db, current!.studentId, term.startDate, d < term.endDate ? d : term.endDate) : null
  const days = ok ? (await studentDays(ctx, current!.studentId, addDays(d, -45), d)).filter((r) => r.status !== 'H') : []
  const leaves = ok ? await studentLeaves(ctx, current!.studentId) : []
  const back = `/keluarga/presensi${current ? `?anak=${current.studentId}` : ''}`
  return (
    <>
      <PageHead title="Presensi & izin" sub={current?.name} />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/presensi" />
      {current && !ok ? <Notice tone="info">Akses akademik untuk anak ini tidak diberikan pada akun Anda.</Notice> : null}
      {ok ? (
        <div className="grid grid--side">
          <div className="stack">
            <div className="grid grid--2">
              <Card title="Bulan ini">{month ? <RecapMeter r={month} /> : null}</Card>
              <Card title={term ? `Semester ${term.name}` : 'Semester'}>{sem ? <RecapMeter r={sem} /> : <span className="muted small">—</span>}</Card>
            </div>
            <Card title="Tidak hadir (45 hari terakhir)" flush>
              {days.length ? (
                <table className="t">
                  <tbody>
                    {days.map((r) => (
                      <tr key={r.id}>
                        <td className="nowrap">{fmtDayDate(r.date)}</td>
                        <td>
                          <Status value={r.status} map={ATT_TONE} />
                        </td>
                        <td className="small muted">{r.note ?? (r.source === 'leave' ? 'Dari pengajuan izin' : '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty icon="checkCircle">Selalu hadir dalam 45 hari terakhir.</Empty>
              )}
            </Card>
            <Card title="Riwayat pengajuan izin" flush>
              {leaves.length ? (
                <table className="t">
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id}>
                        <td className="nowrap">
                          {fmtDate(l.fromDate, undefined, true)}
                          {l.toDate !== l.fromDate ? ` – ${fmtDate(l.toDate, undefined, true)}` : ''}
                        </td>
                        <td>
                          {l.kind}
                          <div className="small muted">{l.reason}</div>
                          {l.reviewNote ? <div className="small">Catatan wali kelas: {l.reviewNote}</div> : null}
                        </td>
                        <td>
                          <Status value={l.status} map={LEAVE_TONE} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty icon="inbox">Belum ada pengajuan izin.</Empty>
              )}
            </Card>
          </div>
          {!current!.self ? (
            <Card title="Ajukan izin / sakit">
              <ActionForm action="izin.ajukan" back={back} hidden={{ siswa: current!.studentId }} files op>
                <Select
                  name="jenis"
                  label="Jenis"
                  options={[
                    ['sakit', 'Sakit'],
                    ['izin', 'Izin (keperluan keluarga, dll.)'],
                    ['dispensasi', 'Dispensasi (tugas/lomba)'],
                  ]}
                />
                <div className="f__row">
                  <Field name="dari" label="Dari tanggal" type="date" value={d} required min={addDays(d, -7)} />
                  <Field name="sampai" label="Sampai tanggal" type="date" value={d} />
                </div>
                <TextArea name="alasan" label="Keterangan" rows={3} required maxLength={1000} />
                <FileField name="bukti" label="Surat dokter / surat izin (opsional)" accept=".pdf,.jpg,.jpeg,.png" hint="Hanya terlihat wali kelas dan petugas berwenang." />
                <Submit icon="arrowRight">Kirim ke wali kelas</Submit>
              </ActionForm>
              <p className="small muted" style={{ marginTop: 10 }}>
                Status presensi berubah setelah wali kelas menyetujui. Pengajuan paling lambat 7 hari setelah tanggal tidak masuk.
              </p>
            </Card>
          ) : (
            <Card title="Izin tidak masuk">
              <p className="small muted">Pengajuan izin dilakukan orang tua/wali dari akunnya, atau sampaikan langsung ke wali kelas.</p>
            </Card>
          )}
        </div>
      ) : null}
    </>
  )
}
