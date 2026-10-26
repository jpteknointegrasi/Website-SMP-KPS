'use client'
import Link from 'next/link'
import React from 'react'
import { useSubmit } from './useSubmit'
import { FieldError } from './FieldError'

type Cycle = { id: number; academicYear: string }

export const InterestForm = ({ cycles, source = 'pendaftaran' }: { cycles: Cycle[]; source?: string }) => {
  const { errors, state, result, submit, a } = useSubmit<{ reference: string }>('/api/leads/submit')

  if (state === 'ok' && result)
    return (
      <div className="alert alert--ok" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <strong>Terima kasih, minat Anda sudah kami terima.</strong>
        <p>Nomor referensi: <strong>{result.reference}</strong>. Petugas penerimaan akan menghubungi Anda melalui kontak yang diberikan.</p>
        <p className="muted">Ini bukan nomor pendaftaran siswa. Pendaftaran resmi mengikuti jadwal dan sistem yang diumumkan sekolah.</p>
      </div>
    )

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    void submit(e.currentTarget, {
      parentName: fd.get('parentName'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      cycle: fd.get('cycle'),
      interests: fd.getAll('interests'),
      studentName: fd.get('studentName'),
      originSchool: fd.get('originSchool'),
      message: fd.get('message'),
      consent: fd.get('consent') === 'on',
      marketingOptIn: fd.get('marketingOptIn') === 'on',
      website: fd.get('website'),
      source,
    })
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-describedby="minat-note">
      <p id="minat-note" className="note">Titipkan minat, bukan pendaftaran resmi. Jangan mengirim dokumen atau data identitas anak di sini.</p>
      {errors.form ? <div className="alert alert--err" role="alert">{errors.form}</div> : null}
      <div className="field">
        <label htmlFor="in-name">Nama orang tua/wali <span aria-hidden="true">*</span></label>
        <input id="in-name" name="parentName" autoComplete="name" required maxLength={100} {...a('parentName')} />
        <FieldError errors={errors} k="parentName" />
      </div>
      <div className="field">
        <label htmlFor="in-email">Email</label>
        <input id="in-email" name="email" type="email" autoComplete="email" maxLength={160} {...a('email')} />
        <FieldError errors={errors} k="email" />
      </div>
      <div className="field">
        <label htmlFor="in-phone">Nomor telepon</label>
        <input id="in-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="08xx…" {...a('phone')} />
        <small>Isi minimal satu: email atau telepon.</small>
        <FieldError errors={errors} k="phone" />
      </div>
      <div className="field">
        <label htmlFor="in-cycle">Tahun ajaran tujuan</label>
        <select id="in-cycle" name="cycle" defaultValue={cycles[0] ? String(cycles[0].id) : 'undecided'}>
          {cycles.map((c) => <option key={c.id} value={c.id}>{c.academicYear}</option>)}
          <option value="undecided">Belum ditentukan</option>
        </select>
      </div>
      <fieldset className="field" {...a('interests')}>
        <legend>Saya ingin mengetahui <span aria-hidden="true">*</span></legend>
        {[
          ['info', 'Informasi penerimaan'],
          ['kunjungan', 'Kunjungan sekolah'],
          ['biaya_program', 'Biaya dan program'],
          ['lainnya', 'Lainnya'],
        ].map(([v, l], i) => (
          <label key={v} className="check">
            <input type="checkbox" name="interests" value={v} defaultChecked={i === 0} /> <span>{l}</span>
          </label>
        ))}
        <FieldError errors={errors} k="interests" />
      </fieldset>
      <details className="field">
        <summary>Tambahan (opsional)</summary>
        <div className="field">
          <label htmlFor="in-student">Nama calon siswa (opsional)</label>
          <input id="in-student" name="studentName" maxLength={100} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="in-origin">Asal sekolah / kelas (opsional)</label>
          <input id="in-origin" name="originSchool" maxLength={120} autoComplete="off" />
        </div>
      </details>
      <div className="field">
        <label htmlFor="in-msg">Pesan (opsional)</label>
        <textarea id="in-msg" name="message" maxLength={1000} rows={4} {...a('message')} />
        <FieldError errors={errors} k="message" />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="in-web">Jangan diisi</label>
        <input id="in-web" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label className="check">
          <input type="checkbox" name="consent" {...a('consent')} />
          <span>Saya setuju data ini dipakai sekolah untuk menindaklanjuti permintaan saya, sesuai <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>. <span aria-hidden="true">*</span></span>
        </label>
        <FieldError errors={errors} k="consent" />
      </div>
      <div className="field">
        <label className="check">
          <input type="checkbox" name="marketingOptIn" />
          <span>Kirimi saya informasi penerimaan berikutnya (opsional).</span>
        </label>
      </div>
      <div>
        <button type="submit" className="btn btn--teal btn--lg" disabled={state === 'sending'} aria-busy={state === 'sending'}>
          {state === 'sending' ? 'Mengirim…' : 'Kirim minat'}
        </button>
      </div>
    </form>
  )
}
