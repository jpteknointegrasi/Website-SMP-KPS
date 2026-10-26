import Link from 'next/link'
import { findBySlug, getAlumniPage, getGlobals, getHomepage, listAlumniEvents, listCollection } from '@/lib/queries'
import { EventFacts, eventInvitation } from '@/components/sections/EventBanner'
import { Countdown } from '@/components/ui/motion'
import { SectionNav } from '@/components/layout/SectionNav'
import { Container } from '@/components/ui/bits'
import { PageBlocks } from '@/components/content/PageBlocks'
import { Img } from '@/components/ui/Img'
import { Icon } from '@/components/ui/Icon'
import { Lightbox } from '@/components/ui/Lightbox'
import { formatDate } from '@/lib/format'
import { ALUMNI_DEFAULTS as D, ALUMNI_PORTAL_FALLBACK, IKA_INSTAGRAM, IKA_JOIN_URL, type StaticPic } from '@/lib/alumni-defaults'
import type { Event, Media, Page as CmsPage, Testimonial } from '@/payload-types'

export const metadata = {
  title: 'Alumni · IKA KPS',
  description: 'Ikatan Keluarga Alumni KPS (IKA KPS): silaturahmi, kolaborasi, dan kontribusi keluarga besar alumni KPS. Portal alumni, kepengurusan, kegiatan, dan galeri.',
  alternates: { canonical: '/alumni' },
}

type Pic = Media | StaticPic
const asMedia = (m: unknown): Media | null => (m && typeof m === 'object' && (m as Media).url ? (m as Media) : null)
const isStatic = (p: Pic): p is StaticPic => 'src' in p
const text = (v: string | null | undefined, fallback: string) => (v && v.trim() ? v : fallback)
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const
const NewTab = () => <span className="sr-only"> (membuka tab baru)</span>

const Picture = ({ p, sizes, priority, className }: { p: Pic; sizes: string; priority?: boolean; className?: string }) =>
  isStatic(p) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.src} width={p.width} height={p.height} alt={p.alt} className={className} loading={priority ? 'eager' : 'lazy'} decoding="async" />
  ) : (
    <Img media={p} sizes={sizes} priority={priority} className={className} />
  )

