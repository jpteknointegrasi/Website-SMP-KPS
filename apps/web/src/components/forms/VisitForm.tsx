'use client'
import Link from 'next/link'
import React, { useState } from 'react'
import { useSubmit } from './useSubmit'
import { FieldError } from './FieldError'

export type SessionOption = { id: number; title: string; when: string; location?: string | null; remaining: number; full: boolean; unit: string; requiresConfirmation: boolean; instructions?: string | null }
type Result = { reference: string; status: string; cancelToken?: string; session?: { title: string } }

export const VisitForm = ({ sessions }: { sessions: SessionOption[] }) => {
  const firstOpen = sessions.find((s) => !s.full)
  const [sel, setSel] = useState<number | undefined>(firstOpen?.id)
  const { errors, state, result, submit, a } = useSubmit<Result>('/api/visit-bookings/submit')
  const chosen = sessions.find((s) => s.id === sel)

  if (state === 'ok' && result) {
    const cancelUrl = result.cancelToken ? `${location.origin}/kunjungan/batal#t=${result.cancelToken}` : null
    return (
      <div className="alert alert--ok" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        {result.status === 'confirmed' ? (
          <strong>Kunjungan Anda terkonfirmasi.</strong>
        ) : (
          <strong>Permintaan kunjungan diterima — menunggu konfirmasi petugas.</strong>
        )}
        <p>
          Nomor referensi: <strong>{result.reference}</strong>
          {chosen ? <> · {chosen.title}, {chosen.when}</> : null}
        </p>
        {result.status !== 'confirmed' ? <p>Jadwal belum pasti sampai petugas mengonfirmasi melalui kontak Anda.</p> : null}
        {cancelUrl ? (
          <p className="muted">
            Simpan tautan pembatalan ini (hanya ditampilkan sekali): <br />
            <a href={cancelUrl} className="break">{cancelUrl}</a>
          </p>
        ) : null}
      </div>
    )
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    void submit(e.currentTarget, {
      session: fd.get('session'),
      parentName: fd.get('parentName'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      participants: Number(fd.get('participants')),
      targetYear: fd.get('targetYear'),
      note: fd.get('note'),
      consent: fd.get('consent') === 'on',
      website: fd.get('website'),
    })
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {errors.form ? <div className="alert alert--err" role="alert">{errors.form}</div> : null}
      <fieldset className="field" {...a('session')}>
        <legend>Pilih jadwal <span aria-hidden="true">*</span></legend>
        <ul className="slots">
          {sessions.map((s) => (
            <li key={s.id}>
              <label className={`slot${s.full ? ' is-full' : ''}${sel === s.id ? ' is-selected' : ''}`}>
                <input type="radio" name="session" value={s.id} checked={sel === s.id} disabled={s.full} onChange={() => setSel(s.id)} />
                <span className="slot__body">
                  <strong>{s.title}</strong>
                  <span>{s.when}{s.location ? ` · ${s.location}` : ''}</span>
                  <span className={s.full ? 'badge badge--ended' : 'badge'}>{s.full ? 'Penuh' : `Sisa ${s.remaining} ${s.unit === 'people' ? 'tempat' : 'keluarga'}`}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <FieldError errors={errors} k="session" />
      </fieldset>
      {chosen?.instructions ? <p className="note">{chosen.instructions}</p> : null}
      <div className="field">
        <label htmlFor="vf-name">Nama orang tua/wali <span aria-hidden="true">*</span></label>
        <input id="vf-name" name="parentName" autoComplete="name" required maxLength={100} {...a('parentName')} />
        <FieldError errors={errors} k="parentName" />
      </div>
      <div className="field">
        <label htmlFor="vf-email">Email</label>
        <input id="vf-email" name="email" type="email" autoComplete="email" maxLength={160} {...a('email')} />
        <FieldError errors={errors} k="email" />
      </div>
      <div className="field">
        <label htmlFor="vf-phone">Nomor telepon</label>
        <input id="vf-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="08xx…" {...a('phone')} />
        <small>Isi minimal satu: email atau telepon.</small>
        <FieldError errors={errors} k="phone" />
      </div>
      <div className="field">
        <label htmlFor="vf-n">Jumlah peserta (termasuk anak)</label>
        <input id="vf-n" name="participants" type="number" min={1} max={10} defaultValue={2} required {...a('participants')} />
        <FieldError errors={errors} k="participants" />
      </div>
      <div className="field">
        <label htmlFor="vf-year">Minat tahun ajaran (opsional)</label>
        <input id="vf-year" name="targetYear" maxLength={40} placeholder="mis. 2027/2028" />
      </div>
      <div className="field">
        <label htmlFor="vf-note">Catatan (opsional)</label>
        <textarea id="vf-note" name="note" maxLength={500} rows={3} />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="vf-web">Jangan diisi</label>
        <input id="vf-web" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label className="check">
          <input type="checkbox" name="consent" {...a('consent')} />
          <span>Saya setuju data ini dipakai untuk mengatur kunjungan, sesuai <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>. <span aria-hidden="true">*</span></span>
        </label>
        <FieldError errors={errors} k="consent" />
      </div>
      <div>
        <button type="submit" className="btn btn--teal btn--lg" disabled={state === 'sending' || !firstOpen} aria-busy={state === 'sending'}>
          {state === 'sending' ? 'Mengirim…' : chosen?.requiresConfirmation ? 'Ajukan kunjungan' : 'Pesan kunjungan'}
        </button>
      </div>
    </form>
  )
}
