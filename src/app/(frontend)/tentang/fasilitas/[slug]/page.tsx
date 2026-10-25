import { getSchoolNames } from '@/lib/queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { Detail } from '@/components/content/Detail'
import type { Facility } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await findBySlug<Facility>('facilities', (await params).slug)
  return d ? { title: d.seo?.title ?? d.title, description: d.seo?.description ?? d.excerpt ?? undefined } : {}
}
const AV: Record<string, string> = { available: 'Tersedia', renovation: 'Sedang direnovasi', planned: 'Rencana — belum tersedia' }
export default async function Page({ params }: P) {
  const { short } = await getSchoolNames()
  const d = await findBySlug<Facility>('facilities', (await params).slug)
  if (!d) notFound()
  return (
    <Detail
      doc={d}
      crumbs={[{ label: `Tentang ${short}`, href: '/tentang' }, { label: 'Fasilitas', href: '/tentang/fasilitas' }, { label: d.title }]}
      aside={<div className="aside-card"><dl><dt>Status</dt><dd>{AV[d.availability]}</dd>{d.category ? <><dt>Kategori</dt><dd>{d.category}</dd></> : null}</dl></div>}
    />
  )
}
