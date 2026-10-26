import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFlags, listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import type { Media, StudentWork } from '@/payload-types'
import { WORK_CATS } from '@/lib/format'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Karya Siswa', description: `Tulisan, seni, sains, teknologi, video dan proyek sosial siswa ${name} — dipublikasikan dengan persetujuan.`, alternates: { canonical: '/karya-siswa' } }))
type SP = { searchParams: Promise<{ kategori?: string; page?: string }> }

export default async function Page({ searchParams }: SP) {
  if (!(await getFlags()).studentWorks) notFound()
  const sp = await searchParams
  const cat = sp.kategori && sp.kategori in WORK_CATS ? sp.kategori : undefined
  const page = Math.max(1, Number(sp.page) || 1)
  const res = await listCollection('student-works', { where: cat ? { category: { equals: cat } } : undefined, sort: '-year', limit: 12, page })
  const items = res.docs as unknown as StudentWork[]
  return (
    <>
      <PageHeader title="Karya Siswa" lead="Karya pilihan yang dikurasi guru dan dipublikasikan dengan persetujuan." crumbs={[{ label: 'Kehidupan Siswa', href: '/kehidupan-siswa' }, { label: 'Karya Siswa' }]} />
      <section className="section">
        <Container>
          <nav className="filters" aria-label="Kategori karya">
            <Link className="chip" href="/karya-siswa" aria-current={!cat ? 'true' : undefined}>Semua</Link>
            {Object.entries(WORK_CATS).map(([k, v]) => (
              <Link key={k} className="chip" href={`/karya-siswa?kategori=${k}`} aria-current={cat === k ? 'true' : undefined}>{v}</Link>
            ))}
          </nav>
          {items.length ? (
            <ul className="cards3">
              {items.map((w) => {
                const cover = w.cover && typeof w.cover === 'object' ? (w.cover as Media) : null
                return (
                  <li key={w.id}>
                    <Link href={`/karya-siswa/${w.slug}`} className="card">
                      {cover ? <span className="card__media"><Img media={cover} sizes="(min-width: 1024px) 380px, 100vw" /></span> : null}
                      <span className="card__body">
                        <span className="tag tag--line">{WORK_CATS[w.category]}{w.year ? ` · ${w.year}` : ''}</span>
                        <strong>{w.title}</strong>
                        {w.excerpt ? <span>{w.excerpt}</span> : null}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState title="Belum ada karya yang dipublikasikan" text="Karya siswa akan tampil setelah dikurasi dan mendapat persetujuan publikasi." action={{ label: 'Lihat kehidupan siswa', href: '/kehidupan-siswa' }} />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/karya-siswa" params={{ kategori: cat }} />
        </Container>
      </section>
    </>
  )
}
