import { getPayload } from 'payload'
import config from '@payload-config'
import { runSeed } from '../../../../scripts/seed-core'
import { isAdmin } from '@/access/roles'

/**
 * Admin-only page that fills the production database with the initial content and photos
 * from content/ (same idempotent seed as `npm run seed`). Works in small time-boxed steps so it
 * fits serverless limits; the page reloads itself until everything is imported.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const page = (title: string, body: string, refresh = false) =>
  new Response(
    `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${refresh ? '<meta http-equiv="refresh" content="2">' : ''}<title>${title}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#172b3a}h1{color:#142a46;font-size:1.5rem}.box{padding:16px 20px;border-radius:12px;background:#eaf5f2;margin:16px 0}.warn{background:#fff7e0}a.btn{display:inline-block;padding:10px 18px;border-radius:10px;background:#167467;color:#fff;text-decoration:none;font-weight:700}progress{width:100%;height:14px}</style></head><body>${body}</body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } },
  )

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user || !isAdmin(user)) {
    return page(
      'Isi data awal',
      `<h1>Isi data awal website</h1><div class="box warn">Halaman ini hanya untuk <b>Admin Teknis</b>. Masuk dulu ke panel admin (atau buat akun pertama), lalu buka lagi halaman ini.</div><p><a class="btn" href="/admin">Buka panel admin</a></p>`,
    )
  }

  const started = Date.now()
  const lines: string[] = []
  const result = await runSeed(payload, (m) => lines.push(m), { deadline: started + 35_000 })
  const total = result.media.created + result.media.skipped + result.media.remaining + result.media.failed
  const doneMedia = total - result.media.remaining
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

  if (!result.done) {
    return page(
      'Mengisi data…',
      `<h1>Mengisi data awal…</h1><div class="box"><p>Foto: <b>${doneMedia}</b> dari <b>${total}</b> sudah diunggah.</p><progress max="${total}" value="${doneMedia}"></progress><p>Halaman ini memuat ulang otomatis. Jangan ditutup sampai muncul tulisan <b>Selesai</b>.</p></div>`,
      true,
    )
  }
  return page(
    'Selesai',
    `<h1>Selesai ✅</h1><div class="box"><p>Konten awal dan ${total} foto sudah ada di website. Halaman ini aman dibuka lagi — data tidak akan digandakan.</p></div><p><a class="btn" href="/">Lihat website</a> &nbsp; <a href="/admin">Panel admin</a></p><details><summary>Catatan proses</summary><pre style="white-space:pre-wrap;font-size:13px">${esc(lines.join('\n'))}</pre></details>`,
  )
}
