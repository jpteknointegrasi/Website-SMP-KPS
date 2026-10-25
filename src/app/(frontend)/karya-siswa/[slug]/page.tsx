import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug, getFlags } from '@/lib/queries'
import { Detail } from '@/components/content/Detail'
import type { StudentWork } from '@/payload-types'
import { WORK_CATS } from '@/lib/format'

type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  if (!(await getFlags()).studentWorks) return {}
  const w = await findBySlug<StudentWork>('student-works', (await params).slug, 0)
  if (!w) return {}
  return { title: w.seo?.title ?? w.title, description: w.seo?.description ?? w.excerpt ?? undefined, alternates: { canonical: `/karya-siswa/${w.slug}` } }
}

export default async function Page({ params }: P) {
  if (!(await getFlags()).studentWorks) notFound()
  const w = await findBySlug<StudentWork>('student-works', (await params).slug, 2)
  if (!w) notFound()
  return (
    <Detail
      doc={w}
      crumbs={[{ label: 'Karya Siswa', href: '/karya-siswa' }, { label: w.title }]}
      aside={
        <div className="aside-card">
          <h2>Tentang karya</h2>
          <dl>
            <dt>Kategori</dt>
            <dd>{WORK_CATS[w.category]}</dd>
            {w.year ? (<><dt>Tahun</dt><dd>{w.year}</dd></>) : null}
            {w.creatorsPublic ? (<><dt>Pembuat</dt><dd>{w.creatorsPublic}</dd></>) : null}
            {w.mentorPublic ? (<><dt>Pembimbing</dt><dd>{w.mentorPublic}</dd></>) : null}
          </dl>
        </div>
      }
    />
  )
}
