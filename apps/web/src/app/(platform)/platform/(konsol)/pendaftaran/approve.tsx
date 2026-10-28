'use client'
import { useActionState, useState } from 'react'
import { approveApplication, type ApproveState } from '@/platform/actions'

type Defaults = { applicationId: number; slug: string; name: string; timezone: string; domain: string; webPlan: string; appPlan: string }

const ZONES = [
  ['Asia/Jakarta', 'WIB'],
  ['Asia/Makassar', 'WITA'],
  ['Asia/Jayapura', 'WIT'],
] as const

function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="copy">
      <input type="text" readOnly value={url} aria-label="Tautan undangan" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn btn--ghost"
        onClick={async () => {
          await navigator.clipboard?.writeText(url).catch(() => null)
          setDone(true)
        }}
      >
        {done ? 'Tersalin' : 'Salin'}
      </button>
    </div>
  )
}

/** Approval form; on success shows the invitation link ONCE plus the remaining manual steps. */
export function ApproveForm({ d, rootDomain }: { d: Defaults; rootDomain: string }) {
  const [state, action, pending] = useActionState<ApproveState, FormData>(approveApplication, null)
  if (state?.ok) {
    return (
      <div className="note note--ok" role="status">
        <b>{state.schoolName} disetujui.</b> Sekolah, akun Admin Teknis ({state.adminEmail}) dan langganan uji coba sudah dibuat.
        <p style={{ margin: '8px 0 4px' }}>
          {state.emailed ? 'Undangan sudah dikirim ke email Admin Teknis. Tautan cadangan (berlaku 72 jam, hanya tampil sekali):' : 'Email belum aktif di platform (SMTP). Kirim tautan ini sendiri ke Admin Teknis — berlaku 72 jam dan hanya tampil sekali:'}
        </p>
        <CopyLink url={state.inviteUrl} />
        <p style={{ margin: '10px 0 0' }}>Langkah berikutnya:</p>
        <ol>
          <li>
            Pastikan alamat <b>{state.domain}</b> sudah ditambahkan di Vercel (proyek website → Settings → Domains) dan DNS-nya mengarah ke Vercel. Tautan undangan baru bisa dibuka setelah alamat ini aktif.
          </li>
          {state.app ? (
            <li>
              Satu Sekolah App: buat database App sekolah, tempel URL-nya di CMS → Sekolah ({state.slug}) → Database App, lalu jalankan <span className="mono">npm run portal:migrate -- --sekolah {state.slug}</span>.
            </li>
          ) : null}
          <li>Ubah status sekolah dari Uji coba ke Aktif setelah langganan berjalan (CMS → Sekolah).</li>
        </ol>
      </div>
    )
  }
  return (
    <form className="f" action={action}>
      {state && !state.ok ? (
        <div className="note note--bad" role="alert">
          <ul>
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <input type="hidden" name="applicationId" value={d.applicationId} />
      <div className="row">
        <label className="fld">
          <span>Nama sekolah</span>
          <input name="name" defaultValue={d.name} required maxLength={160} />
        </label>
        <label className="fld">
          <span>
            Kode sekolah <small>huruf kecil/angka/-; permanen</small>
          </span>
          <input name="slug" defaultValue={d.slug} required maxLength={42} pattern="[a-z0-9](?:[a-z0-9\-]{0,40}[a-z0-9])?" />
        </label>
      </div>
      <div className="row">
        <label className="fld">
          <span>
            Domain sekolah <small>{rootDomain ? `kosong = <kode>.${rootDomain}` : 'wajib (belum ada domain platform)'}</small>
          </span>
          <input name="domain" defaultValue={d.domain} maxLength={253} required={!rootDomain} placeholder="www.sekolah.sch.id" />
        </label>
        <label className="fld">
          <span>Zona waktu</span>
          <select name="timezone" defaultValue={d.timezone}>
            {ZONES.map(([k, l]) => (
              <option key={k} value={k}>
                {l} ({k})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <label className="fld">
          <span>Paket Satu Sekolah Web</span>
          <select name="webPlan" defaultValue={d.webPlan}>
            <option value="none">Tidak berlangganan</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
        </label>
        <label className="fld">
          <span>Paket Satu Sekolah App</span>
          <select name="appPlan" defaultValue={d.appPlan}>
            <option value="none">Tidak berlangganan</option>
            <option value="pilot">Pilot</option>
            <option value="standard">Standar</option>
          </select>
        </label>
      </div>
      <label className="fld">
        <span>Catatan keputusan (internal)</span>
        <textarea name="decisionNote" maxLength={1000} />
      </label>
      <p className="small muted" style={{ margin: 0 }}>
        Status sekolah dan langganan dimulai sebagai <b>Uji coba</b>. Akun Admin Teknis dibuat dari email pengelola; kata sandinya diatur sendiri lewat undangan.
      </p>
      <div className="actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Menyiapkan sekolah…' : 'Setujui & buat sekolah'}
        </button>
      </div>
    </form>
  )
}
