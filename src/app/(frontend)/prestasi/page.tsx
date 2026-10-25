import Link from 'next/link'
import type { Where } from 'payload'
import { listCollection, findBySlug } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import type { Achievement, Album, Media } from '@/payload-types'

export const metadata = { title: 'Prestasi', description: 'Capaian siswa SMP Nasional KPS yang telah diverifikasi.', alternates: { canonical: '/prestasi' } }
const LEVELS: Record<string, string> = { sekolah: 'Sekolah', kota: 'Kota', provinsi: 'Provinsi', nasional: 'Nasional', internasional: 'Internasional' }
const CATS: Record<string, string> = { akademik: 'Akademik', olahraga: 'Olahraga', seni: 'Seni & Budaya', keagamaan: 'Keagamaan', lainnya: 'Lainnya' }

type SP = { searchParams: Promise<{ tahun?: string; tingkat?: string; kategori?: string; page?: string }> }
export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const and: Where[] = []
  const year = Number(sp.tahun)
  if (year >= 1990 && year <= 2100) and.push({ year: { equals: year } })
  if (sp.tingkat && sp.tingkat in LEVELS) and.push({ level: { equals: sp.tingkat } })
  if (sp.kategori && sp.kategori in CATS) and.push({ category: { equals: sp.kategori } })
  const page = Math.max(1, Number(sp.page) || 1)
  const res = await listCollection('achievements', { where: and.length ? { and } : undefined, sort: '-year', limit: 12, page })
  const items = res.docs as Achievement[]
  const archive = await findBySlug<Album>('albums', 'arsip-apresiasi-siswa-2022', 1)
  const thisYear = new Date().getFullYear()
  return (
    <>
      <PageHeader title="Semangat untuk Berprestasi" lead="Capaian siswa yang dimuat di sini telah diverifikasi dari sumber tertulis." crumbs={[{ label: 'Prestasi' }]} />
      <section className="section">
        <Container>
          <form className="filter-form" method="get">
            <label>Tahun
              <select name="tahun" defaultValue={sp.tahun ?? ''}>
                <option value="">Semua</option>
                {Array.from({ length: 8 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label>Tingkat
              <select name="tingkat" defaultValue={sp.tingkat ?? ''}>
                <option value="">Semua</option>
                {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Kategori
              <select name="kategori" defaultValue={sp.kategori ?? ''}>
                <option value="">Semua</option>
                {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button className="btn btn--teal" type="submit">Terapkan</button>
          </form>
          {items.length ? (
            <ul className="list-rows">
              {items.map((a) => (
                <li key={a.id}>
                  <Link href={`/prestasi/${a.slug}`} className="row-link">
                    <span className="row-meta">{[a.year, a.level && LEVELS[a.level], a.category && CATS[a.category]].filter(Boolean).join(' · ')}</span>
                    <strong>{a.title}</strong>
                    {a.recipientPublic ? <span>{a.recipientPublic}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={and.length ? 'Tidak ada prestasi untuk filter ini' : 'Data prestasi sedang diverifikasi'}
              text={and.length ? 'Coba ubah tahun, tingkat atau kategori.' : 'Sekolah sedang memeriksa rincian lomba, penerima dan peringkat sebelum dipublikasikan. Sementara itu, lihat dokumentasi apresiasi siswa.'}
              action={archive ? { label: 'Lihat arsip dokumentasi', href: `/galeri/${archive.slug}` } : undefined}
            />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/prestasi" params={{ tahun: sp.tahun, tingkat: sp.tingkat, kategori: sp.kategori }} />
          {archive && archive.cover ? (
            <div className="block image-text" style={{ marginTop: 56 }}>
              <div>
                <h2>{archive.title}</h2>
                <p className="muted">{archive.excerpt}</p>
                <Link className="btn btn--ghost" href={`/galeri/${archive.slug}`}>Buka album</Link>
              </div>
              <div className="image-text__media"><Img media={archive.cover as Media} sizes="560px" /></div>
            </div>
          ) : null}
        </Container>
      </section>
    </>
  )
}
