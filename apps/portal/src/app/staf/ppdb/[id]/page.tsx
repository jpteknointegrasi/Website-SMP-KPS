import Link from 'next/link'
import { notFound } from 'next/navigation'
import { staffPage } from '@/server/request'
import { cycleDetail } from '@/modules/admissions/config'
import { reviewQueue } from '@/modules/admissions/review'
import { sessionsOf } from '@/modules/admissions/selection'
import { batchesOf, decisionCandidates, seatSummary } from '@/modules/admissions/decisions'
import { reenrollQueue } from '@/modules/admissions/reenroll'
import { staffOptions } from '@/modules/academic/service'
import { hasPerm } from '@/server/context'
import { fmtDate, fmtDateTime, toLocalInput } from '@/server/time'
import { APP_TONE, BATCH_TONE, CYCLE_TONE, OUTCOME_TONE, REENROLL_TONE } from '@/ui/tones'
import { ActionButton, ActionForm, Badge, Card, Check, Empty, Field, Flash, Notice, PageHead, Progress, rupiah, Select, sp1, Stat, Status, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Periode penerimaan' }

type Ctx = Awaited<ReturnType<typeof staffPage>>
type D = NonNullable<Awaited<ReturnType<typeof cycleDetail>>>

const docLines = (p: D['paths'][number]) => p.documents.map((d) => `${d.code} | ${d.label} | ${d.required ? 'wajib' : 'opsional'}${d.help ? ` | ${d.help}` : ''}`).join('\n')
const compLines = (p: D['paths'][number]) => p.components.map((c) => `${c.code} | ${c.label} | ${c.max} | ${c.weight}`).join('\n')
const KIND_ID: Record<string, string> = { document: 'dokumen', confirm: 'konfirmasi', staff: 'petugas' }
const checkLines = (p: D['paths'][number]) => p.checklist.map((c) => `${c.code} | ${c.label} | ${KIND_ID[c.kind] ?? c.kind}`).join('\n')

/** One admission cycle: summary & status, set-up, applicants (PAN-01), selection, decisions (PAN-03), re-enrolment (PAN-04). */
export default async function CyclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const ctx = await staffPage(`/staf/ppdb/${id}`, ['admissions.manage', 'admissions.verify', 'admissions.assess', 'admissions.approve', 'admissions.release', 'admissions.reenroll', 'admissions.convert'], 'penerimaan')
  const sp = await searchParams
  const d = await cycleDetail(ctx.db, id)
  if (!d) notFound()
  const tab = sp1(sp, 'tab') ?? 'ringkasan'
  const base = `/staf/ppdb/${id}`
  const items: [string, string][] = [['Ringkasan', `${base}?tab=ringkasan`]]
  if (hasPerm(ctx, 'admissions.manage')) items.push(['Pengaturan', `${base}?tab=pengaturan`])
  if (hasPerm(ctx, 'admissions.verify', 'admissions.manage', 'admissions.approve')) items.push(['Pendaftar', `${base}?tab=pendaftar`])
  if (d.cycle.selectionEnabled && hasPerm(ctx, 'admissions.manage', 'admissions.assess')) items.push(['Seleksi', `${base}?tab=seleksi`])
  if (hasPerm(ctx, 'admissions.manage', 'admissions.approve', 'admissions.release')) items.push(['Keputusan & rilis', `${base}?tab=keputusan`])
  if (hasPerm(ctx, 'admissions.reenroll', 'admissions.convert', 'admissions.manage')) items.push(['Daftar ulang & konversi', `${base}?tab=daftar-ulang`])
  return (
    <>
      <PageHead title={d.cycle.name} sub={`${d.cycle.code} · Kelas ${d.cycle.targetGrade} · Tahun Ajaran ${d.cycle.targetYear}`} crumbs={[['Penerimaan', '/staf/ppdb'], [d.cycle.name]]} actions={<Status value={d.cycle.status} map={CYCLE_TONE} />} />
      <Flash sp={sp} />
      <Tabs current={`${base}?tab=${tab}`} items={items} />
      {tab === 'ringkasan' ? <Summary ctx={ctx} d={d} base={base} /> : null}
      {tab === 'pengaturan' ? <Setup ctx={ctx} d={d} base={base} /> : null}
      {tab === 'pendaftar' ? <Applicants ctx={ctx} d={d} sp={sp} base={base} /> : null}
      {tab === 'seleksi' ? <Selection ctx={ctx} d={d} base={base} /> : null}
      {tab === 'keputusan' ? <Decisions ctx={ctx} d={d} base={base} /> : null}
      {tab === 'daftar-ulang' ? <Reenroll ctx={ctx} d={d} /> : null}
    </>
  )
}

