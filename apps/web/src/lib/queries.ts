import 'server-only'
import type { Where } from 'payload'
import { currentTenant, payloadClient } from './payload'
import type {
  AlumniPage,
  Homepage,
  Navigation,
  SiteSetting,
  Post,
  Announcement,
  Event,
} from '@/payload-types'
import { cache } from 'react'
import { readFlags, type Flags } from './flags'

/**
 * Public data access. Every query runs with overrideAccess:false and no user,
 * so collection access rules (published only, demo filtering, scheduled publishedAt)
 * are enforced exactly as for the REST API. Results are always paginated.
 */
const pub = { overrideAccess: false as const, draft: false as const }
const nowIso = () => new Date().toISOString()

/** Archive filtering is enforced by collection read access (see access/roles.ts publishedOrStaff). */
export const notArchived: Where = { id: { exists: true } }

/** The school's settings and menus (one read per request). A school without them yet gets safe empty values. */
export const getGlobals = cache(async () => {
  const payload = await payloadClient()
  const [settings, nav, school] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', depth: 1, ...pub }) as Promise<SiteSetting | null>,
    payload.findGlobal({ slug: 'navigation', depth: 0, ...pub }) as Promise<Navigation | null>,
    currentTenant(),
  ])
  return {
    settings: settings ?? ({ id: 0, schoolName: school?.name ?? '', updatedAt: '', createdAt: '' } as unknown as SiteSetting),
    nav: nav ?? ({ id: 0, header: [], footer: [], updatedAt: '', createdAt: '' } as unknown as Navigation),
  }
})

/** School name for texts: full ("SMP Nasional KPS") and short ("KPS", falls back to "Sekolah"). */
export const getSchoolNames = cache(async () => {
  const { settings } = await getGlobals()
  const s = settings as SiteSetting & { shortName?: string | null }
  return { name: s.schoolName || 'Sekolah', short: s.shortName || 'Sekolah', city: s.city || '' }
})

/** The school's /alumni page document (null while not created/published yet). */
export async function getAlumniPage() {
  const payload = await payloadClient()
  return (await payload.findGlobal({ slug: 'alumni-page', depth: 1, ...pub })) as AlumniPage | null
}

/** Published homepage of the school, or null while it is still a draft (new school). */
export async function getHomepage() {
  const payload = await payloadClient()
  return (await payload.findGlobal({ slug: 'homepage', depth: 1, ...pub })) as Homepage | null
}

export const activeAnnouncementWhere = (): Where => ({
  and: [
    { displayStart: { less_than_equal: nowIso() } },
    { or: [{ displayEnd: { exists: false } }, { displayEnd: { equals: null } }, { displayEnd: { greater_than: nowIso() } }] },
    notArchived,
  ],
})

export async function getPriorityAnnouncement() {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'announcements',
    where: { and: [activeAnnouncementWhere(), { priority: { greater_than_equal: 50 } }] },
    sort: '-priority',
    limit: 1,
    depth: 0,
    ...pub,
  })
  return (res.docs[0] as Announcement) ?? null
}

export async function listAnnouncements({ active = true, page = 1, limit = 10 } = {}) {
  const payload = await payloadClient()
  const where: Where = active
    ? activeAnnouncementWhere()
    : { displayEnd: { less_than_equal: nowIso() } }
  return payload.find({ collection: 'announcements', where, sort: active ? '-priority,-displayStart' : '-displayEnd', page, limit: Math.min(limit, 30), depth: 0, ...pub })
}

/** Events that are not over yet: ends in the future, or (no end time) starts within the last 12 hours or later. */
const notOverWhere = (): Where => {
  const now = nowIso()
  const graceStart = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  return {
    or: [
      { endAt: { greater_than: now } },
      { and: [{ or: [{ endAt: { exists: false } }, { endAt: { equals: null } }] }, { startAt: { greater_than_equal: graceStart } }] },
    ],
  }
}

/** Homepage banner: the nearest event flagged "homeBanner" that is not over and not cancelled. */
export const getBannerEvent = cache(async () => {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'events',
    where: { and: [notArchived, { homeBanner: { equals: true } }, { eventStatus: { not_equals: 'cancelled' } }, notOverWhere()] },
    sort: 'startAt',
    limit: 1,
    depth: 1,
    ...pub,
  })
  return (res.docs[0] as Event | undefined) ?? null
})

