import React from 'react'
import { requestBranding, requestCtx } from '@/server/request'
import { portalSchool } from '@/lib/context'
import { unavailableMessage } from '@/lib/unavailable'
import { P, publicFileUrl } from '@/ui/kit'
import { FormEnhancer } from '@/ui/client'

/** Sign-in pages: the school's photo beside the form (LOG-01). One account per person; no shared school accounts. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const school = await portalSchool()
  const ctx = await requestCtx()
  if (!school || !ctx) {
    return (
      <main id="main" className="narrow" style={{ padding: '64px 16px' }}>
        <h1>{school ? school.name : 'Portal tidak ditemukan'}</h1>
        <p>{unavailableMessage(school)}</p>
        {school ? <a href="/">Kembali ke website sekolah</a> : null}
      </main>
    )
  }
  const b = (await requestBranding())!
  const hero = publicFileUrl(b.heroFileId)
  const logo = publicFileUrl(b.logoFileId) ?? `${P}/icon.svg`
  const style = { '--brand': b.primary, '--navy': b.navy } as React.CSSProperties
  return (
    <div className="auth" style={style}>
      <div className="auth__photo" style={hero ? { backgroundImage: `url(${hero})` } : undefined}>
        <div>
          <h2>Portal {b.shortName || school.name}</h2>
          <p>Satu akun untuk layanan sekolah digital: penerimaan siswa baru, informasi belajar, dan layanan administrasi.</p>
        </div>
      </div>
      <div className="auth__panel">
        <main id="main" className="auth__box" tabIndex={-1}>
          <div className="auth__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" />
            <div>
              <strong>{b.shortName || school.name}</strong>
              {b.city ? <span>{b.city}</span> : null}
            </div>
          </div>
          {children}
          <p className="footnote">Didukung SatuSekolah</p>
        </main>
      </div>
      <FormEnhancer />
    </div>
  )
}
