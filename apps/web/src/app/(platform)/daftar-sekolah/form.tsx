'use client'
import { useActionState } from 'react'
import { submitApplication, type FormState } from '@/platform/actions'

const LEVELS = [
  ['sd', 'SD/MI'],
  ['smp', 'SMP/MTs'],
  ['sma', 'SMA/MA'],
  ['smk', 'SMK'],
  ['tk', 'TK/PAUD'],
  ['lainnya', 'Lainnya'],
] as const
const ZONES = [
  ['Asia/Jakarta', 'WIB (Asia/Jakarta)'],
  ['Asia/Makassar', 'WITA (Asia/Makassar)'],
  ['Asia/Jayapura', 'WIT (Asia/Jayapura)'],
] as const

export function ApplicationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitApplication, null)
  const e = state?.errors ?? {}
  const v = state?.values ?? {}
  const field = (name: string, label: string, opts: { required?: boolean; type?: string; hint?: string; auto?: string; max?: number } = {}) => (
    <label className="fld">
      <span>
        {label}
        {opts.required ? ' *' : ''} {opts.hint ? <small>{opts.hint}</small> : null}
      </span>
      <input
        name={name}
        type={opts.type ?? 'text'}
        required={opts.required}
        autoComplete={opts.auto}
        maxLength={opts.max ?? 200}
        defaultValue={v[name] ?? ''}
        aria-invalid={e[name] ? true : undefined}
        aria-describedby={e[name] ? `${name}-err` : undefined}
      />
      {e[name] ? <em id={`${name}-err`}>{e[name]}</em> : null}
    </label>
  )
  return (
    <form className="f" action={action} noValidate>
      {state?.message ? (
        <div className="note note--bad" role="alert">
          {state.message}
        </div>
      ) : null}
      <fieldset>
        <legend>Data sekolah</legend>
        {field('schoolName', 'Nama sekolah', { required: true, auto: 'organization', max: 160 })}
        <div className="row">
          {field('shortName', 'Nama singkat', { hint: 'mis. SMAN 1 Contoh', max: 60 })}
          <label className="fld">
            <span>Jenjang</span>
            <select name="level" defaultValue={v.level ?? 'smp'}>
              {LEVELS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {field('npsn', 'NPSN', { hint: '8 angka', max: 12 })}
        </div>
        <div className="row">
          {field('city', 'Kota/Kabupaten', { required: true, auto: 'address-level2', max: 80 })}
          {field('province', 'Provinsi', { required: true, auto: 'address-level1', max: 80 })}
          <label className="fld">
            <span>Zona waktu</span>
            <select name="timezone" defaultValue={v.timezone ?? 'Asia/Jakarta'}>
              {ZONES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        {field('domain', 'Domain website sekolah', { hint: 'bila sudah punya, mis. www.sman1contoh.sch.id', max: 253 })}
      </fieldset>

      <fieldset>
        <legend>Produk yang diminati</legend>
        <label className="check">
          <input type="checkbox" name="wantWeb" defaultChecked={state ? v.wantWeb === 'on' : true} />
          <span>
            <b>Satu Sekolah Web</b> — website sekolah & CMS: berita, agenda, galeri, informasi pendaftaran, minat & kunjungan.
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="wantApp" defaultChecked={v.wantApp === 'on'} />
          <span>
            <b>Satu Sekolah App</b> — portal sekolah: penerimaan siswa baru, buku induk, presensi, nilai & rapor, layanan TU.
          </span>
        </label>
        {e.products ? <em className="fld">{e.products}</em> : null}
      </fieldset>

      <fieldset>
        <legend>Pengelola (calon Admin Teknis)</legend>
        <p className="small muted" style={{ margin: 0 }}>
          Orang yang akan mengelola akun dan pengaturan sekolah di platform. Satu email hanya untuk satu sekolah.
        </p>
        <div className="row">
          {field('adminName', 'Nama lengkap', { required: true, auto: 'name', max: 120 })}
          {field('adminPosition', 'Jabatan', { hint: 'mis. Kepala TU', max: 80 })}
        </div>
        <div className="row">
          {field('adminEmail', 'Email', { required: true, type: 'email', auto: 'email' })}
          {field('adminPhone', 'Telepon/WhatsApp', { type: 'tel', auto: 'tel', max: 30 })}
        </div>
        <label className="fld">
          <span>Catatan</span>
          <textarea name="note" maxLength={1500} defaultValue={v.note ?? ''} placeholder="Kebutuhan khusus, jumlah siswa, jadwal yang diinginkan…" />
        </label>
      </fieldset>

      <div className="hp" aria-hidden="true">
        <label>
          Jangan diisi <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="consent" required defaultChecked={v.consent === 'on'} aria-invalid={e.consent ? true : undefined} />
        <span>
          Saya berwenang mendaftarkan sekolah ini dan setuju data di atas dipakai untuk meninjau serta menyiapkan layanan. *
          {e.consent ? (
            <>
              <br />
              <em className="fld">{e.consent}</em>
            </>
          ) : null}
        </span>
      </label>
      <div className="actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Mengirim…' : 'Kirim pendaftaran'}
        </button>
      </div>
    </form>
  )
}