/** Upcoming events for alumni (audience "Alumni"), nearest first. */
export async function listAlumniEvents(limit = 3) {
  const payload = await payloadClient()
  return (
    await payload.find({
      collection: 'events',
      where: { and: [notArchived, { audience: { in: ['alumni'] } }, { eventStatus: { not_equals: 'cancelled' } }, notOverWhere()] },
      sort: 'startAt',
      limit,
      depth: 1,
      ...pub,
    })
  ).docs as Event[]
}

export async function listUpcomingEvents(limit = 3) {
  const payload = await payloadClient()
  const startOfToday = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  return payload.find({
    collection: 'events',
    where: { and: [{ startAt: { greater_than_equal: startOfToday } }, notArchived] },
    sort: 'startAt',
    limit,
    depth: 0,
    ...pub,
  })
}

export async function listEvents({ from, to, page = 1, status, sort = 'startAt', category, audience }: { from?: string; to?: string; page?: number; status?: string; sort?: string; category?: number; audience?: string }) {
  const payload = await payloadClient()
  const and: Where[] = [notArchived]
  if (category) and.push({ category: { equals: category } })
  if (audience) and.push({ or: [{ audience: { in: [audience] } }, { audience: { in: ['semua'] } }] })
  if (from) and.push({ startAt: { greater_than_equal: from } })
  if (to) and.push({ startAt: { less_than: to } })
  if (status) and.push({ eventStatus: { equals: status } })
  return payload.find({ collection: 'events', where: { and }, sort, page, limit: 20, depth: 1, ...pub })
}

export async function listPosts({ page = 1, limit = 9, category, q }: { page?: number; limit?: number; category?: string; q?: string } = {}) {
  const payload = await payloadClient()
  const and: Where[] = [notArchived]
  if (category) {
    const cat = await payload.find({ collection: 'categories', where: { slug: { equals: category } }, limit: 1, ...pub })
    and.push({ categories: { in: cat.docs.map((c) => c.id) } })
  }
  if (q) and.push({ or: [{ title: { like: q } }, { excerpt: { like: q } }] })
  return payload.find({ collection: 'posts', where: { and }, sort: '-publishedAt', page, limit: Math.min(limit, 24), depth: 1, ...pub })
}

export async function findBySlug<T>(collection: string, slug: string, depth = 2): Promise<T | null> {
  const payload = await payloadClient()
  const res = await payload.find({ collection: collection as 'posts', where: { slug: { equals: slug } }, limit: 1, depth, ...pub })
  return (res.docs[0] as T) ?? null
}

export async function listCollection(collection: string, opts: { where?: Where; sort?: string; limit?: number; page?: number; depth?: number } = {}) {
  const payload = await payloadClient()
  return payload.find({
    collection: collection as 'posts',
    where: { and: [notArchived, ...(opts.where ? [opts.where] : [])] },
    sort: opts.sort ?? 'order',
    limit: Math.min(opts.limit ?? 12, 48),
    page: opts.page ?? 1,
    depth: opts.depth ?? 1,
    ...pub,
  })
}

export async function relatedPosts(post: Post, limit = 3) {
  const payload = await payloadClient()
  const catIds = (post.categories ?? []).map((c) => (typeof c === 'object' ? c.id : c))
  const and: Where[] = [{ id: { not_equals: post.id } }, notArchived]
  if (catIds.length) and.push({ categories: { in: catIds } })
  let res = await payload.find({ collection: 'posts', where: { and }, sort: '-publishedAt', limit, depth: 1, ...pub })
  if (res.docs.length < limit) {
    res = await payload.find({ collection: 'posts', where: { and: [{ id: { not_equals: post.id } }, notArchived] }, sort: '-publishedAt', limit, depth: 1, ...pub })
  }
  return res.docs as Post[]
}

export async function getCurrentAdmissions() {
  const payload = await payloadClient()
  const res = await payload.find({ collection: 'admissions-cycles', sort: '-academicYear', limit: 1, depth: 1, ...pub })
  return res.docs[0] ?? null
}

