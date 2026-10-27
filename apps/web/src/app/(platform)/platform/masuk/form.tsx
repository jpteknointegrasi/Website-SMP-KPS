'use client'
import { useState } from 'react'

/** Signs in through the CMS login endpoint on this (platform) address; the session cookie stays on this host. */
export function LoginForm() {
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
      window.location.assign('/platform')
    } catch {
      setError('Tidak dapat terhubung. Periksa koneksi internet Anda.')
      setBusy(false)
    }
  }
  return (
    <form className="f" onSubmit={onSubmit}>
      {error ? (
        <div className="note note--bad" role="alert">
          {error}
        </div>
      ) : null}
      <label className="fld">
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="fld">
        <span>Kata sandi</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Memeriksa…' : 'Masuk'}
      </button>
    </form>
  )
}

/** Ends the CMS session (logout also removes the session server-side) and returns to the sign-in page. */
export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={className ?? 'btn btn--ghost'}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await fetch('/api/users/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null)
        window.location.assign('/platform/masuk')
      }}
    >
      {busy ? 'Keluar…' : 'Keluar'}
    </button>
  )
}
