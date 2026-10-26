import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import type { Where } from 'payload'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination } from '@/components/ui/bits'
import { DOC_CATEGORY, DocumentList } from '@/components/content/DocumentList'
import type { Document } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Unduhan', description: `Dokumen publik ${name}: kalender, panduan, e-buletin dan laporan.`, alternates: { canonical: '/unduhan' } }))
type SP = { searchParams: Promise<{ kategori?: string; periode?: string; page?: string }> }

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const cat = sp.kategori && sp.kategori in DOC_CATEGORY ? sp.kategori : undefined
  const period = sp.periode?.slice(0, 12) || undefined
  const page = Math.max(1, Number(sp.page) || 1)
  const and: Where[] = []
  if (cat) and.push({ category: { equals: cat } })
  if (period) and.push({ period: { equals: period } })
  const res = await listCollection('documents', { where: and.length ? { and } : undefined, sort: '-publishedAt', limit: 15, page, depth: 0 })
  const docs = res.docs as unknown as Document[]
  return (
    <>
      <PageHeader title="Unduhan Dokumen" lead="Dokumen publik yang sudah disetujui sekolah, lengkap dengan periode dan versi." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Unduhan' }]} />
      <section className="section">
        <Container>
          <nav className="filters" aria-label="Kategori dokumen">
            <Link className="chip" href="/unduhan" aria-current={!cat ? 'true' : undefined}>Semua</Link>
            {Object.entries(DOC_CATEGORY).map(([k, v]) => (
              <Link key={k} className="chip" href={k === 'bos' ? '/transparansi-bos' : `/unduhan?kategori=${k}`} aria-current={cat === k ? 'true' : undefined}>{v}</Link>
            ))}
          </nav>
          {period ? <p className="muted">Periode: <strong>{period}</strong> · <Link href={cat ? `/unduhan?kategori=${cat}` : '/unduhan'}>hapus filter</Link></p> : null}
          {docs.length ? <DocumentList docs={docs} /> : <EmptyState title="Belum ada dokumen" text="Dokumen publik akan tersedia di sini setelah disetujui dan diterbitkan sekolah." action={{ label: 'Hubungi sekolah', href: '/kontak' }} />}
          <Pagination page={page} totalPages={res.totalPages} base="/unduhan" params={{ kategori: cat, periode: period }} />
        </Container>
      </section>
    </>
  )
}
