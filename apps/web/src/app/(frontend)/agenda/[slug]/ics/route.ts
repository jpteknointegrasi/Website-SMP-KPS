import { hasProduct } from '@satusekolah/core'
import { currentTenant, siteUrl } from '@/lib/payload'
import { findBySlug } from '@/lib/queries'
import { buildIcs } from '@/lib/ics'
import type { Event } from '@/payload-types'

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!hasProduct(await currentTenant(), 'web')) return new Response('Agenda tidak ditemukan', { status: 404 })
  const e = await findBySlug<Event>('events', slug, 0)
  if (!e) return new Response('Agenda tidak ditemukan', { status: 404 })
  const school = await currentTenant()
  const body = buildIcs(e, await siteUrl(), { tz: school?.timezone, schoolName: school?.name })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug.replace(/[^a-z0-9-]/gi, '')}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
