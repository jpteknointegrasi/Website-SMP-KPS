/**
 * Idempotent seed: official content taken from smp.kps.sch.id snapshots (content/sources),
 * plus clearly-flagged demo data (isDemo = true, hidden unless SHOW_DEMO_CONTENT=true).
 * Re-running updates records by slug; it never duplicates.
 *
 *   npm run seed                 # content + media
 *   SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run seed   # also creates the first admin account
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { importMedia } from './import-media'
import { lexical, type Block } from '../src/lib/lexical'

const ctx = { skipAudit: true }
type AnyData = Record<string, unknown>

async function upsert(payload: Payload, collection: string, where: AnyData, data: AnyData, publish = true) {
  const found = await payload.find({
    collection: collection as 'posts',
    where: where as never,
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
    trash: true,
  } as never)
  const full = { ...data, ...(publish ? { _status: 'published', workflowStatus: data.workflowStatus ?? 'published' } : {}) }
  if (found.docs[0]) {
    return payload.update({ collection: collection as 'posts', id: found.docs[0].id, data: full as never, overrideAccess: true, context: ctx, draft: !publish } as never)
  }
  return payload.create({ collection: collection as 'posts', data: full as never, overrideAccess: true, context: ctx, draft: !publish } as never)
}

const MONTHS: Record<string, number> = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 }
const parseEnDate = (s: string) => {
  const m = s.match(/([A-Za-z]+) (\d{1,2}), (\d{4})/)!
  // 09:00 WITA (= 01:00 UTC) on the original publication date
  return new Date(Date.UTC(Number(m[3]), MONTHS[m[1]], Number(m[2]), 1, 0, 0)).toISOString()
}
const witaDate = (daysFromNow: number, hour: number, minute = 0) => {
  const d = new Date()
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysFromNow, hour - 8, minute))
  return base.toISOString()
}

async function main() {
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(m)

  // ---------- 0. first admin (only from env; never hard-coded) ----------
  const { totalDocs: userCount } = await payload.count({ collection: 'users', overrideAccess: true })
  if (userCount === 0 && process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, name: 'Admin Teknis', role: 'admin' },
    })
    log(`Akun admin dibuat: ${process.env.SEED_ADMIN_EMAIL}`)
  } else if (userCount === 0) {
    log('Belum ada akun. Buka /admin untuk membuat akun pertama (otomatis Admin Teknis).')
  }

  // ---------- 1. media ----------
  const media = await importMedia(payload, log)
  const M = (id: string) => media.ids[id] as number

  // ---------- 2. categories ----------
  const cats: Record<string, number> = {}
  for (const [slug, title] of [
    ['kegiatan-sekolah', 'Kegiatan Sekolah'],
    ['keagamaan', 'Keagamaan'],
    ['kepramukaan', 'Kepramukaan'],
    ['kunjungan-belajar', 'Kunjungan Belajar'],
    ['upacara-kebangsaan', 'Upacara & Kebangsaan'],
  ]) {
    const found = await payload.find({ collection: 'categories', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
    const doc = found.docs[0] ?? (await payload.create({ collection: 'categories', data: { slug, title }, overrideAccess: true, context: ctx }))
    cats[slug] = doc.id as number
  }

  // ---------- 3. official news (migrated, original dates & source URLs) ----------
  const articles = JSON.parse(fs.readFileSync(path.resolve('content/articles.json'), 'utf8')) as {
    slug: string
    title: string
    date: string
    sourceUrl: string
    paragraphs: string[]
  }[]
  const POST_META: Record<string, { cover: string; cats: string[]; title?: string; caption: string }> = {
    'semangat-kebersamaan-dan-kemandirian-di-perjusa-smp-nasional-kps-2025': {
      cover: 'KPS-008',
      cats: ['kepramukaan', 'kegiatan-sekolah'],
      caption: 'Siswa berseragam pramuka di lapangan (foto dari arsip unggahan Mei 2025).',
    },
    'smp-nasional-kps-gelar-wisuda-tahfidz': { cover: 'KPS-009', cats: ['keagamaan'], caption: 'Foto bersama pada acara Wisuda Tahfidz Al-Qur’an.' },
    'upacara-bendera-senin-28-april-2025-kapolresta-balikpapan-bangun-kesadaran-pelajar': {
      cover: 'KPS-010',
      cats: ['upacara-kebangsaan'],
      caption: 'Siswa dan pendamping di halaman sekolah, 28 April 2025.',
    },
    'siswa-kelas-9-smp-nasional-kps-balikpapan-melaksanakan-praktik-manasik-haji': {
      cover: 'KPS-011',
      cats: ['keagamaan'],
      caption: 'Peserta kegiatan berbusana putih (arsip unggahan 26 April 2025).',
    },
    'studi-edukasi-kelas-9-smp-nasional-kps-menjelajah-sejarah-ilmu-pengetahuan-dan-rekreasi': {
      cover: 'KPS-012',
      cats: ['kunjungan-belajar'],
      title: 'Studi Edukasi Kelas 9 SMP Nasional KPS: Menjelajah Sejarah, Ilmu Pengetahuan, dan Rekreasi',
      caption: 'Rombongan siswa kelas 9 di lokasi kunjungan.',
    },
    'kapolsek-kawasan-pelabuhan-semayang-menjadi-pembina-upacara-bendera-di-smp-nasional-kps': {
      cover: 'KPS-013',
      cats: ['upacara-kebangsaan'],
      caption: 'Petugas dan warga sekolah di koridor sekolah.',
    },
  }
  for (const a of articles) {
    const meta = POST_META[a.slug]
    const excerpt = a.paragraphs[0].length > 210 ? a.paragraphs[0].slice(0, 207).replace(/\s+\S*$/, '') + '…' : a.paragraphs[0]
    await upsert(payload, 'posts', { slug: { equals: a.slug } }, {
      title: meta?.title ?? a.title,
      slug: a.slug,
      excerpt,
      content: lexical(a.paragraphs),
      cover: meta ? M(meta.cover) : undefined,
      coverCaption: meta?.caption,
      categories: meta?.cats.map((c) => cats[c]),
      publishedAt: parseEnDate(a.date),
      sourceUrl: a.sourceUrl,
      isDemo: false,
    })
  }
  log(`Berita resmi: ${articles.length}`)

  // ---------- 4. pages ----------
  const VISI =
    'Menjadi lembaga pendidikan yang unggul dalam kualitas pembelajaran dan menjadi lembaga rujukan dalam penyelenggaraan pendidikan, baik secara lokal, nasional, maupun internasional, serta berakhlak mulia, berwawasan lingkungan, dan berbudaya nasional.'
  const MISI = [
    'Menghasilkan lulusan yang memenuhi standar kualitas nasional maupun internasional, baik dari aspek intelektual, emosional, sosial, maupun aspek penguasaan bahasa.',
    'Mengembangkan sistem manajemen pendidikan mandiri yang berstandar nasional dan internasional.',
    'Implementasi pendidikan berwawasan lingkungan dan budaya nasional.',
  ]
  const VALUES = [
    { title: 'Berakhlak Mulia', text: 'Sekolah Nasional KPS memberikan pendidikan karakter pada siswa agar memiliki akhlak yang mulia.' },
    { title: 'Berwawasan Lingkungan', text: 'Sekolah Nasional KPS memberikan wawasan mengenai lingkungan dan sosial yang didukung fasilitas sekolah.' },
    { title: 'Berbudaya Nasional', text: 'Sekolah Nasional KPS menanamkan jiwa nasionalisme pada siswa.' },
  ]
  await upsert(payload, 'pages', { slug: { equals: 'tentang' } }, {
    title: 'Tentang SMP Nasional KPS',
    slug: 'tentang',
    excerpt: 'SMP Nasional KPS di Balikpapan mengembangkan pengetahuan, karakter dan potensi setiap siswa dengan nilai Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional.',
    cover: M('KPS-010'),
    layout: [
      { blockType: 'values', heading: 'Nilai yang Kami Pegang', items: VALUES },
      {
        blockType: 'imageText',
        heading: 'Belajar bersama, menjelajah dunia dengan ilmu',
        content: lexical(['SMP Nasional KPS berada di Balikpapan, Kalimantan Timur. Kegiatan belajar dilengkapi dengan kegiatan karakter, kepramukaan, keagamaan, kunjungan belajar dan upacara kebangsaan yang didokumentasikan dalam berita sekolah.']),
        image: M('KPS-028'),
        imageSide: 'right',
      },
    ],
  })
  await upsert(payload, 'pages', { slug: { equals: 'visi-misi' } }, {
    title: 'Visi dan Misi',
    slug: 'visi-misi',
    excerpt: 'Visi dan misi resmi SMP Nasional KPS.',
    layout: [{ blockType: 'richText', content: lexical([{ h2: 'Visi' }, VISI, { h2: 'Misi' }, { ol: MISI }]) }, { blockType: 'values', heading: 'Nilai utama', items: VALUES }],
  })
  await upsert(payload, 'pages', { slug: { equals: 'kebijakan-privasi' } }, {
    title: 'Kebijakan Privasi',
    slug: 'kebijakan-privasi',
    excerpt: 'Bagaimana website ini menggunakan data yang Anda kirim melalui formulir.',
    layout: [
      {
        blockType: 'richText',
        content: lexical([
          'Versi awal — menunggu pengesahan sekolah, termasuk masa penyimpanan (retensi) pesan.',
          { h2: 'Data yang kami terima' },
          'Formulir kontak meminta nama, minimal satu kanal balasan (email atau telepon), kategori, dan isi pesan. Kami tidak meminta dokumen calon siswa melalui website ini.',
          { h2: 'Penggunaan data' },
          { ul: ['Membalas pertanyaan Anda.', 'Meneruskan pesan kepada petugas yang berwenang di sekolah.', 'Data tidak dikirim ke layanan analitik dan tidak dijual.'] },
          { h2: 'Akses dan penyimpanan' },
          'Pesan disimpan dalam kotak masuk admin yang hanya dapat dibuka oleh petugas berwenang. Masa penyimpanan mengikuti kebijakan sekolah.',
          { h2: 'Hubungi kami' },
          'Untuk meminta koreksi atau penghapusan data, gunakan halaman Kontak.',
        ]),
      },
    ],
  })

  // ---------- 5. leadership (names/positions from the official homepage; photos left for verification) ----------
  const leaders = [
    ['M. Afcariono, S.Si., M.Pd.', 'Kepala Sekolah', 1],
    ['Abundaris Khamil Iftara, S.Pd.', 'Wakil Bidang Kurikulum dan Sarpras', 2],
    ['Hanim Farida, S.Pd., M.Pd.', 'Wakil Bidang Kesiswaan', 3],
  ] as const
  for (const [name, position, order] of leaders) {
    await upsert(payload, 'staff', { name: { equals: name } }, { name, position, order, group: 'pimpinan', publicationConsent: false, isDemo: false })
  }

  // ---------- 6. programs & student life ----------
  await upsert(payload, 'programs', { slug: { equals: 'tahfidz-al-quran' } }, {
    title: 'Program Tahfidz Al-Qur’an',
    slug: 'tahfidz-al-quran',
    excerpt: 'Program hafalan Al-Qur’an yang rutin dilaksanakan sebagai bagian dari pendidikan karakter; ditutup dengan wisuda tahfidz.',
    cover: M('KPS-009'),
    content: lexical(['Berita sekolah 8 Mei 2025 mencatat 18 siswa dari kelas 7 hingga kelas 9 diwisuda pada Wisuda Tahfidz Al-Qur’an sebagai puncak program tahfidz yang rutin dilaksanakan.']),
    featured: true,
    order: 3,
    isDemo: false,
  })
  const demoPrograms = [
    ['pembelajaran-aktif', 'Pembelajaran Aktif', 'Siswa terlibat aktif melalui diskusi, proyek dan presentasi. (Label desain — perlu validasi sekolah.)', 'KPS-028', 1],
    ['sains-teknologi', 'Sains & Teknologi', 'Eksplorasi sains dan teknologi untuk menumbuhkan rasa ingin tahu. (Label desain — perlu validasi sekolah.)', null, 2],
    ['karakter-kepedulian', 'Karakter & Kepedulian', 'Pembiasaan nilai karakter dan kepedulian lingkungan. (Label desain — perlu validasi sekolah.)', null, 4],
  ] as const
  for (const [slug, title, excerpt, cover, order] of demoPrograms) {
    await upsert(payload, 'programs', { slug: { equals: slug } }, { title, slug, excerpt, cover: cover ? M(cover) : null, featured: true, order, isDemo: true })
  }
  const life = [
    ['pramuka', 'Pramuka', 'ekskul', 'Kegiatan kepramukaan, termasuk Perkemahan Jumat Sabtu (PERJUSA) untuk kelas 7 dan 8.', 'KPS-008', 1, false],
    ['kegiatan-keagamaan', 'Kegiatan Keagamaan', 'kegiatan', 'Manasik haji, wisuda tahfidz dan pembiasaan ibadah sebagai penguatan karakter.', 'KPS-011', 2, false],
    ['studi-edukasi', 'Studi Edukasi', 'kegiatan', 'Belajar di luar kelas: museum, planetarium dan destinasi edukatif.', 'KPS-012', 3, false],
    ['seni-musik', 'Seni & Musik', 'ekskul', 'Ruang berkarya di bidang seni dan musik. (Nama program perlu konfirmasi sekolah.)', 'KPS-029', 4, true],
  ] as const
  for (const [slug, title, kind, excerpt, cover, order, isDemo] of life) {
    await upsert(payload, 'extracurriculars', { slug: { equals: slug } }, { title, slug, kind, excerpt, cover: M(cover), featured: true, order, isDemo })
  }

  // ---------- 7. albums (archive; captions avoid unverified claims) ----------
  await upsert(payload, 'albums', { slug: { equals: 'kegiatan-sekolah-2025' } }, {
    title: 'Dokumentasi Kegiatan Sekolah 2025',
    slug: 'kegiatan-sekolah-2025',
    eventDate: '2025-05-17T01:00:00.000Z',
    excerpt: 'Foto kegiatan dari berita sekolah Februari–Agustus 2025.',
    cover: M('KPS-007'),
    publicationConsent: true,
    items: ['KPS-007', 'KPS-008', 'KPS-009', 'KPS-010', 'KPS-011', 'KPS-012', 'KPS-013'].map((id) => ({ media: M(id) })),
  })
  const archiveAlbum = await upsert(payload, 'albums', { slug: { equals: 'arsip-apresiasi-siswa-2022' } }, {
    title: 'Arsip Apresiasi Siswa 2022',
    slug: 'arsip-apresiasi-siswa-2022',
    eventDate: '2022-10-03T01:00:00.000Z',
    excerpt: 'Dokumentasi apresiasi siswa dari halaman prestasi lama. Rincian lomba, penerima dan peringkat belum diverifikasi.',
    cover: M('KPS-019'),
    publicationConsent: true,
    items: ['KPS-017', 'KPS-018', 'KPS-019', 'KPS-020', 'KPS-021', 'KPS-022', 'KPS-023', 'KPS-024', 'KPS-025', 'KPS-026'].map((id) => ({ media: M(id) })),
  })

  // ---------- 8. services (labels from the old site menu; URLs not yet confirmed) ----------
  const services = [
    ['perpustakaan', 'Perpustakaan', 'Katalog dan layanan perpustakaan sekolah.', 'book', 1],
    ['rapor', 'Rapor', 'Akses rapor siswa melalui sistem resmi sekolah.', 'report', 2],
    ['link-tugas', 'Link Tugas', 'Tautan tugas pembelajaran.', 'pencil', 3],
    ['e-buletin', 'E-Buletin', 'Buletin digital sekolah.', 'file', 4],
  ] as const
  for (const [slug, title, excerpt, icon, order] of services) {
    await upsert(payload, 'services', { slug: { equals: slug } }, { title, slug, excerpt, icon, order, url: null, external: true, isDemo: false })
  }

  // ---------- 9. admissions ----------
  await upsert(payload, 'admissions-cycles', { academicYear: { equals: '2026/2027' } }, {
    academicYear: '2026/2027',
    admissionStatus: 'unconfirmed',
    intro: 'Website lama menampilkan informasi Pendaftaran PMB/PPDB Tahun Ajaran 2026/2027. Status penerimaan, jadwal dan persyaratan sedang dikonfirmasi oleh sekolah.',
    registrationUrl: 'https://kps.sch.id/ppdb',
    contactNote: 'Untuk informasi pendaftaran, hubungi sekolah melalui email atau telepon pada halaman Kontak.',
    isDemo: false,
  })

  // ---------- 10. demo time-bound content (clearly labelled) ----------
  await upsert(payload, 'announcements', { slug: { equals: 'contoh-informasi-pendaftaran' } }, {
    title: 'Contoh: Informasi pendaftaran 2026/2027 sedang dikonfirmasi',
    slug: 'contoh-informasi-pendaftaran',
    excerpt: 'Data contoh untuk pratinjau. Ganti dengan pengumuman resmi sekolah.',
    content: lexical(['Ini adalah pengumuman contoh untuk menguji strip informasi prioritas di beranda. Data contoh tidak tampil di produksi.']),
    audience: ['umum', 'orang_tua'],
    category: 'pendaftaran',
    priority: 60,
    displayStart: witaDate(-1, 7),
    displayEnd: witaDate(30, 17),
    isDemo: true,
  })
  await upsert(payload, 'announcements', { slug: { equals: 'contoh-jadwal-pembagian-rapor' } }, {
    title: 'Contoh: Jadwal layanan administrasi',
    slug: 'contoh-jadwal-pembagian-rapor',
    excerpt: 'Pengumuman contoh untuk daftar pengumuman di beranda.',
    content: lexical(['Pengumuman contoh. Ganti dengan informasi resmi.']),
    audience: ['orang_tua', 'siswa'],
    category: 'akademik',
    priority: 10,
    displayStart: witaDate(-2, 7),
    displayEnd: witaDate(20, 17),
    isDemo: true,
  })
  const demoEvents = [
    ['contoh-pertemuan-orang-tua', 'Contoh: Pertemuan Orang Tua Siswa', 6, 9, 'scheduled', false],
    ['contoh-kegiatan-pramuka', 'Contoh: Latihan Gabungan Pramuka', 13, 7, 'scheduled', true],
    ['contoh-kunjungan-edukasi', 'Contoh: Kunjungan Edukasi', 20, 8, 'cancelled', false],
  ] as const
  for (const [slug, title, days, hour, eventStatus, allDay] of demoEvents) {
    await upsert(payload, 'events', { slug: { equals: slug } }, {
      title,
      slug,
      startAt: allDay ? witaDate(days, 0) : witaDate(days, hour),
      startAt_tz: 'Asia/Makassar',
      endAt: allDay ? witaDate(days, 0) : witaDate(days, hour + 2),
      endAt_tz: 'Asia/Makassar',
      allDay,
      location: 'SMP Nasional KPS',
      organizer: 'Sekolah',
      eventStatus,
      excerpt: 'Agenda contoh untuk pratinjau. Tidak tampil di produksi.',
      isDemo: true,
    })
  }

  // ---------- 11. redirects (old WordPress paths) ----------
  const redirects: [string, string][] = [
    ['/home', '/'],
    ['/home/profil', '/tentang'],
    ['/home/profile', '/tentang'],
    ['/home/berita', '/berita'],
    ['/home/fasilitas', '/tentang/fasilitas'],
    ['/home/prestasi', '/prestasi'],
    ['/home/kontak', '/kontak'],
    ['/home/alumni', '/alumni'],
    ['/home/perpustakaan', '/layanan'],
    ['/home/raport', '/layanan'],
    ['/home/dana-bos', '/transparansi-bos'],
    ['/home/pengelolaan-dana-bos', '/transparansi-bos'],
    ['/home/kritik-dan-saran', '/kontak'],
    ['/home/calendar', '/agenda'],
    ['/home/e-buletin', '/unduhan'],
    ...articles.map((a) => [`/home/${a.slug}`, `/berita/${a.slug}`] as [string, string]),
  ]
  for (const [oldPath, newPath] of redirects) {
    const f = await payload.find({ collection: 'redirects', where: { oldPath: { equals: oldPath } }, limit: 1, overrideAccess: true })
    if (!f.docs[0]) await payload.create({ collection: 'redirects', data: { oldPath, newPath, active: true }, overrideAccess: true, context: ctx })
  }
  fs.writeFileSync(path.resolve('REDIRECT_MAP.csv'), 'old_path,new_path,status\n' + redirects.map(([o, n]) => `${o}/,${n},301`).join('\n') + '\n')

  // ---------- 12. globals ----------
  await payload.updateGlobal({
    slug: 'site-settings',
    overrideAccess: true,
    context: ctx,
    data: {
      schoolName: 'SMP Nasional KPS',
      city: 'Balikpapan',
      logo: M('KPS-001'),
      valuesLine: 'Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional',
      shortProfile:
        'SMP Nasional KPS di Balikpapan mengembangkan pengetahuan, karakter dan potensi setiap siswa melalui pembelajaran, kegiatan karakter dan kehidupan sekolah yang hangat.',
      address: 'Jl. Sport No.1, Prapatan, Balikpapan',
      email: 'smp@kps.sch.id',
      phone: '0542-421611',
      fax: '0542-738381',
      whatsapp: '',
      serviceHours: '',
      contactVerified: false,
      portalUrl: '',
      alumniUrl: '',
      socials: [{ platform: 'instagram', handle: '@smpnas.kps', url: 'https://www.instagram.com/smpnas.kps/' }],
    } as never,
  })
  await payload.updateGlobal({
    slug: 'navigation',
    overrideAccess: true,
    context: ctx,
    data: {
      header: [
        { label: 'Tentang KPS', href: '/tentang', children: [
          { label: 'Profil Sekolah', href: '/tentang', description: 'Nilai, profil dan lingkungan' },
          { label: 'Visi & Misi', href: '/tentang/visi-misi' },
          { label: 'Sejarah', href: '/tentang/sejarah' },
          { label: 'Pimpinan & Guru', href: '/tentang/pimpinan-guru' },
          { label: 'Fasilitas', href: '/tentang/fasilitas' },
        ] },
        { label: 'Pembelajaran', href: '/pembelajaran', children: [] },
        { label: 'Kehidupan Siswa', href: '/kehidupan-siswa', children: [
          { label: 'Kegiatan & Ekstrakurikuler', href: '/kehidupan-siswa' },
          { label: 'Prestasi', href: '/prestasi' },
          { label: 'Galeri', href: '/galeri' },
          { label: 'Alumni', href: '/alumni' },
        ] },
        { label: 'Prestasi', href: '/prestasi', children: [] },
        { label: 'Informasi', href: '/informasi', children: [
          { label: 'Berita', href: '/berita' },
          { label: 'Pengumuman', href: '/pengumuman' },
          { label: 'Agenda', href: '/agenda' },
          { label: 'Unduhan', href: '/unduhan' },
          { label: 'Transparansi BOS', href: '/transparansi-bos' },
          { label: 'Panduan', href: '/panduan' },
          { label: 'Layanan', href: '/layanan' },
        ] },
        { label: 'Kontak', href: '/kontak', children: [] },
      ],
      footer: [
        { label: 'Profil Sekolah', href: '/tentang' },
        { label: 'Informasi', href: '/informasi' },
        { label: 'Pendaftaran', href: '/pendaftaran' },
        { label: 'Berita', href: '/berita' },
        { label: 'Agenda', href: '/agenda' },
        { label: 'Dana BOS', href: '/transparansi-bos' },
        { label: 'Layanan', href: '/layanan' },
        { label: 'Alumni', href: '/alumni' },
        { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
      ],
    } as never,
  })
  await payload.updateGlobal({
    slug: 'homepage',
    overrideAccess: true,
    context: ctx,
    data: {
      _status: 'published',
      hero: {
        eyebrow: 'Selamat Datang di SMP Nasional KPS',
        title: 'Tempat Bertumbuh, Berkarya, dan Berprestasi.',
        description: 'Mengembangkan pengetahuan, karakter, dan potensi setiap siswa.',
        image: M('KPS-H01'),
        slides: [M('KPS-H01'), M('KPS-H02'), M('KPS-H03'), M('KPS-H04')],
        slideInterval: 6,
        accentImages: [],
        primaryLabel: 'Kenali KPS',
        primaryHref: '/tentang',
        secondaryLabel: 'Informasi Pendaftaran',
        secondaryHref: '/pendaftaran',
        showLiveClock: true,
      },
      quickLinks: [
        { label: 'Pendaftaran', icon: 'school', href: '/pendaftaran' },
        { label: 'Kalender Akademik', icon: 'calendar', href: '/agenda' },
        { label: 'Pengumuman', icon: 'megaphone', href: '/pengumuman' },
        { label: 'Perpustakaan', icon: 'book', href: '/layanan#perpustakaan' },
        { label: 'Alumni', icon: 'users', href: '/alumni' },
        { label: 'Layanan Sekolah', icon: 'grid', href: '/layanan' },
      ],
      intro: {
        eyebrow: 'Mengenal',
        heading: 'Mengenal SMP Nasional KPS',
        text: 'Di SMP Nasional KPS, belajar tidak berhenti di ruang kelas. Siswa tumbuh melalui pembelajaran, kegiatan karakter, kepramukaan, keagamaan dan kunjungan belajar — dalam lingkungan sekolah yang hangat di Balikpapan.',
        introImage: M('KPS-010'),
        collage: [M('KPS-007'), M('KPS-013')],
        pillars: VALUES,
      },
      texts: {
        programsEyebrow: 'Pembelajaran',
        programsHeading: 'Belajar dengan Makna',
        programsIntro: 'Pembelajaran yang menginspirasi, relevan dengan kehidupan, dan membentuk karakter.',
        studentLifeEyebrow: 'Kehidupan Siswa',
        achievementsEyebrow: 'Prestasi',
        achievementsText: 'Apresiasi proses, karya, dan pencapaian siswa.',
        infoEyebrow: 'Informasi',
        newsEyebrow: 'Berita Sekolah',
        communityEyebrow: 'Komunitas',
        alumniTitle: 'Jejaring Alumni',
        alumniText: 'Berbagi cerita, pengalaman, dan inspirasi lintas angkatan.',
        ctaEyebrow: 'Pendaftaran Siswa Baru',
        studentLifeHeading: 'Ruang untuk Setiap Potensi',
        achievementsHeading: 'Semangat untuk Berprestasi',
        newsHeading: 'Cerita dari KPS',
        communityHeading: 'Terhubung dalam Keluarga KPS',
        communityText: 'Siswa, orang tua, guru dan alumni adalah bagian dari keluarga besar KPS. Ikuti kabar sekolah dan tetap terhubung.',
        communityImage: M('KPS-027'),
        achievementsAlbum: (archiveAlbum as { id: number }).id,
        ctaHeading: 'Mari Mengenal KPS Lebih Dekat',
        ctaText: 'Temukan lingkungan belajar untuk tumbuh dan berkarya.',
      },
      sections: [
        { type: 'search', enabled: true },
        { type: 'quickLinks', enabled: true },
        { type: 'schoolIntro', enabled: true },
        { type: 'highlights', enabled: false },
        { type: 'programs', enabled: true, limit: 3 },
        { type: 'studentLife', enabled: true, limit: 4 },
        { type: 'achievements', enabled: true },
        { type: 'announcementsAgenda', enabled: true, limit: 3 },
        { type: 'latestNews', enabled: true, limit: 3 },
        { type: 'facilities', enabled: false, limit: 3 },
        { type: 'communityAlumni', enabled: true },
        { type: 'admissionsCta', enabled: true },
      ],
    } as never,
  })

  log('Seed selesai.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
