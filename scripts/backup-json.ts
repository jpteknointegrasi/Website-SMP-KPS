/**
 * Content-level backup of the production database to local JSON files (one file per collection/global).
 *
 *   npm run backup:prod      # uses .env.vercel (DATABASE_URI of production)
 *
 * All schools by default; BACKUP_TENANT=<kode sekolah> limits it to one school (e.g. to hand a school its data).
 *
 * Output: backups/<YYYY-MM-DD_HHmm>/  — contains personal data (leads, bookings, messages):
 * keep it on a protected computer/drive, never in the (public) Git repository. Files in Vercel Blob
 * (photos/documents) are not copied; they stay in Blob storage.
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../src/payload.config'

import { scopePayload } from '../src/tenancy/scoped'

const raw = await getPayload({ config })
const only = process.env.BACKUP_TENANT
const school = only ? (await raw.find({ collection: 'tenants', where: { slug: { equals: only } }, limit: 1, overrideAccess: true })).docs[0] : null
if (only && !school) throw new Error(`Sekolah "${only}" tidak ditemukan`)
const payload = school ? scopePayload(raw, school.id) : raw
const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '')
const dir = path.resolve('backups', stamp)
fs.mkdirSync(dir, { recursive: true })

let total = 0
for (const c of payload.config.collections) {
  if (c.slug.startsWith('payload-')) continue
  const docs: unknown[] = []
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: c.slug as 'posts', limit: 200, page, depth: 0, overrideAccess: true, draft: true, trash: true } as never)
    docs.push(...res.docs)
    if (!res.hasNextPage) break
    page++
  }
  fs.writeFileSync(path.join(dir, `${c.slug}.json`), JSON.stringify(docs, null, 1))
  total += docs.length
  console.log(`${c.slug.padEnd(22)} ${docs.length}`)
}
fs.writeFileSync(path.join(dir, 'README.txt'), `Backup ${stamp}\nBerisi data pribadi (minat, pemesanan kunjungan, pesan). Simpan di tempat aman, jangan diunggah ke GitHub.\nFoto & dokumen tetap di Vercel Blob (tidak ikut disalin).\n`)
console.log(`\nSelesai: ${total} dokumen → ${dir}`)
process.exit(0)
