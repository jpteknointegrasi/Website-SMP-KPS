import Link from 'next/link'
import { listPosts, listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination } from '@/components/ui/bits'
import { PostCard } from '@/components/sections/home'
import type { Post, Category } from '@/payload-types'

export const metadata = { title: 'Berita', description: 'Cerita dan kabar kegiatan SMP Nasional KPS.', alternates: { canonical: '/berita' } }
type SP = { searchParams: Promise<{ kategori?: string; q?: string; page?: string }> }

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const q = sp.q?.trim().slice(0, 80) || undefined
  const [res, cats] = await Promise.all([listPosts({ page, limit: 9, category: sp.kategori, q }), listCollection('categories', { sort: 'title', limit: 30, depth: 0 })])
  const posts = res.docs as Post[]
  return (
    <>
      <PageHeader title="Cerita dari KPS" lead="Kabar kegiatan, pembelajaran dan kehidupan sekolah." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Berita' }]} />
      <section className="section">
        <Container>
          <form className="filter-form" method="get" role="search">
            <label>Cari berita
              <input type="search" name="q" defaultValue={q} maxLength={80} placeholder="Judul atau kata kunci" />
            </label>
            {sp.kategori ? <input type="hidden" name="kategori" value={sp.kategori} /> : null}
            <button className="btn btn--teal" type="submit">Cari</button>
          </form>
          <nav className="filters" aria-label="Kategori">
            <Link className="chip" href="/berita" aria-current={!sp.kategori ? 'true' : undefined}>Semua</Link>
            {(cats.docs as Category[]).map((c) => (
              <Link key={c.id} className="chip" href={`/berita?kategori=${c.slug}`} aria-current={sp.kategori === c.slug ? 'true' : undefined}>{c.title}</Link>
            ))}
          </nav>
          {posts.length ? (
            <>
              <h2 className="sr-only">Daftar berita</h2>
              <div className="cards">{posts.map((p, i) => <PostCard key={p.id} p={p} i={i} />)}</div>
            </>
          ) : (
            <EmptyState title="Belum ada berita yang cocok" text="Coba kata kunci lain atau lihat semua kategori." action={{ label: 'Semua berita', href: '/berita' }} />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/berita" params={{ kategori: sp.kategori, q }} />
        </Container>
      </section>
    </>
  )
}
