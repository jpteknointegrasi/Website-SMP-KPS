/**
 * Application screens shared by the family portal and the committee (assisted registration): step form, documents,
 * review & submit, and the status view (bills, selection schedule, result, offer, re-enrolment).
 */
import React from 'react'
import { fieldsFor, RELATION_LABEL, type AppField } from '@/modules/admissions/fields'
import type { applicationView } from '@/modules/admissions/apply'
import { OUTCOME } from '@/modules/admissions/fields'
import { fmtDate, fmtDateTime } from '@/server/time'
import { GENDER_LABEL } from '@/modules/students/fields'
import { APP_TONE, DOC_TONE, INVOICE_TONE, ITEM_TONE, PARTICIPANT_TONE, PAYMENT_TONE, REENROLL_TONE } from './tones'
import { ActionForm, Badge, Card, Check, Field, FileField, fileUrl, Notice, rupiah, Select, Status, Submit, TextArea } from './kit'

export type View = Awaited<ReturnType<typeof applicationView>>

function Input({ def, value, disabled }: { def: AppField; value: string; disabled: boolean }) {
  const common = { name: def.key, label: def.label, required: def.required, value }
  if (disabled)
    return (
      <label className="fld">
        <span>{def.label}</span>
        <input value={def.key === 'gender' ? (GENDER_LABEL[value] ?? value) : def.key === 'guardianRelation' ? (RELATION_LABEL[value] ?? value) : value} disabled readOnly />
      </label>
    )
  if (def.type === 'select') {
    const opts = (def.options ?? []).map((o) => [o, def.key === 'gender' ? GENDER_LABEL[o]! : def.key === 'guardianRelation' ? RELATION_LABEL[o]! : o] as [string, string])
    return <Select {...common} empty="— pilih —" options={opts} />
  }
  if (def.type === 'textarea') return <TextArea {...common} rows={2} maxLength={def.max} />
  return <Field {...common} type={def.type === 'date' ? 'date' : def.key === 'guardianEmail' ? 'email' : def.key === 'guardianPhone' ? 'tel' : 'text'} maxLength={def.max} inputMode={def.key === 'nisn' || def.key === 'nik' || def.key === 'originNpsn' ? 'numeric' : undefined} />
}

