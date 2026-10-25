import Link from 'next/link'
import { PageHeader, Container } from '@/components/ui/bits'

export const metadata = { title: 'Informasi', alternates: { canonical: '/informasi' } }
const HUB = [
  ['/berita', 'Berita', 'Cerita kegiatan dan kabar sekolah'],
  ['/pengumuman', 'Pengumuman', 'Informasi resmi yang sedang berlaku'],
  ['/agenda', 'Agenda', 'Kalender kegiatan sekolah (WITA)'],
  ['/galeri', 'Galeri', 'Album foto kegiatan'],
  ['/unduhan', 'Unduhan', 'Dokumen publik, kalender dan formulir'],
  ['/transparansi-bos', 'Transparansi BOS', 'Laporan dana BOS yang disetujui publikasi'],
  ['/panduan', 'Panduan', 'Langkah-langkah layanan sekolah'],
  ['/layanan', 'Layanan', 'Perpustakaan, rapor dan tautan aplikasi'],
]
export default function Page() {
  return (
    <>
      <PageHeader title="Informasi Sekolah" lead="Semua kabar, jadwal dan dokumen publik di satu tempat." crumbs={[{ label: 'Informasi' }]} />
      <section className="section">
        <Container>
          <ul className="hub">
            {HUB.map(([h, t, d]) => (
              <li key={h}><Link href={h}><strong>{t}</strong><span>{d}</span></Link></li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
