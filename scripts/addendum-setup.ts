import type { Payload } from 'payload'
import { lexical } from '../src/lib/lexical'
import { importMedia } from './import-media'

/**
 * Setup for the P0/P1 addendum. ADDITIVE and NON-OVERWRITING: it only creates what is missing, so it is safe on
 * a live site where staff have already edited navigation, the homepage or services. No school data is invented:
 * - agenda categories = the list named in the addendum (configuration, editable in the CMS)
 * - FAQ = only "how to use this website" answers that are true by construction of this site
 * - social accounts = moved from the old settings field (already public on the site)
 * Running it again changes nothing.
 */
const ctx = { skipAudit: true }

export async function runAddendumSetup(payload: Payload, log: (m: string) => void = (m) => payload.logger.info(m), opts: { deadline?: number } = {}) {
  const out: string[] = []
  const note = (m: string) => {
    out.push(m)
    log(m)
  }

  // 1. agenda categories
  const cats: [string, string, string][] = [
    ['Akademik', 'akademik', 'teal'],
    ['Ujian', 'ujian', 'red'],
    ['Libur', 'libur', 'grey'],
    ['Penerimaan', 'penerimaan', 'gold'],
    ['Ekstrakurikuler', 'ekstrakurikuler', 'green'],
    ['Orang tua', 'orang-tua', 'purple'],
    ['Kegiatan sekolah', 'kegiatan-sekolah', 'navy'],
  ]
  let created = 0
  for (const [i, [title, slug, color]] of cats.entries()) {
    const found = await payload.find({ collection: 'event-categories', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
    if (!found.docs[0]) {
      await payload.create({ collection: 'event-categories', overrideAccess: true, context: ctx, data: { title, slug, color: color as 'teal', order: (i + 1) * 10 } })
      created++
    }
  }
  note(`Kategori agenda: ${created} baru, ${cats.length - created} sudah ada.`)

  // 2. website-usage FAQs (true by construction; school-policy FAQs are left to the school)
  const faqs: [string, string, string[]][] = [
    ['cara-menambahkan-agenda-ke-kalender', 'Bagaimana menyimpan agenda sekolah ke kalender saya?', [
      'Buka halaman agenda yang diinginkan, lalu tekan tombol "Tambah ke kalender" untuk mengunduh berkas kalender (.ics) yang bisa dibuka di Google Calendar, Outlook atau kalender ponsel. Tersedia juga tombol langsung ke Google Calendar.',
      'Bila jadwal berubah, buka lagi halaman agenda dan unduh ulang berkasnya agar kalender Anda diperbarui.',
    ]],
    ['zona-waktu-website', 'Jam yang tertulis di website memakai zona waktu apa?', [
      'Semua jam di website ini memakai Waktu Indonesia Tengah (WITA), sesuai lokasi sekolah di Balikpapan.',
    ]],
    ['nomor-referensi-pesan', 'Apa gunanya nomor referensi setelah mengirim pesan atau formulir?', [
      'Nomor referensi membantu petugas menemukan pesan Anda ketika Anda menanyakan tindak lanjutnya. Nomor ini bukan nomor pendaftaran siswa dan tidak bisa dipakai untuk melihat data Anda secara online.',
    ]],
  ]
  let faqNew = 0
  for (const [i, [slug, title, paras]] of faqs.entries()) {
    const found = await payload.find({ collection: 'faqs', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true, draft: true })
    if (!found.docs[0]) {
      await payload.create({
        collection: 'faqs',
        overrideAccess: true,
        context: ctx,
        data: { title, slug, category: 'website', answer: lexical(paras) as never, order: (i + 1) * 10, lastReviewedAt: new Date().toISOString(), _status: 'published', workflowStatus: 'published' },
      })
      faqNew++
    }
  }
  note(`FAQ penggunaan website: ${faqNew} baru.`)

  // 3. move social accounts from the old settings array (only if the new collection is empty)
  const accounts = await payload.count({ collection: 'social-accounts', overrideAccess: true })
  if (accounts.totalDocs === 0) {
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
    let moved = 0
    for (const [i, s] of (settings.socials ?? []).entries()) {
      try {
        await payload.create({
          collection: 'social-accounts',
          overrideAccess: true,
          context: ctx,
          data: {
            platform: s.platform as 'instagram',
            displayName: s.handle || s.platform,
            handle: s.handle,
            profileUrl: s.url,
            owner: 'sekolah',
            verifiedBySchool: true,
            verificationNote: 'Dipindahkan dari Pengaturan Sekolah; akun ini tercantum di situs resmi lama. Konfirmasi ulang bila perlu.',
            enabled: true,
            showInFooter: true,
            showOnContact: true,
            showOnMediaPage: true,
            order: (i + 1) * 10,
          },
        })
        moved++
      } catch (e) {
        note(`Akun ${s.url} dilewati: ${(e as Error).message}`)
      }
    }
    note(`Akun media sosial dipindahkan: ${moved}. KPS TV belum ditambahkan — URL kanal menunggu verifikasi sekolah.`)
  } else note('Akun media sosial: sudah ada, tidak diubah.')

  // 4. navigation: add submenu items only if missing
  const nav = await payload.findGlobal({ slug: 'navigation', depth: 0, overrideAccess: true })
  const header = (nav.header ?? []).map((h) => ({ ...h, children: [...(h.children ?? [])] }))
  const add = (parentHref: string, item: { label: string; href: string }) => {
    const parent = header.find((h) => h.href === parentHref)
    if (!parent) return false
    if (parent.children.some((c) => c.href === item.href)) return false
    parent.children.push(item)
    return true
  }
  const added = [
    add('/informasi', { label: 'FAQ', href: '/faq' }),
    add('/informasi', { label: 'Video & Media Sosial', href: '/media' }),
    add('/kehidupan-siswa', { label: 'Karya Siswa', href: '/karya-siswa' }),
  ].filter(Boolean).length
  if (added) await payload.updateGlobal({ slug: 'navigation', overrideAccess: true, context: ctx, data: { header } as never })
  note(`Navigasi: ${added} tautan ditambahkan (tautan tampil hanya bila fiturnya aktif).`)

  // 5. homepage: insert the KPS TV section after news (hidden automatically while nothing is published)
  const home = await payload.findGlobal({ slug: 'homepage', depth: 0, overrideAccess: true, draft: false })
  const sections = [...(home.sections ?? [])]
  if (!sections.some((s) => s.type === 'mediaHub')) {
    const at = sections.findIndex((s) => s.type === 'latestNews')
    sections.splice(at >= 0 ? at + 1 : sections.length, 0, { type: 'mediaHub', enabled: true, limit: 3 } as (typeof sections)[number])
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = home as unknown as Record<string, unknown>
    await payload.updateGlobal({ slug: 'homepage', overrideAccess: true, context: ctx, data: { ...rest, sections, _status: 'published' } as never })
    note('Beranda: section KPS TV & Cerita Digital ditambahkan setelah Berita.')
  } else note('Beranda: section KPS TV sudah ada.')

  // 6. add new footer link FAQ if missing
  const footer = [...(nav.footer ?? [])]
  if (!footer.some((f) => f.href === '/faq')) {
    const nav2 = await payload.findGlobal({ slug: 'navigation', depth: 0, overrideAccess: true })
    const f2 = [...(nav2.footer ?? [])]
    const at = f2.findIndex((f) => f.href === '/kebijakan-privasi')
    f2.splice(at >= 0 ? at : f2.length, 0, { label: 'FAQ', href: '/faq' } as (typeof f2)[number])
    await payload.updateGlobal({ slug: 'navigation', overrideAccess: true, context: ctx, data: { footer: f2 } as never })
    note('Footer: tautan FAQ ditambahkan.')
  }
  // 7. new photos from the project owner (leader portraits cropped from the template, HAKORDIA 2025)
  const media = await importMedia(payload, () => {}, { deadline: opts.deadline })
  note(`Foto baru: ${media.created} diunggah, ${media.skipped} sudah ada${media.remaining ? `, ${media.remaining} menunggu (jalankan lagi)` : ''}.`)
  const M = (id: string) => (media.ids[id] as number | undefined) ?? undefined

  // 8. leader portraits: replace only the old hexagon photos (KPS-002..004) or an empty photo — never a staff upload
  const OLD = new Set(['KPS-002', 'KPS-003', 'KPS-004'])
  const leaders: [string, string][] = [
    ['M. Afcariono, S.Si., M.Pd.', 'KPS-P01'],
    ['Abundaris Khamil Iftara, S.Pd.', 'KPS-P02'],
    ['Hanim Farida, S.Pd., M.Pd.', 'KPS-P03'],
  ]
  let swapped = 0
  for (const [name, id] of leaders) {
    const newId = M(id)
    if (!newId) continue
    const st = (await payload.find({ collection: 'staff', where: { name: { equals: name } }, limit: 1, depth: 1, overrideAccess: true })).docs[0]
    if (!st) continue
    const cur = st.photo && typeof st.photo === 'object' ? (st.photo as { id: number; sourceId?: string | null }) : null
    if (cur && cur.id === newId) continue
    if (cur && !OLD.has(String(cur.sourceId ?? ''))) continue
    await payload.update({ collection: 'staff', id: st.id, overrideAccess: true, context: ctx, data: { photo: newId, publicationConsent: true } })
    swapped++
  }
  note(`Foto pimpinan (templat potret): ${swapped} diperbarui.`)

  // 9. "Prestasi" news category + HAKORDIA 2025 news and achievement (facts as given by the project owner)
  const cat =
    (await payload.find({ collection: 'categories', where: { slug: { equals: 'prestasi' } }, limit: 1, overrideAccess: true })).docs[0] ??
    (await payload.create({ collection: 'categories', overrideAccess: true, context: ctx, data: { title: 'Prestasi', slug: 'prestasi' } }))
  const POST_SLUG = 'juara-1-sekolah-integritas-hakordia-2025'
  let post = (await payload.find({ collection: 'posts', where: { slug: { equals: POST_SLUG } }, limit: 1, depth: 0, overrideAccess: true, draft: true, trash: true })).docs[0]
  if (!post) {
    post = await payload.create({
      collection: 'posts',
      overrideAccess: true,
      context: ctx,
      data: {
        title: 'SMP Nasional KPS Raih Juara I Kategori Sekolah Integritas pada HAKORDIA 2025',
        slug: POST_SLUG,
        excerpt: 'SMP Nasional KPS menerima penghargaan Juara I kategori Sekolah Integritas dalam peringatan Hari Antikorupsi Sedunia (HAKORDIA) 2025.',
        cover: M('KPS-A01'),
        coverCaption: 'Penyerahan penghargaan Juara I kategori Sekolah Integritas, HAKORDIA 2025.',
        categories: [cat.id],
        content: lexical([
          'SMP Nasional KPS menerima penghargaan Juara I kategori Sekolah Integritas dalam rangkaian peringatan Hari Antikorupsi Sedunia (HAKORDIA) 2025.',
          'Penghargaan ini sejalan dengan nilai Berakhlak Mulia yang menjadi pegangan sekolah dalam keseharian belajar dan bekerja.',
          'Terima kasih kepada seluruh guru, staf, siswa dan orang tua yang terus menjaga budaya kejujuran dan integritas di SMP Nasional KPS.',
        ]) as never,
        _status: 'published',
        workflowStatus: 'published',
      } as never,
    })
    note('Berita HAKORDIA 2025 dibuat.')
  }
  const ACH_SLUG = 'hakordia-2025-sekolah-integritas'
  if (!(await payload.find({ collection: 'achievements', where: { slug: { equals: ACH_SLUG } }, limit: 1, depth: 0, overrideAccess: true, draft: true, trash: true })).docs[0]) {
    await payload.create({
      collection: 'achievements',
      overrideAccess: true,
      context: ctx,
      data: {
        title: 'Juara I Kategori Sekolah Integritas — HAKORDIA 2025',
        slug: ACH_SLUG,
        year: 2025,
        category: 'lainnya',
        recipientPublic: 'SMP Nasional KPS',
        excerpt: 'Penghargaan Juara I kategori Sekolah Integritas pada peringatan Hari Antikorupsi Sedunia (HAKORDIA) 2025.',
        content: lexical([
          'SMP Nasional KPS meraih Juara I kategori Sekolah Integritas pada peringatan Hari Antikorupsi Sedunia (HAKORDIA) 2025.',
        ]) as never,
        cover: M('KPS-A01'),
        // evidence: photo of the award board/certificate supplied by the project owner (content/assets/prestasi)
        verified: true,
        featured: true,
        _status: 'published',
        workflowStatus: 'published',
      } as never,
    })
    note('Prestasi HAKORDIA 2025 dibuat (terverifikasi dari foto piagam yang diberikan pemilik proyek).')
  }

  // 10. "Tentang KPS" page: highlight banner linking to achievements + the HAKORDIA news (only if none yet)
  const about = (await payload.find({ collection: 'pages', where: { slug: { equals: 'tentang' } }, limit: 1, depth: 0, overrideAccess: true, draft: true })).docs[0]
  if (about && !(about.layout ?? []).some((b) => b.blockType === 'highlightBanner')) {
    await payload.update({
      collection: 'pages',
      id: about.id,
      overrideAccess: true,
      context: ctx,
      data: {
        layout: [
          ...(about.layout ?? []),
          {
            blockType: 'highlightBanner',
            eyebrow: 'Prestasi',
            heading: 'Semangat untuk Berprestasi',
            text: 'Capaian siswa dan sekolah yang telah dipublikasikan, termasuk penghargaan Sekolah Integritas pada HAKORDIA 2025.',
            linkLabel: 'Lihat semua prestasi',
            linkHref: '/prestasi',
            post: post.id,
          },
        ],
        _status: 'published',
      } as never,
    })
    note('Halaman Tentang: banner prestasi + berita HAKORDIA ditambahkan.')
  }
  // 11. KPS TV: official channel + featured video (URLs supplied by the project owner, 25 Oct 2026)
  const CHANNEL_URL = 'https://www.youtube.com/channel/UCVaC5I8m-j9Msi036Iega3w'
  let channel = (await payload.find({ collection: 'social-accounts', where: { profileUrl: { equals: CHANNEL_URL } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!channel) {
    channel = await payload.create({
      collection: 'social-accounts',
      overrideAccess: true,
      context: ctx,
      data: {
        platform: 'youtube',
        displayName: 'KPS TV SMP Nasional KPS Balikpapan',
        profileUrl: CHANNEL_URL,
        owner: 'sekolah',
        verifiedBySchool: true,
        verificationNote: 'URL kanal diberikan pemilik proyek (25 Okt 2026).',
        enabled: true,
        showInFooter: true,
        showOnContact: true,
        showOnMediaPage: true,
        order: 5,
      },
    })
    note('Kanal YouTube KPS TV ditambahkan sebagai akun resmi.')
  }
  const VIDEO_URL = 'https://youtu.be/qZSsp-Jjbcc'
  const existingVideo = (await payload.find({ collection: 'media-items', where: { providerItemId: { equals: 'qZSsp-Jjbcc' } }, limit: 1, depth: 0, overrideAccess: true, draft: true, trash: true })).docs[0]
  if (!existingVideo) {
    await payload.create({
      collection: 'media-items',
      overrideAccess: true,
      context: ctx,
      data: {
        // neutral website title; editors may replace it with the video's own title
        title: 'Video Unggulan KPS TV',
        slug: 'video-unggulan-kps-tv',
        originalUrl: VIDEO_URL,
        excerpt: 'Tayangan pilihan dari kanal resmi KPS TV SMP Nasional KPS Balikpapan.',
        contentType: 'video',
        displayMode: 'click_to_load_embed',
        sourceAccount: channel.id,
        homepageFeatured: true,
        homepageOrder: 1,
        consentStatus: 'not_needed',
        contentPermissionNote: 'Dipublikasikan di kanal resmi sekolah; dipilih pemilik proyek untuk ditonjolkan.',
        _status: 'published',
        workflowStatus: 'published',
      } as never,
    })
    note('Video unggulan KPS TV ditambahkan dan ditampilkan di beranda.')
  }
  // 12. KPS-027 shows teachers & staff (not alumni): fix its alt text, move it to "Tentang KPS",
  //     and use the 2026 alumni association inauguration photo for the community/alumni block.
  const oldAlt = 'Warga sekolah berpakaian batik dan kebaya berfoto bersama di halaman sekolah'
  const staffPhotoId = M('KPS-027')
  const alumniPhotoId = M('KPS-ALM01')
  if (staffPhotoId) {
    const sp = await payload.findByID({ collection: 'media', id: staffPhotoId, depth: 0, overrideAccess: true })
    if (!sp.alt || sp.alt === oldAlt)
      await payload.update({ collection: 'media', id: staffPhotoId, overrideAccess: true, context: ctx, data: { alt: 'Guru dan staf SMP Nasional KPS berbusana adat nusantara berfoto bersama di halaman sekolah' } })
  }
  const home2 = await payload.findGlobal({ slug: 'homepage', depth: 0, overrideAccess: true, draft: false })
  const curCommunity = home2.texts?.communityImage
  const curId = curCommunity && typeof curCommunity === 'object' ? (curCommunity as { id: number }).id : curCommunity
  if (alumniPhotoId && (!curId || curId === staffPhotoId)) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = home2 as unknown as Record<string, unknown>
    await payload.updateGlobal({ slug: 'homepage', overrideAccess: true, context: ctx, data: { ...rest, texts: { ...(home2.texts ?? {}), communityImage: alumniPhotoId }, _status: 'published' } as never })
    note('Beranda: foto Komunitas & Alumni diganti foto Pelantikan Ikatan Alumni 2026.')
  }
  const about2 = (await payload.find({ collection: 'pages', where: { slug: { equals: 'tentang' } }, limit: 1, depth: 0, overrideAccess: true, draft: true })).docs[0]
  const hasStaffBlock = (about2?.layout ?? []).some((b) => b.blockType === 'imageText' && (typeof b.image === 'object' ? (b.image as { id: number } | null)?.id : b.image) === staffPhotoId)
  if (about2 && staffPhotoId && !hasStaffBlock) {
    const layout = [...(about2.layout ?? [])]
    const at = layout.findIndex((b) => b.blockType === 'highlightBanner')
    layout.splice(at >= 0 ? at : layout.length, 0, {
      blockType: 'imageText',
      heading: 'Guru dan Staf SMP Nasional KPS',
      content: lexical(['Guru dan staf SMP Nasional KPS mendampingi siswa belajar, berkarya dan bertumbuh, sekaligus merawat keberagaman budaya nusantara di lingkungan sekolah.']) as never,
      image: staffPhotoId,
      imageSide: 'left',
    } as (typeof layout)[number])
    await payload.update({ collection: 'pages', id: about2.id, overrideAccess: true, context: ctx, data: { layout, _status: 'published' } as never })
    note('Halaman Tentang: foto guru & staf dipindahkan ke sini.')
  }
  return out
}
