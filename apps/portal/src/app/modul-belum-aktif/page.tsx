import Link from 'next/link'
export const metadata = { title: 'Modul belum aktif' }
export default function ModuleOff() {
  return (
    <main id="main" className="narrow" style={{ padding: '64px 16px' }}>
      <h1>Modul ini belum aktif di sekolah Anda</h1>
      <p>Sekolah mengaktifkan modul secara bertahap sesuai kesiapan. Informasi lebih lanjut dapat ditanyakan ke sekolah.</p>
      <Link href="/">Kembali ke beranda portal</Link>
    </main>
  )
}
