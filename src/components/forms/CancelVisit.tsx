'use client'
import React, { useEffect, useState } from 'react'

type Info = { reference: string; status: string; session: { title: string; startAt: string } | null }
const fmt = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE || 'Asia/Makassar', dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso))

/** The token lives in the URL fragment (#t=…), which browsers never send to servers or put in access logs. */
export const CancelVisit = () => {
  const [token, setToken] = useState<string | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [msg, setMsg] = useState<string>('Memeriksa tautan…')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const call = async (t: string, confirm: boolean) => {
    const res = await fetch('/api/visit-bookings/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t, confirm }) })
    return (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; booking?: Info; cancelled?: boolean }
  }

  useEffect(() => {
    const t = new URLSearchParams(location.hash.slice(1)).get('t')
    // remove the token from the address bar/history right away
    history.replaceState(null, '', location.pathname)
    if (!t) {
      setMsg('Tautan pembatalan tidak lengkap. Gunakan tautan yang diberikan saat memesan, atau hubungi sekolah.')
      return
    }
    setToken(t)
    void call(t, false).then((j) => {
      if (j.ok && j.booking) {
        setInfo(j.booking)
        setMsg('')
      } else setMsg(j.error ?? 'Tautan tidak berlaku.')
    })
  }, [])

  if (done)
    return (
      <div className="alert alert--ok" role="status">
        <strong>Kunjungan dibatalkan.</strong> Kuota sudah dikembalikan untuk keluarga lain. Terima kasih telah memberi tahu.
      </div>
    )
  if (!info) return <p role="status">{msg}</p>
  return (
    <div className="aside-card">
      <h2>Batalkan kunjungan?</h2>
      <dl>
        <dt>Referensi</dt>
        <dd>{info.reference}</dd>
        {info.session ? (
          <>
            <dt>Jadwal</dt>
            <dd>{info.session.title}, {fmt(info.session.startAt)} WITA</dd>
          </>
        ) : null}
        <dt>Status</dt>
        <dd>{info.status === 'confirmed' ? 'Terkonfirmasi' : 'Menunggu konfirmasi'}</dd>
      </dl>
      {msg ? <p className="field-error" role="alert">{msg}</p> : null}
      <button
        className="btn btn--ghost"
        disabled={busy}
        onClick={async () => {
          if (!token) return
          setBusy(true)
          const j = await call(token, true)
          setBusy(false)
          if (j.ok && j.cancelled) setDone(true)
          else setMsg(j.error ?? 'Pembatalan gagal. Coba lagi atau hubungi sekolah.')
        }}
      >
        {busy ? 'Membatalkan…' : 'Ya, batalkan kunjungan'}
      </button>
    </div>
  )
}
