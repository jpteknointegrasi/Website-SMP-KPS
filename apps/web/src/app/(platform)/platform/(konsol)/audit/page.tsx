import { requireOperator } from '@/platform/session'
import { platformAudit } from '@/platform/data'
import { AUDIT_ACTION, AUDIT_COLLECTION, fmtDateTime } from '@/platform/labels'

export const metadata = { title: 'Audit platform' }

export default async function Audit() {
  await requireOperator()
  const rows = await platformAudit(150)
  return (
    <>
      <div className="head">
        <div>
          <h1>Audit platform</h1>
          <p>Riwayat perubahan sekolah, pendaftaran dan akun (150 terbaru). Hanya nama field yang berubah dicatat, bukan isinya.</p>
        </div>
      </div>
      <section className="card">
        {rows.length === 0 ? (
          <p className="empty">Belum ada catatan.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Waktu</th>
                  <th scope="col">Pelaku</th>
                  <th scope="col">Tindakan</th>
                  <th scope="col">Objek</th>
                  <th scope="col">Field berubah</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap small">{fmtDateTime(r.createdAt)}</td>
                    <td className="small">{r.actorEmail ?? 'sistem'}</td>
                    <td className="small">
                      {AUDIT_ACTION[r.action ?? ''] ?? r.action} {AUDIT_COLLECTION[r.collectionSlug ?? ''] ?? r.collectionSlug}
                    </td>
                    <td className="small">{r.docTitle}</td>
                    <td className="small muted">{r.changedFields || '—'}</td>
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