/** Step form (anak / keluarga). Fields not opened for revision are shown read-only. */
export function StepForm({ v, step, back, next }: { v: View; step: 'anak' | 'keluarga'; back: string; next?: string }) {
  const defs = fieldsFor(v.cycle.requireNik).filter((d) => d.step === step)
  const ed = v.editable
  const can = (k: string) => Boolean(ed && (ed.all || ed.fields.has(k)))
  const questions = step === 'keluarga' ? v.cycle.formFields : []
  return (
    <ActionForm action="ppdb.simpan" back={back} hidden={{ id: v.app.id, _versi: v.app.version, lanjut: next }}>
      <div className="f__row">
        {defs.map((d) => (
          <div key={d.key} style={d.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
            <Input def={d} value={v.app.data[d.key] ?? ''} disabled={!can(d.key)} />
          </div>
        ))}
      </div>
      {questions.length ? (
        <fieldset>
          <legend>Pertanyaan tambahan dari sekolah</legend>
          <div className="stack">
            {questions.map((q) => {
              const name = `q_${q.key}`
              const val = v.app.answers[q.key] ?? ''
              const off = !can(name)
              return (
                <div key={q.key}>
                  <input type="hidden" name="_q" value={name} />
                  {q.type === 'checkbox' ? (
                    <label className="check">
                      <input type="checkbox" name={name} value="ya" defaultChecked={val === 'ya'} disabled={off} />
                      <span>
                        {q.label}
                        {q.required ? ' *' : ''}
                      </span>
                    </label>
                  ) : q.type === 'select' ? (
                    <Select name={name} label={q.label} required={q.required} value={val} empty="— pilih —" options={(q.options ?? []).map((o) => [o, o])} />
                  ) : q.type === 'textarea' ? (
                    <TextArea name={name} label={q.label} required={q.required} value={val} rows={2} />
                  ) : (
                    <Field name={name} label={q.label} required={q.required} value={val} type={q.type === 'date' ? 'date' : q.type === 'number' ? 'number' : 'text'} />
                  )}
                  {q.help ? <small className="muted">{q.help}</small> : null}
                </div>
              )
            })}
          </div>
        </fieldset>
      ) : null}
      {ed ? (
        <div className="f__actions">
          <Submit tone="ghost">Simpan draf</Submit>
          {next ? <Submit>Simpan & lanjut</Submit> : null}
        </div>
      ) : null}
    </ActionForm>
  )
}

export function DocsPanel({ v, back }: { v: View; back: string }) {
  const ed = v.editable
  return (
    <ul className="list">
      {v.path.documents.map((d) => {
        const cur = v.docs.latest.get(d.code)
        const canUpload = Boolean(ed && (ed.all || ed.docs.has(d.code)))
        return (
          <li key={d.code} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="grow">
              <strong>{d.label}</strong> {d.required ? <Badge tone="info">Wajib</Badge> : <Badge>Opsional</Badge>}
              <div className="small muted">{d.help ?? (d.code === 'pasfoto' ? 'JPG/PNG maks. 2 MB' : 'PDF/JPG/PNG maks. 5 MB')}</div>
              {cur ? (
                <div className="small" style={{ marginTop: 4 }}>
                  <a href={fileUrl(cur.file.id)!} target="_blank" rel="noopener">
                    {cur.file.originalName}
                  </a>{' '}
                  · versi {cur.d.versionNo} · <Status value={cur.d.state} map={DOC_TONE} />
                  {cur.d.note ? <div className="muted">Catatan: {cur.d.note}</div> : null}
                </div>
              ) : (
                <div className="small" style={{ marginTop: 4 }}>
                  <Badge tone={d.required ? 'warn' : 'muted'}>Belum diunggah</Badge>
                </div>
              )}
            </div>
            {canUpload ? (
              <ActionForm action="ppdb.berkas" back={back} files hidden={{ id: v.app.id, kode: d.code }} className="row">
                <input type="file" name="berkas" required accept={d.code === 'pasfoto' ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'} aria-label={`Unggah ${d.label}`} style={{ maxWidth: 230 }} />
                <button className="btn btn--ghost btn--sm" type="submit">
                  {cur ? 'Ganti' : 'Unggah'}
                </button>
              </ActionForm>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function SubmitPanel({ v, back }: { v: View; back: string }) {
  const revising = v.app.status === 'needs_revision'
  return (
    <>
      {v.problems.length ? (
        <Notice tone="warn" title="Belum dapat dikirim">
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {v.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      ) : (
        <Notice tone="ok">Data dan berkas wajib sudah lengkap. Periksa kembali sebelum mengirim.</Notice>
      )}
      <dl className="kv" style={{ marginBottom: 14 }}>
        <dt>Calon siswa</dt>
        <dd>{v.app.data.fullName}</dd>
        <dt>Tempat, tanggal lahir</dt>
        <dd>
          {v.app.data.birthPlace || '—'}, {fmtDate(v.app.data.birthDate)}
        </dd>
        <dt>Sekolah asal</dt>
        <dd>{v.app.data.originSchool || '—'}</dd>
        <dt>Orang tua/wali</dt>
        <dd>
          {v.app.data.guardianName || '—'} ({RELATION_LABEL[v.app.data.guardianRelation ?? ''] ?? '—'}) · {v.app.data.guardianPhone || '—'}
        </dd>
        <dt>Jalur</dt>
        <dd>{v.path.name}</dd>
        {v.path.registrationFee ? (
          <>
            <dt>Biaya pendaftaran</dt>
            <dd>{rupiah(v.path.registrationFee)} (tagihan dibuat setelah dikirim)</dd>
          </>
        ) : null}
      </dl>
      {v.cycle.dataNotice ? <Notice tone="info" title="Pemberitahuan penggunaan data">{v.cycle.dataNotice}</Notice> : null}
      <ActionForm action="ppdb.kirim" back={back} hidden={{ id: v.app.id }} op confirm={revising ? 'Kirim perbaikan sekarang?' : 'Kirim pendaftaran sekarang? Setelah dikirim data tidak dapat diubah kecuali diminta panitia.'}>
        <Check name="setuju" label="Saya menyatakan data dan berkas yang saya isi benar dan dapat dipertanggungjawabkan." />
        <div className="f__actions">
          <Submit icon="check">{revising ? 'Kirim perbaikan' : 'Kirim pendaftaran'}</Submit>
        </div>
      </ActionForm>
    </>
  )
}

/** Bills and payment proof upload (family). */
export function BillsPanel({ v, back, canPay }: { v: View; back: string; canPay: boolean }) {
  if (!v.bills.length) return null
  return (
    <Card title="Tagihan">
      <ul className="list">
        {v.bills.map((b) => (
          <li key={b.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="grow">
              <strong>{b.title}</strong> · {rupiah(b.amount)} <Status value={b.status} map={INVOICE_TONE} />
              <div className="small muted">
                No. {b.number}
                {b.dueDate ? ` · jatuh tempo ${fmtDate(b.dueDate)}` : ''}
              </div>
              {b.payments.map((p) => (
                <div key={p.id} className="small" style={{ marginTop: 4 }}>
                  Bayar {rupiah(p.amount)} ({fmtDate(p.paidOn)}) <Status value={p.status} map={PAYMENT_TONE} />
                  {p.receiptNo ? ` · kuitansi ${p.receiptNo}` : ''}
                  {p.rejectReason ? <span className="muted"> · {p.rejectReason}</span> : null}
                </div>
              ))}
            </div>
            {canPay && ['unpaid', 'partial'].includes(b.status) ? (
              <details className="more" style={{ width: '100%' }}>
                <summary>Kirim bukti pembayaran</summary>
                <ActionForm action="keuangan.bayar" back={back} files hidden={{ tagihan: b.id }}>
                  <div className="f__row">
                    <Field name="nominal" label="Nominal (Rp)" type="number" value={b.amount - b.paid} required min={1} />
                    <Field name="tanggal" label="Tanggal bayar" type="date" required />
                    <Select name="metode" label="Metode" options={[['transfer', 'Transfer bank'], ['tunai', 'Tunai di sekolah'], ['lainnya', 'Lainnya']]} />
                    <Field name="pembayar" label="Nama pengirim" />
                  </div>
                  <FileField name="bukti" label="Bukti pembayaran" required accept=".pdf,.jpg,.jpeg,.png" hint="Bukti bukan pembayaran terverifikasi: bagian keuangan akan mencocokkannya." />
                  <Submit>Kirim bukti</Submit>
                </ActionForm>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function SelectionPanel({ v, tz }: { v: View; tz: string }) {
  if (!v.sessions.length) return null
  return (
    <Card title="Jadwal seleksi">
      <ul className="list">
        {v.sessions.map(({ s, p }) => (
          <li key={p.id} style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <strong>{s.title}</strong> <Status value={p.state} map={PARTICIPANT_TONE} />
              <div className="small">
                {fmtDateTime(s.startsAt, tz)} – {fmtDateTime(s.endsAt, tz)} · {s.location}
              </div>
              {s.instructions ? <div className="small muted">{s.instructions}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function ResultPanel({ v, back, tz, canAnswer }: { v: View; back: string; tz: string; canAnswer: boolean }) {
  if (!v.decision) {
    if (v.app.status === 'verified') return <Card title="Hasil seleksi"><p className="muted">Hasil belum tersedia. Hasil diumumkan melalui akun ini pada waktu yang ditetapkan sekolah.</p></Card>
    return null
  }
  const o = v.decision.v.outcome
  const seat = v.reservation
  return (
    <Card title="Hasil seleksi">
      <div className="row" style={{ marginBottom: 10 }}>
        <span className={`b b--${o === 'offered' ? 'ok' : o === 'waitlisted' ? 'info' : 'muted'}`} style={{ fontSize: '1rem', padding: '6px 14px' }}>
          {OUTCOME[o]}
        </span>
        <span className="muted small">Dirilis {fmtDateTime(v.decision.b.releaseAt ?? v.decision.b.releasedAt, tz)}</span>
      </div>
      {o === 'offered' && v.decision.b.instructions ? <p>{v.decision.b.instructions}</p> : null}
      {o === 'waitlisted' ? <p className="muted">Anda berada di daftar cadangan. Bila ada tempat, sekolah akan memberi penawaran baru melalui akun ini.</p> : null}
      {o === 'not_selected' ? <p className="muted">Terima kasih telah mendaftar. Hubungi panitia bila ada pertanyaan.</p> : null}
      {o === 'offered' && seat?.state === 'reserved' ? (
        <>
          <Notice tone="warn">Konfirmasi kesediaan paling lambat {fmtDateTime(seat.expiresAt, tz)}. Bila tidak dikonfirmasi, tempat dapat dialihkan.</Notice>
          {canAnswer ? (
            <div className="row">
              <ActionForm action="ppdb.jawab_penawaran" back={back} hidden={{ id: v.app.id, jawaban: 'terima' }} className="inline">
                <Submit tone="ok" icon="check">Ya, lanjut daftar ulang</Submit>
              </ActionForm>
              <details className="more">
                <summary>Tidak melanjutkan</summary>
                <ActionForm action="ppdb.jawab_penawaran" back={back} hidden={{ id: v.app.id, jawaban: 'tolak' }} confirm="Yakin tidak melanjutkan? Tempat akan dilepas.">
                  <Field name="alasan" label="Alasan (opsional)" />
                  <Submit tone="danger">Tolak penawaran</Submit>
                </ActionForm>
              </details>
            </div>
          ) : null}
        </>
      ) : null}
      {o === 'offered' && seat && ['expired', 'released'].includes(seat.state) && !v.reenroll ? <Notice tone="bad">Penawaran sudah tidak berlaku. Hubungi panitia.</Notice> : null}
    </Card>
  )
}

export function ReenrollPanel({ v, back, tz, family }: { v: View; back: string; tz: string; family: boolean }) {
  const r = v.reenroll
  if (!r || r.status === 'declined') return null
  const open = ['in_progress', 'needs_revision'].includes(r.status)
  return (
    <Card title="Daftar ulang" actions={<Status value={r.status} map={REENROLL_TONE} />}>
      {r.dueAt && open ? <p className="small">Tenggat: <strong>{fmtDateTime(r.dueAt, tz)}</strong></p> : null}
      <ul className="list">
        {r.checklist.map((i) => (
          <li key={i.code} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="grow">
              {i.label} <Status value={i.state} map={ITEM_TONE} />
              <div className="small muted">
                {i.kind === 'payment' ? 'Disahkan otomatis setelah pembayaran diverifikasi bagian keuangan.' : i.kind === 'staff' ? 'Diisi oleh panitia.' : ''}
                {i.note ? ` Catatan: ${i.note}` : ''}
              </div>
              {i.fileId ? (
                <a className="small" href={fileUrl(i.fileId)!} target="_blank" rel="noopener">
                  Lihat berkas
                </a>
              ) : null}
            </div>
            {family && open && (i.kind === 'document' || i.kind === 'confirm') && i.state !== 'verified' ? (
              <ActionForm action="ppdb.daftar_ulang_butir" back={back} files={i.kind === 'document'} hidden={{ id: v.app.id, kode: i.code }} className="row">
                {i.kind === 'document' ? <input type="file" name="berkas" required accept=".pdf,.jpg,.jpeg,.png" aria-label={`Unggah ${i.label}`} style={{ maxWidth: 220 }} /> : null}
                <button className="btn btn--ghost btn--sm" type="submit">
                  {i.kind === 'document' ? (i.fileId ? 'Ganti' : 'Unggah') : 'Saya konfirmasi'}
                </button>
              </ActionForm>
            ) : null}
          </li>
        ))}
      </ul>
      {family && open ? (
        <ActionForm action="ppdb.daftar_ulang_kirim" back={back} hidden={{ id: v.app.id }}>
          <div className="f__actions">
            <Submit>Kirim daftar ulang</Submit>
          </div>
        </ActionForm>
      ) : null}
    </Card>
  )
}

export function StatusSummary({ v, tz }: { v: View; tz: string }) {
  return (
    <dl className="kv">
      <dt>Nomor pendaftaran</dt>
      <dd className="mono">{v.app.registrationNo ?? '— (diberikan saat dikirim)'}</dd>
      <dt>Periode / jalur</dt>
      <dd>
        {v.cycle.name} · {v.path.name}
      </dd>
      <dt>Status</dt>
      <dd>
        <Status value={v.app.status} map={APP_TONE} />
      </dd>
      <dt>Dikirim</dt>
      <dd>{v.app.submittedAt ? fmtDateTime(v.app.submittedAt, tz) : '—'}</dd>
    </dl>
  )
}

export function RevisionNotice({ v, tz }: { v: View; tz: string }) {
  if (v.app.status !== 'needs_revision') return null
  return (
    <Notice tone="warn" title="Panitia meminta perbaikan">
      <p style={{ margin: '4px 0' }}>{v.app.revisionNote}</p>
      {v.app.revisionDue ? <p style={{ margin: 0 }}>Batas waktu: {fmtDateTime(v.app.revisionDue, tz)}</p> : null}
    </Notice>
  )
}

