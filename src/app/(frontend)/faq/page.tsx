import Link from 'next/link'
import { listFaqs } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { FaqList } from '@/components/content/FaqList'
import { FAQ_CATEGORIES } from '@/collections/extra'
import type { Faq } from '@/payload-types'

export const metadata = { title: 'Pertanyaan Umum (FAQ)', description: 'Jawaban resmi atas pertanyaan seputar pendaftaran, pembelajaran, kegiatan, administrasi dan penggunaan website SMP Nasional KPS.', alternates: { canonical: '/faq' } }
type SP = { searchParams: Promise<{ kategori?: string; q?: string }> }

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const cat = FAQ_CATEGORIES.find((c) => c.value === sp.kategori)?.value
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 80) : ''
  const items = (await listFaqs({ category: cat, q: q.length >= 2 ? q : undefined })) as Faq[]
  const grouped = FAQ_CATEGORIES.map((c) => ({ ...c, items: items.filter((f) => f.category === c.value) })).filter((g) => g.items.length)
  return (
    <>
      <PageHeader title="Pertanyaan Umum" lead="Jawaban resmi dari sekolah. Bila pertanyaan Anda belum ada, kirimkan lewat halaman kontak." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'FAQ' }]} />
      <section className="section">
        <Container>
          <form className="searchbox" role="search" action="/faq" method="get">
            <label htmlFor="faq-q" className="sr-only">Cari pertanyaan</label>
            <input id="faq-q" name="q" type="search" defaultValue={q} placeholder="Cari pertanyaan…" maxLength={80} />
            {cat ? <input type="hidden" name="kategori" value={cat} /> : null}
            <button className="btn btn--teal" type="submit">Cari</button>
          </form>
          <nav className="filters" aria-label="Kategori FAQ">
            <Link className="chip" href={q ? `/faq?q=${encodeURIComponent(q)}` : '/faq'} aria-current={!cat ? 'true' : undefined}>Semua</Link>
            {FAQ_CATEGORIES.map((c) => (
              <Link key={c.value} className="chip" href={`/faq?kategori=${c.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`} aria-current={cat === c.value ? 'true' : undefined}>{c.label}</Link>
            ))}
          </nav>
          {grouped.length ? (
            grouped.map((g) => (
              <div key={g.value} className="block faq">
                <h2>{g.label}</h2>
                <FaqList items={g.items} />
              </div>
            ))
          ) : (
            <EmptyState
              title={q ? 'Pertanyaan tidak ditemukan' : 'Belum ada FAQ'}
              text="Belum ada jawaban resmi untuk pencarian ini. Kirimkan pertanyaan Anda — petugas sekolah akan membalas."
              action={{ label: 'Kirim pertanyaan', href: `/kontak${cat === 'pendaftaran' ? '?kategori=pendaftaran' : ''}` }}
            />
          )}
          <p className="muted" style={{ marginTop: 28 }}>Tidak menemukan jawaban? <Link href="/kontak">Hubungi sekolah</Link>.</p>
        </Container>
      </section>
    </>
  )
}
