import type { Endpoint } from 'payload'
import { endpointPayload, noSchool, notifyAddress } from '../tenancy/endpoint'
import { randomBytes } from 'crypto'
import { ipFromHeaders, rateLimited } from '../lib/rate-limit'
import { idempotencyKeyOf, waitForKey } from '../lib/forms'

const CATEGORIES = ['umum', 'pendaftaran', 'akademik', 'saran', 'alumni', 'kegiatan', 'kunjungan'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9\s\-()]{8,20}$/

export type ContactInput = {
  name?: unknown
  email?: unknown
  phone?: unknown
  category?: unknown
  message?: unknown
  consent?: unknown
  website?: unknown // honeypot
  startedAt?: unknown
  topic?: unknown
  idempotencyKey?: unknown
}

export const validateContact = (b: ContactInput) => {
  const errors: Record<string, string> = {}
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const email = typeof b.email === 'string' ? b.email.trim() : ''
  const phone = typeof b.phone === 'string' ? b.phone.trim() : ''
  const message = typeof b.message === 'string' ? b.message.trim() : ''
  const category = typeof b.category === 'string' ? b.category : ''
  if (name.length < 2 || name.length > 100) errors.name = 'Nama wajib diisi (2–100 karakter).'
  if (!email && !phone) errors.email = 'Isi minimal satu kanal balasan: email atau telepon.'
  if (email && (!EMAIL_RE.test(email) || email.length > 160)) errors.email = 'Format email tidak valid.'
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'Format nomor telepon tidak valid.'
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) errors.category = 'Pilih kategori.'
  if (message.length < 10 || message.length > 3000) errors.message = 'Pesan 10–3000 karakter.'
  if (b.consent !== true && b.consent !== 'true' && b.consent !== 'on') errors.consent = 'Persetujuan penggunaan data wajib dicentang.'
  const topic = typeof b.topic === 'string' ? b.topic.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80) : ''
  return { errors, value: { name, email, phone, message, category, topic } }
}

const makeRef = () => {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  return `PSN-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`
}

export const contactSubmitEndpoint: Endpoint = {
  path: '/submit',
  method: 'post',
  handler: async (req) => {
    const p = await endpointPayload(req)
    if (!p) return noSchool()
    // shared across server instances (database); 5 per 10 minutes per IP
    if (await rateLimited(p, `contact:${ipFromHeaders(req.headers)}`)) {
      return Response.json({ ok: false, error: 'Terlalu banyak pengiriman. Coba lagi beberapa menit lagi.' }, { status: 429 })
    }
    let body: ContactInput = {}
    try {
      body = (await req.json?.()) ?? {}
    } catch {
      return Response.json({ ok: false, error: 'Format permintaan tidak valid.' }, { status: 400 })
    }
    // Spam controls: honeypot + minimum fill time (silently accept, store nothing)
    const started = Number(body.startedAt)
    if ((typeof body.website === 'string' && body.website.length > 0) || (started && Date.now() - started < 2500)) {
      return Response.json({ ok: true, reference: makeRef() })
    }
    const { errors, value } = validateContact(body)
    if (Object.keys(errors).length) return Response.json({ ok: false, errors }, { status: 400 })

    const idempotencyKey = idempotencyKeyOf(body.idempotencyKey)
    if (!idempotencyKey) return Response.json({ ok: false, error: 'Muat ulang halaman lalu kirim lagi.' }, { status: 400 })
    const byKey = async () =>
      (await p.find({ collection: 'contact-messages', where: { idempotencyKey: { equals: idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    const prior = await byKey()
    if (prior) return Response.json({ ok: true, reference: prior.reference, repeated: true })

    const reference = makeRef()
    let doc: { id: number }
    try {
      doc = await p.create({
        collection: 'contact-messages',
        overrideAccess: true,
        data: { ...value, category: value.category as 'umum', reference, consent: true, status: 'new', idempotencyKey },
      })
    } catch (e) {
      // a concurrent duplicate submit with the same key won the race → answer with its reference
      const again = await waitForKey(byKey)
      if (again) return Response.json({ ok: true, reference: again.reference, repeated: true })
      p.logger.error(`Gagal menyimpan pesan: ${(e as Error).message}`)
      return Response.json({ ok: false, error: 'Maaf, pesan belum tersimpan. Coba lagi beberapa saat lagi.' }, { status: 500 })
    }

    // Optional email notification — failure never loses the stored message.
    const { to, schoolName } = await notifyAddress(p, 'contact')
    if (to && process.env.SMTP_HOST) {
      try {
        await p.sendEmail({
          to,
          subject: `[Website ${schoolName}] Pesan baru ${reference}`,
          // no message content in the notification (privacy): staff reads it in the admin inbox
          text: `Ada pesan baru (${value.category}) dengan nomor ${reference}. Buka panel admin untuk membaca.`,
        })
        await p.update({ collection: 'contact-messages', id: doc.id, data: { emailNotified: true }, overrideAccess: true })
      } catch (e) {
        p.logger.warn(`Notifikasi email gagal untuk ${reference}; pesan tetap tersimpan.`)
      }
    }
    return Response.json({ ok: true, reference })
  },
}
