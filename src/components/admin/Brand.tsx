import React from 'react'
import type { Payload } from 'payload'
import { schoolOfAddress } from '@/tenancy/admin'
import { findSingleton } from '@/tenancy/scoped'
import { PLATFORM_NAME } from '@/tenancy/config'

type Logo = { url?: string | null; alt?: string | null } | number | null | undefined

/** Login/dashboard logo: the logo of the school whose address the CMS is opened on, else the platform name. */
export const AdminLogo = async ({ payload }: { payload: Payload }) => {
  const school = payload ? await schoolOfAddress(payload) : null
  const settings = school ? await findSingleton(payload, 'site-settings', school.id, { depth: 1, overrideAccess: true }) : null
  const logo = settings?.logo as Logo
  const src = logo && typeof logo === 'object' ? logo.url : null
  const name = (settings?.schoolName as string | undefined) ?? school?.name ?? PLATFORM_NAME
  return (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <div
      style={{
        background: '#142A46',
        borderRadius: 14,
        padding: '10px 16px',
        boxShadow: '0 10px 30px -12px rgba(20,42,70,.6)',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={240} height={60} style={{ display: 'block', height: 52, width: 'auto' }} />
      ) : (
        <strong style={{ display: 'block', color: '#fff', fontSize: 18, lineHeight: '52px' }}>{name}</strong>
      )}
    </div>
    <div style={{ lineHeight: 1.2 }}>
      <strong style={{ display: 'block', fontSize: 18 }}>CMS Website</strong>
      <span style={{ opacity: 0.7, fontSize: 13 }}>{school ? name : PLATFORM_NAME}</span>
    </div>
  </div>
  )
}

export const AdminIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 32 32" aria-hidden="true" style={{ display: 'block', minWidth: 18, minHeight: 18 }}>
    <rect width="32" height="32" rx="8" fill="#142A46" />
    {/* generic school building */}
    <path d="M7 14l9-5 9 5M9 14v9M14 14v9M18 14v9M23 14v9M7 24h18" stroke="#D5AF54" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
)
