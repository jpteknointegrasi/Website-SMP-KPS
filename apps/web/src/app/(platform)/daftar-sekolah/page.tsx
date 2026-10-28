import { notFound } from 'next/navigation'
import { onPlatformHost } from '@/platform/session'
import { ApplicationForm } from './form'

export const metadata = { title: 'Daftarkan sekolah' }

/** Public sign-up for schools (platform address only). Nothing is created until the platform approves. */
export default async function DaftarSekolah() {
  if (!(await onPlatformHost())) notFound()
  return (
    <div className="pub">
      <aside className="pub__aside">
        <div>
          <h2>Bergabung dengan Satu Sekolah</h2>
          <p>Website sekolah dan aplikasi layanan sekolah dalam satu platform. Setiap sekolah punya domain, data, akun dan pengaturannya sendiri.</p>
          <ol>
            <li>Isi formulir ini atas nama sekolah.</li>
            <li>Tim platform meninjau pendaftaran Anda.</li>
            <li>Bila disetujui, Anda menerima tautan untuk mengatur kata sandi akun <b>Admin Teknis</b>.</li>
            <li>Admin Teknis membuat akun staf lain dan mengatur perannya.</li>
          </ol>
        </div>
        <small>Data pendaftaran hanya dipakai untuk meninjau dan menyiapkan layanan sekolah Anda.</small>
      </aside>
      <div className="pub__main">
        <main id="main" className="pub__box" tabIndex={-1}>
          <h1>Daftarkan sekolah</h1>
          <p className="muted">Semua kolom bertanda * wajib diisi.</p>
          <ApplicationForm />
        </main>
      </div>
    </div>
  )
}
