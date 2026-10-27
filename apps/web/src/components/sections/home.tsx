import { requestTimezone } from '@/lib/tz'
import Link from 'next/link'
import React from 'react'
import { MediaCard, MediaEmbed } from '../media/MediaCard'
import type { Homepage, Media, Post, Announcement, Event, Program, Extracurricular, Achievement, Facility, Album, SiteSetting, AdmissionsCycle, MediaItem, SocialAccount } from '@/payload-types'
import { Img } from '../ui/Img'
import { Icon } from '../ui/Icon'
import { DemoBadge, SmartLink } from '../ui/bits'
import { Countdown, HexField, LiveClock, Parallax, Reveal } from '../ui/motion'
import { CountOnView } from '../ui/fx'
import { HeroSlides } from '../ui/HeroSlides'
import { EVENT_STATUS, dayParts, formatDate, formatEventWhen } from '@/lib/format'

const m = (v: unknown) => (v && typeof v === 'object' ? (v as Media) : null)

/* ---------- shared bits ---------- */
export const Eyebrow = ({ children, light = false }: { children?: React.ReactNode; light?: boolean }) =>
  children ? <p className={`eyebrow ${light ? 'eyebrow--light' : ''}`}>{children}</p> : null

const MoreLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="more-link">
    {children}
    <Icon name="arrow" size={16} />
  </Link>
)

const Head = ({ eyebrow, title, id, aside }: { eyebrow?: string | null; title?: string | null; id?: string; aside?: React.ReactNode }) => (
  <div className="section__head">
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="h2" id={id}>{title}</h2>
    </div>
    {aside}
  </div>
)

/* ---------- 02 priority ---------- */
export const PriorityStrip = ({ a }: { a: Announcement | null }) =>
  a ? (
    <div className="priority" role="region" aria-label="Informasi penting">
      <div className="container priority__inner">
        <span className="priority__icon" aria-hidden="true">
          <Icon name="megaphone" size={18} />
        </span>
        <span className="sr-only">Penting:</span>
        <p>{a.title}</p>
        <span className="priority__sep" aria-hidden="true" />
        <Link href={`/pengumuman/${a.slug}`} className="priority__link">
          Lihat informasi <span className="sr-only">: {a.title}</span>
          <Icon name="arrow" size={15} />
        </Link>
      </div>
    </div>
  ) : null

