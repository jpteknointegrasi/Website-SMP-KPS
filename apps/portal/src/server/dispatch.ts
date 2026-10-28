/**
 * The form-action dispatcher behind POST /portal/aksi/<name>, separated from the route so it can be tested with a
 * real Ctx: guards (support read-only, Super Admin governance only) → handler → redirect
 * (post/redirect/get) with a message.
 */
import { Form, getAction } from './actions'
import type { Ctx } from './context'
import { UserError } from './errors'
import { safePath } from './paths'

const BASE = '/portal'

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

/** Form actions of the platform Super Admin's governance mode (settings, modules, staff & roles, own notifications). */
export const PLATFORM_ACTIONS = /^(pengaturan|staf|bantuan)\.|^notifikasi\.baca$/

export async function dispatchAction(ctx: Ctx, nama: string, data: FormData): Promise<Response> {
  const handler = getAction(nama)
  if (!handler) return new Response('Tidak ditemukan', { status: 404 })
  const back = safePath(data.get('_kembali')) ?? '/'
  if (ctx.staff?.support) return go(withMessage(back, 'galat', 'Akses bantuan teknis hanya untuk melihat.'))
  // the Super Admin acts in governance mode only (data screens it may see under a grant are read-only); command()
  // enforces the same rule for every write, this answers early with a clear message
  if (ctx.staff?.platform && !PLATFORM_ACTIONS.test(nama))
    return go(withMessage(back, 'galat', 'Super Admin platform hanya dapat mengubah pengaturan sekolah, aktivasi modul, serta staf & peran.'))
  try {
    const r = await handler(ctx, new Form(data))
    const target = (r && r.redirect && safePath(r.redirect)) || back
    return go(withMessage(target, 'ok', r ? r.message : undefined), r ? r.cookies : undefined)
  } catch (e) {
    if (e instanceof UserError) {
      if (e.code === 'unauthenticated') return go(`${ctx.staff ? '/masuk-staf' : '/masuk'}?lanjut=${encodeURIComponent(BASE + back)}`)
      return go(withMessage(back, 'galat', e.message, e.field))
    }
    console.error(`[aksi ${nama}]`, e)
    return go(withMessage(back, 'galat', 'Terjadi gangguan saat menyimpan. Coba lagi beberapa saat lagi.'))
  }
}

export { withMessage, go as redirectTo }
