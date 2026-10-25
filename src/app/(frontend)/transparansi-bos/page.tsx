import Link from 'next/link'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { DocumentList } from '@/components/content/DocumentList'
import type { Document } from '@/payload-types'

export const metadata = { title: 'Transparansi BOS', description: 'Laporan penggunaan Dana BOS SMP Nasional KPS yang disetujui untuk publikasi.', alternates: { canonical: '/transparansi-bos' } }
type SP = { searchParams: Promise<{ periode?: string }> }

export default async function Page({ searchParams }: SP) {
  const period = (await searchParams).periode?.slice(0, 12) || undefined
  const all = await listCollection('documents', { where: { category: { equals: 'bos' } }, sort: '-period', limit: 48, depth: 0 })
  const docs = all.docs as unknown as Document[]
  const periods = [...new Set(docs.map((d) => d.period).filter(Boolean) as string[])]
  const shown = period ? docs.filter((d) => d.period === period) : docs
  return (
    <>
      <PageHeader title="Transparansi Dana BOS" lead="Laporan penggunaan Dana Bantuan Operasional Sekolah yang telah disetujui untuk dipublikasikan." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Transparansi BOS' }]} />
      <section className="section">
        <Container>
          {periods.length > 1 ? (
            <nav className="filters" aria-label="Periode laporan">
              <Link className="chip" href="/transparansi-bos" aria-current={!period ? 'true' : undefined}>Semua periode</Link>
              {periods.map((p) => (
                <Link key={p} className="chip" href={`/transparansi-bos?periode=${encodeURIComponent(p)}`} aria-current={period === p ? 'true' : undefined}>{p}</Link>
              ))}
            </nav>
          ) : null}
          {shown.length ? (
            <DocumentList docs={shown} />
          ) : (
            <EmptyState title="Laporan belum diterbitkan" text="Dokumen BOS akan tampil di sini setelah disetujui untuk publikasi oleh sekolah. Untuk pertanyaan, silakan hubungi sekolah." action={{ label: 'Hubungi sekolah', href: '/kontak' }} />
          )}
        </Container>
      </section>
    </>
  )
}
