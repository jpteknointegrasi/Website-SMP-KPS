import { after } from 'next/server'
import '@/modules/register'
import { BASE, requestCtx } from '@/server/request'
import { Form, getAction } from '@/server/actions'
import { UserError } from '@/server/errors'
import { processOutbox } from '@/server/outbox'
import { safePath } from '@/server/paths'

function withMessage(path: string, key: 'ok' | 'galat', msg?: string, field?: string) {
  const [p, q = ''] = path.split('?')
  const sp = new URLSearchParams(q)
  sp.delete('ok')
  sp.delete('galat')
  sp.delete('kolom')
  if (msg) sp.set(key, msg)
  if (field) sp.set('kolom', field)
  const qs = sp.toString()
  return `${p}${qs ? `?${qs}` : ''}`
}

const go = (path: string, cookies: { name: string; value: string; maxAge: number }[] = []) => {
  const h = new Headers({ Location: `${BASE}${path}`, 'Cache-Control': 'no-store' })
  // PORTAL_INSECURE_COOKIES=true only for local testing over plain http
  const secure = process.env.NODE_ENV === 'production' && process.env.PORTAL_INSECURE_COOKIES !== 'true' ? '; Secure' : ''
  for (const c of cookies) h.append('Set-Cookie', `${c.name}=${c.value}; Path=${BASE}; HttpOnly; SameSite=Lax; Max-Age=${c.maxAge}${secure}`)
  return new Response(null, { status: 303, headers: h })
}

/** Dispatcher of every portal form (POST /portal/aksi/<name>). Answers with a redirect (post/redirect/get). */
export async function POST(req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { nama } = await params
  const ctx = await requestCtx()
  const handler = getAction(nama)
  if (!ctx || !handler) return new Response('Tidak ditemukan', { status: 404 })
  let data: FormData
  try {
    data = await req.formData()
  } catch {
    return go(withMessage('/', 'galat', 'Formulir tidak dapat dibaca (berkas terlalu besar?).'))
  }
  const back = safePath(data.get('_kembali')) ?? '/'
  if (ctx.staff?.support) return go(withMessage(back, 'galat', 'Akses bantuan teknis hanya untuk melihat.'))
  let res: Response
  try {
    const r = await handler(ctx, new Form(data))
    const target = (r && r.redirect && safePath(r.redirect)) || back
    res = go(withMessage(target, 'ok', r ? r.message : undefined), r ? r.cookies : undefined)
  } catch (e) {
    if (e instanceof UserError) {
      if (e.code === 'unauthenticated') res = go(`${ctx.staff ? '/masuk-staf' : '/masuk'}?lanjut=${encodeURIComponent(BASE + back)}`)
      else res = go(withMessage(back, 'galat', e.message, e.field))
    } else {
      console.error(`[aksi ${nama}]`, e)
      res = go(withMessage(back, 'galat', 'Terjadi gangguan saat menyimpan. Coba lagi beberapa saat lagi.'))
    }
  }
  if (ctx.outboxPending) after(() => processOutbox(ctx.db, ctx.school).catch((e) => console.error('[outbox]', e)))
  return res
}
