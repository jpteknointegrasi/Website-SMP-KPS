import Link from 'next/link'
import { listAnnouncements } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination, DemoBadge } from '@/components/ui/bits'
import { AUDIENCE, formatDate } from '@/lib/format'
import type { Announcement } from '@/payload-types'

export const metadata = { title: 'Pengumuman', description: 'Informasi resmi SMP Nasional KPS yang sedang berlaku dan arsipnya.', alternates: { canonical: '/pengumuman' } }
type SP = { searchParams: Promise<{ arsip?: string; page?: string }> }


export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const archive = sp.arsip === '1'
  const page = Math.max(1, Number(sp.page) || 1)
  const res = await listAnnouncements({ active: !archive, page, limit: 10 })
  const items = res.docs as Announcement[]
  return (
    <>
      <PageHeader title="Pengumuman Sekolah" lead="Informasi resmi yang sedang berlaku. Pengumuman yang sudah lewat periode tampil tersimpan di arsip." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Pengumuman' }]} />
      <section className="section">
        <Container>
          <nav className="filters" aria-label="Status pengumuman">
            <Link className="chip" href="/pengumuman" aria-current={!archive ? 'true' : undefined}>Sedang berlaku</Link>
            <Link className="chip" href="/pengumuman?arsip=1" aria-current={archive ? 'true' : undefined}>Arsip</Link>
          </nav>
          {items.length ? (
            <ul className="list-rows">
              {items.map((a) => (
                <li key={a.id}>
                  <Link href={`/pengumuman/${a.slug}`} className="row-link">
                    <span className="row-meta">
                      {formatDate(a.displayStart)}
                      {(a.audience ?? []).map((x) => <span key={x} className="badge">{AUDIENCE[x]}</span>)}
                      {archive ? <span className="badge badge--ended">Sudah berakhir</span> : null}
                      <DemoBadge show={a.isDemo} />
                    </span>
                    <strong>{a.title}</strong>
                    {a.excerpt ? <span>{a.excerpt}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={archive ? 'Arsip masih kosong' : 'Belum ada pengumuman aktif'}
              text={archive ? 'Pengumuman yang sudah berakhir akan tersimpan di sini.' : 'Saat ini tidak ada pengumuman yang sedang berlaku. Lihat agenda atau berita terbaru.'}
              action={archive ? { label: 'Pengumuman aktif', href: '/pengumuman' } : { label: 'Lihat agenda', href: '/agenda' }}
            />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/pengumuman" params={{ arsip: archive ? '1' : undefined }} />
        </Container>
      </section>
    </>
  )
}
