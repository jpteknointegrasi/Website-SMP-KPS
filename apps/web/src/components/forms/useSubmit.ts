'use client'
import { useRef, useState } from 'react'

/**
 * Shared form submit state: one idempotency key per form instance (a retry or double click re-sends the same key,
 * so the server stores the submission once), loading/success/error states, focus on the first invalid field.
 */
export function useSubmit<T extends Record<string, unknown>>(endpoint: string) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'ok'>('idle')
  const [result, setResult] = useState<T | null>(null)
  const key = useRef<string>('')
  const started = useRef(Date.now())
  if (!key.current) key.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-k`

  const submit = async (form: HTMLFormElement, body: Record<string, unknown>) => {
    if (state === 'sending') return
    setState('sending')
    setErrors({})
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, idempotencyKey: key.current, startedAt: started.current }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        setResult(json as T)
        setState('ok')
        return
      }
      setErrors(json.errors ?? { form: json.error ?? 'Data belum terkirim. Periksa isian lalu coba lagi.' })
      setState('idle')
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    } catch {
      setErrors({ form: 'Koneksi terputus. Data belum terkirim; coba lagi.' })
      setState('idle')
    }
  }
  const a = (k: string) => ({ 'aria-invalid': errors[k] ? (true as const) : undefined, 'aria-describedby': errors[k] ? `err-${k}` : undefined })
  return { errors, state, result, submit, a }
}
