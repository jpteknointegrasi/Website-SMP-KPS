import { findBySlug } from '@/lib/queries'
import { buildIcs } from '@/lib/ics'
import type { Event } from '@/payload-types'

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const e = await findBySlug<Event>('events', slug, 0)
  if (!e) return new Response('Agenda tidak ditemukan', { status: 404 })
  const body = buildIcs(e, process.env.NEXT_PUBLIC_SERVER_URL || '')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug.replace(/[^a-z0-9-]/gi, '')}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
