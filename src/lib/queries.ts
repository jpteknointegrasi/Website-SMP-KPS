import 'server-only'
import type { Where } from 'payload'
import { payloadClient } from './payload'
import type {
  Homepage,
  Navigation,
  SiteSetting,
  Post,
  Announcement,
  Event,
} from '@/payload-types'

/**
 * Public data access. Every query runs with overrideAccess:false and no user,
 * so collection access rules (published only, demo filtering, scheduled publishedAt)
 * are enforced exactly as for the REST API. Results are always paginated.
 */
const pub = { overrideAccess: false as const, draft: false as const }
const nowIso = () => new Date().toISOString()

/** Archive filtering is enforced by collection read access (see access/roles.ts publishedOrStaff). */
export const notArchived: Where = { id: { exists: true } }

export async function getGlobals() {
  const payload = await payloadClient()
  const [settings, nav] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', depth: 1, ...pub }) as Promise<SiteSetting>,
    payload.findGlobal({ slug: 'navigation', depth: 0, ...pub }) as Promise<Navigation>,
  ])
  return { settings, nav }
}

export async function getHomepage() {
  const payload = await payloadClient()
  return (await payload.findGlobal({ slug: 'homepage', depth: 1, ...pub })) as Homepage
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

export async function listEvents({ from, to, page = 1, status, sort = 'startAt' }: { from?: string; to?: string; page?: number; status?: string; sort?: string }) {
  const payload = await payloadClient()
  const and: Where[] = [notArchived]
  if (from) and.push({ startAt: { greater_than_equal: from } })
  if (to) and.push({ startAt: { less_than: to } })
  if (status) and.push({ eventStatus: { equals: status } })
  return payload.find({ collection: 'events', where: { and }, sort, page, limit: 20, depth: 0, ...pub })
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
  pages: { label: 'Halaman', base: '' },
} as const

export async function search(q: string, type?: string, page = 1) {
  const query = q.trim().slice(0, 80)
  if (query.length < 2) return { results: [], total: 0, totalPages: 0 }
  const payload = await payloadClient()
  const types = (type && type in SEARCH_TYPES ? [type] : Object.keys(SEARCH_TYPES)) as (keyof typeof SEARCH_TYPES)[]
  const all = (
    await Promise.all(
      types.map(async (t) => {
        const res = await payload.find({
          collection: t,
          where: { and: [notArchived, { or: [{ title: { like: query } }, { excerpt: { like: query } }] }] },
          limit: 30,
          depth: 0,
          ...pub,
        })
        return res.docs.map((d) => {
          const doc = d as { id: number; title: string; slug: string; excerpt?: string | null; updatedAt: string; publishedAt?: string | null }
          const href = t === 'pages' ? pagePath(doc.slug) : `${SEARCH_TYPES[t].base}/${doc.slug}`
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
