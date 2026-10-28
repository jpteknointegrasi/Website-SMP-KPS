import { after } from 'next/server'
import '@/modules/register'
import { requestCtx } from '@/server/request'
import { getAction } from '@/server/actions'
import { dispatchAction, redirectTo, withMessage } from '@/server/dispatch'
import { processOutbox } from '@/server/outbox'

/** Dispatcher of every portal form (POST /portal/aksi/<name>). Answers with a redirect (post/redirect/get). */
export async function POST(req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { nama } = await params
  const ctx = await requestCtx()
  if (!ctx || !getAction(nama)) return new Response('Tidak ditemukan', { status: 404 })
  let data: FormData
  try {
    data = await req.formData()
  } catch {
    return redirectTo(withMessage('/', 'galat', 'Formulir tidak dapat dibaca (berkas terlalu besar?).'))
  }
  const res = await dispatchAction(ctx, nama, data)
  if (ctx.outboxPending) after(() => processOutbox(ctx.db, ctx.school).catch((e) => console.error('[outbox]', e)))
  return res
}
