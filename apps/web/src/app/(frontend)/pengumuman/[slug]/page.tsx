import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { PageHeader, Container, DemoBadge } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { Icon } from '@/components/ui/Icon'
import { AUDIENCE, formatDate } from '@/lib/format'
import type { Announcement, Document } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }
const CAT: Record<string, string> = { umum: 'Umum', akademik: 'Akademik', pendaftaran: 'Pendaftaran', kegiatan: 'Kegiatan' }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await findBySlug<Announcement>('announcements', (await params).slug, 0)
  if (!a) return {}
  return { title: a.seo?.title ?? a.title, description: a.seo?.description ?? a.excerpt ?? undefined, alternates: { canonical: `/pengumuman/${a.slug}` } }
}

export default async function Page({ params }: P) {
  const a = await findBySlug<Announcement>('announcements', (await params).slug, 1)
  if (!a) notFound()
  const now = Date.now()
  const ended = Boolean(a.displayEnd && new Date(a.displayEnd).getTime() <= now)
  const files = (a.attachments ?? []).filter((d): d is Document => typeof d === 'object' && Boolean(d?.url))
  return (
    <>
      <PageHeader title={a.title} crumbs={[{ label: 'Pengumuman', href: '/pengumuman' }, { label: a.title }]}>
        <div className="article-meta">
          <span>Terbit {formatDate(a.displayStart)}</span>
          {a.category ? <span>{CAT[a.category]}</span> : null}
          {ended ? <span className="badge badge--ended">Sudah berakhir</span> : <span className="badge">Berlaku</span>}
          <DemoBadge show={a.isDemo} />
        </div>
      </PageHeader>
      <section className="section">
        <Container className="layout-2">
          <div>
            {ended ? <p className="note" role="status">Pengumuman ini sudah berakhir pada {formatDate(a.displayEnd)} dan disimpan sebagai arsip.</p> : null}
            {a.excerpt ? <p className="lead">{a.excerpt}</p> : null}
            <RichText data={a.content} />
            {files.length ? (
              <>
                <h2>Lampiran</h2>
                <ul className="list-rows">
                  {files.map((f) => (
                    <li key={f.id}>
                      <a className="row-link" href={f.url!} download>
                        <strong><Icon name="download" size={18} /> {f.title}</strong>
                        <span>{[f.version && `Versi ${f.version}`, f.filesize && `${Math.round(f.filesize / 1024)} KB`].filter(Boolean).join(' · ')}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <aside>
            <div className="aside-card">
              <h2>Ringkasan</h2>
              <dl>
                <dt>Sasaran</dt>
                <dd>{(a.audience ?? ['umum']).map((x) => AUDIENCE[x]).join(', ')}</dd>
                <dt>Berlaku</dt>
                <dd>
                  {formatDate(a.displayStart)}
                  {a.displayEnd ? ` – ${formatDate(a.displayEnd)}` : ' (sampai diumumkan lain)'}
                </dd>
                {a.contact ? (
                  <>
                    <dt>Kontak terkait</dt>
                    <dd>{a.contact}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          </aside>
        </Container>
      </section>
    </>
  )
}