/* ---------- 03 hero ---------- */
export const Hero = ({ hero: heroIn, settings }: { hero?: Homepage['hero'] | null; settings: SiteSetting }) => {
  // Empty database (fresh install): fall back to safe defaults instead of crashing.
  const hero = (heroIn ?? {}) as Homepage['hero']
  const words = (hero.title || settings.schoolName || '').split(' ')
  const img = m(hero.image)
  const mobile = m(hero.imageMobile)
  const slides = ((hero.slides ?? []).map(m).filter((s) => s?.url) as Media[])
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__photo">
        {slides.length > 1 ? (
          <HeroSlides slides={slides} interval={hero.slideInterval ?? 6} />
        ) : (
          <picture>
            {mobile?.url ? <source media="(max-width: 767px)" srcSet={mobile.sizes?.card?.url ?? mobile.url} /> : null}
            <Img media={slides[0] ?? img} priority sizes="(min-width: 1024px) 64vw, 100vw" className="hero__img" />
          </picture>
        )}
      </div>
      <HexField className="hero__hex" cols={12} rows={8} />
      <div className="container hero__inner">
        <div className="hero__copy">
          {hero.showLiveClock ? <LiveClock city={settings.city} tz={requestTimezone()} /> : null}
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 id="hero-title" className="hero__title">
            {words.map((w, i) => (
              <React.Fragment key={i}>
                <span className="hero__word" style={{ ['--i' as string]: i }}>
                  {w}
                </span>{' '}
              </React.Fragment>
            ))}
          </h1>
          {hero.description ? <p className="hero__lead">{hero.description}</p> : null}
          <div className="hero__actions">
            {hero.primaryHref && hero.primaryLabel ? (
              <SmartLink href={hero.primaryHref} className="btn btn--teal" data-fx="magnet">
                {hero.primaryLabel} <Icon name="arrow" size={17} />
              </SmartLink>
            ) : null}
            {hero.secondaryHref && hero.secondaryLabel ? (
              <SmartLink href={hero.secondaryHref} className="btn btn--outline" data-fx="magnet">
                {hero.secondaryLabel}
              </SmartLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 05 search (overlaps hero bottom-right on desktop) ---------- */
export const SearchBand = () => (
  <div className="searchband" role="search" aria-label="Pencarian">
    <div className="container searchband__inner">
      <form action="/cari" method="get" className="searchbox searchbox--compact">
        <label htmlFor="home-q" className="sr-only">
          Cari informasi sekolah
        </label>
        <Icon name="search" size={19} />
        <input id="home-q" name="q" type="search" placeholder="Cari informasi sekolah…" minLength={2} maxLength={80} autoComplete="off" />
        <button type="submit" className="searchbox__btn" aria-label="Cari">
          <Icon name="arrow" size={18} />
        </button>
      </form>
    </div>
  </div>
)

/* ---------- 04 quick links ---------- */
export const QuickLinks = ({ links }: { links: Homepage['quickLinks'] }) =>
  links?.length ? (
    <section className="quick" aria-label="Akses cepat" id="beranda-lanjut">
      <div className="container">
        <ul className="quick__grid">
          {links.map((l, i) => (
            <li key={l.href + l.label} style={{ ['--i' as string]: i }}>
              <SmartLink href={l.href} className="quick__item" data-fx="tilt">
                <span className="quick__icon">
                  <Icon name={l.icon ?? 'link'} size={30} />
                </span>
                <span className="quick__label">{l.label}</span>
              </SmartLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  ) : null

/* ---------- 06 intro ---------- */
const PILLAR_ICON = ['heart', 'leaf', 'flag']
export const SchoolIntro = ({ intro }: { intro: Homepage['intro'] }) => {
  const small = (intro?.collage ?? []).map(m).filter(Boolean) as Media[]
  return (
    <section className="section intro">
      <div className="container intro__grid">
        <Reveal className={`collage collage--${small.length}`}>
          <div className="collage__main">
            <Img media={m(intro?.introImage)} sizes="(min-width: 1024px) 420px, 66vw" />
          </div>
          {small.map((s, i) => (
            <div key={s.id} className="collage__small" style={{ ['--i' as string]: i + 1 }}>
              <Img media={s} sizes="(min-width: 1024px) 220px, 33vw" />
            </div>
          ))}
        </Reveal>
        <Reveal className="intro__copy">
          <Eyebrow>{intro?.eyebrow}</Eyebrow>
          <h2 className="h2">{intro?.heading}</h2>
          {intro?.text ? <p className="intro__text">{intro.text}</p> : null}
          {intro?.pillars?.length ? (
            <ul className="pills">
              {intro.pillars.map((p, i) => (
                <li key={p.title} title={p.text ?? undefined}>
                  <span className={`pills__icon pills__icon--${i}`} aria-hidden="true">
                    <Icon name={PILLAR_ICON[i] ?? 'sparkle'} size={18} />
                  </span>
                  {p.title}
                </li>
              ))}
            </ul>
          ) : null}
          <MoreLink href="/tentang">Tentang sekolah</MoreLink>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 07 programs ---------- */
export const HexPlaceholder = ({ seed = 0 }: { seed?: number }) => (
  <div className={`hexph hexph--${seed % 3}`} aria-hidden="true">
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 18 }).map((_, k) => {
        const col = k % 6
        const row = Math.floor(k / 6)
        return <polygon key={k} transform={`translate(${col * 21 + (row % 2) * 10.5} ${row * 18 + 10})`} points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" />
      })}
    </svg>
  </div>
)

export const Programs = ({ eyebrow, heading, intro, items }: { eyebrow?: string | null; heading?: string | null; intro?: string | null; items: Program[] }) =>
  items.length ? (
    <section className="section section--ivory">
      <div className="container">
        <Head eyebrow={eyebrow} title={heading} aside={intro ? <p className="section__intro">{intro}</p> : <MoreLink href="/pembelajaran">Semua program</MoreLink>} />
        <Reveal as="ul" className="cards3">
          {items.map((p, i) => (
            <li key={p.id} style={{ ['--i' as string]: i }}>
              <Link href={`/pembelajaran/${p.slug}`} className="card" data-fx="tilt">
                <div className="card__media">{m(p.cover) ? <Img media={m(p.cover)} sizes="(min-width: 1024px) 380px, 100vw" /> : <HexPlaceholder seed={i} />}</div>
                <div className="card__body">
                  <h3>
                    {p.title} <DemoBadge show={p.isDemo} />
                  </h3>
                  {p.excerpt ? <p>{p.excerpt}</p> : null}
                </div>
              </Link>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  ) : null

/* ---------- 08 student life ---------- */
export const StudentLife = ({ eyebrow, heading, items }: { eyebrow?: string | null; heading?: string | null; items: Extracurricular[] }) =>
  items.length ? (
    <section className="section life">
      <div className="container">
        <Head eyebrow={eyebrow} title={heading} aside={<MoreLink href="/kehidupan-siswa">Jelajahi kehidupan siswa</MoreLink>} />
        <Reveal as="ul" className="tiles">
          {items.map((e, i) => (
            <li key={e.id} style={{ ['--i' as string]: i }}>
              <Link href={`/ekstrakurikuler/${e.slug}`} className="ptile" data-fx="tilt">
                <span className="ptile__media">
                  {m(e.cover) ? <Img media={m(e.cover)} sizes="(min-width: 1024px) 290px, 50vw" /> : <HexPlaceholder seed={i} />}
                </span>
                <span className="ptile__label">
                  {e.title} <DemoBadge show={e.isDemo} />
                </span>
              </Link>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  ) : null

/* ---------- 09 achievements ---------- */
export const Achievements = ({ eyebrow, heading, text, featured, archive }: { eyebrow?: string | null; heading?: string | null; text?: string | null; featured: Achievement[]; archive: Album | null }) => {
  const photo = featured.map((a) => m(a.cover)).find(Boolean) ?? m(archive?.cover) ?? m(archive?.items?.[0]?.media)
  return (
    <section className="achv" aria-labelledby="achv-title">
      <HexField className="achv__hex" cols={18} rows={6} />
      <div className="container achv__grid">
        <div className="achv__copy">
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h2 id="achv-title" className="h2">
            {heading}
          </h2>
          {text ? <p className="achv__text">{text}</p> : null}
          {featured.length ? (
            <ul className="achv__list">
              {featured.map((a) => (
                <li key={a.id}>
                  <Link href={`/prestasi/${a.slug}`}>
                    <strong>{a.title}</strong>
                    <span>{[a.level, a.year, a.organizer].filter(Boolean).join(' · ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link className="btn btn--gold" href="/prestasi" data-fx="magnet">
            Jelajahi Prestasi <Icon name="arrow" size={17} />
          </Link>
        </div>
        {photo ? (
          <Parallax depth={10} className="achv__photo">
            <Img media={photo} sizes="(min-width: 1024px) 560px, 100vw" />
          </Parallax>
        ) : null}
      </div>
    </section>
  )
}

/* ---------- 10 announcements + agenda ---------- */
const ANN_CAT: Record<string, string> = { umum: 'Umum', akademik: 'Akademik', pendaftaran: 'Pendaftaran', kegiatan: 'Kegiatan' }

export const AnnouncementsAgenda = ({ eyebrow, announcements, events }: { eyebrow?: string | null; announcements: Announcement[]; events: Event[] }) => {
  const next = events.find((e) => e.eventStatus === 'scheduled')
  return (
    <section className="section">
      <div className="container aa">
        <div>
          <Head eyebrow={eyebrow} title="Pengumuman Sekolah" aside={<MoreLink href="/pengumuman">Semua pengumuman</MoreLink>} />
          {announcements.length ? (
            <Reveal as="ul" className="ann-list">
              {announcements.map((a, i) => (
                <li key={a.id} style={{ ['--i' as string]: i }}>
                  <Link href={`/pengumuman/${a.slug}`} className="ann">
                    <span className="ann__icon" aria-hidden="true">
                      <Icon name="megaphone" size={20} />
                    </span>
                    <span className="ann__tag">{a.isDemo ? 'Contoh konten' : (ANN_CAT[a.category ?? ''] ?? formatDate(a.displayStart))}</span>
                    <span className="ann__body">
                      <strong>{a.title}</strong>
                      {a.excerpt ? <span>{a.excerpt}</span> : null}
                    </span>
                    <Icon name="chevron" size={18} className="ann__chev" />
                  </Link>
                </li>
              ))}
            </Reveal>
          ) : (
            <p className="muted">Belum ada pengumuman aktif saat ini.</p>
          )}
        </div>
        <aside className="agenda-card" aria-labelledby="agenda-title">
          <div className="agenda-card__head">
            <span className="agenda-card__icon" aria-hidden="true">
              <Icon name="calendar" size={22} />
            </span>
            <h2 id="agenda-title">Agenda Terdekat</h2>
          </div>
          {next ? (
            <div className="agenda-card__next">
              <span>Kegiatan berikutnya</span>
              <Countdown to={next.startAt} allDay={next.allDay} />
            </div>
          ) : null}
          {events.length ? (
            <ul className="agenda-card__list">
              {events.map((e) => {
                const d = dayParts(e.startAt)
                return (
                  <li key={e.id}>
                    <Link href={`/agenda/${e.slug}`} className={`ev ev--${e.eventStatus}`}>
                      <span className="ev__date">
                        <b>{d.day}</b>
                        <small>{d.month}</small>
                      </span>
                      <span className="ev__body">
                        <strong>{e.title}</strong>
                        <span>{formatEventWhen(e)}</span>
                        {e.eventStatus !== 'scheduled' ? <span className={`badge badge--${e.eventStatus}`}>{EVENT_STATUS[e.eventStatus ?? 'scheduled']}</span> : null}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="agenda-card__empty">Belum ada agenda mendatang yang diumumkan.</p>
          )}
          <p className="agenda-card__foot">
            Jadwal mengikuti pengumuman resmi. <Link href="/agenda">Lihat kalender</Link>
          </p>
        </aside>
      </div>
    </section>
  )
}

/* ---------- 11 news ---------- */
export const PostCard = ({ p, i = 0 }: { p: Post; i?: number; big?: boolean }) => (
  <article className="post-card" style={{ ['--i' as string]: i }}>
    <Link href={`/berita/${p.slug}`} className="card" data-fx="tilt">
      <div className="card__media">
        <Img media={m(p.cover)} sizes="(min-width: 1024px) 380px, 100vw" alt="" />
      </div>
      <div className="card__body">
        <time dateTime={p.publishedAt ?? undefined}>{formatDate(p.publishedAt)}</time>
        <h3>{p.title}</h3>
        {p.excerpt ? <p>{p.excerpt}</p> : null}
      </div>
    </Link>
  </article>
)

export const LatestNews = ({ eyebrow, heading, posts }: { eyebrow?: string | null; heading?: string | null; posts: Post[] }) =>
  posts.length ? (
    <section className="section section--tight">
      <div className="container">
        <Head eyebrow={eyebrow} title={heading} aside={<MoreLink href="/berita">Lihat semua berita</MoreLink>} />
        <Reveal className="cards3">
          {posts.map((p, i) => (
            <PostCard key={p.id} p={p} i={i} />
          ))}
        </Reveal>
      </div>
    </section>
  ) : null

/* ---------- 11b Video & Cerita Digital (curated media; hidden when empty) ---------- */
export const MediaHubSection = ({
  eyebrow,
  heading,
  intro,
  items,
  channel,
}: {
  eyebrow?: string | null
  heading?: string | null
  intro?: string | null
  items: MediaItem[]
  channel?: SocialAccount | null
}) => {
  if (!items.length) return null
  const [main, ...side] = items
  return (
    <section className="section section--ivory mhub">
      <div className="container">
        <Head
          eyebrow={eyebrow ?? 'Video Sekolah'}
          title={heading ?? 'Video & Cerita Digital'}
          aside={
            <div className="mhub__links">
              <MoreLink href="/media">Lihat Semua Media</MoreLink>
              {channel ? (
                <a className="arrow-link" href={channel.profileUrl} target="_blank" rel="noopener noreferrer" data-cta="kanal-youtube">
                  Kunjungi Kanal YouTube <Icon name="external" size={15} />
                  <span className="sr-only"> (membuka tab baru)</span>
                </a>
              ) : null}
            </div>
          }
        />
        {intro ? <p className="mhub__intro">{intro}</p> : null}
        <div className={`mhub__grid${side.length ? '' : ' mhub__grid--single'}`}>
          <div className="mhub__main">
            <MediaEmbed m={main!} />
          </div>
          {side.length ? (
            <ul className="mhub__side">
              {side.slice(0, 2).map((m) => (
                <li key={m.id}>
                  <MediaCard m={m} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/* ---------- 12 facilities (optional) ---------- */
export const FacilitiesSection = ({ items }: { items: Facility[] }) =>
  items.length ? (
    <section className="section section--ivory">
      <div className="container">
        <Head eyebrow="Fasilitas" title="Fasilitas Sekolah" aside={<MoreLink href="/tentang/fasilitas">Semua fasilitas</MoreLink>} />
        <ul className="cards3">
          {items.map((f, i) => (
            <li key={f.id}>
              <Link href={`/tentang/fasilitas/${f.slug}`} className="card" data-fx="tilt">
                <div className="card__media">{m(f.cover) ? <Img media={m(f.cover)} sizes="380px" /> : <HexPlaceholder seed={i} />}</div>
                <div className="card__body">
                  <h3>{f.title}</h3>
                  {f.excerpt ? <p>{f.excerpt}</p> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  ) : null

/* ---------- 13 community / alumni ---------- */
export const CommunityAlumni = ({
  eyebrow,
  heading,
  text,
  alumniTitle,
  alumniText,
  alumniUrl,
  image,
}: {
  eyebrow?: string | null
  heading?: string | null
  text?: string | null
  alumniTitle?: string | null
  alumniText?: string | null
  alumniUrl?: string | null
  image?: Media | null
}) => (
  <section className="section section--ivory community">
    <div className="container">
      <Head eyebrow={eyebrow} title={heading} />
      <div className="community__grid">
        {image ? (
          <Reveal className="community__photo">
            <Link href="/alumni" tabIndex={-1} aria-hidden="true">
              <Img media={image} sizes="(min-width: 1024px) 760px, 100vw" />
            </Link>
          </Reveal>
        ) : null}
        <Reveal className="community__copy">
          <h3>{alumniTitle}</h3>
          {alumniText || text ? <p>{alumniText || text}</p> : null}
          <div className="community__actions">
            <Link href="/alumni" className="btn btn--gold">
              Halaman Alumni (IKA KPS) <Icon name="arrow" size={17} />
            </Link>
            {alumniUrl ? (
              <a href={alumniUrl} className="btn btn--outline" target="_blank" rel="noopener noreferrer">
                Portal Alumni <Icon name="external" size={16} />
                <span className="sr-only"> (membuka tab baru)</span>
              </a>
            ) : null}
          </div>
        </Reveal>
      </div>
    </div>
  </section>
)

/* ---------- 14 admissions CTA ---------- */
export const AdmissionsCta = ({ eyebrow, heading, text, cycle }: { eyebrow?: string | null; heading?: string | null; text?: string | null; cycle: AdmissionsCycle | null }) => {
  const open = cycle?.admissionStatus === 'open' && cycle.registrationUrl?.startsWith('https://')
  return (
    <section className="cta">
      <HexField className="cta__hex" cols={22} rows={4} />
      <div className="container cta__inner">
        <div>
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h2 className="h2">{heading}</h2>
          {text ? <p>{text}</p> : null}
          {cycle ? (
            <p className="cta__status">
              Tahun ajaran {cycle.academicYear}: {STATUS_LABEL[cycle.admissionStatus]}
            </p>
          ) : null}
        </div>
        <div className="cta__actions">
          {open ? (
            <a href={cycle!.registrationUrl!} className="btn btn--gold" target="_blank" rel="noopener noreferrer" data-fx="magnet">
              Daftar sekarang <Icon name="external" size={16} />
            </a>
          ) : null}
          <Link href="/pendaftaran" className={`btn ${open ? 'btn--line' : 'btn--gold'}`} data-fx="magnet">
            Informasi Pendaftaran <Icon name="arrow" size={17} />
          </Link>
          <Link href="/kontak" className="btn btn--line" data-fx="magnet">
            Hubungi Sekolah
          </Link>
        </div>
      </div>
    </section>
  )
}

export const STATUS_LABEL: Record<string, string> = {
  unconfirmed: 'informasi sedang dikonfirmasi sekolah',
  not_open: 'pendaftaran belum dibuka',
  open: 'pendaftaran dibuka',
  closed: 'pendaftaran sudah ditutup',
}

/* ---------- optional: Sekilas sekolah (live counts from CMS) ---------- */
export type Highlight = { label: string; value: number; href: string; icon: string; note?: string }

export const Highlights = ({ items, short = 'Sekolah' }: { items: Highlight[]; short?: string }) => {
  const shown = items.filter((i) => i.value > 0)
  if (!shown.length) return null
  return (
    <section className="section section--tight highlights" aria-labelledby="hl-title">
      <div className="container">
        <Head eyebrow="Sekilas" title={`Sekilas ${short}`} id="hl-title" aside={<p className="section__intro">Dihitung otomatis dari konten yang sudah terbit.</p>} />
        <Reveal as="ul" className="highlights__grid">
          {shown.map((h, i) => (
            <li key={h.label} style={{ ['--i' as string]: i }}>
              <Link href={h.href} className="hl" data-fx="tilt">
                <span className="hl__icon" aria-hidden="true">
                  <Icon name={h.icon} size={24} />
                </span>
                <span className="hl__value">
                  <CountOnView value={h.value} />
                </span>
                <span className="hl__label">{h.label}</span>
                {h.note ? <span className="hl__note">{h.note}</span> : null}
              </Link>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
