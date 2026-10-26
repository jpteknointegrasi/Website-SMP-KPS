import { and, eq } from 'drizzle-orm'
import { files } from '@/db/schema'
import { requestCtx } from '@/server/request'
import { readFile } from '@/server/files'

/** Public files of the school (logo, photo for sign-in pages). Only files classified "public" are served here. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requestCtx()
  if (!ctx || !/^[0-9a-f-]{36}$/.test(id)) return new Response('Tidak ditemukan', { status: 404 })
  const [f] = await ctx.db.select().from(files).where(and(eq(files.id, id), eq(files.classification, 'public')))
  if (!f || f.deletedAt) return new Response('Tidak ditemukan', { status: 404 })
  const body = await readFile(f)
  if (!body) return new Response('Tidak ditemukan', { status: 404 })
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff' },
  })
}
