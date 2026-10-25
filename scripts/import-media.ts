/**
 * Idempotent media importer: one media record per SHA-256 checksum.
 * Usage: npm run import:media   (re-running creates no duplicates)
 */
import 'dotenv/config'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

type Asset = {
  id: string
  file: string
  web_file?: string
  url: string
  page: string
  width: number
  height: number
  sha256: string
  downloaded_at: string
  visual_description: string
  editorial_note: string
  recommended_use: string
}

const ROOT = path.resolve(process.cwd(), 'content')

/** Human-written alt text based on what is visibly in each photo (not file names). */
export const ALT: Record<string, string> = {
  'KPS-001': 'Logo SMP Nasional KPS',
  'KPS-002': 'Potret pimpinan sekolah, pria berkacamata mengenakan jas',
  'KPS-003': 'Potret pimpinan sekolah, pria mengenakan jas',
  'KPS-004': 'Potret pimpinan sekolah, perempuan berhijab mengenakan jas',
  'KPS-005': 'Penyerahan penghargaan dengan papan hadiah dan piala',
  'KPS-006': 'Tangkapan layar pertemuan belajar daring',
  'KPS-007': 'Penyerahan bendera kepada petugas pengibar dalam upacara di halaman sekolah',
  'KPS-008': 'Siswa berseragam pramuka berbaris di lapangan berumput dekat tenda',
  'KPS-009': 'Siswa berbusana putih berfoto bersama di panggung acara wisuda tahfidz',
  'KPS-010': 'Siswa berseragam putih dan pendamping berfoto bersama di halaman sekolah',
  'KPS-011': 'Siswa berbusana putih berfoto di depan bangunan bercorak biru',
  'KPS-012': 'Rombongan siswa berfoto di tangga lokasi kunjungan',
  'KPS-013': 'Petugas dan warga sekolah berdiri di koridor sekolah',
  'KPS-014': 'Ikon jabat tangan dan percakapan',
  'KPS-015': 'Ikon diskusi kelompok',
  'KPS-016': 'Ikon bendera merah putih',
  'KPS-017': 'Siswa berseragam dengan selempang berfoto bersama',
  'KPS-018': 'Guru menyerahkan apresiasi kepada siswa di halaman sekolah',
  'KPS-019': 'Guru dan kelompok siswa berfoto bersama memegang piala',
  'KPS-020': 'Kelompok peserta berkaus hijau berfoto bersama di dalam ruangan',
  'KPS-021': 'Guru dan siswa memegang piala di halaman sekolah',
  'KPS-022': 'Siswa berseragam dan selempang berdiri di depan lemari piala',
  'KPS-023': 'Kelompok peserta kegiatan berfoto di depan bangunan biru',
  'KPS-024': 'Penyerahan apresiasi kepada peserta berpakaian adat di lapangan',
  'KPS-025': 'Kelompok peserta berfoto bersama pendamping',
  'KPS-026': 'Foto bersama di panggung bertuliskan KPS 9',
  'KPS-027': 'Warga sekolah berpakaian batik dan kebaya berfoto bersama di halaman sekolah',
  'KPS-028': 'Banner sekolah: guru dan siswa dengan globe, bertuliskan Belajar bersama, menjelajah dunia dengan ilmu',
  'KPS-029': 'Kelompok berseragam merah dan biru berfoto di depan bangunan sekolah',
  'KPS-030': 'Halaman dan taman sekolah dengan siswa berbaris dalam kegiatan pagi',
  'KPS-031': 'Interior ruangan gelap dengan jendela',
}
const BLOCKED = new Set(['KPS-005', 'KPS-006', 'KPS-031'])

export async function importMedia(payload: Payload, log = console.log) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-manifest.json'), 'utf8')) as { assets: Asset[] }
  const result = { created: 0, skipped: 0, failed: 0, ids: {} as Record<string, number | string> }
  for (const a of manifest.assets) {
    const filePath = path.join(ROOT, a.file)
    try {
      const sha = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
      if (sha !== a.sha256) log(`! ${a.id}: checksum berbeda dari manifest (${sha.slice(0, 10)}…)`)
      const existing = await payload.find({ collection: 'media', where: { sha256: { equals: sha } }, limit: 1, depth: 0, overrideAccess: true })
      if (existing.docs[0]) {
        result.ids[a.id] = existing.docs[0].id
        result.skipped++
        continue
      }
      const doc = await payload.create({
        collection: 'media',
        overrideAccess: true,
        filePath,
        context: { skipAudit: true },
        data: {
          alt: ALT[a.id] ?? a.visual_description,
          sourceId: a.id,
          sourceUrl: a.url,
          sourcePage: a.page,
          originalFilename: path.basename(a.file),
          downloadedAt: a.downloaded_at,
          sha256: sha,
          license: 'Aset website resmi sekolah; khusus perancangan ulang situs sekolah yang sama.',
          consent: 'unknown',
          reviewStatus: BLOCKED.has(a.id) ? 'blocked' : 'pending',
          editorialNote: `${a.recommended_use}. ${a.editorial_note}`,
        },
      })
      result.ids[a.id] = doc.id
      result.created++
      log(`+ ${a.id} → media #${doc.id}`)
    } catch (e) {
      result.failed++
      log(`x ${a.id}: ${(e as Error).message}`)
    }
  }
  log(`Import media: ${result.created} baru, ${result.skipped} sudah ada (checksum), ${result.failed} gagal.`)
  return result
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith('import-media.ts')
if (isMain) {
  const { getPayload } = await import('payload')
  const config = (await import('../src/payload.config')).default
  const payload = await getPayload({ config })
  const res = await importMedia(payload)
  fs.writeFileSync(path.resolve('content/media-import-report.json'), JSON.stringify(res, null, 2))
  process.exit(res.failed ? 1 : 0)
}
