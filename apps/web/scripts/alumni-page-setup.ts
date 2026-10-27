import type { TenantPayload } from '../src/tenancy/scoped'
import { ALUMNI_DEFAULTS as D, type StaticPic } from '../src/lib/alumni-defaults'

/**
 * Copies the starting content of /alumni (IKA KPS) into the CMS global "alumni-page", so editors see and
 * edit real values instead of empty fields. NON-OVERWRITING: only empty fields/lists are filled.
 * `M` maps manifest ids (IKA-<file>, KPS-ALM01) to media ids imported by importMedia.
 */
const ctx = { skipAudit: true }
const fileId = (p: StaticPic) => `IKA-${p.src.split('/').pop()!.replace(/\.jpg$/, '')}`

export async function runAlumniPageSetup(payload: TenantPayload, M: (id: string) => number | undefined) {
  const cur = (await payload.findGlobal({ slug: 'alumni-page', depth: 0, overrideAccess: true })) as unknown as Record<string, unknown>
  const img = (p: StaticPic) => M(fileId(p))
  const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
  const data: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => {
    if (empty(cur[k]) && !empty(v)) data[k] = v
  }

  for (const k of ['eyebrow', 'heading', 'headingAccent', 'tagline', 'intro', 'aboutHeading', 'aboutText', 'committeeNote', 'agendaHeading', 'agendaText', 'photoCredit', 'ctaHeading', 'ctaText'] as const)
    set(k, D[k])
  set('heroImage', img(D.heroImage))
  set('heroCaption', `${D.heroCaption} · Foto: @ika_kps`)
  set('aboutImage', M('KPS-ALM01') ?? img(D.aboutImage))
  set('values', D.values)
  set('committee', D.committee)
  set('activities', D.activities.map((a) => ({ title: a.title, category: a.category, summary: a.summary, url: a.url, image: img(a.image) })))
  set('stories', D.stories.map((s) => ({ title: s.title, text: s.text, url: s.url, image: img(s.image) })))
  set(
    'gallery',
    [
      ...D.gallery.map((g) => ({ image: img(g.image), caption: g.caption })),
      { image: img(D.posters[0]), caption: 'Arsip poster: 8 hari menuju pelantikan' },
      { image: img(D.posters[1]), caption: 'Arsip poster: 7 hari menuju pelantikan' },
    ].filter((g) => g.image),
  )

  const keys = Object.keys(data)
  if (!keys.length) return ['Halaman Alumni (IKA KPS): isi CMS sudah ada, tidak diubah.']
  await payload.updateGlobal({ slug: 'alumni-page', overrideAccess: true, context: ctx, data: data as never })
  return [`Halaman Alumni (IKA KPS): ${keys.length} bagian diisi dengan isi awal (bisa diedit di CMS).`]
}
