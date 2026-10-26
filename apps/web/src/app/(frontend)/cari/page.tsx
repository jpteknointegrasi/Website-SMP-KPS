import Link from 'next/link'
import type { Metadata } from 'next'
import { search, SEARCH_TYPES } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination } from '@/components/ui/bits'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'Pencarian', robots: { index: false, follow: true } }
type SP = { searchParams: Promise<{ q?: string; type?: string; page?: string }> }

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 80)
  const type = sp.type && sp.type in SEARCH_TYPES ? sp.type : undefined
  const page = Math.max(1, Number(sp.page) || 1)
  const res = q.length >= 2 ? await search(q, type, page) : null
  return (
    <>
      <PageHeader title="Cari informasi" lead="Cari berita, pengumuman, agenda, program dan panduan sekolah." crumbs={[{ label: 'Pencarian' }]} />
      <section className="section">
        <Container>
          <form action="/cari" method="get" className="searchbox" role="search" style={{ marginBottom: 20 }}>
            <label htmlFor="q" className="sr-only">Kata kunci</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Cari informasi sekolah…" minLength={2} maxLength={80} autoComplete="off" />
            {type ? <input type="hidden" name="type" value={type} /> : null}
            <button type="submit" className="btn btn--teal">Cari</button>
          </form>
          {q ? (
            <nav className="filters" aria-label="Jenis konten">
              <Link className="chip" href={`/cari?q=${encodeURIComponent(q)}`} aria-current={!type ? 'true' : undefined}>Semua</Link>
              {Object.entries(SEARCH_TYPES).map(([k, v]) => (
                <Link key={k} className="chip" href={`/cari?q=${encodeURIComponent(q)}&type=${k}`} aria-current={type === k ? 'true' : undefined}>{v.label}</Link>
              ))}
            </nav>
          ) : null}
          {!res ? (
            <p className="muted">{q ? 'Masukkan minimal 2 karakter.' : 'Ketik kata kunci untuk mulai mencari.'}</p>
          ) : res.results.length ? (
            <>
              <p className="muted" role="status">{res.total} hasil untuk “{q}”</p>
              <ul className="search-results">
                {res.results.map((r) => (
                  <li key={r.href}>
                    <Link className="row-link" href={r.href}>
                      <span className="row-meta"><span className="badge">{r.label}</span>{formatDate(r.date)}</span>
                      <strong>{r.title}</strong>
                      {r.excerpt ? <span>{r.excerpt}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination page={page} totalPages={res.totalPages} base="/cari" params={{ q, type }} />
            </>
          ) : (
            <EmptyState title={`Tidak ada hasil untuk “${q}”`} text="Coba kata kunci yang lebih umum, atau jelajahi halaman informasi." action={{ label: 'Halaman informasi', href: '/informasi' }} />
          )}
        </Container>
      </section>
    </>
  )
}
