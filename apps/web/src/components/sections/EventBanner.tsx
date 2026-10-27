import Link from 'next/link'
import { Container } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import { Icon } from '@/components/ui/Icon'
import { Countdown } from '@/components/ui/motion'
import { formatTime } from '@/lib/format'
import type { Document, Event, EventCategory, Media } from '@/payload-types'

const TZ = 'Asia/Makassar'
const part = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, ...o }).format(new Date(iso))

/** Big date block + key facts of an event, shared by the homepage banner and the alumni page. */
export const EventFacts = ({ e }: { e: Event }) => (
  <div className="evb-facts">
    <div className="evb-date" aria-hidden="true">
      <span>{part(e.startAt, { weekday: 'long' })},</span>
      <b>{part(e.startAt, { day: 'numeric' })}</b>
      <small>{part(e.startAt, { month: 'long', year: 'numeric' })}</small>
    </div>
    <dl className="evb-meta">
      <div>
        <dt className="sr-only">Waktu</dt>
        <dd>
          <Icon name="clock" size={18} />
          <span className="sr-only">{part(e.startAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, </span>
          {e.allDay ? 'Sepanjang hari' : `${formatTime(e.startAt)}${e.endAt ? ` – ${formatTime(e.endAt)}` : ''} WITA`}
        </dd>
      </div>
      {e.location ? (
        <div>
          <dt className="sr-only">Lokasi</dt>
          <dd><Icon name="pin" size={18} />{e.location}</dd>
        </div>
      ) : null}
      {e.dressCode ? (
        <div>
          <dt className="sr-only">Pakaian</dt>
          <dd><Icon name="sparkle" size={18} />Pakaian: {e.dressCode}</dd>
        </div>
      ) : null}
    </dl>
  </div>
)

export const eventInvitation = (e: Event) =>
  (e.attachments ?? []).find((d): d is Document => typeof d === 'object' && d !== null && Boolean(d.url)) ?? null

/** Homepage banner for one highlighted event (Agenda → "Tampilkan sebagai banner di beranda"). */
export const EventBanner = ({ e }: { e: Event }) => {
  const cover = e.cover && typeof e.cover === 'object' ? (e.cover as Media) : null
  const cat = e.category && typeof e.category === 'object' ? (e.category as EventCategory) : null
  const doc = eventInvitation(e)
  const upcoming = new Date(e.startAt).getTime() > Date.now() && e.eventStatus === 'scheduled'
  return (
    <section className="evb" aria-labelledby={`evb-${e.id}`}>
      <Container>
        <div className={`evb__card ${cover ? '' : 'evb__card--noimg'}`}>
          <div className="evb__body">
            <p className="evb__eyebrow">
              {e.eventStatus === 'postponed' ? 'Ditunda · ' : ''}
              {cat?.title ? `Agenda ${cat.title}` : 'Agenda sekolah'}
            </p>
            <h2 id={`evb-${e.id}`} className="evb__title">{e.title}</h2>
            {e.excerpt ? <p className="evb__lead">{e.excerpt}</p> : null}
            <EventFacts e={e} />
            {upcoming ? (
              <div className="evb__count">
                <Countdown to={e.startAt} allDay={e.allDay} />
              </div>
            ) : null}
            <div className="evb__actions">
              <Link className="btn btn--gold" href={`/agenda/${e.slug}`} data-cta="banner-acara">
                Detail &amp; rundown <Icon name="arrow" size={18} />
              </Link>
              {doc ? (
                <a className="btn btn--line" href={doc.url!} download={doc.originalFilename ?? undefined} data-cta="banner-undangan">
                  <Icon name="download" size={18} /> Unduh undangan
                </a>
              ) : null}
              {e.registrationUrl && /^https:\/\//.test(e.registrationUrl) && upcoming ? (
                <a className="btn btn--line" href={e.registrationUrl} target="_blank" rel="noopener noreferrer">
                  Konfirmasi kehadiran <span className="sr-only">(membuka tab baru)</span>
                </a>
              ) : null}
            </div>
          </div>
          {cover ? (
            <Link href={`/agenda/${e.slug}`} className="evb__poster" tabIndex={-1} aria-hidden="true">
              <Img media={cover} sizes="(min-width: 1024px) 340px, 80vw" alt="" />
            </Link>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
