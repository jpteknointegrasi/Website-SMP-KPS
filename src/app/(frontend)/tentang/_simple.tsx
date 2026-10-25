import { findBySlug } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { PageBlocks } from '@/components/content/PageBlocks'
import type { Page } from '@/payload-types'

/** Renders a CMS page by slug, or a helpful empty state when it has not been written yet. */
export async function SimplePage({ slug, fallbackTitle, crumbs, emptyText }: { slug: string; fallbackTitle: string; crumbs: { label: string; href?: string }[]; emptyText: string }) {
  const page = await findBySlug<Page>('pages', slug)
  return (
    <>
      <PageHeader title={page?.title ?? fallbackTitle} lead={page?.excerpt} crumbs={crumbs} />
      <section className="section">
        <Container>
          {page ? <PageBlocks blocks={page.layout} /> : <EmptyState title="Konten belum tersedia" text={emptyText} action={{ label: 'Kembali ke profil', href: '/tentang' }} />}
        </Container>
      </section>
    </>
  )
}
