import { APIError, type CollectionBeforeDeleteHook, type Field, type Where } from 'payload'
import { SINGLETON_COLLECTIONS } from '../tenancy/config'
import { scopeToDoc, type TenantPayload } from '../tenancy/scoped'

/** (collection, field path) pairs that reference the media collection. */
export const MEDIA_REFERENCES: [string, string][] = [
  ['posts', 'cover'],
  ['posts', 'gallery'],
  ['pages', 'cover'],
  ['announcements', 'cover'],
  ['events', 'cover'],
  ['programs', 'cover'],
  ['programs', 'gallery'],
  ['extracurriculars', 'cover'],
  ['extracurriculars', 'gallery'],
  ['facilities', 'cover'],
  ['facilities', 'gallery'],
  ['staff', 'photo'],
  ['achievements', 'cover'],
  ['albums', 'cover'],
  ['albums', 'items.media'],
  ['testimonials', 'photo'],
  ['pages', 'layout.image'], // imageText & highlightBanner blocks
  ['media-items', 'thumbnail'],
  ['student-works', 'cover'],
  ['student-works', 'gallery'],
  ['social-accounts', 'profileImage'],
]

const sameId = (x: unknown, id: number | string) =>
  x !== null && x !== undefined && String(typeof x === 'object' ? ((x as { value?: unknown; id?: unknown }).value ?? (x as { id?: unknown }).id) : x) === String(id)

const refersToMedia = (f: { relationTo?: unknown }) => (Array.isArray(f.relationTo) ? f.relationTo.includes('media') : f.relationTo === 'media')

/** Upload nodes inside a Lexical rich text value. */
const scanRichText = (node: unknown, id: number | string): boolean => {
  if (Array.isArray(node)) return node.some((n) => scanRichText(n, id))
  if (!node || typeof node !== 'object') return false
  const n = node as { type?: string; relationTo?: string; value?: unknown; children?: unknown; root?: unknown }
  if (n.type === 'upload' && n.relationTo === 'media' && sameId(n.value, id)) return true
  return scanRichText(n.root, id) || scanRichText(n.children, id)
}

/**
 * Walks a document along its field config and records every upload/relationship to `media` that points at `id`
 * (also inside tabs, groups, rows, arrays, blocks and rich text). Generic: new image fields in a school's settings,
 * homepage or alumni page are covered without listing them here.
 */
export const scanFields = (fields: readonly Field[], data: unknown, id: number | string, path: string, hits: string[]) => {
  if (!data || typeof data !== 'object') return
  const d = data as Record<string, unknown>
  for (const f of fields) {
    if (f.type === 'tabs') {
      for (const t of f.tabs) 'name' in t && t.name ? scanFields(t.fields, d[t.name], id, `${path}.${t.name}`, hits) : scanFields(t.fields, d, id, path, hits)
      continue
    }
    if (!('name' in f) || !f.name) {
      if ('fields' in f && Array.isArray(f.fields)) scanFields(f.fields, d, id, path, hits)
      continue
    }
    const v = d[f.name]
    const here = `${path}.${f.name}`
    if (f.type === 'upload' || f.type === 'relationship') {
      if (refersToMedia(f) && (Array.isArray(v) ? v : [v]).some((x) => sameId(x, id))) hits.push(here)
    } else if (f.type === 'group') scanFields(f.fields, v, id, here, hits)
    else if (f.type === 'array' && Array.isArray(v)) v.forEach((row, i) => scanFields(f.fields, row, id, `${here}[${i}]`, hits))
    else if (f.type === 'blocks' && Array.isArray(v))
      v.forEach((row, i) => {
        const block = (f.blocks ?? []).find((b) => b.slug === (row as { blockType?: string })?.blockType)
        if (block) scanFields(block.fields, row, id, `${here}[${i}]`, hits)
      })
    else if (f.type === 'richText' && scanRichText(v, id)) hits.push(here)
  }
}

/** Where a media file is used, within its own school (cross-school references are impossible by design). */
export const findMediaUsage = async (payload: TenantPayload, id: number | string) => {
  const usages: string[] = []
  for (const [collection, path] of MEDIA_REFERENCES) {
    const where: Where = { [path]: { equals: id } }
    const res = await payload.find({
      collection: collection as 'posts',
      where,
      limit: 5,
      depth: 0,
      draft: true,
      overrideAccess: true,
      trash: true,
    } as Parameters<typeof payload.find>[0])
    for (const d of res.docs) usages.push(`${collection}: ${(d as { title?: string; name?: string }).title ?? (d as { name?: string }).name ?? d.id}`)
  }
  // every per-school settings document (former globals: site-settings, homepage, navigation, alumni page, …),
  // both the published version and the latest draft, so neither the live page nor a pending draft loses an image
  for (const slug of SINGLETON_COLLECTIONS) {
    const cfg = payload.config.collections.find((c) => c.slug === slug)
    if (!cfg) continue
    const hits = new Set<string>()
    for (const draft of [false, true]) {
      const g = await payload.findGlobal({ slug, depth: 0, draft, overrideAccess: true })
      const found: string[] = []
      scanFields(cfg.fields, g, id, slug, found)
      found.forEach((h) => hits.add(h))
    }
    usages.push(...hits)
  }
  return usages
}

export const blockDeleteIfUsed: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (req.context?.forceMediaDelete) return
  const media = await req.payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true, trash: true, disableErrors: true, req })
  if (!media) return
  const usages = await findMediaUsage(scopeToDoc(req.payload, media as never), id)
  if (usages.length) {
    throw new APIError(
      `Media masih dipakai (${usages.slice(0, 5).join('; ')}${usages.length > 5 ? '; …' : ''}). Ganti gambar di konten tersebut terlebih dahulu.`,
      409,
      null,
      true,
    )
  }
}
