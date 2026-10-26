import { staffPage } from '@/server/request'
import { catalogue, findBorrower, LOAN_DAYS, libraryStats, loans } from '@/modules/library/service'
import { staffOptions } from '@/modules/academic/service'
import { fmtDate, today } from '@/server/time'
import { ActionForm, Badge, Card, Empty, Field, Flash, Notice, PageHead, Select, sp1, Stat, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Perpustakaan' }

/** PUS-01: circulation (find borrower by NIS / card QR, lend, return, renew), overdue list, catalogue. */
export default async function Library({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/perpustakaan', ['library.manage'], 'perpustakaan')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'sirkulasi'
  const st = await libraryStats(ctx)
  const who = sp1(sp, 'peminjam') ? await findBorrower(ctx, sp1(sp, 'peminjam')!) : null
  const q = sp1(sp, 'q') ?? null
  const books = await catalogue(ctx.db, q, tab === 'katalog' ? 100 : 30)
  const active = tab === 'sirkulasi' ? await loans(ctx, { overdue: sp1(sp, 'terlambat') === '1', studentId: who?.id }) : []
  const staff = tab === 'sirkulasi' ? await staffOptions(ctx) : []
  const d = today(ctx.tz, ctx.now)
  const back = `/staf/perpustakaan?tab=${tab}${who ? `&peminjam=${encodeURIComponent(sp1(sp, 'peminjam')!)}` : ''}`
  return (
    <>
      <PageHead title="Perpustakaan" sub="Sirkulasi buku dan katalog. Peminjam dapat dicari dengan NIS atau memindai QR kartu siswa." />
      <Flash sp={sp} />
      <div className="grid grid--4" style={{ marginBottom: 16 }}>
        <Stat icon="library" label="Judul" value={st.titles} />
        <Stat icon="book" label="Eksemplar" value={st.copies} />
        <Stat icon="arrowRight" label="Sedang dipinjam" value={st.active} />
        <Stat icon="clock" tone={st.overdue ? 'bad' : 'ok'} label="Lewat tenggat" value={st.overdue} href="/staf/perpustakaan?tab=sirkulasi&terlambat=1" />
      </div>
      <Tabs
        current={`/staf/perpustakaan?tab=${tab}`}
        items={[
          ['Sirkulasi', '/staf/perpustakaan?tab=sirkulasi'],
          ['Katalog', '/staf/perpustakaan?tab=katalog'],
        ]}
      />
      {tab === 'sirkulasi' ? (
        <div className="grid grid--side">
          <Card title={who ? `Pinjaman ${who.name}` : sp1(sp, 'terlambat') ? 'Lewat tenggat' : 'Pinjaman aktif'} flush>
            {active.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Buku</th>
                      <th>Peminjam</th>
                      <th>Tenggat</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(({ l, title, code, student, nis, staff: sname }) => (
                      <tr key={l.id}>
                        <td>
                          <strong>{title}</strong>
                          <div className="small muted mono">{code}</div>
                        </td>
                        <td>
                          {student ?? sname}
                          {nis ? <div className="small muted">{nis}</div> : null}
                        </td>
                        <td className="nowrap">{l.dueOn < d ? <Badge tone="bad">{fmtDate(l.dueOn, undefined, true)}</Badge> : fmtDate(l.dueOn, undefined, true)}</td>
                        <td className="actions">
                          <ActionForm action="pustaka.kembali" back={back} hidden={{ id: l.id }} className="row">
                            <Submit name="aksi" value="return" tone="ok">
                              Kembali
                            </Submit>
                            <Submit name="aksi" value="renew" tone="ghost">
                              Perpanjang
                            </Submit>
                          </ActionForm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="library">Tidak ada pinjaman.</Empty>
            )}
          </Card>
          <div className="stack">
            <Card title="Cari peminjam">
              <form method="get" className="row">
                <input type="hidden" name="tab" value="sirkulasi" />
                <input name="peminjam" defaultValue={sp1(sp, 'peminjam') ?? ''} placeholder="NIS atau isi QR kartu" aria-label="NIS atau QR" className="grow" autoFocus />
                <Submit tone="ghost">Cari</Submit>
              </form>
              {sp1(sp, 'peminjam') && !who ? <Notice tone="warn">Siswa tidak ditemukan atau kartu tidak berlaku.</Notice> : null}
            </Card>
            <Card title="Pinjamkan buku">
              <ActionForm action="pustaka.pinjam" back={back} op>
                {who ? (
                  <>
                    <input type="hidden" name="peminjam_jenis" value="siswa" />
                    <input type="hidden" name="siswa" value={who.id} />
                    <p>
                      Peminjam: <strong>{who.name}</strong> ({who.nis})
                    </p>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="peminjam_jenis" value="staf" />
                    <Select name="staf" label="Peminjam staf (atau cari siswa di atas)" options={staff.map((s) => [s.id, s.name])} />
                  </>
                )}
                <Select name="buku" label="Buku (tersedia)" options={books.filter((b) => b.available > 0).map((b) => [b.id, `${b.title} · ${b.code} (${b.available})`])} required />
                <Field name="hari" label="Lama pinjam (hari)" type="number" min={1} max={60} value={LOAN_DAYS} />
                <Submit>Catat peminjaman</Submit>
              </ActionForm>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid--side">
          <Card flush>
            <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
              <input type="hidden" name="tab" value="katalog" />
              <Field name="q" label="Cari judul / pengarang / kode / ISBN" value={q} className="fld--grow" />
              <Submit tone="ghost">Cari</Submit>
            </form>
            {books.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Judul</th>
                      <th>Rak</th>
                      <th className="num">Tersedia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((b) => (
                      <tr key={b.id}>
                        <td className="mono small">{b.code}</td>
                        <td>
                          <strong>{b.title}</strong>
                          <div className="small muted">{[b.author, b.publisher, b.year].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td className="small">{b.location ?? '—'}</td>
                        <td className="num">
                          {b.available}/{b.copies}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="book">Belum ada buku.</Empty>
            )}
          </Card>
          <div className="stack">
            <Card title="Tambah buku">
              <ActionForm action="pustaka.buku" back="/staf/perpustakaan?tab=katalog">
                <div className="f__row">
                  <Field name="kode" label="Kode" required />
                  <Field name="isbn" label="ISBN" />
                </div>
                <Field name="judul" label="Judul" required />
                <div className="f__row">
                  <Field name="pengarang" label="Pengarang" />
                  <Field name="penerbit" label="Penerbit" />
                </div>
                <div className="f__row">
                  <Field name="tahun" label="Tahun" type="number" />
                  <Field name="eksemplar" label="Eksemplar" type="number" min={0} value={1} />
                </div>
                <div className="f__row">
                  <Field name="kategori" label="Kategori" />
                  <Field name="rak" label="Rak/lokasi" />
                </div>
                <Submit>Simpan</Submit>
              </ActionForm>
            </Card>
            <Card title="Impor katalog">
              <ActionForm action="pustaka.impor" back="/staf/perpustakaan?tab=katalog">
                <TextArea name="data" label="Satu buku per baris: kode;judul;pengarang;penerbit;tahun;kategori;lokasi;eksemplar" rows={5} />
                <Submit tone="ghost">Impor</Submit>
              </ActionForm>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
