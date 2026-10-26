import '@/modules/register'
import { requestCtx } from '@/server/request'
import { exportCsv } from '@/modules/dashboard/service'
import { UserError } from '@/server/errors'
import { safePath } from '@/server/paths'
import { BASE } from '@/server/request'

/** Purpose-bound CSV export (POST from the dashboard; same-origin enforced by the proxy). Audited in the service. */
export async function POST(req: Request) {
  const ctx = await requestCtx()
  if (!ctx?.staff) return new Response('Tidak berwenang', { status: 403 })
  const f = await req.formData()
  const back = safePath(f.get('_kembali')) ?? '/staf/dashboard'
  try {
    const { filename, body } = await exportCsv(ctx, String(f.get('jenis') ?? ''), String(f.get('tujuan') ?? ''), { from: String(f.get('dari') ?? '') || undefined, to: String(f.get('sampai') ?? '') || undefined })
    return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } })
  } catch (e) {
    const msg = e instanceof UserError ? e.message : 'Ekspor gagal.'
    if (!(e instanceof UserError)) console.error('[ekspor]', e)
    return new Response(null, { status: 303, headers: { Location: `${BASE}${back}?galat=${encodeURIComponent(msg)}` } })
  }
}
