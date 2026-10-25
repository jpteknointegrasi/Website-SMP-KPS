import { siteUrl } from '@/lib/payload'
import React from 'react'
import type { Metadata } from 'next'
import { getCurrentAdmissions, getFlags, getGlobals, getHomepage, getPriorityAnnouncement, listAnnouncements, listCollection, listMediaItems, listPosts, listSocialAccounts, listUpcomingEvents } from '@/lib/queries'
import {
  Achievements,
  AdmissionsCta,
  AnnouncementsAgenda,
  CommunityAlumni,
  FacilitiesSection,
  Hero,
  Highlights,
  type Highlight,
  LatestNews,
  MediaHubSection,
  PriorityStrip,
  Programs,
  QuickLinks,
  SchoolIntro,
  SearchBand,
  StudentLife,
} from '@/components/sections/home'
import type { Achievement, Album, Announcement, Event, Extracurricular, Facility, Media, MediaItem, Post, Program } from '@/payload-types'
import { payloadClient } from '@/lib/payload'
import { BackToTop, PointerFX } from '@/components/ui/fx'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default async function Home() {
  const [home, { settings }, priority] = await Promise.all([getHomepage(), getGlobals(), getPriorityAnnouncement()])
  // A new school whose homepage is not published yet: neutral placeholder instead of an empty hero.
  if (!home)
    return (
      <section className="section">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '12vh 16px', textAlign: 'center' }}>
          <h1>{settings.schoolName || 'Website sekolah'}</h1>
          <p>Website ini sedang disiapkan. Silakan kembali beberapa saat lagi.</p>
        </div>
      </section>
    )
  const sections = (home.sections ?? []).filter((s) => s.enabled)
  const lim = (type: string, d: number) => sections.find((s) => s.type === type)?.limit ?? d
  const has = (t: string) => sections.some((s) => s.type === t)

  const payload = await payloadClient()
  const flags = await getFlags()
  const showMedia = has('mediaHub') && flags.mediaHub
  const [mediaFeatured, ytAccounts] = showMedia
    ? await Promise.all([listMediaItems({ featured: true, limit: Math.min(lim('mediaHub', 3), 3) }), listSocialAccounts('showOnMediaPage')])
    : [null, []]
  const [programs, life, achievements, archive, anns, events, posts, facilities, cycle] = await Promise.all([
    has('programs') ? listCollection('programs', { where: { featured: { equals: true } }, limit: lim('programs', 3) }) : null,
    has('studentLife') ? listCollection('extracurriculars', { where: { featured: { equals: true } }, limit: lim('studentLife', 4) }) : null,
    has('achievements') ? listCollection('achievements', { where: { and: [{ featured: { equals: true } }, { verified: { equals: true } }] }, sort: '-year', limit: 3 }) : null,
    has('achievements') && home.texts?.achievementsAlbum
      ? payload.find({ collection: 'albums', where: { id: { equals: typeof home.texts.achievementsAlbum === 'object' ? home.texts.achievementsAlbum.id : home.texts.achievementsAlbum } }, limit: 1, depth: 2, overrideAccess: false, draft: false })
      : null,
    has('announcementsAgenda') ? listAnnouncements({ limit: lim('announcementsAgenda', 3) }) : null,
    has('announcementsAgenda') ? listUpcomingEvents(lim('announcementsAgenda', 3)) : null,
    has('latestNews') ? listPosts({ limit: lim('latestNews', 3) }) : null,
    has('facilities') ? listCollection('facilities', { where: { and: [{ featured: { equals: true } }, { availability: { equals: 'available' } }] }, limit: lim('facilities', 3) }) : null,
    has('admissionsCta') ? getCurrentAdmissions() : null,
  ])

  let highlights: Highlight[] = []
  if (has('highlights')) {
    const now = new Date().toISOString()
    const pub = { overrideAccess: false as const, draft: false as const }
    const [postsN, albumsAll, eventsN, lifeN] = await Promise.all([
      payload.count({ collection: 'posts', ...pub }),
      payload.find({ collection: 'albums', limit: 100, depth: 0, select: { items: true } as never, ...pub }),
      payload.count({ collection: 'events', where: { startAt: { greater_than_equal: now } }, ...pub }),
      payload.count({ collection: 'extracurriculars', ...pub }),
    ])
    const photos = albumsAll.docs.reduce((n, a) => n + ((a as Album).items?.length ?? 0), 0)
    highlights = [
      { label: 'Cerita kegiatan', value: postsN.totalDocs, href: '/berita', icon: 'pencil' },
      { label: 'Foto dokumentasi', value: photos, href: '/galeri', icon: 'grid', note: `${albumsAll.totalDocs} album` },
      { label: 'Kegiatan & ekskul', value: lifeN.totalDocs, href: '/kehidupan-siswa', icon: 'users' },
      { label: 'Agenda mendatang', value: eventsN.totalDocs, href: '/agenda', icon: 'calendar' },
    ]
  }

  const t = home.texts ?? {}
  const SITE = await siteUrl()
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MiddleSchool',
    name: settings.schoolName,
    url: SITE || undefined,
    email: settings.email || undefined,
    telephone: settings.phone || undefined,
    address: settings.address ? { '@type': 'PostalAddress', streetAddress: settings.address, addressLocality: settings.city, addressCountry: 'ID' } : undefined,
    sameAs: (settings.socials ?? []).map((s) => s.url).concat(ytAccounts.map((a) => a.profileUrl)),
  }

  const render = (type: string) => {
    switch (type) {
      case 'quickLinks':
        return <QuickLinks links={home.quickLinks} />
      case 'search':
        return <SearchBand />
      case 'highlights':
        return <Highlights items={highlights} short={(settings as { shortName?: string | null }).shortName || undefined} />
      case 'schoolIntro':
        return <SchoolIntro intro={home.intro} />
      case 'programs':
        return <Programs eyebrow={t.programsEyebrow} heading={t.programsHeading} intro={t.programsIntro} items={(programs?.docs ?? []) as Program[]} />
      case 'studentLife':
        return <StudentLife eyebrow={t.studentLifeEyebrow} heading={t.studentLifeHeading} items={(life?.docs ?? []) as Extracurricular[]} />
      case 'achievements':
        return <Achievements eyebrow={t.achievementsEyebrow} heading={t.achievementsHeading} text={t.achievementsText} featured={(achievements?.docs ?? []) as Achievement[]} archive={(archive?.docs[0] as Album) ?? null} />
      case 'announcementsAgenda':
        return <AnnouncementsAgenda eyebrow={t.infoEyebrow} announcements={(anns?.docs ?? []) as Announcement[]} events={(events?.docs ?? []) as Event[]} />
      case 'latestNews':
        return <LatestNews eyebrow={t.newsEyebrow} heading={t.newsHeading} posts={(posts?.docs ?? []) as Post[]} />
      case 'mediaHub':
        return showMedia ? (
          <MediaHubSection
            eyebrow={t.mediaEyebrow}
            heading={t.mediaHeading}
            intro={t.mediaIntro}
            items={(mediaFeatured?.docs ?? []) as MediaItem[]}
            channel={ytAccounts.find((a) => a.platform === 'youtube') ?? null}
          />
        ) : null
      case 'facilities':
        return <FacilitiesSection items={(facilities?.docs ?? []) as Facility[]} />
      case 'communityAlumni':
        return <CommunityAlumni eyebrow={t.communityEyebrow} heading={t.communityHeading} text={t.communityText} alumniTitle={t.alumniTitle} alumniText={t.alumniText} alumniUrl={settings.alumniUrl} image={communityImage} />
      case 'admissionsCta':
        return <AdmissionsCta eyebrow={t.ctaEyebrow} heading={t.ctaHeading} text={t.ctaText} cycle={cycle} />
      default:
        return null
    }
  }
  const communityImage = home.texts?.communityImage && typeof home.texts.communityImage === 'object' ? (home.texts.communityImage as Media) : null

  return (
    <>
      <PriorityStrip a={priority} />
      <Hero hero={home.hero} settings={settings} />
      {sections.map((s, i) => (
        <React.Fragment key={s.id ?? i}>{render(s.type)}</React.Fragment>
      ))}
      <PointerFX />
      <BackToTop />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </>
  )
}
