import Link from 'next/link'
import { Container } from '@/components/ui/bits'
import { Icon } from '@/components/ui/Icon'

export default function NotFound() {
  const links = [
    ['/', 'Beranda'],
    ['/berita', 'Berita'],
    ['/pengumuman', 'Pengumuman'],
    ['/agenda', 'Agenda'],
    ['/pendaftaran', 'Pendaftaran'],
    ['/kontak', 'Kontak'],
  ]
  return (
    <section className="section notfound">
      <Container>
        <div className="notfound__hex" aria-hidden="true">404</div>
        <h1>Halaman tidak ditemukan</h1>
        <p className="lead">Halaman yang Anda cari mungkin sudah dipindahkan dari website lama, atau alamatnya keliru.</p>
        <form action="/cari" method="get" className="searchbox" role="search">
          <Icon name="search" />
          <label htmlFor="nf-q" className="sr-only">Cari informasi</label>
          <input id="nf-q" name="q" type="search" placeholder="Cari informasi sekolah…" minLength={2} maxLength={80} />
          <button type="submit" className="btn btn--teal">Cari</button>
        </form>
        <nav aria-label="Tautan penting" className="filters" style={{ justifyContent: 'center', marginTop: 24 }}>
          {links.map(([h, l]) => <Link key={h} className="chip" href={h}>{l}</Link>)}
        </nav>
      </Container>
    </section>
  )
}
