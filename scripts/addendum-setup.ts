import type { Payload } from 'payload'
import { lexical } from '../src/lib/lexical'

/**
 * Setup for the P0/P1 addendum. ADDITIVE and NON-OVERWRITING: it only creates what is missing, so it is safe on
 * a live site where staff have already edited navigation, the homepage or services. No school data is invented:
 * - agenda categories = the list named in the addendum (configuration, editable in the CMS)
 * - FAQ = only "how to use this website" answers that are true by construction of this site
 * - social accounts = moved from the old settings field (already public on the site)
 * Running it again changes nothing.
 */
const ctx = { skipAudit: true }

export async function runAddendumSetup(payload: Payload, log: (m: string) => void = (m) => payload.logger.info(m)) {
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
  return out
}
