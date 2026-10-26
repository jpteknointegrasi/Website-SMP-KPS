import { portalEnabled, portalSchool } from '@/lib/context'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Penerimaan Siswa Baru' }

/**
 * M14 admissions (Blueprint §19, §41). The applicant portal is the next module to be built on this foundation; until
 * then this page says so plainly instead of pretending registration is open.
 */
export default async function Pendaftaran() {
  const school = await portalSchool()
  if (!school || !(await portalEnabled())) notFound()
  return (
    <div className="wrap wrap--narrow">
      <p className="eyebrow">Penerimaan Siswa Baru</p>
      <h1>{school.name}</h1>
      <div className="card" role="status">
        <h2>Portal pendaftaran sedang disiapkan</h2>
        <p>Pendaftaran secara daring melalui portal ini belum dibuka. Informasi resmi penerimaan tetap diumumkan di website sekolah.</p>
        <p>
          <a href="/pendaftaran">Lihat informasi pendaftaran di website sekolah</a>
        </p>
      </div>
    </div>
  )
}
