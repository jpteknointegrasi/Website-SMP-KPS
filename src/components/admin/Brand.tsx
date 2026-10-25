import React from 'react'

export const AdminLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <div
      style={{
        background: '#142A46',
        borderRadius: 14,
        padding: '10px 16px',
        boxShadow: '0 10px 30px -12px rgba(20,42,70,.6)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-smp-kps.png" alt="SMP Nasional KPS" width={240} height={60} style={{ display: 'block', height: 52, width: 'auto' }} />
    </div>
    <div style={{ lineHeight: 1.2 }}>
      <strong style={{ display: 'block', fontSize: 18 }}>CMS Website</strong>
      <span style={{ opacity: 0.7, fontSize: 13 }}>Kelola konten tanpa kode</span>
    </div>
  </div>
)

export const AdminIcon = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#142A46" />
    <path d="M9 9v14M9 16l8-7M12 14l6 9" stroke="#D5AF54" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="23" cy="10" r="2.2" fill="#167467" />
  </svg>
)
