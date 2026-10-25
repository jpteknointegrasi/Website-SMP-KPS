import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findBySlug } from '@/lib/queries'
import { PageHeader, Container, DemoBadge } from '@/components/ui/bits'
import { RichText } from '@/components/ui/RichText'
import { Img } from '@/components/ui/Img'
import { Icon } from '@/components/ui/Icon'
import { Countdown } from '@/components/ui/motion'
import { EVENT_STATUS, formatEventWhen } from '@/lib/format'
import type { Event, Media } from '@/payload-types'

type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const e = await findBySlug<Event>('events', (await params).slug, 0)
  if (!e) return {}
  return { title: e.seo?.title ?? e.title, description: e.seo?.description ?? e.excerpt ?? undefined, alternates: { canonical: `/agenda/${e.slug}` } }
}

export default async function Page({ params }: P) {
  const e = await findBySlug<Event>('events', (await params).slug, 1)
  if (!e) notFound()
  const cover = e.cover && typeof e.cover === 'object' ? (e.cover as Media) : null
  const upcoming = new Date(e.startAt).getTime() > Date.now() && e.eventStatus === 'scheduled'
  const SITE = process.env.NEXT_PUBLIC_SERVER_URL || ''
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    startDate: e.allDay ? e.startAt.slice(0, 10) : e.startAt,
    endDate: e.endAt ?? undefined,
    eventStatus: `https://schema.org/Event${{ scheduled: 'Scheduled', postponed: 'Postponed', cancelled: 'Cancelled', completed: 'Scheduled' }[e.eventStatus]}`,
    location: e.location ? { '@type': 'Place', name: e.location } : undefined,
    organizer: { '@type': 'Organization', name: e.organizer || 'SMP Nasional KPS' },
    url: SITE ? `${SITE}/agenda/${e.slug}` : undefined,
  }
  return (
    <>
      <PageHeader title={e.title} lead={e.excerpt} crumbs={[{ label: 'Agenda', href: '/agenda' }, { label: e.title }]}>
        <div className="article-meta">
          <span>{formatEventWhen(e)}</span>
          <span className={`badge badge--${e.eventStatus}`}>{EVENT_STATUS[e.eventStatus]}</span>
          <DemoBadge show={e.isDemo} />
        </div>
      </PageHeader>
      <section className="section">
        <Container className="layout-2">
          <div>
            {e.eventStatus === 'cancelled' ? <p className="note" role="status">Kegiatan ini dibatalkan.</p> : null}
            {e.eventStatus === 'postponed' ? <p className="note" role="status">Kegiatan ini ditunda. Jadwal baru akan diumumkan.</p> : null}
            {cover ? (
              <figure className="article-cover">
                <Img media={cover} priority sizes="(min-width: 1024px) 860px, 100vw" />
              </figure>
            ) : null}
            <RichText data={e.content} />
          </div>
          <aside>
            <div className="aside-card">
              <h2>Detail kegiatan</h2>
              {upcoming ? (
                <div style={{ marginBottom: 16 }}>
                  <Countdown to={e.startAt} allDay={e.allDay} />
                </div>
              ) : null}
              <dl>
                <dt>Waktu</dt>
                <dd>{formatEventWhen(e)}</dd>
                {e.location ? (<><dt>Lokasi</dt><dd>{e.location}</dd></>) : null}
                {e.organizer ? (<><dt>Penyelenggara</dt><dd>{e.organizer}</dd></>) : null}
              </dl>
              <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                {e.eventStatus !== 'cancelled' ? (
                  <a className="btn btn--teal" href={`/agenda/${e.slug}/ics`} download>
                    <Icon name="calendar" size={18} /> Tambah ke kalender
                  </a>
                ) : null}
                {e.registrationUrl && /^https:\/\//.test(e.registrationUrl) && upcoming ? (
                  <a className="btn btn--gold" href={e.registrationUrl} target="_blank" rel="noopener noreferrer">
                    Daftar kegiatan <span className="sr-only">(membuka tab baru)</span>
                  </a>
                ) : null}
              </div>
            </div>
          </aside>
        </Container>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </>
  )
}
