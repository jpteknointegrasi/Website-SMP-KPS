import { requireOperator } from '@/platform/session'
import { listSchools } from '@/platform/data'
import { PRODUCT_STATUS_LABEL, SCHOOL_STATUS, fmtDate, planLabel } from '@/platform/labels'

export const metadata = { title: 'Sekolah' }

const product = (p: { plan: string; status: string; on: boolean }) =>
  p.plan === 'none' ? <span className="pill pill--muted">—</span> : <span className={`pill pill--${p.on ? 'info' : 'muted'}`}>{`${planLabel(p.plan)} · ${PRODUCT_STATUS_LABEL[p.status] ?? p.status}`}</span>

export default async function Sekolah() {
  await requireOperator()
  const schools = await listSchools()
  return (
    <>
      <div className="head">
        <div>
          <h1>Sekolah</h1>
          <p>Status, alamat dan langganan setiap sekolah. Ubah paket, status, domain atau database App lewat CMS → Sekolah (platform).</p>
        </div>
      </div>
      <section className="card">
        {schools.length === 0 ? (
          <p className="empty">Belum ada sekolah.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Sekolah</th>
                  <th scope="col">Status</th>
                  <th scope="col">Web (paket)</th>
                  <th scope="col">App</th>
                  <th scope="col">Akun staf</th>
                  <th scope="col">
                    <span className="sr">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id} id={`sekolah-${s.id}`}>
                    <td>
                      <strong>{s.name}</strong>
                      <br />
                      <span className="small muted">
                        <span className="mono">{s.slug}</span> · {s.primaryDomain ?? 'belum ada domain'} · sejak {fmtDate(s.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span className={`pill pill--${SCHOOL_STATUS[s.status]?.tone}`}>{SCHOOL_STATUS[s.status]?.label}</span>
                    </td>
                    <td>
                      {product(s.web)}
                      {s.web.plan === 'basic' ? (
                        <>
                          <br />
                          <span className="small" style={s.web.cms ? undefined : { color: 'var(--warn)' }}>
                            {s.web.cms ? `CMS sampai ${fmtDate(s.web.cmsUntil)}` : 'CMS ditutup'}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {product(s.app)}
                      {s.app.plan !== 'none' ? (
                        <>
                          <br />
                          <span className={`small ${s.app.database ? 'muted' : ''}`} style={s.app.database ? undefined : { color: 'var(--warn)' }}>
                            {s.app.database ? 'database diatur' : 'database belum diatur'}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td className="nowrap">
                      {s.staff}
                      {s.admins === 0 ? (
                        <>
                          <br />
                          <span className="small" style={{ color: 'var(--bad)' }}>
                            tanpa Admin Teknis
                          </span>
                        </>
                      ) : (
                        <span className="small muted"> ({s.admins} admin)</span>
                      )}
                    </td>
                    <td className="nowrap small">
                      <a href={`/admin/collections/tenants/${s.id}`}>Kelola di CMS</a>
                      {s.primaryDomain ? (
                        <>
                          <br />
                          {s.web.on ? (
                            <a href={`https://${s.primaryDomain}`} target="_blank" rel="noopener">
                              Website ↗
                            </a>
                          ) : null}
                          {s.web.on && s.app.on ? ' · ' : null}
                          {s.app.on ? (
                            <a href={`https://${s.primaryDomain}/portal/masuk-staf`} target="_blank" rel="noopener">
                              App ↗
                            </a>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
