import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { onPlatformHost } from '@/platform/session'
import { ApplicationForm } from './form'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }
const chosen = async (sp: Props['searchParams']) => {
  const p = (await sp).paket
  return p === 'cms' || p === 'lengkap' ? p : 'gratis'
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: (await chosen(searchParams)) === 'lengkap' ? 'Ajukan demo Paket Lengkap' : 'Daftarkan sekolah' }
}

/**
 * Public sign-up for schools (platform address only). Nothing is created until the platform approves.
 * Website Gratis / Website + CMS = a sign-up; Paket Lengkap (?paket=lengkap) = a demo request.
 */
export default async function DaftarSekolah({ searchParams }: Props) {
  if (!(await onPlatformHost())) notFound()
  const pkg = await chosen(searchParams)
  const demo = pkg === 'lengkap'
  return (
    <div className="pub">
      <aside className="pub__aside">
        <div>
          <h2>{demo ? 'Demo SatuSekolah App' : 'Bergabung dengan SatuSekolah'}</h2>
          <p>
            {demo
              ? 'Paket Lengkap menggabungkan website sekolah dengan SatuSekolah App: penerimaan siswa baru, buku induk, akademik, nilai & rapor, dan layanan keluarga. Kami tunjukkan dulu lewat demo; harga dibahas setelahnya.'
              : 'Website sekolah gratis untuk semua sekolah, dengan domain, data, akun dan pengaturan sekolah sendiri.'}
          </p>
          <ol>
            {demo ? (
              <>
                <li>Isi formulir ini atas nama sekolah.</li>
                <li>Tim SatuSekolah menghubungi Anda untuk menjadwalkan demo.</li>
                <li>Setelah demo, kami kirim penawaran paket dan menyiapkan sekolah Anda.</li>
              </>
            ) : (
              <>
                <li>Isi formulir ini atas nama sekolah.</li>
                <li>Tim SatuSekolah meninjau pendaftaran Anda.</li>
                <li>Bila disetujui, Anda menerima tautan untuk mengatur kata sandi akun <b>Admin Teknis</b>.</li>
                <li>Isi konten website lewat CMS. Pada Website Gratis, CMS dibuka selama 1 bulan pertama.</li>
              </>
            )}
          </ol>
        </div>
        <small>Data pendaftaran hanya dipakai untuk meninjau dan menyiapkan layanan sekolah Anda.</small>
      </aside>
      <div className="pub__main">
        <main id="main" className="pub__box" tabIndex={-1}>
          <h1>{demo ? 'Ajukan demo Paket Lengkap' : 'Daftarkan sekolah'}</h1>
          <p className="muted">Semua kolom bertanda * wajib diisi.</p>
          <ApplicationForm initialPackage={pkg} />
        </main>
      </div>
    </div>
  )
}
