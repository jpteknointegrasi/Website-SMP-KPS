import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { del, list } from '@vercel/blob'
import { runSeed } from '../../../../scripts/seed-core'
import { runAddendumSetup } from '../../../../scripts/addendum-setup'
import { isAdmin } from '@/access/roles'

/**
 * Admin-only page that fills the production database with the initial content and photos
 * from content/ (same idempotent seed as `npm run seed`). Works in small time-boxed steps so it
 * fits serverless limits; the page reloads itself until everything is imported.
 *
 * POST (from the confirmation button) re-imports the initial photos: it deletes only media that came
 * from the import (sourceId set) plus their blobs, then the GET flow uploads them again.
 * POST-only so a link on another site cannot trigger it (session cookie is SameSite=Lax).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STEP_MS = 35_000

const page = (title: string, body: string, opts: { refresh?: boolean; autoPost?: boolean } = {}) =>
  new Response(
    `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${opts.refresh ? '<meta http-equiv="refresh" content="2;url=/setup/isi-data?jalankan=1">' : ''}<title>${title}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#172b3a}h1{color:#142a46;font-size:1.5rem}.box{padding:16px 20px;border-radius:12px;background:#eaf5f2;margin:16px 0}.warn{background:#fff7e0}a.btn,button{display:inline-block;padding:10px 18px;border-radius:10px;border:0;background:#167467;color:#fff;text-decoration:none;font:700 15px system-ui,sans-serif;cursor:pointer}button.danger{background:#b42318}progress{width:100%;height:14px}small{color:#526170}</style></head><body>${body}${
      opts.autoPost ? '<form method="post" id="next"><input type="hidden" name="aksi" value="ulang-foto"></form><script>setTimeout(function(){document.getElementById("next").submit()},1200)</script>' : ''
    }</body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } },
  )

const notAdmin = () =>
  page(
    'Isi data awal',
    `<h1>Isi data awal website</h1><div class="box warn">Halaman ini hanya untuk <b>Admin Teknis</b>. Masuk dulu ke panel admin (atau buat akun pertama), lalu buka lagi halaman ini.</div><p><a class="btn" href="/admin">Buka panel admin</a></p>`,
  )

const noBlobToken = () =>
  page(
    'Token Blob belum ada',
    `<h1>Belum bisa mengisi foto</h1><div class="box warn"><p>Variabel <b>BLOB_READ_WRITE_TOKEN</b> belum terpasang di Vercel, jadi foto tidak bisa disimpan.</p><ol><li>Vercel → Storage → <b>kps-files</b> → <i>Show secret</i> → salin nilai <code>vercel_blob_rw_…</code></li><li>Settings → Environment Variables → <b>Add</b>: key <code>BLOB_READ_WRITE_TOKEN</code>, centang Production &amp; Preview → Save</li><li>Deployments → ⋯ → <b>Redeploy</b>, tunggu Ready, lalu buka halaman ini lagi.</li></ol></div>`,
  )

async function authorize(req: Request): Promise<{ payload: Payload } | Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user || !isAdmin(user)) return notAdmin()
  // On Vercel the server disk is read-only/ephemeral: photos must go to Vercel Blob.
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) return noBlobToken()
  return { payload }
}

export async function GET(req: Request) {
  const auth = await authorize(req)
  if (auth instanceof Response) return auth
  const { payload } = auth

  // Menu first: the full seed resets initial texts (homepage, navigation). It runs only when chosen explicitly.
  if (new URL(req.url).searchParams.get('jalankan') !== '1') {
    const hasContent = (await payload.count({ collection: 'posts', overrideAccess: true })).totalDocs > 0
    return page(
      'Isi data',
      `<h1>Data website</h1>
<div class="box"><h2 style="font-size:1.1rem;margin-top:0">Data fitur tambahan</h2><p>Kategori agenda, FAQ penggunaan website, akun media sosial, tautan menu dan section KPS TV. <b>Hanya menambah yang belum ada</b> — aman untuk website yang sudah dipakai.</p>
<form method="post"><input type="hidden" name="aksi" value="fitur-tambahan"><button type="submit">Pasang data fitur tambahan</button></form></div>
<div class="box ${hasContent ? 'warn' : ''}"><h2 style="font-size:1.1rem;margin-top:0">Konten & foto awal</h2><p>${
        hasContent
          ? 'Website sudah berisi. Menjalankan ini <b>mengembalikan teks awal</b> (beranda, navigasi, berita impor) — perubahan staf pada bagian itu akan tertimpa.'
          : 'Mengunggah 35 foto resmi dan konten awal. Memuat ulang sendiri sampai selesai.'
      }</p><p><a class="btn" href="/setup/isi-data?jalankan=1"${hasContent ? ` onclick="return confirm('Teks awal akan menimpa perubahan staf. Lanjutkan?')"` : ''}>${hasContent ? 'Isi ulang konten awal' : 'Mulai isi data awal'}</a></p></div>
<p><a href="/admin">Kembali ke panel admin</a></p>`,
    )
  }

  const started = Date.now()
  const lines: string[] = []
  const result = await runSeed(payload, (m) => lines.push(m), { deadline: started + STEP_MS })
  const total = result.media.created + result.media.skipped + result.media.remaining + result.media.failed
  const doneMedia = total - result.media.remaining
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

  if (!result.done) {
    return page(
      'Mengisi data…',
      `<h1>Mengisi data awal…</h1><div class="box"><p>Foto: <b>${doneMedia}</b> dari <b>${total}</b> sudah diunggah.</p><progress max="${total}" value="${doneMedia}"></progress><p>Halaman ini memuat ulang otomatis. Jangan ditutup sampai muncul tulisan <b>Selesai</b>.</p></div>`,
      { refresh: true },
    )
  }
  return page(
    'Selesai',
    `<h1>Selesai ✅</h1><div class="box"><p>Konten awal dan ${total} foto sudah ada di website. Halaman ini aman dibuka lagi — data tidak akan digandakan.</p></div><p><a class="btn" href="/">Lihat website</a> &nbsp; <a href="/admin">Panel admin</a></p>
<hr style="margin:32px 0;border:0;border-top:1px solid #dfe6eb"><h2 style="font-size:1.1rem">Foto tidak tampil?</h2><p><small>Unggah ulang foto hasil impor awal (${total} foto). Foto yang diunggah staf sendiri tidak ikut terhapus. Konten akan langsung dihubungkan ke foto yang baru.</small></p>
<form method="post" onsubmit="return confirm('Unggah ulang semua foto impor awal?')"><input type="hidden" name="aksi" value="ulang-foto"><button class="danger" type="submit">Unggah ulang foto</button></form>
<details style="margin-top:24px"><summary>Catatan proses</summary><pre style="white-space:pre-wrap;font-size:13px">${esc(lines.join('\n'))}</pre></details>`,
  )
}

export async function POST(req: Request) {
  const auth = await authorize(req)
  if (auth instanceof Response) return auth
  const { payload } = auth
  const form = await req.formData().catch(() => null)
  if (form?.get('aksi') === 'fitur-tambahan') {
    const lines = await runAddendumSetup(payload, undefined, { deadline: Date.now() + STEP_MS })
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
    return page(
      'Fitur tambahan siap',
      `<h1>Data fitur tambahan siap ✅</h1><div class="box"><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p>Tidak ada konten lama yang ditimpa. Nyalakan fitur di <b>Pengaturan → Fitur Aktif</b> setelah datanya siap.</p></div><p><a class="btn" href="/admin/globals/feature-flags">Buka Fitur Aktif</a> &nbsp; <a href="/">Lihat website</a></p>`,
    )
  }
  if (form?.get('aksi') !== 'ulang-foto') return new Response('Permintaan tidak dikenal', { status: 400 })

  const deadline = Date.now() + STEP_MS
  // 1) delete media records created by the initial import (sourceId set); staff uploads are kept
  const imported = await payload.find({
    collection: 'media',
    where: { sourceId: { exists: true } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  let deleted = 0
  for (const d of imported.docs) {
    if (Date.now() > deadline) break
    try {
      await payload.delete({ collection: 'media', id: d.id, overrideAccess: true, context: { forceMediaDelete: true, skipAudit: true } })
    } catch (e) {
      payload.logger.warn(`Hapus media #${d.id}: ${(e as Error).message}`)
    }
    deleted++
  }
  const left = imported.totalDocs - deleted
  if (left > 0) {
    return page(
      'Menghapus foto lama…',
      `<h1>Menyiapkan unggah ulang…</h1><div class="box"><p>Menghapus foto lama: tersisa <b>${left}</b>.</p><p>Halaman ini lanjut otomatis.</p></div>`,
      { autoPost: true },
    )
  }

  // 2) remove leftover blobs under media/ (e.g. variants stored with a random suffix)
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    const keep = new Set<string>()
    const staff = await payload.find({ collection: 'media', limit: 1000, depth: 0, overrideAccess: true })
    staff.docs.forEach((m) => {
      const doc = m as { url?: string | null; sizes?: Record<string, { url?: string | null }> }
      if (doc.url) keep.add(doc.url)
      Object.values(doc.sizes ?? {}).forEach((s) => s?.url && keep.add(s.url))
    })
    let cursor: string | undefined
    do {
      const res = await list({ prefix: 'media/', cursor, limit: 1000, token })
      const stale = res.blobs.map((b) => b.url).filter((u) => !keep.has(u))
      if (stale.length) await del(stale, { token })
      cursor = res.hasMore ? res.cursor : undefined
    } while (cursor && Date.now() < deadline)
  }

  // 3) back to the import flow, which uploads the photos again and relinks content
  return new Response(null, { status: 303, headers: { location: '/setup/isi-data?jalankan=1', 'cache-control': 'no-store' } })
}