const initials = (name: string) =>
  name
    .replace(/\[.*?\]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

const LinkOut = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
  href.startsWith('/') ? (
    <Link href={href} className={className}>{children}</Link>
  ) : (
    <a href={href} className={className} {...ext}>{children}<NewTab /></a>
  )

export default async function Page() {
  const [cms, { settings }, home, page, events, stories] = await Promise.all([
    getAlumniPage(),
    getGlobals(),
    getHomepage(),
    findBySlug<CmsPage>('pages', 'alumni'),
    listAlumniEvents(4),
    // only stories with recorded publication consent
    listCollection('testimonials', { where: { consent: { equals: true } }, sort: '-updatedAt', limit: 6 }),
  ])

  const portalUrl = settings.alumniUrl || ALUMNI_PORTAL_FALLBACK
  const joinUrl = cms.joinUrl || IKA_JOIN_URL
  const igUrl = cms.instagramUrl || IKA_INSTAGRAM
  // the alumni association inauguration photo already used on the homepage ("Komunitas & alumni")
  const inauguration = asMedia(page?.cover) ?? asMedia(home.texts?.communityImage)

  const hero: Pic = asMedia(cms.heroImage) ?? D.heroImage
  const about: Pic = asMedia(cms.aboutImage) ?? inauguration ?? D.aboutImage
  const values = cms.values?.length ? cms.values : D.values
  const committee = cms.committee?.length
    ? cms.committee.map((c) => ({ name: c.name, role: c.role, note: c.note, photo: asMedia(c.photo) }))
    : D.committee.map((c) => ({ ...c, note: null, photo: null }))
  const activities = cms.activities?.length
    ? cms.activities.map((a) => ({ title: a.title, category: a.category, summary: a.summary, url: a.url, image: asMedia(a.image) as Pic | null }))
    : D.activities
  const storyCards = cms.stories?.length
    ? cms.stories.map((s) => ({ title: s.title, text: s.text, url: s.url, image: asMedia(s.image) as Pic | null }))
    : D.stories
  const usingDefaultGallery = !cms.gallery?.length
  const gallery = (
    usingDefaultGallery
      ? D.gallery.map((g) => ({ src: g.image.src, thumb: g.image.src, width: g.image.width, height: g.image.height, alt: g.image.alt, caption: g.caption }))
      : cms.gallery!.flatMap((g) => {
          const m = asMedia(g.image)
          if (!m) return []
          const big = m.sizes?.large?.url || m.url!
          const thumb = m.sizes?.card?.url || m.url!
          return [{ src: big, thumb, width: m.width ?? 800, height: m.height ?? 600, alt: m.alt ?? '', caption: g.caption ?? '' }]
        })
  ).map((g, i) => ({ ...g, id: i + 1 }))
  const featured = (events[0] as Event | undefined) ?? null
  const upcoming = events.slice(1)
  const quotes = stories.docs as unknown as Testimonial[]
  const aboutParas = text(cms.aboutText, D.aboutText).split(/\n\s*\n/).filter(Boolean)
  const fromInstagram = (u?: string | null) => Boolean(u && /instagram\.com/i.test(u))

  return (
    <>
      <SectionNav
        label="Bagian halaman alumni"
        items={[
          ...(featured ? [{ id: 'acara', label: 'Acara' }] : []),
          { id: 'tentang', label: 'Tentang' },
          { id: 'portal', label: 'Portal Alumni' },
          { id: 'pengurus', label: 'Pengurus' },
          { id: 'kegiatan', label: 'Kegiatan' },
          { id: 'galeri', label: 'Galeri' },
          { id: 'bergabung', label: 'Bergabung' },
        ]}
      />
      <section className="ika-hero" aria-labelledby="ika-title">
        <Container>
          <div className="ika-hero__grid">
            <div className="ika-hero__copy">
              <nav className="crumbs" aria-label="Breadcrumb">
                <ol>
                  <li><Link href="/">Beranda</Link></li>
                  <li aria-current="page">Alumni</li>
                </ol>
              </nav>
              <p className="eyebrow eyebrow--light">{text(cms.eyebrow, D.eyebrow)}</p>
              <h1 id="ika-title" className="ika-hero__title">
                {text(cms.heading, D.heading)} <span>{text(cms.headingAccent, D.headingAccent)}</span>
              </h1>
              <p className="ika-hero__tagline">{text(cms.tagline, D.tagline)}</p>
              <p className="ika-hero__lead">{text(cms.intro, D.intro)}</p>
              <div className="ika-hero__actions">
                <a className="btn btn--gold btn--lg" href={portalUrl} {...ext} data-cta="portal-alumni">
                  Buka Portal Alumni <Icon name="external" size={18} />
                  <NewTab />
                </a>
                <a className="btn btn--line btn--lg" href={joinUrl} {...ext} data-cta="gabung-ika">
                  Bergabung dengan IKA KPS
                  <NewTab />
                </a>
              </div>
              <a className="ika-ig" href={igUrl} {...ext} data-cta="instagram-ika">
                <span className="ika-ig__icon"><Icon name="instagram" size={20} /></span>
                <span><small>Instagram resmi</small> <strong>@ika_kps</strong></span>
                <NewTab />
              </a>
            </div>
            <figure className="ika-hero__photo">
              <div className="ika-hero__frame">
                <Picture p={hero} sizes="(min-width: 1024px) 560px, 100vw" priority />
              </div>
              <figcaption>{text(cms.heroCaption, D.heroCaption)}{isStatic(hero) ? ' · Foto: @ika_kps' : ''}</figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <Container>
        <ul className="ika-values">
          {values.map((v) => (
            <li key={v.title}>
              <span className="ika-values__icon"><Icon name={v.icon ?? 'users'} size={26} /></span>
              <span>
                <strong>{v.title}</strong>
                {v.text ? <small>{v.text}</small> : null}
              </span>
            </li>
          ))}
        </ul>
      </Container>

      {featured ? <FeaturedEvent e={featured} /> : null}

      <section className="section ika-sec" id="tentang" aria-labelledby="ika-about">
        <Container className="ika-about">
          <div>
            <h2 id="ika-about" className="h2 ika-h2">{text(cms.aboutHeading, D.aboutHeading)}</h2>
            {aboutParas.map((p, i) => <p key={i} className="ika-about__p">{p}</p>)}
            <a className="btn btn--gold" href={joinUrl} {...ext}>
              Bergabung dengan IKA KPS <Icon name="arrow" size={18} />
              <NewTab />
            </a>
          </div>
          <figure className="ika-about__photo">
            <Picture p={about} sizes="(min-width: 1024px) 560px, 100vw" />
            {!isStatic(about) && (about.caption || about.alt) ? <figcaption>{about.caption || about.alt}</figcaption> : null}
          </figure>
        </Container>
      </section>

      <section className="ika-portal-wrap" id="portal" aria-labelledby="ika-portal">
        <Container>
          <div className="ika-portal">
            <span className="ika-portal__icon"><Icon name="globe" size={30} /></span>
            <div>
              <h2 id="ika-portal">Portal Alumni</h2>
              <p>Masuk ke portal alumni untuk memperbarui data dan tetap terhubung dengan sesama alumni KPS.</p>
              <p className="ika-portal__url">{portalUrl.replace(/^https:\/\//, '').replace(/\/$/, '')}</p>
            </div>
            <a className="btn btn--gold btn--lg" href={portalUrl} {...ext} data-cta="portal-alumni-band">
              Buka Portal Alumni <Icon name="external" size={18} />
              <NewTab />
            </a>
          </div>
        </Container>
      </section>

      {page?.layout?.length ? (
        <section className="section ika-sec">
          <Container><PageBlocks blocks={page.layout} /></Container>
        </section>
      ) : null}

      <section className="section ika-sec section--ivory" id="pengurus" aria-labelledby="ika-committee">
        <Container>
          <h2 id="ika-committee" className="h2 ika-h2">Kepengurusan IKA KPS</h2>
          <p className="ika-note">{text(cms.committeeNote, D.committeeNote)}</p>
          <ul className="ika-people">
            {committee.map((c) => (
              <li key={c.name + c.role} className="ika-person">
                <span className="ika-person__photo">
                  {c.photo ? <Img media={c.photo} sizes="96px" alt="" /> : <span aria-hidden="true">{initials(c.name)}</span>}
                </span>
                <strong>{c.name}</strong>
                <span>{c.role}</span>
                {c.note ? <small>{c.note}</small> : null}
              </li>
            ))}
          </ul>
          {cms.committeeUrl ? (
            <p className="ika-center">
              <LinkOut href={cms.committeeUrl} className="btn btn--ghost">Lihat struktur lengkap</LinkOut>
            </p>
          ) : null}
        </Container>
      </section>

      <section className="section ika-sec" id="kegiatan" aria-labelledby="ika-news">
        <Container>
          <div className="section__head">
            <h2 id="ika-news" className="h2 ika-h2">Kabar &amp; Kegiatan</h2>
            <a className="more-link" href={igUrl} {...ext}>Lihat semua di @ika_kps <Icon name="arrow" size={16} /><NewTab /></a>
          </div>
          <ul className="cards3">
            {activities.map((a) => (
              <li key={a.title}>
                <article className="card ika-card">
                  <div className="card__media">{a.image ? <Picture p={a.image} sizes="(min-width: 1024px) 400px, 100vw" /> : null}</div>
                  <div className="card__body">
                    {a.category ? <span className="tag tag--line ika-card__tag">{a.category}</span> : null}
                    <h3>{a.title}</h3>
                    {a.summary ? <p>{a.summary}</p> : null}
                    {a.url ? (
                      <LinkOut href={a.url} className="more-link ika-card__link">
                        {fromInstagram(a.url) ? 'Lihat di Instagram' : 'Baca selengkapnya'} <Icon name="arrow" size={16} />
                      </LinkOut>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>

          <div className="ika-duo">
            <div className="ika-agenda">
              <h3><Icon name="calendar" size={24} /> Agenda Alumni</h3>
              {upcoming.length ? (
                <ul className="ika-agenda__list">
                  {upcoming.map((e) => (
                    <li key={e.id}>
                      <Link href={`/agenda/${e.slug}`}>
                        <strong>{e.title}</strong>
                        <span>{formatDate(e.startAt)}{e.location ? ` · ${e.location}` : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className="ika-agenda__title">{featured ? 'Agenda berikutnya menyusul' : text(cms.agendaHeading, D.agendaHeading)}</p>
                  <p className="muted">{text(cms.agendaText, D.agendaText)}</p>
                </>
              )}
              <a className="more-link" href={igUrl} {...ext}>Ikuti kabar di Instagram <Icon name="arrow" size={16} /><NewTab /></a>
            </div>
            <div className="ika-stories">
              <h3><Icon name="file" size={24} /> Cerita dari Almamater</h3>
              <ul>
                {storyCards.map((s) => (
                  <li key={s.title}>
                    {s.image ? <span className="ika-stories__thumb"><Picture p={s.image} sizes="120px" /></span> : null}
                    <span className="ika-stories__body">
                      <strong>{s.title}</strong>
                      {s.text ? <small>{s.text}</small> : null}
                      {s.url ? (
                        <LinkOut href={s.url} className="more-link">
                          {fromInstagram(s.url) ? 'Tonton di Instagram' : 'Baca selengkapnya'} <Icon name="arrow" size={16} />
                        </LinkOut>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {quotes.length ? (
            <div className="ika-quotes">
              <h3 className="ika-h3">Kata alumni</h3>
              <ul className="cards">
                {quotes.map((t) => (
                  <li key={t.id}>
                    <figure className="quote-card">
                      <blockquote>“{t.quote}”</blockquote>
                      <figcaption>
                        {asMedia(t.photo) ? <Img media={asMedia(t.photo)!} sizes="56px" alt="" /> : null}
                        <span><strong>{t.publicName}</strong>{t.roleLine ? <small>{t.roleLine}</small> : null}</span>
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </section>

      <section className="section ika-sec section--ivory" id="galeri" aria-labelledby="ika-gallery">
        <Container>
          <div className="section__head">
            <h2 id="ika-gallery" className="h2 ika-h2">Galeri Kebersamaan</h2>
            <a className="more-link" href={igUrl} {...ext}>Lihat @ika_kps <Icon name="arrow" size={16} /><NewTab /></a>
          </div>
          <div className="ika-gallery">
            <Lightbox items={gallery} />
          </div>
          {usingDefaultGallery ? (
            <div className="ika-posters">
              <h3 className="ika-h3">Arsip poster menuju pelantikan</h3>
              <ul>
                {D.posters.map((p) => (
                  <li key={p.src}><Picture p={p} sizes="160px" /></li>
                ))}
              </ul>
            </div>
          ) : null}
          {cms.photoCredit || usingDefaultGallery ? <p className="ika-credit">{cms.photoCredit || D.photoCredit}</p> : null}
        </Container>
      </section>

      <section className="ika-cta-wrap" id="bergabung" aria-labelledby="ika-cta">
        <Container>
          <div className="ika-cta">
            <div>
              <h2 id="ika-cta">{text(cms.ctaHeading, D.ctaHeading)}</h2>
              <p>{text(cms.ctaText, D.ctaText)}</p>
            </div>
            <div className="ika-cta__actions">
              <a className="btn btn--gold" href={joinUrl} {...ext} data-cta="formulir-alumni">
                Isi Formulir Alumni <Icon name="arrow" size={18} />
                <NewTab />
              </a>
              <a className="btn btn--line" href={portalUrl} {...ext}>
                Portal Alumni <Icon name="external" size={16} />
                <NewTab />
              </a>
              <a className="btn btn--line" href={igUrl} {...ext} data-cta="instagram-ika-cta">
                <Icon name="instagram" size={18} /> @ika_kps
                <span className="sr-only"> di Instagram (membuka tab baru)</span>
              </a>
            </div>
            <p className="ika-cta__small">
              Pertanyaan untuk sekolah? <Link href="/kontak?kategori=alumni">Hubungi SMP Nasional KPS</Link>
            </p>
          </div>
        </Container>
      </section>
    </>
  )
}

/** The nearest alumni event (Agenda with audience "Alumni"): invitation, facts, rundown. */
const FeaturedEvent = ({ e }: { e: Event }) => {
  const cover = asMedia(e.cover)
  const doc = eventInvitation(e)
  const upcoming = new Date(e.startAt).getTime() > Date.now() && e.eventStatus === 'scheduled'
  return (
    <section className="section ika-sec ika-event" id="acara" aria-labelledby="ika-event">
      <Container>
        <div className="ika-event__card">
          <div className="ika-event__main">
            <p className="evb__eyebrow">{e.eventStatus === 'postponed' ? 'Ditunda · ' : ''}Acara terdekat · Undangan</p>
            <h2 id="ika-event" className="ika-event__title">{e.title}</h2>
            {e.excerpt ? <p className="evb__lead">{e.excerpt}</p> : null}
            <EventFacts e={e} />
            {upcoming ? <div className="evb__count"><Countdown to={e.startAt} allDay={e.allDay} /></div> : null}
            <div className="evb__actions">
              {doc ? (
                <a className="btn btn--gold" href={doc.url!} download={doc.originalFilename ?? undefined} data-cta="alumni-undangan">
                  <Icon name="download" size={18} /> Unduh undangan (PDF)
                </a>
              ) : null}
              <a className="btn btn--line" href={`/agenda/${e.slug}/ics`} download data-cta="alumni-ics">
                <Icon name="calendar" size={18} /> Simpan ke kalender
              </a>
              <Link className="btn btn--line" href={`/agenda/${e.slug}`}>Detail acara</Link>
            </div>
          </div>
          {e.rundown?.length ? (
            <div className="ika-event__rundown">
              <h3>Susunan acara</h3>
              <ol className="rundown">
                {e.rundown.map((r) => (
                  <li key={r.id ?? r.time + r.activity} className={r.highlight ? 'is-highlight' : undefined}>
                    <time>{r.time}</time>
                    <span>{r.activity}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : cover ? (
            <div className="ika-event__poster"><Img media={cover} sizes="(min-width: 1024px) 380px, 90vw" /></div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
