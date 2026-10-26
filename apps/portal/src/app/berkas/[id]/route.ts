import { eq } from 'drizzle-orm'
import { files } from '@/db/schema'
import { requestCtx } from '@/server/request'
import { canReadFile, readFile } from '@/server/files'

/**
 * Private file download. Every request is checked against the record that owns the file (module rules); unknown,
 * deleted or forbidden files all answer 404 so file ids reveal nothing.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requestCtx()
  if (!ctx || !/^[0-9a-f-]{36}$/.test(id)) return new Response('Tidak ditemukan', { status: 404 })
  const [f] = await ctx.db.select().from(files).where(eq(files.id, id))
  if (!f || !(await canReadFile(ctx, f))) return new Response('Tidak ditemukan', { status: 404 })
  const body = await readFile(f)
  if (!body) return new Response('Berkas tidak tersedia', { status: 404 })
  const download = new URL(req.url).searchParams.has('unduh')
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': f.mime,
      'Content-Length': String(body.length),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(f.originalName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  })
}
