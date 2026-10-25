import type { Endpoint } from 'payload'
import { randomBytes } from 'crypto'

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

export const rateLimited = (key: string, now = Date.now()) => {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  arr.push(now)
  hits.set(key, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > MAX_PER_WINDOW
}

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
  return `KPS-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`
}

export const contactSubmitEndpoint: Endpoint = {
  path: '/submit',
  method: 'post',
  handler: async (req) => {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
    if (rateLimited(ip)) {
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

    const reference = makeRef()
    const doc = await req.payload.create({
      collection: 'contact-messages',
      overrideAccess: true,
      data: { ...value, category: value.category as 'umum', reference, consent: true, status: 'new' },
    })

    // Optional email notification — failure never loses the stored message.
    const to = process.env.CONTACT_NOTIFY_EMAIL
    if (to && process.env.SMTP_HOST) {
      try {
        await req.payload.sendEmail({
          to,
          subject: `[Website KPS] Pesan baru ${reference}`,
          // no message content in the notification (privacy): staff reads it in the admin inbox
          text: `Ada pesan baru (${value.category}) dengan nomor ${reference}. Buka panel admin untuk membaca.`,
        })
        await req.payload.update({ collection: 'contact-messages', id: doc.id, data: { emailNotified: true }, overrideAccess: true })
      } catch (e) {
        req.payload.logger.warn(`Notifikasi email gagal untuk ${reference}; pesan tetap tersimpan.`)
      }
    }
    return Response.json({ ok: true, reference })
  },
}
