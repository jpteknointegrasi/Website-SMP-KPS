import Link from 'next/link'
import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { achievementsOf, FIELDS, LEVELS, myReports, REPORT_CATEGORIES, REPORT_STATUS } from '@/modules/affairs/service'
import { fmtDate, fmtDateTime, today } from '@/server/time'
import { ChildPicker } from '@/ui/child-picker'
import { ActionForm, Badge, Card, Check, Empty, Field, FileField, Flash, PageHead, Select, sp1, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Prestasi & laporan' }

const ACH: Record<string, [string, 'warn' | 'ok' | 'bad']> = { submitted: ['Menunggu verifikasi', 'warn'], verified: ['Terverifikasi', 'ok'], rejected: ['Ditolak', 'bad'] }

export default async function FamilyAffairs({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/kesiswaan', 'kesiswaan')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'prestasi'
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const achs = current && tab === 'prestasi' ? await achievementsOf(ctx, current.studentId) : []
  const reps = tab === 'laporan' ? await myReports(ctx) : []
  const q = (t: string) => `/keluarga/kesiswaan?tab=${t}${current ? `&anak=${current.studentId}` : ''}`
  const d = today(ctx.tz, ctx.now)
  return (
    <>
      <PageHead title="Prestasi & laporan" sub="Catat prestasi, atau laporkan perundungan dan masalah lain kepada kesiswaan." />
      <Flash sp={sp} />
      <Tabs
        current={q(tab)}
        items={[
          ['Prestasi', q('prestasi')],
          ['Laporan ke kesiswaan', q('laporan')],
        ]}
      />
      {tab === 'prestasi' ? (
        <>
          <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/kesiswaan" />
          {current ? (
            <div className="grid grid--side">
              <Card title={`Prestasi ${current.name}`}>
                {achs.length ? (
                  <ul className="list">
                    {achs.map((a) => (
                      <li key={a.id}>
                        <span className="grow">
                          <strong>{a.title}</strong>
                          <div className="small muted">
                            {LEVELS[a.level as keyof typeof LEVELS]} · {a.rank ?? '—'} · {fmtDate(a.date)}
                          </div>
                          {a.reviewNote ? <div className="small">{a.reviewNote}</div> : null}
                        </span>
                        <Badge tone={ACH[a.status]![1]}>{ACH[a.status]![0]}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon="star">Belum ada prestasi tercatat.</Empty>
                )}
              </Card>
              <Card title="Laporkan prestasi">
                <ActionForm action="prestasi.ajukan" back={q('prestasi')} hidden={{ siswa: current.studentId }} files op>
                  <Field name="judul" label="Nama lomba / prestasi" required />
                  <div className="f__row">
                    <Select name="bidang" label="Bidang" options={Object.entries(FIELDS)} />
                    <Select name="tingkat" label="Tingkat" options={Object.entries(LEVELS)} />
                  </div>
                  <div className="f__row">
                    <Field name="peringkat" label="Peringkat" placeholder="Juara 1, Finalis…" />
                    <Field name="tanggal" label="Tanggal" type="date" max={d} required />
                  </div>
                  <Field name="penyelenggara" label="Penyelenggara" />
                  <FileField name="bukti" label="Sertifikat / foto" accept=".pdf,.jpg,.jpeg,.png" />
                  <Check name="publik" label="Saya setuju prestasi ini (nama & prestasi) ditampilkan di website sekolah" />
                  <Submit>Kirim untuk diverifikasi</Submit>
                </ActionForm>
              </Card>
            </div>
          ) : (
            <Empty icon="users">Belum ada siswa yang terhubung.</Empty>
          )}
        </>
      ) : (
        <div className="grid grid--side">
          <Card title="Laporan saya" flush>
            {reps.length ? (
              <table className="t">
                <tbody>
                  {reps.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">
                        <Link href={`/keluarga/kesiswaan/laporan/${r.id}`}>{r.number}</Link>
                      </td>
                      <td>{REPORT_CATEGORIES[r.category as keyof typeof REPORT_CATEGORIES]}</td>
                      <td className="small">{fmtDateTime(r.createdAt, ctx.tz)}</td>
                      <td>
                        <Badge tone={r.status === 'closed' ? 'ok' : r.status === 'clarification' ? 'warn' : 'info'}>{REPORT_STATUS[r.status as keyof typeof REPORT_STATUS]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty icon="shield">Belum ada laporan.</Empty>
            )}
          </Card>
          <Card title="Buat laporan">
            <ActionForm action="laporan.kirim" back={q('laporan')} files op>
              <Select name="kategori" label="Kategori" options={Object.entries(REPORT_CATEGORIES)} />
              <TextArea name="uraian" label="Apa yang terjadi?" rows={5} required />
              <div className="f__row">
                <Field name="tanggal" label="Tanggal kejadian" type="date" max={d} />
                <Field name="tempat" label="Tempat" />
              </div>
              <FileField name="lampiran" label="Bukti/foto (opsional)" accept=".pdf,.jpg,.jpeg,.png" />
              <Check name="rahasia" label="Rahasiakan identitas saya (hanya diketahui petugas kesiswaan)" />
              <Submit>Kirim laporan</Submit>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  )
}
