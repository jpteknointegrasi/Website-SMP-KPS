import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { Detail } from '@/components/content/Detail'
import type { Program } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await findBySlug<Program>('programs', (await params).slug)
  return d ? { title: d.seo?.title ?? d.title, description: d.seo?.description ?? d.excerpt ?? undefined } : {}
}
export default async function Page({ params }: P) {
  const d = await findBySlug<Program>('programs', (await params).slug)
  if (!d) notFound()
  return (
    <Detail doc={d} crumbs={[{ label: 'Pembelajaran', href: '/pembelajaran' }, { label: d.title }]}>
      {d.benefits?.length ? (
        <>
          <h2>Tujuan & manfaat</h2>
          <ul>{d.benefits.map((b) => <li key={b.id}>{b.text}</li>)}</ul>
        </>
      ) : null}
    </Detail>
  )
}
