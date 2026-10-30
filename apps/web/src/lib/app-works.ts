/**
 * Karya siswa from Sekolahku App (Web↔App, addendum D). For a school that subscribes to the App and has the
 * "Karya siswa" feature on, the scheduler pulls works whose publication consent was given in the App and creates
 * them here as DRAFTS ("Ajukan Review") for editorial moderation — nothing is published automatically. Works whose
 * consent was withdrawn in the App get consentStatus "withdrawn", which hides them from the public site.
 * Calls are server-to-server with the shared secret (PORTAL_SYNC_HEADER); browsers cannot make them.
 */
import { createHash } from 'crypto'
import type { Payload } from 'payload'
import { PORTAL_BASE_PATH, PORTAL_HOST_HEADER, PORTAL_PROXY_HEADER, PORTAL_SYNC_HEADER, hasProduct, type SchoolInfo } from '@sekolahku/core'
import { scopePayload } from '../tenancy/scoped'
import { readFlags } from './flags'

type Feed = {
  works: { ref: string; title: string; category: string; description: string; publicName: string; mentorPublic: string | null; year: number; images: string[]; imported: boolean }[]
  withdrawn: string[]
}

const CATEGORIES = new Set(['tulisan', 'seni', 'sains', 'teknologi', 'video', 'proyek_sosial'])
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Minimal Lexical document with one paragraph per line of text. */
const richText = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, children: [{ type: 'text', text: l, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }] })),
  },
})

export async function syncAppWorks(payload: Payload, school: SchoolInfo, fetcher: typeof fetch = fetch) {
  const origin = process.env.PORTAL_ORIGIN
  const secret = process.env.PORTAL_PROXY_SECRET
  if (!origin || !secret || !hasProduct(school, 'app') || !school.primaryDomain) return { skipped: 'tidak berlangganan App / portal belum diatur' }
  const p = scopePayload(payload, school.id)
  if (!(await readFlags(p)).studentWorks) return { skipped: 'fitur karya siswa nonaktif' }
  const headers = { [PORTAL_HOST_HEADER]: school.primaryDomain, [PORTAL_PROXY_HEADER]: secret, [PORTAL_SYNC_HEADER]: secret }
  const base = `${origin}${PORTAL_BASE_PATH}/api/sinkron/karya`
  const res = await fetcher(base, { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Portal menjawab ${res.status}`)
  const feed = (await res.json()) as Feed
  const imported: string[] = []
  let created = 0
  let hidden = 0
  for (const w of feed.works) {
    const existing = await p.find({ collection: 'student-works', where: { appRef: { equals: w.ref } }, limit: 1, depth: 0, overrideAccess: true, draft: true, trash: true })
    if (existing.docs[0]) {
      if (!w.imported) imported.push(w.ref)
      continue
    }
    const media: number[] = []
    for (const fileId of w.images.slice(0, 6)) {
      const r = await fetcher(`${base}/${w.ref}/${fileId}`, { headers, signal: AbortSignal.timeout(20_000) })
      const mime = (r.headers.get('content-type') ?? '').split(';')[0]!
      if (!r.ok || !EXT[mime]) continue
      const data = Buffer.from(await r.arrayBuffer())
      const sha = createHash('sha256').update(data).digest('hex')
      const dup = await p.find({ collection: 'media', where: { sha256: { equals: sha } }, limit: 1, depth: 0, overrideAccess: true })
      if (dup.docs[0]) {
        media.push(dup.docs[0].id as number)
        continue
      }
      const doc = await p.create({
        collection: 'media',
        overrideAccess: true,
        file: { data, mimetype: mime, name: `karya-${w.ref.slice(0, 8)}-${media.length + 1}.${EXT[mime]}`, size: data.length },
        data: { alt: `Karya siswa: ${w.title}`.slice(0, 200), sha256: sha, consent: 'approved', reviewStatus: 'pending', license: 'Izin publikasi dari orang tua/wali, tercatat di SatuSekolah App.', editorialNote: `Dari SatuSekolah App (karya ${w.ref}).` },
      } as never)
      media.push((doc as { id: number }).id)
    }
    await p.create({
      collection: 'student-works',
      overrideAccess: true,
      draft: true,
      data: {
        title: w.title.slice(0, 140),
        category: CATEGORIES.has(w.category) ? w.category : 'seni',
        excerpt: w.description.slice(0, 220),
        content: richText(w.description),
        creatorsPublic: w.publicName,
        mentorPublic: w.mentorPublic,
        year: w.year,
        cover: media[0] ?? null,
        gallery: media,
        consentStatus: 'obtained',
        appRef: w.ref,
        workflowStatus: 'in_review',
        _status: 'draft',
      },
    } as never)
    imported.push(w.ref)
    created++
  }
  for (const ref of feed.withdrawn) {
    const r = await p.find({ collection: 'student-works', where: { and: [{ appRef: { equals: ref } }, { consentStatus: { not_equals: 'withdrawn' } }] }, limit: 5, depth: 0, overrideAccess: true, trash: true })
    for (const d of r.docs) {
      await p.update({ collection: 'student-works', id: d.id, overrideAccess: true, draft: (d as { _status?: string })._status !== 'published', data: { consentStatus: 'withdrawn' } } as never)
      hidden++
    }
  }
  if (imported.length) await fetcher(base, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ imported }), signal: AbortSignal.timeout(10_000) })
  return { created, hidden }
}
