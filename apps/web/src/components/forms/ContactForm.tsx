'use client'
import Link from 'next/link'
import React, { useRef, useState } from 'react'

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'category' | 'message' | 'consent' | 'form', string>>

export const ContactForm = ({ defaultCategory = 'umum', topic }: { defaultCategory?: string; topic?: string }) => {
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'ok'>('idle')
  const [ref, setRef] = useState('')
  const started = useRef(Date.now())
  // one key per form instance: a retry or double click re-sends the same key, the server stores the message once
  const key = useRef('')
  if (!key.current) key.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-k`
  const formRef = useRef<HTMLFormElement>(null)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (state === 'sending') return
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries()) as Record<string, unknown>
    body.consent = fd.get('consent') === 'on'
    body.startedAt = started.current
    body.idempotencyKey = key.current
    if (topic) body.topic = topic
    setState('sending')
    setErrors({})
    try {
      const res = await fetch('/api/contact-messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setRef(json.reference)
        setState('ok')
        formRef.current?.reset()
        return
      }
      setErrors(json.errors ?? { form: json.error ?? 'Pesan belum terkirim. Periksa isian lalu coba lagi.' })
      setState('idle')
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    } catch {
      setErrors({ form: 'Koneksi terputus. Pesan belum terkirim; coba lagi.' })
      setState('idle')
    }
  }

  if (state === 'ok')
    return (
      <div className="alert alert--ok" role="status">
        <strong>Pesan terkirim.</strong> Nomor referensi Anda: <strong>{ref}</strong>. Simpan nomor ini bila perlu menindaklanjuti.
      </div>
    )

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <span className="field-error" id={`err-${k}`}>
        {errors[k]}
      </span>
    ) : null
  const a = (k: keyof Errors) => ({ 'aria-invalid': errors[k] ? (true as const) : undefined, 'aria-describedby': errors[k] ? `err-${k}` : undefined })

  return (
    <form ref={formRef} className="form" onSubmit={onSubmit} noValidate>
      {errors.form ? (
        <div className="alert alert--err" role="alert">
          {errors.form}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="cf-name">Nama</label>
        <input id="cf-name" name="name" autoComplete="name" required maxLength={100} {...a('name')} />
        {err('name')}
      </div>
      <div className="field">
        <label htmlFor="cf-email">Email</label>
        <input id="cf-email" name="email" type="email" autoComplete="email" maxLength={160} {...a('email')} />
        {err('email')}
      </div>
      <div className="field">
        <label htmlFor="cf-phone">Telepon (opsional bila email diisi)</label>
        <input id="cf-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} {...a('phone')} />
        <small>Isi minimal satu: email atau telepon, agar kami dapat membalas.</small>
        {err('phone')}
      </div>
      <div className="field">
        <label htmlFor="cf-cat">Kategori</label>
        <select id="cf-cat" name="category" defaultValue={defaultCategory} {...a('category')}>
          <option value="umum">Informasi umum</option>
          <option value="pendaftaran">Pendaftaran</option>
          <option value="akademik">Akademik</option>
          <option value="saran">Kritik &amp; saran</option>
          <option value="alumni">Alumni</option>
          <option value="kegiatan">Kegiatan &amp; ekstrakurikuler</option>
          <option value="kunjungan">Kunjungan sekolah</option>
        </select>
        {err('category')}
      </div>
      <div className="field">
        <label htmlFor="cf-msg">Pesan</label>
        <textarea id="cf-msg" name="message" required minLength={10} maxLength={3000} {...a('message')} />
        {err('message')}
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="cf-web">Jangan diisi</label>
        <input id="cf-web" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label className="check">
          <input type="checkbox" name="consent" {...a('consent')} />
          <span>
            Saya setuju data ini digunakan untuk membalas pesan sesuai <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>.
          </span>
        </label>
        {err('consent')}
      </div>
      <div>
        <button type="submit" className="btn btn--teal btn--lg" disabled={state === 'sending'}>
          {state === 'sending' ? 'Mengirim…' : 'Kirim pesan'}
        </button>
      </div>
    </form>
  )
}
