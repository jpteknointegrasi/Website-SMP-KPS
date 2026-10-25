import { APIError, type CollectionBeforeDeleteHook, type Where } from 'payload'

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
]

const GLOBAL_IMAGE_KEYS = new Set(['image', 'imageMobile', 'logo', 'logoDark', 'accentImages', 'ogImage', 'introImage', 'cover'])

const scan = (node: unknown, id: number | string, hits: string[], path: string) => {
  if (Array.isArray(node)) node.forEach((n, i) => scan(n, id, hits, `${path}[${i}]`))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (GLOBAL_IMAGE_KEYS.has(k)) {
        const vals = Array.isArray(v) ? v : [v]
        if (vals.some((x) => x === id || (x && typeof x === 'object' && (x as { id?: unknown }).id === id))) hits.push(`${path}.${k}`)
      }
      scan(v, id, hits, `${path}.${k}`)
    }
  }
}

export const findMediaUsage = async (payload: import('payload').Payload, id: number | string) => {
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
  for (const slug of ['site-settings', 'homepage'] as const) {
    const g = await payload.findGlobal({ slug, depth: 0, draft: true, overrideAccess: true })
    const hits: string[] = []
    scan(g, id, hits, slug)
    usages.push(...hits)
  }
  return usages
}

export const blockDeleteIfUsed: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (req.context?.forceMediaDelete) return
  const usages = await findMediaUsage(req.payload, id)
  if (usages.length) {
    throw new APIError(
      `Media masih dipakai (${usages.slice(0, 5).join('; ')}${usages.length > 5 ? '; …' : ''}). Ganti gambar di konten tersebut terlebih dahulu.`,
      409,
      null,
      true,
    )
  }
}
