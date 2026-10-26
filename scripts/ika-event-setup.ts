import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Payload } from 'payload'
import { lexical } from '../src/lib/lexical'

/**
 * Agenda: Pelantikan Pengurus IKA Sekolah Nasional KPS (30 Oct 2026), from the official invitation PDF
 * supplied by the project owner. Idempotent and non-overwriting: creates the category, the downloadable
 * invitation and the event only when missing (matched by slug / title).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../content')
const ctx = { skipAudit: true }
export const IKA_EVENT_SLUG = 'pelantikan-pengurus-ika-kps-2026'

export async function runIkaEventSetup(payload: Payload, posterId?: number) {
  const out: string[] = []

  // category "Alumni"
  let cat = (await payload.find({ collection: 'event-categories', where: { slug: { equals: 'alumni' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!cat) {
    cat = await payload.create({ collection: 'event-categories', overrideAccess: true, context: ctx, data: { title: 'Alumni', slug: 'alumni', color: 'gold', order: 80 } as never })
    out.push('Kategori agenda "Alumni" dibuat.')
  }

  // invitation PDF (public download)
  const docTitle = 'Undangan Pelantikan Pengurus IKA Sekolah Nasional KPS 2026'
  let doc = (await payload.find({ collection: 'documents', where: { title: { equals: docTitle } }, limit: 1, depth: 0, overrideAccess: true, draft: true })).docs[0]
  if (!doc) {
    const file = path.join(ROOT, 'assets/alumni/undangan-pelantikan-ika-kps-2026.pdf')
    const data = fs.readFileSync(file)
    doc = await payload.create({
      collection: 'documents',
      overrideAccess: true,
      context: ctx,
      file: { data, mimetype: 'application/pdf', name: 'undangan-pelantikan-ika-kps-2026.pdf', size: data.length },
      data: {
        title: docTitle,
        category: 'umum',
        period: '2026',
        description: 'Undangan dan susunan acara (rundown) Pelantikan Pengurus Ikatan Keluarga Alumni (IKA) Sekolah Nasional KPS, Jumat 30 Oktober 2026.',
        originalFilename: 'undangan-pelantikan-ika-kps-2026.pdf',
        publishedAt: new Date().toISOString(),
        _status: 'published',
        workflowStatus: 'published',
      } as never,
    })
    out.push('Dokumen undangan (PDF) diunggah.')
  }

  const existing = (await payload.find({ collection: 'events', where: { slug: { equals: IKA_EVENT_SLUG } }, limit: 1, depth: 0, overrideAccess: true, draft: true })).docs[0]
  if (!existing) {
    const rundown: [string, string, boolean?][] = [
      ['13:00 - 13:45', 'Registrasi Peserta dan Undangan'],
      ['13:45 - 13:55', 'Tari Penyambutan dan Paduan Suara SD Nasional KPS “Shine Choir”'],
      ['13:55 - 14:15', 'Rangkaian Pembukaan dan Pembacaan Doa'],
      ['14:15 - 14:20', 'Laporan Ketua Panitia'],
      ['14:20 - 14:45', 'Prosesi Pelantikan Pengurus IKA KPS', true],
      ['14:45 - 15:10', 'Sambutan-sambutan'],
      ['15:10 - 15:20', 'Pemberian Cendera Mata VIP'],
      ['15:20 - 15:25', 'Penampilan Vokal Grup “Symphony Glow”'],
      ['15:25 - 15:30', 'Sesi Foto Bersama dan Ramah Tamah'],
      ['15:30', 'Penutupan'],
    ]
    await payload.create({
      collection: 'events',
      overrideAccess: true,
      context: ctx,
      data: {
        title: 'Pelantikan Pengurus Ikatan Keluarga Alumni (IKA) Sekolah Nasional KPS',
        slug: IKA_EVENT_SLUG,
        // Jumat, 30 Oktober 2026, 13.30–15.30 WITA (UTC+8)
        startAt: '2026-10-30T05:30:00.000Z',
        startAt_tz: 'Asia/Makassar',
        endAt: '2026-10-30T07:30:00.000Z',
        endAt_tz: 'Asia/Makassar',
        allDay: false,
        category: cat.id,
        audience: ['semua', 'alumni'],
        location: 'Ghrya Kreativitas Mahakam, Sekolah Nasional KPS Balikpapan',
        organizer: 'Ikatan Keluarga Alumni (IKA) Sekolah Nasional KPS',
        eventStatus: 'scheduled',
        excerpt: 'Legacy of Excellence: Menjaga Tradisi, Membangun Generasi.',
        content: lexical([
          'Bapak/Ibu/Saudara/i, Alumni, Guru, serta Keluarga Besar Sekolah Nasional KPS diharapkan kehadirannya dalam acara Pelantikan Pengurus Ikatan Keluarga Alumni (IKA) Sekolah Nasional KPS.',
          'Acara berlangsung pukul 13.30–15.30 WITA; registrasi peserta dan undangan dibuka mulai pukul 13.00 WITA. Pakaian: Batik / Smart Casual.',
          'Kehadiran Bapak/Ibu/Saudara/i merupakan suatu kehormatan dan kebahagiaan bagi kami.',
        ]) as never,
        rundown: rundown.map(([time, activity, highlight]) => ({ time, activity, highlight: Boolean(highlight) })),
        dressCode: 'Batik / Smart Casual',
        attachments: [doc.id],
        ...(posterId ? { cover: posterId } : {}),
        homeBanner: true,
        _status: 'published',
        workflowStatus: 'published',
      } as never,
    })
    out.push('Agenda "Pelantikan Pengurus IKA KPS" (30 Okt 2026) diterbitkan dan tampil sebagai banner beranda.')
  } else if (posterId && !existing.cover) {
    await payload.update({ collection: 'events', id: existing.id, overrideAccess: true, context: ctx, data: { cover: posterId } as never })
  }
  return out
}
