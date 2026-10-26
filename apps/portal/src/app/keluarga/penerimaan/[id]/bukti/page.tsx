import { notFound } from 'next/navigation'
import { accountPage, requestBranding } from '@/server/request'
import { applicationView } from '@/modules/admissions/apply'
import { fmtDate, fmtDateTime } from '@/server/time'
import { PrintButton } from '@/ui/client'
import { P, publicFileUrl } from '@/ui/kit'
import { APP_STATUS } from '@/modules/admissions/fields'

export const metadata = { title: 'Bukti pendaftaran' }

/** Proof of registration (A4, printable). */
export default async function Proof({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const ctx = await accountPage(`/keluarga/penerimaan/${id}/bukti`, 'penerimaan')
  const v = await applicationView(ctx, id).catch(() => notFound())
  if (!v.app.registrationNo) notFound()
  const b = (await requestBranding())!
  return (
    <>
      <div className="no-print row" style={{ marginBottom: 16 }}>
        <PrintButton />
      </div>
      <article className="doc">
        <header className="doc__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicFileUrl(b.logoFileId) ?? `${P}/icon.svg`} alt="" />
          <div>
            <strong>{(b.shortName || ctx.school.name).toUpperCase()}</strong>
            {b.city ? <span>{b.city.toUpperCase()}</span> : null}
            {b.address ? <small>{b.address}</small> : null}
          </div>
        </header>
        <h2 className="doc__title">BUKTI PENDAFTARAN</h2>
        <p className="doc__sub">{v.cycle.name}</p>
        <table className="doc__kv">
          <tbody>
            {[
              ['Nomor pendaftaran', v.app.registrationNo],
              ['Nama calon siswa', v.app.data.fullName],
              ['Tempat, tanggal lahir', `${v.app.data.birthPlace}, ${fmtDate(v.app.data.birthDate)}`],
              ['Sekolah asal', v.app.data.originSchool],
              ['Jalur', v.path.name],
              ['Tingkat tujuan', `${v.cycle.targetGrade} — Tahun Ajaran ${v.cycle.targetYear}`],
              ['Orang tua/wali', `${v.app.data.guardianName} · ${v.app.data.guardianPhone}`],
              ['Waktu pendaftaran', fmtDateTime(v.app.submittedAt, ctx.tz)],
              ['Status saat dicetak', APP_STATUS[v.app.status]],
            ].map(([k, val]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{val || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="doc__h">Langkah berikutnya</h3>
        <p>Pantau status pendaftaran, jadwal seleksi dan hasil melalui portal sekolah menggunakan akun Anda. Hasil tidak diumumkan melalui pencarian nomor pendaftaran.</p>
        {v.cycle.helpContact ? <p>Bantuan: {v.cycle.helpContact}</p> : null}
        <p className="doc__foot">Dicetak dari portal {ctx.school.name} pada {fmtDateTime(ctx.now, ctx.tz)}. Bukti ini bukan surat keputusan penerimaan.</p>
      </article>
    </>
  )
}
