import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { Detail } from '@/components/content/Detail'
import type { Extracurricular } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await findBySlug<Extracurricular>('extracurriculars', (await params).slug)
  return d ? { title: d.seo?.title ?? d.title, description: d.seo?.description ?? d.excerpt ?? undefined } : {}
}
export default async function Page({ params }: P) {
  const d = await findBySlug<Extracurricular>('extracurriculars', (await params).slug)
  if (!d) notFound()
  const info = [d.mentor && ['Pembina', d.mentor], d.schedule && ['Jadwal', d.schedule]].filter(Boolean) as [string, string][]
  return (
    <Detail
      doc={d}
      crumbs={[{ label: 'Kehidupan Siswa', href: '/kehidupan-siswa' }, { label: d.title }]}
      aside={info.length ? <div className="aside-card"><dl>{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div> : undefined}
    />
  )
}
