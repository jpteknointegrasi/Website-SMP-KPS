import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination, DemoBadge } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import { formatDate } from '@/lib/format'
import type { Album, Media } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Galeri', description: `Album foto kegiatan ${name}.`, alternates: { canonical: '/galeri' } }))
type SP = { searchParams: Promise<{ page?: string }> }

export default async function Page({ searchParams }: SP) {
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const res = await listCollection('albums', { sort: '-eventDate', limit: 12, page, depth: 1 })
  const albums = res.docs as unknown as Album[]
  return (
    <>
      <PageHeader title="Galeri Kegiatan" lead="Dokumentasi kegiatan siswa dan sekolah. Foto ditampilkan sesuai persetujuan publikasi sekolah." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Galeri' }]} />
      <section className="section">
        <Container>
          {albums.length ? (
            <ul className="cards">
              {albums.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/galeri/${a.slug}`} className="album" style={{ ['--i' as string]: i }}>
                    <div className="album__media">
                      <Img media={a.cover as Media} sizes="(min-width: 1024px) 380px, 100vw" alt="" />
                      <span className="album__count">{a.items?.length ?? 0} foto</span>
                    </div>
                    <div className="album__body">
                      {a.eventDate ? <time dateTime={a.eventDate}>{formatDate(a.eventDate)}</time> : null}
                      <h2>{a.title} <DemoBadge show={a.isDemo} /></h2>
                      {a.excerpt ? <p>{a.excerpt}</p> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada album" text="Album foto akan muncul setelah diterbitkan oleh tim sekolah." />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/galeri" />
        </Container>
      </section>
    </>
  )
}