/** Whitelisted public search. Never searches messages, private files, users or drafts. */
export const SEARCH_TYPES = {
  posts: { label: 'Berita', base: '/berita' },
  announcements: { label: 'Pengumuman', base: '/pengumuman' },
  events: { label: 'Agenda', base: '/agenda' },
  programs: { label: 'Program', base: '/pembelajaran' },
  extracurriculars: { label: 'Kehidupan siswa', base: '/ekstrakurikuler' },
  achievements: { label: 'Prestasi', base: '/prestasi' },
  guides: { label: 'Panduan', base: '/panduan' },
  faqs: { label: 'FAQ', base: '/faq#' },
  'media-items': { label: 'Video & media', base: '/media' },
  'student-works': { label: 'Karya siswa', base: '/karya-siswa' },
  pages: { label: 'Halaman', base: '' },
} as const

export async function search(q: string, type?: string, page = 1) {
  const query = q.trim().slice(0, 80)
  if (query.length < 2) return { results: [], total: 0, totalPages: 0 }
  const payload = await payloadClient()
  const flags = await getFlags()
  const types = ((type && type in SEARCH_TYPES ? [type] : Object.keys(SEARCH_TYPES)) as (keyof typeof SEARCH_TYPES)[]).filter(
    (t) => (t !== 'media-items' || flags.mediaHub) && (t !== 'student-works' || flags.studentWorks),
  )
  const all = (
    await Promise.all(
      types.map(async (t) => {
        const res = await payload.find({
          collection: t,
          where: { and: [notArchived, t === 'faqs' ? { title: { like: query } } : { or: [{ title: { like: query } }, { excerpt: { like: query } }] }] },
          limit: 30,
          depth: 0,
          ...pub,
        })
        return res.docs.map((d) => {
          const doc = d as { id: number; title: string; slug: string; excerpt?: string | null; updatedAt: string; publishedAt?: string | null }
          const href = t === 'pages' ? pagePath(doc.slug) : t === 'faqs' ? `/faq#${doc.slug}` : `${SEARCH_TYPES[t].base}/${doc.slug}`
          return { type: t, label: SEARCH_TYPES[t].label, title: doc.title, excerpt: doc.excerpt ?? '', href, date: doc.publishedAt ?? doc.updatedAt }
        })
      }),
    )
  ).flat()
  const perPage = 10
  return { results: all.slice((page - 1) * perPage, page * perPage), total: all.length, totalPages: Math.ceil(all.length / perPage) }
}

export const pagePath = (slug: string) =>
  ({ tentang: '/tentang', 'visi-misi': '/tentang/visi-misi', sejarah: '/tentang/sejarah', 'kebijakan-privasi': '/kebijakan-privasi', alumni: '/alumni' })[slug] ?? `/tentang`

export type { Event }

// ---------------------------------------------------------------- addendum (P0/P1)

/** Feature flags for the current request (one DB read per request). */
export const getFlags = cache(async (): Promise<Flags> => readFlags(await payloadClient()))

/** Navigation/footer hrefs that belong to a flag-guarded feature. */
const FLAG_PATHS: [RegExp, keyof Flags][] = [
  [/^\/media(\/|$)/, 'mediaHub'],
  [/^\/karya-siswa(\/|$)/, 'studentWorks'],
  [/^\/kunjungan(\/|$)/, 'schoolVisits'],
  [/^\/pendaftaran\/minat(\/|$)/, 'interestForm'],
]
export const hrefAllowed = (href: string, flags: Flags) => !FLAG_PATHS.some(([re, f]) => re.test(href) && !flags[f])

/**
 * Flags for LINKS (menu, footer, call-to-action buttons): a feature is linked only when it is switched on AND has
 * something to show, so visitors never land on an empty page. The routes themselves follow the plain flags.
 */
export const getLinkFlags = cache(async (): Promise<Flags> => {
  const flags = await getFlags()
  const payload = await payloadClient()
  const now = new Date().toISOString()
  const count = async (fn: () => Promise<{ totalDocs: number }>) => {
    try {
      return (await fn()).totalDocs
    } catch {
      return 0
    }
  }
  const [visits, works, media, cycles] = await Promise.all([
    flags.schoolVisits
      ? count(() =>
          payload.count({
            collection: 'visit-sessions',
            overrideAccess: true,
            where: { and: [{ sessionStatus: { equals: 'open' } }, { startAt: { greater_than: now } }, { or: [{ bookingDeadline: { exists: false } }, { bookingDeadline: { equals: null } }, { bookingDeadline: { greater_than: now } }] }] },
          }),
        )
      : 0,
    flags.studentWorks ? count(() => payload.count({ collection: 'student-works', ...pub })) : 0,
    flags.mediaHub ? count(() => payload.count({ collection: 'media-items', ...pub })) : 0,
    flags.interestForm
      ? count(() => payload.count({ collection: 'admissions-cycles', where: { or: [{ interestFormEnabled: { equals: true } }, { mode: { equals: 'interest_form' } }] }, ...pub }))
      : 0,
  ])
  return { ...flags, schoolVisits: visits > 0, studentWorks: works > 0, mediaHub: media > 0, interestForm: cycles > 0 }
})

