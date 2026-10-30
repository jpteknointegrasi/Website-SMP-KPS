import { notFound } from 'next/navigation'
import { PORTAL_BASE_PATH, hasProduct, isDemoSchool, isLive } from '@sekolahku/core'
import { rawPayload } from '@/lib/payload'
import { onPlatformHost } from '@/platform/session'
import { toInfo } from '@/tenancy/resolve'

export const metadata = { title: { absolute: 'Masuk ke App · SatuSekolah' } }

/**
 * "Masuk ke App" from the SatuSekolah landing page. Staff sign in on their own school's address only, so this page
 * lists the schools with an active App subscription and links to <school domain>/portal. Platform address only.
 */
export default async function MasukApp() {
  if (!(await onPlatformHost())) notFound()
  const payload = await rawPayload()
  const res = await payload.find({ collection: 'tenants', pagination: false, depth: 0, sort: 'name', overrideAccess: true })
  const schools = res.docs
    .map((d) => toInfo(d as never))
    // demo schools (sample data) are shown only to people who are sent their address
    .filter((t) => isLive(t) && hasProduct(t, 'app') && t.primaryDomain && !isDemoSchool(t))

  return (
    <div className="pub">
      <aside className="pub__aside">
        <div>
          <h2>SatuSekolah App</h2>
          <p>Setiap sekolah memiliki alamat portalnya sendiri. Pilih sekolah Anda untuk masuk dengan akun yang diberikan oleh Admin sekolah.</p>
        </div>
        <small>
          <a href="/" style={{ color: 'inherit' }}>← Kembali ke beranda SatuSekolah</a>
        </small>
      </aside>
      <div className="pub__main">
        <main id="main" className="pub__box" tabIndex={-1}>
          <h1>Masuk ke App</h1>
          <p className="muted">Pilih sekolah Anda.</p>
          {schools.length === 0 ? (
            <p>Belum ada sekolah dengan SatuSekolah App yang aktif.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 10 }}>
              {schools.map((s) => (
                <li key={s.id}>
                  <a
                    href={`https://${s.primaryDomain}${PORTAL_BASE_PATH}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 12, textDecoration: 'none', color: 'inherit', minHeight: 44 }}
                  >
                    <span>
                      <strong style={{ display: 'block' }}>{s.name}</strong>
                      <span className="muted small">{s.primaryDomain}</span>
                    </span>
                    <span aria-hidden="true">→</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}
