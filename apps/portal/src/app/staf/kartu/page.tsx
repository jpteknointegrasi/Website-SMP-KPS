import Link from 'next/link'
import QRCode from 'qrcode'
import { staffPage, requestBranding } from '@/server/request'
import * as C from '@/modules/cards/service'
import { activeYear } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { fmtDate, fmtDateTime } from '@/server/time'
import { TEMPLATE_TONE } from '@/ui/tones'
import { CardBack, CardFront } from '@/ui/student-card'
import { ActionButton, ActionForm, Avatar, Badge, Card, Check, Empty, Field, fileUrl, Flash, Notice, PageHead, Select, sp1, Status, Submit, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Kartu siswa' }

/** KRT-01 template, KRT-02 issuance, KRT-04 replacement queue. */
export default async function CardsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/kartu', ['cards.manage'], 'kartu')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'penerbitan'
  const b = (await requestBranding())!
  const tpls = await C.templates(ctx.db)
  const approved = tpls.find((t) => t.status === 'approved') ?? null
  const draft = tpls.find((t) => t.status === 'draft') ?? null
  const base = '/staf/kartu'
  return (
    <>
      <PageHead title="Kartu siswa QR" sub="Template, penerbitan & cetak massal, serta penggantian kartu." crumbs={[['Administrasi siswa', '/staf/siswa'], ['Kartu siswa']]} />
      <Flash sp={sp} />
      <Tabs
        current={`${base}?tab=${tab}`}
        items={[
          ['Penerbitan & cetak', `${base}?tab=penerbitan`],
          ['Template kartu', `${base}?tab=template`],
          ['Penggantian', `${base}?tab=penggantian`],
        ]}
      />
      {tab === 'template' ? <TemplateTab ctx={ctx} b={b} approved={approved} draft={draft} tpls={tpls} /> : null}
      {tab === 'penerbitan' ? <IssueTab ctx={ctx} sp={sp} approved={approved} /> : null}
      {tab === 'penggantian' ? <ReplaceTab ctx={ctx} /> : null}
    </>
  )
}

