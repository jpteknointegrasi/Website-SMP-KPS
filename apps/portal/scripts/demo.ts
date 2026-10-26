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
import { and, eq, gt, isNull } from 'drizzle-orm'
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
await putSetting(db, 'modules', { ...DEFAULT_MODULES, buku_induk: 'active', kartu: 'active', penerimaan: 'pilot', akademik: 'pilot', nilai_rapor: 'pilot', pengumuman: 'pilot', layanan: 'pilot', keuangan: 'pilot', bk: 'pilot', ekskul: 'pilot', kesiswaan: 'pilot', perpustakaan: 'pilot', uks: 'pilot', organisasi: 'pilot', alumni: 'pilot' }, sysId)

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
// admissions example: an open cycle with families at different stages
import('../src/modules/admissions/decisions')
const cfg = await import('../src/modules/admissions/config')
const apply = await import('../src/modules/admissions/apply')
const review = await import('../src/modules/admissions/review')
const { accounts, persons, admissionCycles } = await import('../src/db/schema')
const { hashPassword } = await import('../src/server/secrets')
if (!(await db.select().from(admissionCycles).where(eq(admissionCycles.code, 'PPDB27'))).length) {
  if (!ov.years.some((y) => y.name === '2027/2028')) await A.saveYear(ctx, { name: '2027/2028', startDate: '2027-07-12', endDate: '2028-06-24' })
  const cid = await cfg.createCycle(ctx, { code: 'PPDB27', name: 'Penerimaan Siswa Baru 2027/2028', targetYear: '2027/2028', targetGrade: 'VII' })
  const d = (await cfg.cycleDetail(db, cid))!
  await cfg.savePath(ctx, cid, { id: d.paths[0]!.id, name: 'Reguler', description: 'Jalur umum.', quota: 64, registrationFee: 150000, reenrollFee: 1500000, documents: cfg.DEFAULT_DOCUMENTS, components: cfg.DEFAULT_COMPONENTS, checklist: cfg.DEFAULT_CHECKLIST, active: true })
  await cfg.savePath(ctx, cid, { name: 'Prestasi', description: 'Untuk calon siswa dengan prestasi akademik/non-akademik.', quota: 16, registrationFee: 150000, reenrollFee: 1500000, documents: [...cfg.DEFAULT_DOCUMENTS, { code: 'sertifikat', label: 'Sertifikat prestasi', required: true }], components: cfg.DEFAULT_COMPONENTS, checklist: cfg.DEFAULT_CHECKLIST, active: true })
  await cfg.updateCycle(ctx, cid, { name: 'Penerimaan Siswa Baru 2027/2028', openAt: new Date(Date.now() - 86400_000), closeAt: new Date(Date.now() + 60 * 86400_000), selectionEnabled: true, offerDays: 7, reenrollDays: 14, requireNik: false, info: 'Pendaftaran dibuka untuk calon siswa kelas VII. [Biaya dan persyaratan resmi diumumkan sekolah]', dataNotice: 'Data digunakan untuk proses penerimaan siswa baru dan disimpan sesuai kebijakan sekolah.', helpContact: '[Kontak panitia penerimaan]' }, null)
  await db.update(admissionCycles).set({ status: 'open', approvedBy: 'demo', approvedAt: new Date() }).where(eq(admissionCycles.id, cid))
  const families = [['ortu.alya@contoh.invalid', 'Alya Ramadhani'], ['ortu.bima@contoh.invalid', 'Bima Saputra'], ['ortu.citra@contoh.invalid', 'Citra Ayu']] as const
  for (const [i, [email, child]] of families.entries()) {
    const [p] = await db.insert(persons).values({ fullName: `Orang Tua ${child.split(' ')[0]}`, email }).returning()
    const [acc] = await db.insert(accounts).values({ login: email, email, personId: p!.id, passwordHash: await hashPassword('Contoh-Keluarga-2026'), emailVerifiedAt: new Date(), verifiedBy: 'demo' }).returning()
    const fctx = makeCtx({ school, db, account: { kind: 'account', id: acc!.id, personId: p!.id, login: email, name: p!.fullName, email, emailVerified: true, mustChangePassword: false, sessionId: 'demo' } })
    const app = await apply.startApplication(fctx, { cycleId: cid, pathId: d.paths[0]!.id, childName: child })
    await apply.saveApplicationData(fctx, app, { fullName: child, gender: i % 2 ? 'L' : 'P', birthPlace: 'Balikpapan', birthDate: '2014-0' + (i + 3) + '-12', religion: 'Islam', address: '[Alamat contoh]', originSchool: 'SD Contoh', guardianName: p!.fullName, guardianRelation: 'ibu', guardianPhone: '081200000000' }, null)
    if (i === 2) continue // stays a draft
    const tiny = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('contoh')])
    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex')
    await apply.uploadApplicationDocument(fctx, app, 'pasfoto', { name: 'foto.png', buffer: png })
    for (const c of ['akta', 'kk']) await apply.uploadApplicationDocument(fctx, app, c, { name: `${c}.pdf`, buffer: tiny })
    await apply.submitApplication(fctx, app, { confirm: true })
    if (i === 0) await review.startReview(ctx, app)
  }
}

