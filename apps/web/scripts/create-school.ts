/**
 * Onboarding a new school from the command line (the Super Admin can do the same in the CMS: Platform → Sekolah).
 *
 *   npm run sekolah:baru -- --nama "SMA Negeri 1 Contoh" --kode sman1 --zona Asia/Jakarta \
 *        --domain www.sman1contoh.sch.id --paket basic --admin kepala.tu@sman1contoh.sch.id
 *
 *   --kode    subdomain/kode sekolah (huruf kecil, angka, tanda hubung) — wajib
 *   --nama    nama sekolah — wajib
 *   --zona    Asia/Jakarta (WIB, bawaan) | Asia/Makassar (WITA) | Asia/Jayapura (WIT)
 *   --domain  domain sekolah (boleh diulang); tanpa domain sekolah tetap bisa dibuka di <kode>.PLATFORM_ROOT_DOMAIN
 *   --paket   paket Sekolahku Web: basic (bawaan) | pro | none
 *   --app     paket Sekolahku App: none (bawaan) | pilot | standard
 *   --status  trial (bawaan) | active
 *   --admin   email Admin Teknis sekolah; kata sandi sementara dicetak SEKALI di layar
 *
 * Uses .env (DATABASE_URI). Creates the school, its settings/menu/feature documents (automatic), and optionally
 * its first admin account. Re-running with an existing --kode changes nothing and says so.
 */
import 'dotenv/config'
import { randomBytes } from 'crypto'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { isSchoolTimezone } from '../src/tenancy/config'

const args = process.argv.slice(2)
const all = (name: string) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]!] : []))
const one = (name: string) => all(name)[0]

const slug = one('kode')?.toLowerCase()
const name = one('nama')
const zone = one('zona') ?? 'Asia/Jakarta'
const plan = one('paket') ?? 'basic'
const appPlan = one('app') ?? 'none'
const status = one('status') ?? 'trial'
const domains = all('domain')
const adminEmail = one('admin')?.toLowerCase()

const fail = (m: string) => {
  console.error(`✗ ${m}`)
  process.exit(1)
}
if (!slug || !name) fail('Wajib: --kode dan --nama. Lihat contoh di bagian atas scripts/create-school.ts.')
if (!isSchoolTimezone(zone)) fail('--zona harus Asia/Jakarta, Asia/Makassar atau Asia/Jayapura.')
if (!['none', 'basic', 'pro'].includes(plan)) fail('--paket (Sekolahku Web) harus none, basic atau pro.')
if (!['none', 'pilot', 'standard'].includes(appPlan)) fail('--app (Sekolahku App) harus none, pilot atau standard.')
if (!['trial', 'active'].includes(status)) fail('--status harus trial atau active.')

const payload = await getPayload({ config })
const existing = await payload.find({ collection: 'tenants', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
if (existing.docs[0]) {
  console.log(`Sekolah dengan kode "${slug}" sudah ada (id ${existing.docs[0].id}). Tidak ada yang diubah.`)
  process.exit(0)
}

const school = await payload.create({
  collection: 'tenants',
  overrideAccess: true,
  data: { name: name!, slug: slug!, timezone: zone as never, web: { plan, status: 'active' } as never, app: { plan: appPlan, status: 'trial' } as never, status: status as never, domains: domains.map((domain, i) => ({ domain, primary: i === 0 })) },
})
console.log(`✓ Sekolah "${school.name}" dibuat (id ${school.id}, kode ${school.slug}). Pengaturan, menu dan fitur awal sudah disiapkan.`)

if (adminEmail) {
  // SCHOOL_ADMIN_PASSWORD (e.g. Preview setup) is used as given and never printed
  const given = process.env.SCHOOL_ADMIN_PASSWORD
  const password = given || randomBytes(12).toString('base64url')
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: { email: adminEmail, password, name: 'Admin Teknis', role: 'admin', tenant: school.id } as never,
  })
  console.log(`✓ Akun Admin Teknis: ${adminEmail}`)
  if (!given) console.log(`  Kata sandi sementara (hanya ditampilkan sekali): ${password}`)
  console.log('  Minta admin sekolah segera menggantinya setelah masuk.')
}

const root = process.env.PLATFORM_ROOT_DOMAIN
console.log('\nLangkah berikutnya:')
if (domains.length) console.log(`  1. Arahkan DNS ${domains.join(', ')} ke Vercel dan tambahkan domain itu di Vercel → Project → Domains.`)
else if (root) console.log(`  1. Sekolah bisa dibuka di https://${slug}.${root} (pastikan wildcard *.${root} sudah diarahkan ke Vercel).`)
else console.log('  1. Tambahkan domain sekolah di CMS (Platform → Sekolah) atau isi PLATFORM_ROOT_DOMAIN untuk subdomain otomatis.')
console.log('  2. Admin sekolah masuk ke /admin di alamat sekolahnya, mengisi Pengaturan Sekolah (logo, kontak) lalu')
console.log('     menerbitkan Beranda setelah memasang foto utama.')
process.exit(0)