async function Summary({ ctx, d, base }: { ctx: Ctx; d: D; base: string }) {
  const seats = await seatSummary(ctx.db, d.cycle.id)
  const q = await reviewQueue(ctx, { cycleId: d.cycle.id }).catch(() => [])
  const by = (s: string) => q.filter((x) => x.a.status === s).length
  const st = d.cycle.status
  const back = `${base}?tab=ringkasan`
  const next: [string, string, boolean][] = []
  if (st === 'draft') next.push(['ready_for_review', 'Ajukan untuk review', hasPerm(ctx, 'admissions.manage')])
  if (st === 'ready_for_review') next.push(['approved', 'Setujui periode', hasPerm(ctx, 'admissions.approve')], ['draft', 'Kembalikan ke draf', hasPerm(ctx, 'admissions.manage')])
  if (st === 'approved') next.push(['open', 'Buka pendaftaran', hasPerm(ctx, 'admissions.approve')], ['ready_for_review', 'Tarik persetujuan', hasPerm(ctx, 'admissions.approve')])
  if (st === 'open') next.push(['closed', 'Tutup pendaftaran', hasPerm(ctx, 'admissions.approve')])
  if (st === 'closed') next.push(['open', 'Buka kembali', hasPerm(ctx, 'admissions.manage')], ['archived', 'Arsipkan', hasPerm(ctx, 'admissions.manage')])
  return (
    <>
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Stat icon="clipboard" label="Pendaftar terkirim" value={q.length} />
        <Stat icon="alert" tone="warn" label="Menunggu verifikasi" value={by('submitted') + by('resubmitted') + by('under_verification')} />
        <Stat icon="checkCircle" tone="ok" label="Terverifikasi" value={by('verified')} />
        <Stat icon="edit" label="Perlu perbaikan" value={by('needs_revision')} />
      </div>
      <div className="grid grid--2">
        <Card title="Status periode">
          <dl className="kv">
            <dt>Status</dt>
            <dd>
              <Status value={st} map={CYCLE_TONE} />
            </dd>
            <dt>Pendaftaran</dt>
            <dd>
              {fmtDateTime(d.cycle.openAt, ctx.tz)} – {fmtDateTime(d.cycle.closeAt, ctx.tz)}
            </dd>
            <dt>Seleksi</dt>
            <dd>{d.cycle.selectionEnabled ? 'Ya' : 'Tanpa seleksi (keputusan langsung)'}</dd>
            <dt>Batas konfirmasi tawaran</dt>
            <dd>{d.cycle.offerDays} hari setelah rilis</dd>
            <dt>Tenggat daftar ulang</dt>
            <dd>{d.cycle.reenrollDays} hari setelah konfirmasi</dd>
          </dl>
          {next.filter(([, , ok]) => ok).length ? (
            <ActionForm action="ppdb.status" back={back} hidden={{ id: d.cycle.id }}>
              <Field name="alasan" label="Alasan (wajib untuk menutup, membuka kembali, menarik persetujuan)" />
              <div className="row">
                {next
                  .filter(([, , ok]) => ok)
                  .map(([to, label]) => (
                    <Submit key={to} name="ke" value={to} tone={to === 'closed' || to === 'draft' || to === 'ready_for_review' ? 'ghost' : undefined}>
                      {label}
                    </Submit>
                  ))}
              </div>
            </ActionForm>
          ) : null}
          {st === 'ready_for_review' ? <p className="small muted">Persetujuan harus oleh orang lain selain pembuat periode.</p> : null}
        </Card>
        <Card title="Kapasitas & kuota">
          <table className="t">
            <thead>
              <tr>
                <th>Jalur</th>
                <th className="num">Kuota</th>
                <th className="num">Ditawarkan</th>
                <th className="num">Dikonfirmasi</th>
                <th className="num">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => (
                <tr key={s.path.id}>
                  <td>{s.path.name}</td>
                  <td className="num">{s.path.quota}</td>
                  <td className="num">{s.reserved}</td>
                  <td className="num">{s.confirmed}</td>
                  <td className="num">
                    <strong>{s.free}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}

async function Setup({ ctx, d, base }: { ctx: Ctx; d: D; base: string }) {
  const back = `${base}?tab=pengaturan`
  const frozen = !['draft', 'ready_for_review'].includes(d.cycle.status)
  const qLines = d.cycle.formFields.map((q) => `${q.key} | ${q.label} | ${q.type} | ${q.required ? 'wajib' : 'opsional'}${q.options?.length ? ` | ${q.options.join('; ')}` : ''}`).join('\n')
  return (
    <>
      {frozen ? <Notice tone="info">Periode sudah disetujui: aturan (jalur, berkas, komponen, formulir) terkunci. Teks informasi, kontak dan kuota masih dapat disesuaikan dan tercatat di audit.</Notice> : null}
      <div className="grid grid--2">
        <Card title="Periode">
          <ActionForm action="ppdb.periode_ubah" back={back} hidden={{ id: d.cycle.id, _versi: d.cycle.version }}>
            <Field name="nama" label="Nama periode" value={d.cycle.name} required />
            <div className="f__row">
              <Field name="buka" type="datetime-local" label="Pendaftaran dibuka" value={toLocalInput(d.cycle.openAt, ctx.tz)} />
              <Field name="tutup" type="datetime-local" label="Pendaftaran ditutup" value={toLocalInput(d.cycle.closeAt, ctx.tz)} />
              <Field name="hari_penawaran" type="number" label="Hari untuk konfirmasi tawaran" value={d.cycle.offerDays} min={1} max={60} />
              <Field name="hari_daftar_ulang" type="number" label="Hari untuk daftar ulang" value={d.cycle.reenrollDays} min={1} max={90} />
            </div>
            <Check name="seleksi" checked={d.cycle.selectionEnabled} label="Memakai seleksi (tes/wawancara)" />
            <Check name="wajib_nik" checked={d.cycle.requireNik} label="Minta NIK calon siswa (hanya bila memang diperlukan)" />
            <TextArea name="info" label="Informasi publik (persyaratan, jadwal, biaya yang disahkan)" value={d.cycle.info ?? ''} rows={5} />
            <TextArea name="pemberitahuan" label="Pemberitahuan penggunaan data" value={d.cycle.dataNotice ?? ''} rows={3} />
            <Field name="kontak" label="Kontak bantuan" value={d.cycle.helpContact ?? ''} />
            <Submit>Simpan</Submit>
          </ActionForm>
        </Card>
        <div>
          <Card title="Gelombang">
            {d.waves.length ? (
              <ul className="list">
                {d.waves.map((w) => (
                  <li key={w.id}>
                    <span className="grow">
                      <strong>{w.name}</strong>
                      <div className="small muted">
                        {fmtDateTime(w.openAt, ctx.tz)} – {fmtDateTime(w.closeAt, ctx.tz)}
                      </div>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Tanpa gelombang: satu jendela pendaftaran.</p>
            )}
            <ActionForm action="ppdb.gelombang" back={back} hidden={{ id: d.cycle.id }}>
              <Field name="nama" label="Nama gelombang" placeholder="Gelombang 1" required />
              <div className="f__row">
                <Field name="buka" type="datetime-local" label="Dibuka" required />
                <Field name="tutup" type="datetime-local" label="Ditutup" required />
              </div>
              <Submit tone="ghost" icon="plus">Tambah gelombang</Submit>
            </ActionForm>
          </Card>
          <Card title="Pertanyaan tambahan formulir">
            <ActionForm action="ppdb.formulir" back={back} hidden={{ id: d.cycle.id }}>
              <TextArea name="pertanyaan" label="Satu pertanyaan per baris" value={qLines} rows={5} hint="Format: kode | label | jenis (text/textarea/select/date/number/checkbox) | wajib/opsional | pilihan1; pilihan2" />
              <Submit tone="ghost">Simpan formulir (versi {d.cycle.formVersion + 1})</Submit>
            </ActionForm>
          </Card>
        </div>
      </div>
      {[...d.paths, null].map((p) => (
        <Card key={p?.id ?? 'baru'} title={p ? `Jalur: ${p.name}` : 'Tambah jalur'}>
          <ActionForm action="ppdb.jalur" back={back} hidden={{ id: d.cycle.id, jalur: p?.id, aktif_ada: 1 }}>
            <div className="f__row--3 f__row">
              <Field name="nama" label="Nama jalur" value={p?.name ?? ''} required />
              <Field name="kuota" type="number" label="Kuota" value={p?.quota ?? 0} min={0} required />
              <Field name="biaya_daftar" type="number" label="Biaya pendaftaran (Rp, 0 = gratis)" value={p?.registrationFee ?? 0} min={0} />
              <Field name="biaya_daftar_ulang" type="number" label="Biaya daftar ulang (Rp)" value={p?.reenrollFee ?? 0} min={0} />
            </div>
            <TextArea name="deskripsi" label="Deskripsi & persyaratan jalur" value={p?.description ?? ''} rows={2} />
            <div className="f__row--3 f__row">
              <TextArea name="berkas" label="Berkas" rows={6} value={p ? docLines(p) : ''} hint="kode | label | wajib/opsional | bantuan" />
              <TextArea name="komponen" label="Komponen seleksi" rows={6} value={p ? compLines(p) : ''} hint="kode | label | nilai maks | bobot" />
              <TextArea name="checklist" label="Checklist daftar ulang" rows={6} value={p ? checkLines(p) : ''} hint="kode | label | dokumen/konfirmasi/petugas (pembayaran otomatis bila ada biaya)" />
            </div>
            <Check name="aktif" checked={p?.active ?? true} label="Jalur aktif" />
            <Submit tone={p ? 'ghost' : undefined}>{p ? 'Simpan jalur' : 'Tambah jalur'}</Submit>
          </ActionForm>
        </Card>
      ))}
    </>
  )
}

async function Applicants({ ctx, d, sp, base }: { ctx: Ctx; d: D; sp: SP; base: string }) {
  const status = sp1(sp, 'status') ?? ''
  const path = sp1(sp, 'jalur') ?? ''
  const q = sp1(sp, 'q') ?? ''
  const rows = await reviewQueue(ctx, { cycleId: d.cycle.id, status: status || undefined, pathId: path || undefined, q: q || undefined, mine: sp1(sp, 'saya') === '1' })
  return (
    <Card title="Antrean pendaftar" flush>
      <form method="get" className="filters" style={{ padding: '0 20px' }}>
        <input type="hidden" name="tab" value="pendaftar" />
        <Select name="status" label="Status" value={status} empty="Semua" options={Object.entries(APP_TONE).filter(([k]) => k !== 'draft').map(([k, [l]]) => [k, l])} />
        <Select name="jalur" label="Jalur" value={path} empty="Semua" options={d.paths.map((p) => [p.id, p.name])} />
        <label className="fld fld--grow">
          <span>Cari</span>
          <input type="search" name="q" defaultValue={q} placeholder="Nama pendaftar atau nomor" />
        </label>
        <label className="check" style={{ alignSelf: 'center' }}>
          <input type="checkbox" name="saya" value="1" defaultChecked={sp1(sp, 'saya') === '1'} />
          <span>Diperiksa saya</span>
        </label>
        <button className="btn" type="submit">
          Terapkan
        </button>
      </form>
      {rows.length ? (
        <div className="tablewrap">
          <table className="t">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Nama pendaftar</th>
                <th>Jalur</th>
                <th>Status</th>
                <th>Berkas</th>
                <th>Biaya</th>
                <th>Pemeriksa</th>
                <th>Dikirim</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.a.id}>
                  <td className="mono small">{r.a.registrationNo}</td>
                  <td>
                    {r.name} {r.a.duplicateOf ? <Badge tone="warn">Cek duplikat</Badge> : null} {r.a.assistedBy ? <Badge>Dibantu</Badge> : null}
                  </td>
                  <td>{r.path}</td>
                  <td>
                    <Status value={r.a.status} map={APP_TONE} />
                  </td>
                  <td>{r.docsPending ? <Badge tone="info">{r.docsPending} menunggu</Badge> : <Badge tone="ok">Diperiksa</Badge>}</td>
                  <td>{r.unpaid ? <Badge tone="warn">Belum lunas</Badge> : <Badge tone="ok">OK</Badge>}</td>
                  <td>{r.verifier ?? '—'}</td>
                  <td className="small">{fmtDateTime(r.a.submittedAt, ctx.tz, { zone: false })}</td>
                  <td className="actions">
                    <Link className="btn btn--ghost btn--sm" href={`/staf/ppdb/pendaftar/${r.a.id}?kembali=${encodeURIComponent(`${base}?tab=pendaftar`)}`}>
                      Lihat
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Tidak ada pendaftar dengan filter ini.</Empty>
      )}
    </Card>
  )
}

async function Selection({ ctx, d, base }: { ctx: Ctx; d: D; base: string }) {
  const sessions = await sessionsOf(ctx, d.cycle.id)
  const staff = hasPerm(ctx, 'admissions.manage') ? await staffOptions(ctx) : []
  return (
    <div className="grid grid--side">
      <Card title="Sesi seleksi">
        {sessions.length ? (
          <ul className="list">
            {sessions.map((s) => (
              <li key={s.id}>
                <div className="grow">
                  <Link href={`/staf/ppdb/sesi/${s.id}`}>
                    <strong>{s.title}</strong>
                  </Link>{' '}
                  <Badge tone={s.status === 'done' ? 'ok' : s.status === 'cancelled' ? 'muted' : 'info'}>{s.status === 'done' ? 'Nilai dikunci' : s.status === 'cancelled' ? 'Batal' : 'Terjadwal'}</Badge>
                  <div className="small muted">
                    {fmtDateTime(s.startsAt, ctx.tz)} · {s.location} · {s.participants}/{s.capacity} peserta · penilai: {s.assessors.map((a) => a.name).join(', ') || '—'}
                  </div>
                </div>
                <Link className="btn btn--ghost btn--sm" href={`/staf/ppdb/sesi/${s.id}`}>
                  Buka
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="calendar">Belum ada sesi seleksi.</Empty>
        )}
      </Card>
      {hasPerm(ctx, 'admissions.manage') ? (
        <Card title="Sesi baru">
          <ActionForm action="ppdb.sesi" back={`${base}?tab=seleksi`} hidden={{ periode: d.cycle.id }}>
            <Field name="judul" label="Judul" placeholder="Tes tertulis gelombang 1" required />
            <div className="f__row">
              <Select name="jenis" label="Jenis" options={[['tes', 'Tes'], ['wawancara', 'Wawancara'], ['lainnya', 'Lainnya']]} />
              <Select name="jalur" label="Jalur" empty="Semua jalur" options={d.paths.map((p) => [p.id, p.name])} />
              <Field name="mulai" type="datetime-local" label="Mulai" required />
              <Field name="selesai" type="datetime-local" label="Selesai" required />
              <Field name="tempat" label="Tempat / tautan privat" required />
              <Field name="kapasitas" type="number" label="Kapasitas" min={1} required />
            </div>
            <TextArea name="instruksi" label="Instruksi untuk peserta" rows={2} />
            <fieldset>
              <legend>Penilai</legend>
              {staff.map((s) => (
                <label key={s.id} className="check">
                  <input type="checkbox" name="penilai" value={s.id} />
                  <span>{s.name}</span>
                </label>
              ))}
            </fieldset>
            <Submit icon="plus">Buat sesi</Submit>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  )
}

async function Decisions({ ctx, d, base }: { ctx: Ctx; d: D; base: string }) {
  const back = `${base}?tab=keputusan`
  const cands = await decisionCandidates(ctx, d.cycle.id)
  const batches = await batchesOf(ctx, d.cycle.id)
  const seats = await seatSummary(ctx.db, d.cycle.id)
  const quota = seats.reduce((a, s) => a + s.path.quota, 0)
  const used = seats.reduce((a, s) => a + s.reserved + s.confirmed, 0)
  return (
    <>
      <div className="grid grid--side">
        <Card title="Kandidat keputusan (terverifikasi)" flush>
          {cands.length ? (
            hasPerm(ctx, 'admissions.manage') ? (
              <ActionForm action="ppdb.usulan" back={back} hidden={{ periode: d.cycle.id }} className="">
                <div className="tablewrap">
                  <table className="t">
                    <thead>
                      <tr>
                        <th>Pilih</th>
                        <th>Nomor</th>
                        <th>Nama</th>
                        <th>Jalur</th>
                        <th className="num">Nilai</th>
                        <th>Usulan keputusan</th>
                        <th>Kode alasan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cands.map((c) => (
                        <tr key={c.a.id}>
                          <td>
                            <input type="checkbox" name="pilih" value={c.a.id} aria-label={`Pilih ${c.name}`} />
                          </td>
                          <td className="mono small">{c.a.registrationNo}</td>
                          <td>
                            <Link href={`/staf/ppdb/pendaftar/${c.a.id}`}>{c.name}</Link>
                          </td>
                          <td>{c.path}</td>
                          <td className="num">{c.score ?? (d.cycle.selectionEnabled ? <Badge tone="warn">belum lengkap</Badge> : '—')}</td>
                          <td>
                            <select name={`hasil:${c.a.id}`} defaultValue="offered" aria-label="Keputusan">
                              <option value="offered">Diterima</option>
                              <option value="waitlisted">Cadangan</option>
                              <option value="not_selected">Belum diterima</option>
                            </select>
                          </td>
                          <td>
                            <input name={`alasan:${c.a.id}`} placeholder="mis. kuota" aria-label="Kode alasan" style={{ maxWidth: 120 }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 20px' }} className="stack">
                  <div className="f__row">
                    <Field name="judul" label="Judul usulan" placeholder="Hasil seleksi gelombang 1" required />
                    <Field name="rilis" type="datetime-local" label="Rencana waktu rilis" />
                  </div>
                  <TextArea name="instruksi" label="Instruksi untuk yang diterima" rows={2} placeholder="Konfirmasi kesediaan dan lengkapi daftar ulang sebelum tenggat." />
                  <Submit>Buat usulan</Submit>
                </div>
              </ActionForm>
            ) : (
              <p className="muted" style={{ padding: 20 }}>{cands.length} kandidat menunggu usulan panitia.</p>
            )
          ) : (
            <Empty>Tidak ada pendaftar terverifikasi tanpa keputusan.</Empty>
          )}
        </Card>
        <Card title="Kapasitas">
          <p>
            Terpakai <strong>{used}</strong> dari <strong>{quota}</strong> kursi
          </p>
          <Progress value={quota ? (used / quota) * 100 : 0} />
          <ul className="list" style={{ marginTop: 8 }}>
            {seats.map((s) => (
              <li key={s.path.id}>
                <span className="grow">{s.path.name}</span>
                <span className="small">
                  {s.reserved + s.confirmed}/{s.path.quota}
                </span>
              </li>
            ))}
          </ul>
          <p className="small muted">Kursi dicadangkan saat usulan disetujui; kedaluwarsa bila tidak dikonfirmasi. Tidak ada overbooking.</p>
        </Card>
      </div>
      {batches.map((b) => (
        <Card key={b.id} id={`usulan-${b.id}`} title={b.title} actions={<Status value={b.status} map={BATCH_TONE} />}>
          <p className="small muted">
            Diusulkan {fmtDateTime(b.createdAt, ctx.tz)}
            {b.approvedAt ? ` · disetujui ${fmtDateTime(b.approvedAt, ctx.tz)}` : ''}
            {b.releaseAt ? ` · rilis ${fmtDateTime(b.releaseAt, ctx.tz)}` : ''}
          </p>
          <table className="t">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Nama</th>
                <th className="num">Nilai</th>
                <th>Keputusan</th>
                <th>Alasan</th>
              </tr>
            </thead>
            <tbody>
              {b.entries.map((e) => (
                <tr key={e.v.id}>
                  <td className="mono small">{e.regNo}</td>
                  <td>{e.name}</td>
                  <td className="num">{e.score ?? '—'}</td>
                  <td>
                    <Status value={e.v.outcome} map={OUTCOME_TONE} /> {e.v.superseded ? <Badge>diganti</Badge> : null}
                  </td>
                  <td className="small">{e.v.reasonCode ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 12 }}>
            {b.status === 'proposed' && hasPerm(ctx, 'admissions.manage') ? <ActionButton action="ppdb.usulan_ajukan" back={back} hidden={{ id: b.id }} label="Ajukan untuk persetujuan" /> : null}
            {b.status === 'in_review' && hasPerm(ctx, 'admissions.approve') ? <ActionButton action="ppdb.usulan_setujui" back={back} hidden={{ id: b.id, _versi: b.version }} label="Setujui hasil seleksi" icon="check" /> : null}
            {b.status === 'approved' && hasPerm(ctx, 'admissions.release') ? (
              <ActionForm action="ppdb.usulan_rilis" back={back} hidden={{ id: b.id }} className="row" confirm="Rilis hasil? Pendaftar akan melihat hasil di akun masing-masing pada waktu rilis.">
                <input type="datetime-local" name="rilis" defaultValue={toLocalInput(b.releaseAt, ctx.tz)} aria-label="Waktu rilis" style={{ maxWidth: 220 }} />
                <Submit>Rilis hasil seleksi</Submit>
              </ActionForm>
            ) : null}
            {['proposed', 'in_review', 'approved'].includes(b.status) && hasPerm(ctx, 'admissions.manage') ? (
              <details className="more">
                <summary>Batalkan usulan</summary>
                <ActionForm action="ppdb.usulan_batal" back={back} hidden={{ id: b.id }}>
                  <Field name="alasan" label="Alasan" required />
                  <Submit tone="danger">Batalkan</Submit>
                </ActionForm>
              </details>
            ) : null}
          </div>
          {b.status === 'approved' ? <Notice tone="warn">Hasil sudah disetujui tetapi belum dirilis: pendaftar belum dapat melihat hasilnya.</Notice> : null}
        </Card>
      ))}
    </>
  )
}

async function Reenroll({ ctx, d }: { ctx: Ctx; d: D }) {
  const rows = await reenrollQueue(ctx, d.cycle.id)
  return (
    <Card title="Daftar ulang & aktivasi siswa" flush>
      {rows.length ? (
        <table className="t">
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Nama</th>
              <th>Status daftar ulang</th>
              <th>Kelengkapan</th>
              <th>Tenggat</th>
              <th>Konversi</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ok = r.r.checklist.filter((i) => ['verified', 'waived'].includes(i.state)).length
              return (
                <tr key={r.r.id}>
                  <td className="mono small">{r.a.registrationNo}</td>
                  <td>{r.name}</td>
                  <td>
                    <Status value={r.r.status} map={REENROLL_TONE} />
                  </td>
                  <td>
                    {ok}/{r.r.checklist.length}
                  </td>
                  <td className="small">{fmtDate(r.r.dueAt, ctx.tz)}</td>
                  <td>{r.mapped ? <Link href={`/staf/siswa/${r.mapped}`}>Siswa aktif</Link> : r.r.status === 'verified' ? <Badge tone="info">Siap dikonversi</Badge> : '—'}</td>
                  <td className="actions">
                    <Link className="btn btn--ghost btn--sm" href={`/staf/ppdb/pendaftar/${r.a.id}#daftar-ulang`}>
                      Proses
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <Empty>Belum ada daftar ulang.</Empty>
      )}
      <p className="small muted" style={{ padding: '10px 20px' }}>
        Biaya pendaftaran/daftar ulang: {d.paths.map((p) => `${p.name} ${rupiah(p.registrationFee)} / ${rupiah(p.reenrollFee)}`).join(' · ')}
      </p>
    </Card>
  )
}
