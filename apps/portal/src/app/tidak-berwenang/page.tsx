import Link from 'next/link'
export const metadata = { title: 'Tidak berwenang' }
export default function NoAccess() {
  return (
    <main id="main" className="narrow" style={{ padding: '64px 16px' }}>
      <h1>Anda tidak berwenang membuka halaman ini</h1>
      <p>Halaman ini memerlukan peran tertentu. Bila Anda seharusnya bisa mengaksesnya, minta Admin App sekolah memberikan peran yang sesuai.</p>
      <Link href="/">Kembali ke beranda portal</Link>
    </main>
  )
}