export async function listEventCategories() {
  const payload = await payloadClient()
  return (await payload.find({ collection: 'event-categories', sort: 'order', limit: 50, depth: 0, ...pub })).docs
}

/** Events overlapping [from, to) with optional category/audience/status filters (range is capped at ~6 weeks). */
export async function listEventsInRange({ from, to, category, audience, status }: { from: string; to: string; category?: number; audience?: string; status?: string }) {
  const payload = await payloadClient()
  const and: Where[] = [
    notArchived,
    { startAt: { less_than: to } },
    { or: [{ endAt: { greater_than_equal: from } }, { and: [{ or: [{ endAt: { exists: false } }, { endAt: { equals: null } }] }, { startAt: { greater_than_equal: from } }] }] },
  ]
  if (category) and.push({ category: { equals: category } })
  if (audience) and.push({ or: [{ audience: { in: [audience] } }, { audience: { in: ['semua'] } }] })
  if (status) and.push({ eventStatus: { equals: status } })
  return (await payload.find({ collection: 'events', where: { and }, sort: 'startAt', limit: 200, depth: 1, ...pub })).docs as Event[]
}

export async function listFaqs({ category, q, featured, limit = 60 }: { category?: string; q?: string; featured?: boolean; limit?: number } = {}) {
  const payload = await payloadClient()
  const and: Where[] = [notArchived]
  if (category) and.push({ category: { equals: category } })
  if (featured) and.push({ featured: { equals: true } })
  if (q) and.push({ title: { like: q.slice(0, 80) } })
  return (await payload.find({ collection: 'faqs', where: { and }, sort: 'order', limit, depth: 0, ...pub })).docs
}

export async function listMediaItems({ page = 1, limit = 12, type, platform, featured }: { page?: number; limit?: number; type?: string; platform?: string; featured?: boolean } = {}) {
  const payload = await payloadClient()
  const and: Where[] = [notArchived, { contentType: { not_equals: 'channel' } }]
  if (type) and.push({ contentType: { equals: type } })
  if (platform) and.push({ platform: { equals: platform } })
  if (featured) and.push({ homepageFeatured: { equals: true } })
  return payload.find({
    collection: 'media-items',
    where: { and },
    sort: featured ? 'homepageOrder' : '-sourcePublishedAt',
    page,
    limit: Math.min(limit, 24),
    depth: 1,
    ...pub,
  })
}

export async function listSocialAccounts(where: 'showInFooter' | 'showOnContact' | 'showOnMediaPage') {
  const payload = await payloadClient()
  return (await payload.find({ collection: 'social-accounts', where: { [where]: { equals: true } }, sort: 'order', limit: 12, depth: 1, ...pub })).docs
}

/** Public items related to a media item (posts/programs/works/achievements that reference it). */
export async function contentUsingMedia(mediaId: number) {
  const payload = await payloadClient()
  const flags = await getFlags()
  const cols = [
    ['posts', '/berita'],
    ['programs', '/pembelajaran'],
    ['extracurriculars', '/ekstrakurikuler'],
    ['achievements', '/prestasi'],
    ...(flags.studentWorks ? [['student-works', '/karya-siswa']] : []),
  ] as const
  const all = await Promise.all(
    cols.map(async ([c, base]) => {
      const r = await payload.find({ collection: c as 'posts', where: { and: [notArchived, { relatedMedia: { in: [mediaId] } }] }, limit: 4, depth: 0, ...pub })
      return r.docs.map((d) => ({ title: (d as { title: string }).title, href: `${base}/${(d as { slug: string }).slug}` }))
    }),
  )
  return all.flat()
}
