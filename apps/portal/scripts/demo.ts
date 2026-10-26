/**
 * Fills a school's App database with EXAMPLE data for demos and local testing (synthetic names, "DATA CONTOH").
 * Never run against a school's real database.
 *
 *   npm run portal:demo -- --sekolah kps [--logo path.png] [--foto path.jpg] [--admin email@cms]
 *
 * --admin pre-registers that CMS e-mail as App staff with many roles so every screen can be tried.
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { eq } from 'drizzle-orm'
import { schoolById } from '@sekolahku/core/registry'
import pg from 'pg'
import { closeSchoolDbs, schoolDb } from '../src/db/school-db'
import { staffMembers, students } from '../src/db/schema'
import { makeCtx, type StaffActor } from '../src/server/context'
import { permissionsOf, ROLES } from '../src/server/roles'
import { putSetting, getBranding, DEFAULT_MODULES } from '../src/server/settings'
import * as A from '../src/modules/academic/service'
import * as S from '../src/modules/students/service'
import * as C from '../src/modules/cards/service'
import { saveBranding } from '../src/modules/admin/service'

const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined)
const slug = arg('--sekolah')
if (!slug || !process.argv.includes('--sekolah')) {
  console.error('Pakai --sekolah <kode>')
  process.exit(1)
}
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--saya-paham-ini-data-contoh')) {
  console.error('Menolak: NODE_ENV=production. Data contoh tidak boleh masuk database sekolah sungguhan.')
  process.exit(1)
}

const platform = new pg.Pool({ connectionString: process.env.PLATFORM_DATABASE_URL })
const id = (await platform.query<{ id: number }>('SELECT id FROM tenants WHERE slug = $1', [slug])).rows[0]?.id
await platform.end()
if (!id) throw new Error(`Sekolah ${slug} tidak ditemukan`)
const school = (await schoolById(id))!
const db = await schoolDb(school)

const [sys] = await db.insert(staffMembers).values({ email: `sistem-demo@${slug}.invalid`, name: 'Data contoh (sistem)', active: false }).onConflictDoNothing().returning()
const sysId = sys?.id ?? (await db.select().from(staffMembers).where(eq(staffMembers.email, `sistem-demo@${slug}.invalid`)))[0]!.id
const all = Object.keys(ROLES)
const actor: StaffActor = { kind: 'staff', id: sysId, webUserId: 'demo', name: 'Data contoh', email: 'demo', webRole: 'admin', roles: new Set(all), perms: permissionsOf(all) }
const ctx = makeCtx({ school, db, staff: actor })

// branding
const logo = arg('--logo')
const foto = arg('--foto')
const cur = await getBranding(db)
await saveBranding(
  ctx,
  { shortName: cur.shortName || 'SMP Nasional KPS', city: cur.city || 'Balikpapan', address: cur.address || '[Alamat sekolah]', phone: cur.phone || '[Kontak sekolah]' },
  { logo: logo ? { name: logo, buffer: readFileSync(logo) } : null, hero: foto ? { name: foto, buffer: readFileSync(foto) } : null },
)
await putSetting(db, 'modules', { ...DEFAULT_MODULES, buku_induk: 'active', kartu: 'active', penerimaan: 'pilot', akademik: 'pilot', nilai_rapor: 'pilot', pengumuman: 'pilot', layanan: 'pilot', keuangan: 'configuring', bk: 'configuring', ekskul: 'pilot', kesiswaan: 'configuring', perpustakaan: 'configuring', uks: 'configuring', organisasi: 'configuring', alumni: 'configuring' }, sysId)

// admin staff (CMS e-mail) with broad roles
const admin = arg('--admin')
if (admin) {
  const existing = (await db.select().from(staffMembers).where(eq(staffMembers.email, admin.toLowerCase())))[0]
  if (!existing) await (await import('../src/modules/admin/service')).addStaff(ctx, { email: admin, name: 'Admin Demo', roles: all.filter((r) => r !== 'pimpinan'), displayName: null, nip: null, position: null })
}

// academic
const ov0 = await A.academicOverview(ctx)
let yearId = ov0.years.find((y) => y.name === '2026/2027')?.id
if (!yearId) yearId = await A.saveYear(ctx, { name: '2026/2027', startDate: '2026-07-13', endDate: '2027-06-26' })
await A.activateYear(ctx, yearId)
for (const [name, ord, fin] of [['VII', 7, false], ['VIII', 8, false], ['IX', 9, true]] as const) if (!ov0.levels.some((l) => l.name === name)) await A.saveGradeLevel(ctx, { name, ordinal: ord, final: fin })
const ov = await A.academicOverview(ctx)
const lvl = (n: string) => ov.levels.find((l) => l.name === n)!.id
const rooms = await A.homeroomsOfYear(ctx, yearId)
const room: Record<string, string> = Object.fromEntries(rooms.map((r) => [r.h.name, r.h.id]))
for (const [n, l] of [['VII A', 'VII'], ['VII B', 'VII'], ['VIII A', 'VIII'], ['IX A', 'IX']] as const)
  if (!room[n]) room[n] = await A.saveHomeroom(ctx, { yearId, gradeLevelId: lvl(l), name: n, homeroomTeacherId: null, room: `R${n.replace(' ', '')}`, capacity: 32 })
const SUBJ: [string, string][] = [
  ['PAI', 'Pendidikan Agama'],
  ['PPKN', 'Pendidikan Pancasila'],
  ['BIND', 'Bahasa Indonesia'],
  ['MTK', 'Matematika'],
  ['IPA', 'IPA'],
  ['IPS', 'IPS'],
  ['BING', 'Bahasa Inggris'],
  ['PJOK', 'PJOK'],
  ['SENI', 'Seni Budaya'],
  ['INF', 'Informatika'],
]
for (const [i, [code, name]] of SUBJ.entries()) if (!ov.subjects.some((s) => s.code === code)) await A.saveSubject(ctx, { code, name, group: null, ordinal: i + 1, active: true })

// students (synthetic)
const NAMES = ['Alya Putri', 'Bima Pratama', 'Citra Lestari', 'Daffa Ramadhan', 'Eka Saputra', 'Fajar Nugroho', 'Gita Ananda', 'Hana Wulandari', 'Ilham Saputra', 'Jihan Maharani', 'Kevin Aditya', 'Laras Ayuningtyas']
const have = await db.select({ nis: students.nis }).from(students)
for (const [i, name] of NAMES.entries()) {
  const nis = String(26001 + i)
  if (have.some((h) => h.nis === nis)) continue
  const sid = await S.createStudent(
    ctx,
    { fullName: name, nis, nisn: `00${String(12345670 + i).padStart(8, '0')}`, gender: i % 2 ? 'L' : 'P', birthPlace: 'Balikpapan', birthDate: `2013-0${(i % 9) + 1}-1${i % 9}`, religion: 'Islam', address: '[Alamat contoh]', entryYear: '2026' },
    { homeroomId: room[i < 5 ? 'VII A' : i < 8 ? 'VII B' : i < 10 ? 'VIII A' : 'IX A'] },
  )
  if (i !== 3) await S.addGuardian(ctx, sid, { relation: 'ibu', fullName: `Ibu ${name.split(' ')[0]}`, phone: '08xx-contoh', email: null, occupation: null, education: null, nik: null, isPrimary: true })
}
if (!(await C.approvedTemplate(db))) {
  const t = await C.saveTemplateDraft(ctx, 'Kartu Siswa', C.DEFAULT_CARD)
  await C.approveTemplate(ctx, t)
}
console.log(`✓ Data contoh untuk ${school.name} siap (${NAMES.length} siswa contoh, 4 rombel, ${SUBJ.length} mapel).`)
await closeSchoolDbs()
process.exit(0)
