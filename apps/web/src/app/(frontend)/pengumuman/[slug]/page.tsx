import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findArchivedAnnouncement, findBySlug } from '@/lib/queries'
import { PageHeader, Container, DemoBadge } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { Icon } from '@/components/ui/Icon'
import { AUDIENCE, formatDate } from '@/lib/format'
import type { Announcement, Document } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }
const CAT: Record<string, string> = { umum: 'Umum', akademik: 'Akademik', pendaftaran: 'Pendaftaran', kegiatan: 'Kegiatan' }

/** The announcement, or (detail page only) its archived version: old links stay reachable with a badge. */
async function load(slug: string, depth: number) {
  const a = await findBySlug<Announcement>('announcements', slug, depth)
  if (a) return { a, archived: false }
  const old = await findArchivedAnnouncement(slug)
  return old ? { a: old, archived: true } : null
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await load((await params).slug, 0)
  if (!r) return {}
  const { a, archived } = r
  return { title: a.seo?.title ?? a.title, description: a.seo?.description ?? a.excerpt ?? undefined, alternates: { canonical: `/pengumuman/${a.slug}` }, ...(archived ? { robots: { index: false } } : {}) }
}

export default async function Page({ params }: P) {
  const r = await load((await params).slug, 1)
  if (!r) notFound()
  const { a, archived } = r
  const now = Date.now()
  const ended = archived || Boolean(a.displayEnd && new Date(a.displayEnd).getTime() <= now)
  const files = (a.attachments ?? []).filter((d): d is Document => typeof d === 'object' && Boolean(d?.url))
  return (
    <>
      <PageHeader title={a.title} crumbs={[{ label: 'Pengumuman', href: '/pengumuman' }, { label: a.title }]}>
        <div className="article-meta">
          <span>Terbit {formatDate(a.displayStart)}</span>
          {a.category ? <span>{CAT[a.category]}</span> : null}
          {archived ? <span className="badge badge--ended">Diarsipkan</span> : ended ? <span className="badge badge--ended">Sudah berakhir</span> : <span className="badge">Berlaku</span>}
          <DemoBadge show={a.isDemo} />
        </div>
      </PageHeader>
      <section className="section">
        <Container className="layout-2">
          <div>
            {archived ? (
              <p className="note" role="status">Pengumuman ini sudah diarsipkan dan tidak berlaku lagi. Isinya disimpan sebagai rujukan.</p>
            ) : ended ? (
              <p className="note" role="status">Pengumuman ini sudah berakhir pada {formatDate(a.displayEnd)} dan disimpan sebagai arsip.</p>
            ) : null}
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
