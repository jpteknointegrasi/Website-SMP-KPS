'use client'
import { useFormFields } from '@payloadcms/ui'
import React from 'react'

/** Soft warning in the announcement form: seasonal items should have an end date. */
export const EndDateWarning = () => {
  const end = useFormFields(([fields]) => fields.displayEnd?.value)
  const category = useFormFields(([fields]) => fields.category?.value)
  if (end) return null
  const seasonal = category === 'pendaftaran' || category === 'kegiatan' || category === 'akademik'
  return (
    <div
      role="note"
      style={{ margin: '4px 0 20px', padding: '10px 14px', borderRadius: 8, background: seasonal ? '#fff4d6' : '#eef3f7', color: '#3b2f05', fontSize: 13 }}
    >
      <strong>Tanggal berakhir belum diisi.</strong>{' '}
      {seasonal
        ? 'Pengumuman musiman (pendaftaran/kegiatan/akademik) sebaiknya punya tanggal berakhir agar otomatis turun dari beranda dan masuk arsip.'
        : 'Tanpa tanggal berakhir, pengumuman tetap aktif sampai diarsipkan manual.'}
    </div>
  )
}