// ---------- daily academics (P2): teachers, timetable, attendance, tasks, announcements, services ----------
{
  const sched = await import('../src/modules/schedule/service')
  const att = await import('../src/modules/attendance/service')
  const learn = await import('../src/modules/learning/service')
  const comms = await import('../src/modules/comms/service')
  const svc = await import('../src/modules/services/service')
  const { staffRoles, guardianLinks, accounts: accT, persons: perT, timeSlots } = await import('../src/db/schema')
  const { hashPassword: hp } = await import('../src/server/secrets')
  const { addDays: plus, today: todayOf, weekday: wd } = await import('../src/server/time')
  if (!(await db.select().from(timeSlots)).length) {
    await sched.saveSlots(ctx, [
      { ordinal: 1, label: 'Jam 1', startTime: '07:15', endTime: '07:55', kind: 'lesson' },
      { ordinal: 2, label: 'Jam 2', startTime: '07:55', endTime: '08:35', kind: 'lesson' },
      { ordinal: 3, label: 'Jam 3', startTime: '08:35', endTime: '09:15', kind: 'lesson' },
      { ordinal: 4, label: 'Istirahat', startTime: '09:15', endTime: '09:35', kind: 'break' },
      { ordinal: 5, label: 'Jam 4', startTime: '09:35', endTime: '10:15', kind: 'lesson' },
      { ordinal: 6, label: 'Jam 5', startTime: '10:15', endTime: '10:55', kind: 'lesson' },
      { ordinal: 7, label: 'Jam 6', startTime: '10:55', endTime: '11:35', kind: 'lesson' },
      { ordinal: 8, label: 'Ishoma', startTime: '11:35', endTime: '12:15', kind: 'break' },
      { ordinal: 9, label: 'Jam 7', startTime: '12:15', endTime: '12:55', kind: 'lesson' },
      { ordinal: 10, label: 'Jam 8', startTime: '12:55', endTime: '13:35', kind: 'lesson' },
    ])
    // synthetic teachers (never real people); the demo admin teaches MTK & Informatika in VII A and is its wali kelas
    const T: string[] = []
    const GURU = ['Bu Sari (contoh)', 'Pak Andi (contoh)', 'Bu Rina (contoh)', 'Pak Dedi (contoh)', 'Bu Wati (contoh)', 'Pak Yusuf (contoh)', 'Bu Lia (contoh)', 'Pak Hadi (contoh)', 'Bu Nur (contoh)', 'Pak Rudi (contoh)']
    for (const [i, name] of GURU.entries()) {
      const email = `guru${i + 1}@${slug}.contoh.invalid`
      const [g] = await db.insert(staffMembers).values({ email, name, active: true }).onConflictDoNothing().returning()
      const gid = g?.id ?? (await db.select().from(staffMembers).where(eq(staffMembers.email, email)))[0]!.id
      if (g) await db.insert(staffRoles).values({ staffId: gid, role: 'guru', grantedBy: 'demo' })
      T.push(gid)
    }
    const adminRow = admin ? (await db.select().from(staffMembers).where(eq(staffMembers.email, admin.toLowerCase())))[0] : undefined
    const ovT = await A.academicOverview(ctx)
    const term1 = ovT.terms.find((t) => t.yearId === yearId && t.ordinal === 1)!
    const subj = ovT.subjects
    const groups: [string, number][] = [
      ['VII A', 0],
      ['VII B', 5],
    ]
    for (const [hn, off] of groups) {
      for (const [i, sb] of subj.entries()) {
        let teacher = T[off + (i % 5)]!
        if (hn === 'VII A' && adminRow && (sb.code === 'MTK' || sb.code === 'INF')) teacher = adminRow.id
        await A.saveAssignment(ctx, { termId: term1.id, homeroomId: room[hn]!, subjectId: sb.id, teacherId: teacher, hoursPerWeek: sb.code === 'MTK' || sb.code === 'BIND' ? 5 : 3 })
      }
    }
    if (adminRow) await A.saveHomeroom(ctx, { id: room['VII A'], yearId, gradeLevelId: lvl('VII'), name: 'VII A', homeroomTeacherId: adminRow.id, room: 'R7A', capacity: 32 })
    const asg = await A.assignmentsOfTerm(ctx, term1.id)
    const lessonSlots = (await sched.slots(db)).filter((s) => s.kind === 'lesson')
    const ver = await sched.newVersion(ctx, term1.id, 'Jadwal contoh')
    for (const [gi, [hn]] of groups.entries()) {
      const mine = asg.filter((a) => a.a.homeroomId === room[hn])
      for (let day = 1; day <= 5; day++)
        for (const [j, sl] of lessonSlots.entries()) {
          if (day === 5 && j >= 6) continue // Jumat pulang lebih awal
          const a = mine[(day * 3 + Math.floor(j / 2) + gi * 2) % mine.length]!
          await sched.setCell(ctx, ver, { homeroomId: room[hn]!, day, slotId: sl.id, assignmentId: a.a.id, room: null })
        }
    }
    const clash = await sched.conflicts(db, ver)
    const { timetableEntries, tasks: tasksT } = await import('../src/db/schema')
    for (const c of clash) for (const id of c.entryIds.slice(1)) await db.delete(timetableEntries).where(eq(timetableEntries.id, id))
    await sched.publishVersion(ctx, ver, '2026-07-13')
    const d0 = todayOf(ctx.tz)
    await sched.saveEvent(ctx, { title: 'Asesmen Tengah Semester', kind: 'ujian', startDate: plus(d0, 14), endDate: plus(d0, 18), audience: 'all', isPublic: true, description: 'Jadwal per mapel diumumkan wali kelas.' })
    await sched.saveEvent(ctx, { title: 'Libur Hari Guru (contoh)', kind: 'libur', startDate: plus(d0, 28), endDate: plus(d0, 28), audience: 'all', isPublic: false, description: null })
    await sched.saveEvent(ctx, { title: 'Rapat dewan guru', kind: 'rapat', startDate: plus(d0, 3), endDate: plus(d0, 3), audience: 'staff', isPublic: false, description: null })

    // family accounts linked to Alya (VII A): guardian + student login (synthetic, @contoh.invalid)
    const alya = (await db.select({ id: students.id, personId: students.personId }).from(students).where(eq(students.nis, '26001')))[0]
    if (alya) {
      const [link] = await db.select().from(guardianLinks).where(eq(guardianLinks.studentId, alya.id))
      const pw = await hp('Contoh-Keluarga-2026')
      const [wp] = await db.insert(perT).values({ fullName: 'Ibu Alya (contoh)', email: 'wali.alya@contoh.invalid' }).returning()
      const [wa] = await db.insert(accT).values({ login: 'wali.alya@contoh.invalid', email: 'wali.alya@contoh.invalid', personId: wp!.id, passwordHash: pw, emailVerifiedAt: new Date(), verifiedBy: 'demo' }).returning()
      const wctx = makeCtx({ school, db, account: { kind: 'account', id: wa!.id, personId: wp!.id, login: wa!.login, name: wp!.fullName, email: wa!.email, emailVerified: true, mustChangePassword: false, sessionId: 'demo' } })
      if (link) await S.redeemCode(wctx, (await S.issueGuardianCode(ctx, link.id)).code)
      const [sa] = await db.insert(accT).values({ login: 'siswa.alya', personId: alya.personId, passwordHash: pw, verifiedBy: 'demo' }).returning()
      await db.update(students).set({ accountId: sa!.id }).where(eq(students.id, alya.id))
      const sctx = makeCtx({ school, db, account: { kind: 'account', id: sa!.id, personId: alya.personId, login: 'siswa.alya', name: 'Alya Putri', email: null, emailVerified: false, mustChangePassword: false, sessionId: 'demo' } })

      await att.requestLeave(wctx, { studentId: alya.id, kind: 'izin', fromDate: plus(d0, 1), toDate: plus(d0, 1), reason: 'Acara keluarga (contoh).', file: null })

      // learning: material + tasks in MTK VII A
      const mtk = asg.find((a) => a.homeroom === 'VII A' && a.subjectCode === 'MTK')!
      await learn.saveMaterial(ctx, { assignmentId: mtk.a.id, title: 'Bilangan bulat dan operasinya', unit: 'Bab 1', body: 'Ringkasan materi: penjumlahan, pengurangan, perkalian dan pembagian bilangan bulat beserta contoh soal.', links: [], publish: true }, [])
      await learn.saveTask(ctx, { assignmentId: mtk.a.id, title: 'Latihan bilangan bulat', kind: 'tugas', instructions: 'Kerjakan soal nomor 1–10 di buku paket halaman 12. Unggah foto jawaban atau ketik jawabanmu.', dueAt: new Date(Date.now() + 3 * 86400_000), maxScore: 100, allowLate: true, submissionType: 'file_or_text', publish: true }, [])
      const t2 = await learn.saveTask(ctx, { assignmentId: mtk.a.id, title: 'Kuis pecahan', kind: 'kuis', instructions: 'Kuis singkat 10 soal.', dueAt: new Date(Date.now() + 86400_000), maxScore: 100, allowLate: false, submissionType: 'file_or_text', publish: true }, [])
      await learn.submitTask(sctx, t2, 'Jawaban kuis: 1) 3/4 2) 1/2 … (contoh)', [])
      await db.update(tasksT).set({ dueAt: new Date(Date.now() - 2 * 86400_000) }).where(eq(tasksT.id, t2))
      await learn.reviewSubmission(ctx, t2, alya.id, { score: 85, feedback: 'Bagus! Perhatikan penyederhanaan pecahan di soal 7.', needsRevision: false })

      // announcements & a service request
      await comms.saveAnnouncement(ctx, { title: 'Asesmen Tengah Semester Ganjil', body: 'Asesmen Tengah Semester dilaksanakan dua pekan lagi. Jadwal per mata pelajaran akan dibagikan wali kelas. Mohon orang tua mendampingi anak belajar di rumah.', audience: { type: 'families' }, publishAt: null, requiresAck: true, pinned: true, publish: true }, [])
      await comms.saveAnnouncement(ctx, { title: 'Pengumpulan nilai harian', body: 'Bapak/Ibu guru dimohon melengkapi nilai harian dan jurnal mengajar sebelum akhir bulan.', audience: { type: 'staff' }, publishAt: null, requiresAck: false, pinned: false, publish: true }, [])
      const types = await svc.catalogue(db)
      await svc.submitRequest(wctx, { typeId: types.find((t) => t.code === 'ket_aktif')!.id, studentId: alya.id, answers: { keperluan: 'Persyaratan beasiswa (contoh)' }, purpose: null, file: null })
    }
  }
}
// attendance history for VII A (demo placements are back-dated to the start of the year so history can exist)
{
  const { dailyAttendance, classPlacements } = await import('../src/db/schema')
  const att = await import('../src/modules/attendance/service')
  const { addDays: plus, today: todayOf, weekday: wd } = await import('../src/server/time')
  const { homeroomStudents } = await import('../src/modules/scope')
  if (!(await db.select({ id: dailyAttendance.id }).from(dailyAttendance).limit(1)).length) {
    await db.update(classPlacements).set({ validFrom: '2026-07-13' }).where(and(gt(classPlacements.validFrom, '2026-07-13'), isNull(classPlacements.validTo)))
    const d0 = todayOf(ctx.tz)
    const pupils = await homeroomStudents(db, room['VII A']!, d0)
    for (let k = 0, n = 0; n < 6 && k < 14; k++) {
      const day = plus(d0, -k)
      if (wd(day) === 0 || wd(day) === 6) continue
      n++
      await att.saveDaily(ctx, room['VII A']!, day, pupils.map((p, i) => ({ studentId: p.studentId, status: (i + k) % 9 === 0 ? 'S' : (i + k) % 13 === 0 ? 'I' : 'H', note: null })))
    }
  }
}
// ---------- P3: grades & report cards, extracurricular, achievements, BK (synthetic) ----------
{
  const { gradeItems, accounts: accT2, students: stT } = await import('../src/db/schema')
  if (!(await db.select({ id: gradeItems.id }).from(gradeItems).limit(1)).length) {
    const G = await import('../src/modules/grades/service')
    const X = await import('../src/modules/activities/service')
    const K = await import('../src/modules/affairs/service')
    const BK = await import('../src/modules/counseling/service')
    const { homeroomStudents } = await import('../src/modules/scope')
    const { today: todayOf } = await import('../src/server/time')
    const d0 = todayOf(ctx.tz)
    const ovG = await A.academicOverview(ctx)
    const term1 = ovG.terms.find((t) => t.yearId === yearId && t.ordinal === 1)!
    const asgG = (await A.assignmentsOfTerm(ctx, term1.id)).filter((a) => a.homeroom === 'VII A')
    const pupils = await homeroomStudents(db, room['VII A']!, d0)
    const DESC = ['Menunjukkan penguasaan yang sangat baik dan mampu menerapkan konsep pada soal kontekstual.', 'Menunjukkan penguasaan yang baik; perlu penguatan pada penerapan konsep.', 'Cukup menguasai materi; perlu bimbingan pada beberapa kompetensi.']
    for (const [ai, a] of asgG.entries()) {
      const it1 = await G.saveItem(ctx, { assignmentId: a.a.id, kind: 'sumatif', title: 'Sumatif Bab 1', date: '2026-08-28', maxScore: 100, weight: 1 })
      const it2 = await G.saveItem(ctx, { assignmentId: a.a.id, kind: 'sts', title: 'STS Ganjil', date: '2026-10-05', maxScore: 100, weight: 1 })
      await G.saveScores(ctx, it1, pupils.map((p, i) => ({ studentId: p.studentId, score: 72 + ((i * 7 + ai * 3) % 25) })))
      await G.saveScores(ctx, it2, pupils.map((p, i) => ({ studentId: p.studentId, score: 70 + ((i * 5 + ai * 11) % 28) })))
      if (a.subjectCode !== 'INF') {
        const book = await G.gradebook(ctx, a.a.id)
        await G.saveResults(ctx, a.a.id, book.rows.map((r) => ({ studentId: r.studentId, finalScore: null, adjustReason: null, description: DESC[r.computed! >= 88 ? 0 : r.computed! >= 78 ? 1 : 2]! })))
        await G.submitResults(ctx, a.a.id)
      }
    }
    // extracurricular
    const coach = (await db.select().from(staffMembers).where(eq(staffMembers.email, `guru1@${slug}.contoh.invalid`)))[0]
    const pramuka = await X.saveActivity(ctx, { name: 'Pramuka', category: 'wajib', description: 'Kepramukaan untuk seluruh siswa kelas VII.', coachId: coach?.id ?? null, schedule: 'Jumat 14.00–16.00', location: 'Lapangan', capacity: null, requiresConsent: false, status: 'open' })
    await X.saveActivity(ctx, { name: 'Futsal', category: 'minat', description: 'Latihan teknik dan pertandingan persahabatan.', coachId: coach?.id ?? null, schedule: 'Selasa 15.00–17.00', location: 'Lapangan futsal', capacity: 20, requiresConsent: true, status: 'open' })
    await X.saveActivity(ctx, { name: 'Paduan Suara', category: 'minat', description: 'Vokal grup untuk upacara dan lomba.', coachId: null, schedule: 'Rabu 14.00–15.30', location: 'Ruang musik', capacity: 30, requiresConsent: true, status: 'open' })
    const alyaG = (await db.select().from(stT).where(eq(stT.nis, '26001')))[0]
    const wali = (await db.select().from(accT2).where(eq(accT2.login, 'wali.alya@contoh.invalid')))[0]
    if (alyaG && wali) {
      const wctx = makeCtx({ school, db, account: { kind: 'account', id: wali.id, personId: wali.personId, login: wali.login, name: 'Ibu Alya (contoh)', email: wali.email, emailVerified: true, mustChangePassword: false, sessionId: 'demo' } })
      const m = await X.apply(wctx, pramuka, alyaG.id, null)
      await X.decide(ctx, m, true, null)
      await X.recordSession(ctx, pramuka, '2026-10-23', 'Baris-berbaris', { [alyaG.id]: 'H' })
      await X.evaluate(ctx, pramuka, term1.id, [{ studentId: alyaG.id, predicate: 'Baik', description: 'Aktif dan disiplin.' }])
      const ach = await K.submitAchievement(wctx, { studentId: alyaG.id, title: 'Juara 2 Lomba Cerdas Cermat (contoh)', field: 'akademik', level: 'kota', rank: 'Juara 2', organizer: 'Panitia contoh', date: '2026-09-19', publicConsent: true, file: null })
      await K.reviewAchievement(ctx, ach, true, null)
      await BK.requestCase(wctx, { studentId: alyaG.id, category: 'belajar', urgency: 'normal', request: 'Mohon bantuan mengatur waktu belajar di rumah (contoh).', preferredTime: 'Setelah pulang sekolah' })
      await K.submitReport(wctx, { category: 'sarana', description: 'Kran air di toilet lantai 2 bocor sejak minggu lalu (contoh).', occurredOn: null, location: 'Toilet lantai 2', hideIdentity: false, file: null })
    }
  }
}
// ---------- P4: library, UKS, organisations (synthetic) ----------
{
  const { libraryBooks, students: stT, accounts: accT3 } = await import('../src/db/schema')
  if (!(await db.select({ id: libraryBooks.id }).from(libraryBooks).limit(1)).length) {
    const L = await import('../src/modules/library/service')
    const O = await import('../src/modules/organizations/service')
    const H = await import('../src/modules/health/service')
    await L.importBooks(ctx, ['PUS-001;Laskar Pelangi;Andrea Hirata;Bentang;2005;Novel;Rak A1;3', 'PUS-002;Bumi;Tere Liye;Gramedia;2014;Novel;Rak A1;2', 'PUS-003;Matematika Kelas VII;Tim Penulis;Kemendikbud;2022;Buku teks;Rak B2;10', 'PUS-004;IPA Kelas VII;Tim Penulis;Kemendikbud;2022;Buku teks;Rak B2;10', 'PUS-005;Atlas Indonesia dan Dunia;Tim Atlas;Contoh Pustaka;2020;Referensi;Rak C1;1', 'PUS-006;Kamus Besar Bahasa Indonesia;Badan Bahasa;Contoh Pustaka;2016;Referensi;Rak C1;2'].join('\n'))
    const alyaP = (await db.select().from(stT).where(eq(stT.nis, '26001')))[0]
    const books = await L.catalogue(db, null)
    if (alyaP) {
      await L.lend(ctx, books.find((b) => b.code === 'PUS-001')!.id, { studentId: alyaP.id })
      const org = await O.saveOrg(ctx, { name: 'OSIS', description: 'Organisasi Siswa Intra Sekolah.', advisorId: (await db.select().from(staffMembers).where(eq(staffMembers.email, `guru2@${slug}.contoh.invalid`)))[0]?.id ?? null })
      await O.setMember(ctx, org, alyaP.id, 'Sekretaris', true, true)
      const sa = (await db.select().from(accT3).where(eq(accT3.login, 'siswa.alya')))[0]
      if (sa) {
        const sctx = makeCtx({ school, db, account: { kind: 'account', id: sa.id, personId: sa.personId, login: sa.login, name: 'Alya Putri', email: null, emailVerified: false, mustChangePassword: false, sessionId: 'demo' } })
        await O.submitProposal(sctx, org, { title: 'Class meeting akhir semester', description: 'Lomba antarkelas (futsal, cerdas cermat, kebersihan kelas) setelah asesmen akhir semester.', startDate: '2026-12-14', endDate: '2026-12-16', location: 'Lingkungan sekolah', budget: 750000, participants: 'Seluruh siswa', isPublic: true })
      }
      await H.recordVisit(ctx, { studentId: alyaP.id, at: new Date(Date.now() - 2 * 86400_000), complaint: 'Pusing (contoh)', action: 'Istirahat 20 menit, minum air', notes: null, outcome: 'kembali_kelas', familyNote: 'Alya sempat beristirahat di UKS dan sudah kembali ke kelas.', notifyGuardian: true, followUpOn: null })
    }
  }
}
console.log(`✓ Data contoh untuk ${school.name} siap (${NAMES.length} siswa contoh, 4 rombel, ${SUBJ.length} mapel).`)
await closeSchoolDbs()
process.exit(0)
