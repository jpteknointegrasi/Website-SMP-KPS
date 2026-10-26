'use client'
import { useFormFields } from '@payloadcms/ui'
import React from 'react'
import { CONTENT_TYPE_LABEL, PLATFORM_LABEL, parseMediaUrl } from '@/lib/media-url'

/** Live feedback under the URL field: detected platform/type, embed support and hints. Same parser as the server. */
export const MediaUrlHint = () => {
  const url = useFormFields(([f]) => f.originalUrl?.value as string | undefined)
  if (!url) return null
  const p = parseMediaUrl(url)
  const box: React.CSSProperties = { marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 13 }
  if (!p.ok) return <div role="alert" style={{ ...box, background: '#fde8e8', color: '#7a1010' }}>{p.error}</div>
  return (
    <div role="status" style={{ ...box, background: '#e9f5f2', color: '#0e4d44' }}>
      Terdeteksi: <strong>{PLATFORM_LABEL[p.platform]}</strong> · {CONTENT_TYPE_LABEL[p.contentType]}
      {p.embeddable ? ' · pemutar didukung (klik untuk memuat)' : ' · tampil sebagai kartu tautan'}
      {p.hint ? <div style={{ marginTop: 4 }}>{p.hint}</div> : null}
    </div>
  )
}
