import Link from 'next/link'
import { staffPage } from '@/server/request'
import { CATEGORIES, listInvoices, pendingPayments } from '@/modules/finance/service'
import { activeYear, homeroomStudents } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { hasPerm } from '@/server/context'
import { fmtDate, fmtDateTime, today } from '@/server/time'
import { INVOICE_TONE } from '@/ui/tones'
import { ActionForm, Card, Empty, Field, fileUrl, Flash, PageHead, rupiah, Select, sp1, Stat, Status, Submit, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Keuangan' }

/** FIN-01: invoices, payment proofs to verify (proof ≠ payment), new invoices. */
export default async function Finance({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/keuangan', ['finance.manage', 'finance.verify'], 'keuangan')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'bukti'
  const pend = await pendingPayments(ctx)
  const list = tab === 'tagihan' ? await listInvoices(ctx, { status: sp1(sp, 'status') || undefined, category: sp1(sp, 'kategori') || undefined, q: sp1(sp, 'q') || undefined }) : []
  const all = await listInvoices(ctx, {})
  const outstanding = all.filter((r) => ['unpaid', 'partial'].includes(r.i.status)).reduce((a, r) => a + r.i.amount - r.i.paid, 0)
  const paid = all.reduce((a, r) => a + r.i.paid, 0)
  const year = await activeYear(ctx.db)
  const rooms = tab === 'baru' && year ? await homeroomsOfYear(ctx, year.id) : []
  const rombel = sp1(sp, 'rombel')
  const pupils = tab === 'baru' && rombel ? await homeroomStudents(ctx.db, rombel, today(ctx.tz, ctx.now)) : []
  const base = '/staf/keuangan'
  return (
    <>
      <PageHead title="Tagihan & pembayaran" sub="Verifikasi bukti pembayaran dan kelola tagihan. Bukti transfer baru dihitung setelah diverifikasi." />
      <Flash sp={sp} />
      <div className="grid grid--3" style={{ marginBottom: 18 }}>
        <Stat icon="inbox" tone={pend.length ? 'warn' : 'ok'} label="Bukti menunggu verifikasi" value={pend.length} />
        <Stat icon="wallet" label="Belum terbayar" value={rupiah(outstanding)} />
        <Stat icon="checkCircle" tone="ok" label="Terverifikasi" value={rupiah(paid)} />
      </div>
      <Tabs current={`${base}?tab=${tab}`} items={[['Bukti pembayaran', `${base}?tab=bukti`], ['Daftar tagihan', `${base}?tab=tagihan`], ['Buat tagihan', `${base}?tab=baru`]]} />
      {tab === 'bukti' ? (
        <Card title="Bukti pembayaran menunggu verifikasi">
          {pend.length ? (
            <ul className="list">
              {pend.map(({ p, i }) => (
                <li key={p.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="grow">
                    <strong>{i.title}</strong> · tagihan {rupiah(i.amount)} · dibayar <strong>{rupiah(p.amount)}</strong>
                    <div className="small muted">
                      {i.number} · {p.method} · tgl bayar {fmtDate(p.paidOn)} · {p.payerName ?? 'pengirim —'} · dikirim {fmtDateTime(p.createdAt, ctx.tz)}
                    </div>
                    {p.proofFileId ? (
                      <a className="small" href={fileUrl(p.proofFileId)!} target="_blank" rel="noopener">
                        Lihat bukti
                      </a>
                    ) : null}
                  </div>
                  {hasPerm(ctx, 'finance.verify') ? (
                    <div className="row">
                      <ActionForm action="keuangan.verifikasi" back={`${base}?tab=bukti`} hidden={{ id: p.id }} className="row">
                        <input name="referensi" placeholder="No. referensi bank (opsional)" aria-label="Nomor referensi" style={{ maxWidth: 210 }} />
                        <Submit tone="ok" icon="check">Verifikasi & alokasikan</Submit>
                      </ActionForm>
                      <details className="more">
                        <summary>Tolak</summary>
                        <ActionForm action="keuangan.tolak" back={`${base}?tab=bukti`} hidden={{ id: p.id }}>
                          <Field name="alasan" label="Alasan / perbaikan yang diminta" required />
                          <Submit tone="danger">Tolak bukti</Submit>
                        </ActionForm>
                      </details>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="checkCircle">Tidak ada bukti yang menunggu.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'tagihan' ? (
        <Card flush>
          <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
            <input type="hidden" name="tab" value="tagihan" />
            <label className="fld fld--grow">
              <span>Cari</span>
              <input type="search" name="q" defaultValue={sp1(sp, 'q') ?? ''} placeholder="Nomor tagihan, nama siswa/pendaftar" />
            </label>
            <Select name="kategori" label="Jenis" value={sp1(sp, 'kategori') ?? ''} empty="Semua" options={Object.entries(CATEGORIES)} />
            <Select name="status" label="Status" value={sp1(sp, 'status') ?? ''} empty="Semua" options={Object.entries(INVOICE_TONE).map(([k, [l]]) => [k, l])} />
            <button className="btn" type="submit">
              Terapkan
            </button>
          </form>
          {list.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Nomor</th>
                    <th>Untuk</th>
                    <th>Jenis</th>
                    <th className="num">Nominal</th>
                    <th className="num">Terbayar</th>
                    <th>Jatuh tempo</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ i, studentName, applicantName, regNo }) => (
                    <tr key={i.id}>
                      <td className="mono small">{i.number}</td>
                      <td>{studentName ? <Link href={`/staf/siswa/${i.studentId}`}>{studentName}</Link> : applicantName ? <Link href={`/staf/ppdb/pendaftar/${i.applicationId}`}>{applicantName} ({regNo})</Link> : '—'}</td>
                      <td>{CATEGORIES[i.category] ?? i.category}</td>
                      <td className="num">{rupiah(i.amount)}</td>
                      <td className="num">{rupiah(i.paid)}</td>
                      <td>{fmtDate(i.dueDate)}</td>
                      <td>
                        <Status value={i.status} map={INVOICE_TONE} />
                      </td>
                      <td>
                        {['unpaid', 'partial'].includes(i.status) && hasPerm(ctx, 'finance.manage') ? (
                          <details className="more">
                            <summary>Bebaskan/batalkan</summary>
                            <ActionForm action="keuangan.tutup" back={`${base}?tab=tagihan`} hidden={{ id: i.id }}>
                              <Select name="jenis" label="Tindakan" options={[['waived', 'Bebaskan (keringanan)'], ['cancelled', 'Batalkan (salah buat)']]} />
                              <Field name="alasan" label="Alasan" required />
                              <Submit tone="ghost">Simpan</Submit>
                            </ActionForm>
                          </details>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Tidak ada tagihan.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'baru' ? (
        <Card title="Buat tagihan siswa">
          <form method="get" className="filters">
            <input type="hidden" name="tab" value="baru" />
            <Select name="rombel" label="Rombel" value={rombel ?? ''} empty="— pilih —" options={rooms.map((r) => [r.h.id, r.h.name])} />
            <button className="btn btn--ghost" type="submit">
              Tampilkan siswa
            </button>
          </form>
          {pupils.length && hasPerm(ctx, 'finance.manage') ? (
            <ActionForm action="keuangan.tagihan_baru" back={`${base}?tab=baru&rombel=${rombel}`} op>
              <div className="row">
                {pupils.map((p) => (
                  <label key={p.studentId} className="check" style={{ minWidth: 200 }}>
                    <input type="checkbox" name="siswa" value={p.studentId} defaultChecked />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
              <div className="f__row">
                <Select name="kategori" label="Jenis" options={Object.entries(CATEGORIES).filter(([k]) => k !== 'pendaftaran' && k !== 'daftar_ulang')} />
                <Field name="judul" label="Judul tagihan" placeholder="SPP Juli 2026" required />
                <Field name="nominal" label="Nominal (Rp)" type="number" min={1} required />
                <Field name="jatuh_tempo" label="Jatuh tempo" type="date" />
              </div>
              <Submit icon="plus">Buat tagihan</Submit>
            </ActionForm>
          ) : (
            <Empty>Pilih rombel terlebih dahulu.</Empty>
          )}
        </Card>
      ) : null}
    </>
  )
}