async function TemplateTab({ ctx, b, approved, draft, tpls }: { ctx: Awaited<ReturnType<typeof staffPage>>; b: Awaited<ReturnType<typeof requestBranding>> & object; approved: Awaited<ReturnType<typeof C.templates>>[number] | null; draft: Awaited<ReturnType<typeof C.templates>>[number] | null; tpls: Awaited<ReturnType<typeof C.templates>> }) {
  const current = draft ?? approved
  const s = current?.settings ?? C.DEFAULT_CARD
  const qr = await QRCode.toString('CONTOH', { type: 'svg', margin: 4 })
  const sample = { name: 'Nama Siswa Contoh', nis: '00001', nisn: '0000000000', entryYear: new Date().getFullYear(), homeroom: 'VII A', photo: null, cardNo: 'CONTOH-0001', validUntil: '2027-07-31', qr }
  return (
    <div className="grid grid--side">
      <div>
        <Card title="Pratinjau kartu (depan)" actions={current ? <Status value={current.status} map={TEMPLATE_TONE} /> : <Badge>Bawaan</Badge>}>
          <div className="scard-preview">
            <CardFront d={sample} s={s} b={b} schoolName={ctx.school.name} sample />
          </div>
        </Card>
        <Card title="Pratinjau kartu (belakang)">
          <div className="scard-preview">
            <CardBack s={s} b={b} schoolName={ctx.school.name} />
          </div>
        </Card>
        {!b.logoFileId ? <Notice tone="warn">Logo sekolah belum diunggah (Pengaturan sekolah). Kartu memakai ikon sementara.</Notice> : null}
      </div>
      <div>
        <Card title="Pengaturan template">
          <ActionForm action="kartu.template" back="/staf/kartu?tab=template">
            <Field name="nama" label="Nama template" value={current?.name ?? 'Kartu Siswa'} />
            <Select name="orientasi" label="Orientasi" value={s.orientation} options={[['landscape', 'Horizontal (85,6 × 54 mm)'], ['portrait', 'Vertikal (54 × 85,6 mm)']]} />
            <Select name="skema" label="Skema warna" value={s.scheme} options={[['biru', 'Biru'], ['cyan', 'Cyan'], ['kuning', 'Kuning'], ['netral', 'Netral']]} />
            <fieldset>
              <legend>Informasi yang ditampilkan</legend>
              <Check name="foto" checked={s.show.photo} label="Pasfoto" />
              <Check name="nis" checked={s.show.nis} label="NIS" />
              <Check name="nisn" checked={s.show.nisn} label="NISN" />
              <Check name="angkatan" checked={s.show.entryYear} label="Angkatan" />
              <Check name="kelas" checked={s.show.homeroom} label="Kelas (tidak dianjurkan: kelas berubah tiap tahun)" />
            </fieldset>
            <Field name="berlaku" type="number" label="Masa berlaku (bulan)" value={s.validityMonths} min={1} max={72} />
            <Field name="teks_belakang" label="Teks sisi belakang" value={s.backText ?? ''} maxLength={200} />
            <div className="f__actions">
              <Submit tone="ghost">Simpan draf</Submit>
            </div>
          </ActionForm>
          {draft ? (
            <div style={{ marginTop: 12 }}>
              <ActionButton action="kartu.template_setujui" back="/staf/kartu?tab=template" hidden={{ id: draft.id }} label={`Setujui template v${draft.version}`} icon="check" />
            </div>
          ) : null}
        </Card>
        <Card title="Versi template">
          {tpls.length ? (
            <ul className="list">
              {tpls.map((t) => (
                <li key={t.id}>
                  <span className="grow">
                    v{t.version} · {t.name}
                    <div className="small muted">{t.approvedAt ? `Disetujui ${fmtDateTime(t.approvedAt, ctx.tz)}` : `Dibuat ${fmtDateTime(t.createdAt, ctx.tz)}`}</div>
                  </span>
                  <Status value={t.status} map={TEMPLATE_TONE} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Belum ada template. Simpan draf lalu setujui.</Empty>
          )}
        </Card>
      </div>
    </div>
  )
}

async function IssueTab({ ctx, sp, approved }: { ctx: Awaited<ReturnType<typeof staffPage>>; sp: SP; approved: unknown }) {
  const rombel = sp1(sp, 'rombel') ?? ''
  const year = await activeYear(ctx.db)
  const rooms = year ? await homeroomsOfYear(ctx, year.id) : []
  const rows = await C.cardIssuanceList(ctx, rombel || null)
  const ready = rows.filter((r) => !r.card && !r.blockers.length)
  const withCard = rows.filter((r) => r.card)
  return (
    <>
      {!approved ? <Notice tone="warn" title="Belum ada template yang disetujui">Buka tab Template kartu, simpan draf lalu setujui sebelum menerbitkan kartu.</Notice> : null}
      <Card flush>
        <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
          <input type="hidden" name="tab" value="penerbitan" />
          <Select name="rombel" label="Rombel" value={rombel} empty="Semua siswa aktif" options={rooms.map((r) => [r.h.id, r.h.name])} />
          <button className="btn btn--ghost" type="submit">
            Tampilkan
          </button>
        </form>
        <ActionForm action="kartu.terbitkan" back={`/staf/kartu?tab=penerbitan${rombel ? `&rombel=${rombel}` : ''}`} op className="">
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Pilih</th>
                  <th>Nama siswa</th>
                  <th>NIS</th>
                  <th>Rombel</th>
                  <th>Kelengkapan kartu</th>
                  <th>Kartu</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{!r.card && !r.blockers.length ? <input type="checkbox" name="siswa" value={r.id} defaultChecked aria-label={`Pilih ${r.name}`} /> : null}</td>
                    <td>
                      <div className="who">
                        <Avatar name={r.name} src={fileUrl(r.photo)} />
                        <Link href={`/staf/siswa/${r.id}?tab=kartu`}>{r.name}</Link>
                      </div>
                    </td>
                    <td className="mono">{r.nis ?? '—'}</td>
                    <td>{r.homeroom ?? '—'}</td>
                    <td>{r.blockers.length ? <Badge tone="bad">{r.blockers.join(', ')}</Badge> : <Badge tone="ok">Lengkap</Badge>}</td>
                    <td>{r.card ? <Badge tone="ok">Terbit · {r.card.printedAt ? 'tercetak' : 'belum dicetak'}</Badge> : r.blockers.length ? <Badge tone="bad">Tidak bisa</Badge> : <Badge tone="info">Siap terbit</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length ? <Empty>Tidak ada siswa aktif.</Empty> : null}
          <div className="row row--between" style={{ padding: '12px 20px' }}>
            <span className="muted small">
              {ready.length} siap terbit · {withCard.length} sudah berkartu · {rows.length - ready.length - withCard.length} belum lengkap
            </span>
            <Submit icon="card">Terbitkan kartu terpilih</Submit>
          </div>
        </ActionForm>
      </Card>
      {withCard.length ? (
        <Card title="Cetak ulang / cetak kartu yang sudah terbit">
          <form method="get" action="/portal/staf/kartu/cetak">
            <div className="row" style={{ marginBottom: 10 }}>
              {withCard.map((r) => (
                <label key={r.card!.id} className="check" style={{ minWidth: 220 }}>
                  <input type="checkbox" name="k" value={r.card!.id} defaultChecked={!r.card!.printedAt} />
                  <span>
                    {r.name} <span className="muted small">{r.card!.printedAt ? `(dicetak ${fmtDate(r.card!.printedAt, ctx.tz)})` : '(belum dicetak)'}</span>
                  </span>
                </label>
              ))}
            </div>
            <button className="btn btn--ghost" type="submit">
              Pratinjau cetak A4
            </button>
          </form>
        </Card>
      ) : null}
    </>
  )
}

async function ReplaceTab({ ctx }: { ctx: Awaited<ReturnType<typeof staffPage>> }) {
  const rows = await C.pendingReplacements(ctx)
  return (
    <Card title="Permohonan penggantian kartu">
      {rows.length ? (
        <ul className="list">
          {rows.map(({ r, name, nis }) => (
            <li key={r.id}>
              <div className="grow">
                <strong>{name}</strong> <span className="muted small">{nis}</span>
                <div className="small muted">
                  {C.REPLACE_REASONS[r.reason]} · {fmtDateTime(r.createdAt, ctx.tz)} {r.note ? `· ${r.note}` : ''} {r.deactivateOld ? '· kartu lama dinonaktifkan' : ''}
                </div>
              </div>
              <ActionButton action="kartu.ganti_putuskan" back="/staf/kartu?tab=penggantian" hidden={{ id: r.id, keputusan: 'tolak' }} label="Tolak" tone="danger-ghost" small />
              <ActionButton action="kartu.ganti_putuskan" back="/staf/kartu?tab=penggantian" hidden={{ id: r.id, keputusan: 'setuju' }} label="Setujui & terbitkan baru" small />
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon="checkCircle">Tidak ada permohonan penggantian.</Empty>
      )}
    </Card>
  )
}
