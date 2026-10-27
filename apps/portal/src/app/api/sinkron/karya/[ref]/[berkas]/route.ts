import { headers } from 'next/headers'
import { isPortalSync } from '@sekolahku/core'
import { requestCtx } from '@/server/request'
import { readFile } from '@/server/files'
import { syncImage } from '@/modules/works/service'

/** One image of a consented work, for the website's import (server-to-server only). */
export async function GET(_req: Request, { params }: { params: Promise<{ ref: string; berkas: string }> }) {
  const { ref, berkas } = await params
  if (!isPortalSync(await headers())) return new Response('Tidak berwenang', { status: 401 })
  const ctx = await requestCtx()
  const uuid = /^[0-9a-f-]{36}$/
  if (!ctx || !uuid.test(ref) || !uuid.test(berkas)) return new Response('Tidak ditemukan', { status: 404 })
  const f = await syncImage(ctx.db, ref, berkas)
  if (!f) return new Response('Tidak ditemukan', { status: 404 })
  const data = await readFile(f)
  if (!data) return new Response('Tidak ditemukan', { status: 404 })
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': f.mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
