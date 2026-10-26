'use client'
import { useState } from 'react'

/**
 * Staff sign in with their school CMS account (shared login). The browser posts to the website's own login endpoint
 * on the same domain, which sets the session cookie the portal then asks the website about.
 */
export function StaffLoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const r = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
      })
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { errors?: { message?: string }[] } | null
        const msg = j?.errors?.[0]?.message
        setError(msg && !/^The email or password/i.test(msg) ? msg : 'Email atau kata sandi salah.')
        setBusy(false)
        return
      }
      window.location.assign(next)
    } catch {
      setError('Tidak dapat terhubung. Periksa koneksi internet Anda.')
      setBusy(false)
    }
  }
  return (
    <form className="f" method="post" onSubmit={onSubmit}>
      {error ? (
        <div className="notice notice--bad" role="alert">
          <div>{error}</div>
        </div>
      ) : null}
      <label className="fld">
        <span>Email staf</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="fld">
        <span>Kata sandi</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Memeriksa…' : 'Masuk sebagai staf'}
      </button>
    </form>
  )
}
