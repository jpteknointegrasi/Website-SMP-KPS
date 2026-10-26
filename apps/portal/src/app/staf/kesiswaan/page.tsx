import Link from 'next/link'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { achievementList, FIELDS, LEVELS, myReports, REPORT_CATEGORIES, REPORT_STATUS, reportQueue } from '@/modules/affairs/service'
import { homeroomStudents, myHomerooms } from '@/modules/scope'
import { activeYear } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { fmtDate, fmtDateTime, today } from '@/server/time'
import { ActionForm, Badge, Card, Check, Empty, Field, fileUrl, FileField, Flash, PageHead, Select, sp1, Stat, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Kesiswaan' }

const ACH: Record<string, [string, 'warn' | 'ok' | 'bad']> = { submitted: ['Menunggu verifikasi', 'warn'], verified: ['Terverifikasi', 'ok'], rejected: ['Ditolak', 'bad'] }
const REP_TONE: Record<string, 'warn' | 'info' | 'ok'> = { received: 'warn', clarification: 'warn', follow_up: 'info', closed: 'ok' }

/** KES-01: achievements (verify / record) and reports to student affairs. */
export default async function Affairs({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/kesiswaan', ['student_affairs', 'teach'], 'kesiswaan')
  const sp = await searchParams
  const handler = hasPerm(ctx, 'student_affairs')
  const tab = sp1(sp, 'tab') ?? 'prestasi'
  const achs = handler && tab === 'prestasi' ? await achievementList(ctx, sp1(sp, 'status') || undefined) : []
  const reports = handler && tab === 'laporan' ? await reportQueue(ctx, sp1(sp, 'selesai') === '1') : []
  const mine = !handler && tab === 'laporan' ? await myReports(ctx) : []
  const d = today(ctx.tz, ctx.now)
  const year = await activeYear(ctx.db)
  const rooms = handler && year ? (await homeroomsOfYear(ctx, year.id)).map((r) => r.h) : await myHomerooms(ctx)
  const pool: [string, string][] = []
  if (tab === 'prestasi') for (const h of rooms) for (const s of await homeroomStudents(ctx.db, h.id, d)) pool.push([s.studentId, `${s.name} (${h.name})`])
  const base = '/staf/kesiswaan'
  return (
    <>
      <PageHead title="Kesiswaan" sub="Prestasi siswa dan laporan ke kesiswaan (perundungan, kedisiplinan, keamanan)." />
      <Flash sp={sp} />
      <Tabs
        current={`${base}?tab=${tab}`}
        items={[
          ['Prestasi', `${base}?tab=prestasi`],
          ['Laporan', `${base}?tab=laporan`],
        ]}
      />
      {tab === 'prestasi' ? (
        <div className="grid grid--side">
          {handler ? (
            <Card flush title="Prestasi siswa">
              <form method="get" className="filters" style={{ padding: '0 20px' }}>
                <input type="hidden" name="tab" value="prestasi" />
                <Select name="status" label="Status" value={sp1(sp, 'status')} empty="Semua" options={Object.entries(ACH).map(([k, v]) => [k, v[0]])} />
                <Submit tone="ghost">Saring</Submit>
              </form>
              {achs.length ? (
                <ul className="list" style={{ padding: '0 20px' }}>
                  {achs.map(({ a, name }) => (
                    <li key={a.id} style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div className="grow">
                        <strong>{a.title}</strong> · {name}
                        <div className="small muted">
                          {LEVELS[a.level as keyof typeof LEVELS]} · {a.rank ?? '—'} · {a.organizer ?? '—'} · {fmtDate(a.date)}
                          {a.publicConsent ? ' · boleh dipublikasikan' : ''}
                        </div>
                        {a.evidenceFileId ? (
                          <a className="small" href={fileUrl(a.evidenceFileId)!} target="_blank" rel="noopener">
                            Lihat bukti
                          </a>
                        ) : null}
                      </div>
                      {a.status === 'submitted' ? (
                        <ActionForm action="prestasi.verifikasi" back={`${base}?tab=prestasi`} hidden={{ id: a.id }} className="row">
                          <input name="catatan" placeholder="Catatan" aria-label="Catatan" style={{ maxWidth: 160 }} />
                          <Submit name="keputusan" value="setuju" tone="ok">
                            Verifikasi
                          </Submit>
                          <Submit name="keputusan" value="tolak" tone="ghost">
                            Tolak
                          </Submit>
                        </ActionForm>
                      ) : (
                        <Badge tone={ACH[a.status]![1]}>{ACH[a.status]![0]}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon="star">Belum ada prestasi.</Empty>
              )}
            </Card>
          ) : (
            <Card title="Prestasi siswa perwalian">
              <p className="small muted">Catat prestasi siswa di kelas perwalian Anda; kesiswaan akan memverifikasi sebelum tampil di rapor.</p>
            </Card>
          )}
          <Card title="Catat prestasi">
            {pool.length ? (
              <ActionForm action="prestasi.ajukan" back={`${base}?tab=prestasi`} files op>
                <Select name="siswa" label="Siswa" options={pool} required />
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
                <FileField name="bukti" label="Bukti (sertifikat/foto)" accept=".pdf,.jpg,.jpeg,.png" />
                <Check name="publik" label="Siswa/orang tua setuju dipublikasikan di website sekolah" />
                <Submit>Simpan</Submit>
              </ActionForm>
            ) : (
              <p className="small muted">Tidak ada siswa yang dapat Anda catat.</p>
            )}
          </Card>
        </div>
      ) : null}
      {tab === 'laporan' ? (
        <div className="grid grid--side">
          <Card title={handler ? 'Laporan masuk' : 'Laporan saya'} flush actions={handler ? <Link href={`${base}?tab=laporan${sp1(sp, 'selesai') ? '' : '&selesai=1'}`}>{sp1(sp, 'selesai') ? 'Yang aktif' : 'Yang selesai'}</Link> : null}>
            {handler ? (
              <div className="grid grid--3" style={{ padding: '0 20px 12px' }}>
                <Stat icon="inbox" tone="warn" label="Baru" value={reports.filter((r) => r.status === 'received').length} />
                <Stat icon="alert" tone="bad" label="Perundungan" value={reports.filter((r) => r.category === 'perundungan' && r.status !== 'closed').length} />
                <Stat icon="clock" label="Ditindaklanjuti" value={reports.filter((r) => r.status === 'follow_up').length} />
              </div>
            ) : null}
            {(handler ? reports : mine).length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Nomor</th>
                      <th>Kategori</th>
                      <th>Diterima</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(handler ? reports : mine).map((r) => (
                      <tr key={r.id}>
                        <td className="mono">
                          <Link href={`${base}/laporan/${r.id}`}>{r.number}</Link>
                        </td>
                        <td>{REPORT_CATEGORIES[r.category as keyof typeof REPORT_CATEGORIES]}</td>
                        <td className="nowrap">{fmtDateTime(r.createdAt, ctx.tz)}</td>
                        <td>
                          <Badge tone={REP_TONE[r.status] ?? 'info'}>{REPORT_STATUS[r.status as keyof typeof REPORT_STATUS]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="shield">Tidak ada laporan.</Empty>
            )}
          </Card>
          <Card title="Buat laporan">
            <ActionForm action="laporan.kirim" back={`${base}?tab=laporan`} files op>
              <Select name="kategori" label="Kategori" options={Object.entries(REPORT_CATEGORIES)} />
              <TextArea name="uraian" label="Uraian kejadian" rows={5} required />
              <div className="f__row">
                <Field name="tanggal" label="Tanggal kejadian" type="date" max={d} />
                <Field name="tempat" label="Tempat" />
              </div>
              <FileField name="lampiran" label="Lampiran (opsional)" accept=".pdf,.jpg,.jpeg,.png" />
              <Submit>Kirim laporan</Submit>
            </ActionForm>
          </Card>
        </div>
      ) : null}
    </>
  )
}
