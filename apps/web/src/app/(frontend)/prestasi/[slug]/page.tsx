import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { findBySlug, listPosts } from '@/lib/queries'
import { Detail } from '@/components/content/Detail'
import { formatDate } from '@/lib/format'
import type { Achievement, Post } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await findBySlug<Achievement>('achievements', (await params).slug)
  return d ? { title: d.seo?.title ?? d.title, description: d.seo?.description ?? d.excerpt ?? undefined } : {}
}
export default async function Page({ params }: P) {
  const d = await findBySlug<Achievement>('achievements', (await params).slug)
  if (!d) notFound()
  const news = (await listPosts({ category: 'prestasi', limit: 3 })).docs as Post[]
  const rows = [
    ['Penerima', d.recipientPublic],
    ['Tingkat', d.level],
    ['Kategori', d.category],
    ['Penyelenggara', d.organizer],
    ['Tanggal', d.date ? formatDate(d.date) : d.year],
  ].filter(([, v]) => v) as [string, string][]
  return (
    <Detail
      doc={d}
      crumbs={[{ label: 'Prestasi', href: '/prestasi' }, { label: d.title }]}
      aside={
        <>
          <div className="aside-card"><dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd style={{ textTransform: 'capitalize' }}>{v}</dd></div>)}</dl></div>
          {news.length ? (
            <div className="aside-card">
              <h2>Berita prestasi</h2>
              <ul className="list-plain">{news.map((n) => <li key={n.id}><Link href={`/berita/${n.slug}`}>{n.title}</Link></li>)}</ul>
            </div>
          ) : null}
        </>
      }
    />
  )
}
