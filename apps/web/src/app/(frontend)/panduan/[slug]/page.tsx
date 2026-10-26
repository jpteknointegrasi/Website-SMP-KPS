import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { PageHeader, Container, DemoBadge } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { DocumentList } from '@/components/content/DocumentList'
import { formatDate } from '@/lib/format'
import type { Guide, Document } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const g = await findBySlug<Guide>('guides', (await params).slug, 0)
  if (!g) return {}
  return { title: g.title, description: g.excerpt ?? undefined, alternates: { canonical: `/panduan/${g.slug}` } }
}

export default async function Page({ params }: P) {
  const g = await findBySlug<Guide>('guides', (await params).slug, 1)
  if (!g) notFound()
  const files = (g.attachments ?? []).filter((d): d is Document => typeof d === 'object' && Boolean(d?.url))
  return (
    <>
      <PageHeader title={g.title} lead={g.excerpt} crumbs={[{ label: 'Panduan', href: '/panduan' }, { label: g.title }]}>
        <div className="article-meta">
          {g.category ? <span>{g.category}</span> : null}
          {g.lastReviewedAt ? <span>Terakhir ditinjau {formatDate(g.lastReviewedAt)}</span> : null}
          <DemoBadge show={g.isDemo} />
        </div>
      </PageHeader>
      <section className="section">
        <Container>
          <div className="prose">
            {g.steps?.length ? (
              <>
                <h2>Langkah-langkah</h2>
                <ol className="steps">
                  {g.steps.map((s) => (
                    <li key={s.id ?? s.title}>
                      <div>
                        <h3>{s.title}</h3>
                        {s.detail ? <p>{s.detail}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>
          <RichText data={g.content} />
          {files.length ? (
            <>
              <h2>Lampiran</h2>
              <DocumentList docs={files} />
            </>
          ) : null}
        </Container>
      </section>
    </>
  )
}
