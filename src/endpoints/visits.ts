import type { Endpoint, Where } from 'payload'
import { createHash } from 'crypto'
import { rateLimited } from './contact'
import { readFlags, flagOff } from '../lib/flags'
import { canSeeLeads } from '../access/roles'
import { recordEvent } from '../lib/analytics'
import { recomputeBooked, release, releaseExpiredHolds, seatsFor, tryReserve, consumes } from '../lib/capacity'
import {
  CONSENT_VERSION,
  EMAIL_RE,
  clientIp,
  idempotencyKeyOf,
  waitForKey,
  json,
  looksLikeBot,
  makeReference,
  normalizePhone,
  randomToken,
  str,
  truthy,
} from '../lib/forms'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const nowIso = () => new Date().toISOString()

/** Sessions visible to the public: open, in the future, before the booking deadline. */
export const bookableWhere = (): Where => ({
  and: [
    { sessionStatus: { equals: 'open' } },
    { startAt: { greater_than: nowIso() } },
    { or: [{ bookingDeadline: { exists: false } }, { bookingDeadline: { equals: null } }, { bookingDeadline: { greater_than: nowIso() } }] },
  ],
})

export type PublicSession = {
  id: number
  title: string
  kind: string
  startAt: string
  endAt?: string | null
  location?: string | null
  instructions?: string | null
  capacityUnit: string
  remaining: number
  full: boolean
  requiresConfirmation: boolean
}

/** Aggregate availability only — never names, contacts or the guide. Used by the page and the API. */
export async function listPublicSessions(payload: import('payload').Payload): Promise<PublicSession[]> {
  const res = await payload.find({ collection: 'visit-sessions', where: bookableWhere(), sort: 'startAt', limit: 30, depth: 0, overrideAccess: true })
  // lazily free expired holds so availability is right even if the scheduler did not run
  if (res.docs.length) await releaseExpiredHolds(payload)
  const fresh = res.docs.length ? await payload.find({ collection: 'visit-sessions', where: bookableWhere(), sort: 'startAt', limit: 30, depth: 0, overrideAccess: true }) : res
  return fresh.docs.map((s) => {
    const remaining = Math.max(0, Number(s.capacity) - Number(s.bookedCount ?? 0))
    return {
      id: s.id,
      title: s.title,
      kind: s.kind,
      startAt: s.startAt,
      endAt: s.endAt,
      location: s.location,
      instructions: s.instructions,
      capacityUnit: s.capacityUnit,
      remaining,
      full: remaining <= 0,
      requiresConfirmation: Boolean(s.requiresConfirmation),
    }
  })
}

/** GET /api/visit-sessions/available */
export const visitAvailabilityEndpoint: Endpoint = {
  path: '/available',
  method: 'get',
  handler: async (req) => {
    if (!(await readFlags(req.payload)).schoolVisits) return flagOff()
    return json({ ok: true, sessions: await listPublicSessions(req.payload) })
  },
}

/** POST /api/visit-sessions/reconcile — staff tool to rebuild counters from bookings. */
export const visitReconcileEndpoint: Endpoint = {
  path: '/reconcile',
  method: 'post',
  handler: async (req) => {
    if (!canSeeLeads(req.user)) return json({ ok: false, error: 'Tidak diizinkan.' }, 403)
    await releaseExpiredHolds(req.payload)
    const sessions = await req.payload.find({ collection: 'visit-sessions', where: { startAt: { greater_than: new Date(Date.now() - 30 * 864e5).toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
    const out: Record<number, number> = {}
    for (const s of sessions.docs) out[s.id] = await recomputeBooked(req.payload, s.id)
    return json({ ok: true, sessions: out })
  },
}

export const validateBooking = (b: Record<string, unknown>) => {
  const errors: Record<string, string> = {}
  const parentName = str(b.parentName, 100)
  const email = str(b.email, 160).toLowerCase()
  const phoneRaw = str(b.phone, 25)
  const phone = phoneRaw ? normalizePhone(phoneRaw) : ''
  const participants = Number(b.participants)
  const sessionId = Number(b.session)
  if (!Number.isInteger(sessionId) || sessionId <= 0) errors.session = 'Pilih jadwal kunjungan.'
  if (parentName.length < 2) errors.parentName = 'Nama orang tua/wali wajib diisi.'
  if (!email && !phoneRaw) errors.email = 'Isi minimal satu: email atau nomor telepon.'
  if (email && !EMAIL_RE.test(email)) errors.email = 'Format email tidak valid.'
  if (phoneRaw && !phone) errors.phone = 'Nomor telepon tidak valid.'
  if (!Number.isInteger(participants) || participants < 1 || participants > 10) errors.participants = 'Jumlah peserta 1–10 orang.'
  if (!truthy(b.consent)) errors.consent = 'Persetujuan wajib dicentang.'
  return {
    errors,
    value: { sessionId, parentName, email: email || undefined, phone: phoneRaw || undefined, phoneNormalized: phone || undefined, participants, targetYearLabel: str(b.targetYear, 40), note: str(b.note, 500) },
  }
}

/** POST /api/visit-bookings/submit — atomic seat reservation, then the booking record. */
export const visitBookingEndpoint: Endpoint = {
  path: '/submit',
  method: 'post',
  handler: async (req) => {
    const flags = await readFlags(req.payload)
    if (!flags.schoolVisits) return flagOff()
    if (rateLimited(`visit:${clientIp(req)}`)) return json({ ok: false, error: 'Terlalu banyak pengiriman. Coba lagi beberapa menit lagi.' }, 429)
    let body: Record<string, unknown> = {}
    try {
      body = ((await req.json?.()) ?? {}) as Record<string, unknown>
    } catch {
      return json({ ok: false, error: 'Format permintaan tidak valid.' }, 400)
    }
    if (looksLikeBot(body)) return json({ ok: true, reference: makeReference('KJG'), status: 'pending' })
    const { errors, value } = validateBooking(body)
    if (Object.keys(errors).length) return json({ ok: false, errors }, 400)
    const idempotencyKey = idempotencyKeyOf(body.idempotencyKey)
    if (!idempotencyKey) return json({ ok: false, error: 'Muat ulang halaman lalu kirim lagi.' }, 400)

    const byKey = async () => (await req.payload.find({ collection: 'visit-bookings', where: { idempotencyKey: { equals: idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    const prior = await byKey()
    if (prior) return json({ ok: true, reference: prior.reference, status: prior.status, repeated: true })

    const session = (await req.payload.find({ collection: 'visit-sessions', where: { and: [{ id: { equals: value.sessionId } }, bookableWhere()] }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    if (!session) return json({ ok: false, errors: { session: 'Jadwal ini sudah tidak tersedia. Pilih jadwal lain.' } }, 409)
    await releaseExpiredHolds(req.payload, session.id)

    const seats = seatsFor(session.capacityUnit, value.participants)
    if (!(await tryReserve(req.payload, session.id, seats)))
      return json({ ok: false, errors: { session: 'Kuota jadwal ini sudah penuh. Silakan pilih jadwal lain.' } }, 409)

    const status = session.requiresConfirmation ? 'pending' : 'confirmed'
    const token = randomToken()
    const reference = makeReference('KJG')
    // link (never create) an existing lead with the same contact
    const contactOr: Where[] = []
    if (value.email) contactOr.push({ email: { equals: value.email } })
    if (value.phoneNormalized) contactOr.push({ phoneNormalized: { equals: value.phoneNormalized } })
    const lead = contactOr.length
      ? (await req.payload.find({ collection: 'leads', where: { and: [{ or: contactOr }, { status: { not_equals: 'closed' } }] }, sort: '-createdAt', limit: 1, depth: 0, overrideAccess: true })).docs[0]
      : undefined
    try {
      const { sessionId, ...rest } = value
      await req.payload.create({
        collection: 'visit-bookings',
        overrideAccess: true,
        context: { capacityReserved: true },
        data: {
          ...rest,
          session: sessionId,
          reference,
          status,
          holdExpiresAt: status === 'pending' ? new Date(Date.now() + Number(session.holdHours ?? 48) * 3600_000).toISOString() : null,
          consentVersion: CONSENT_VERSION,
          consentAt: nowIso(),
          cancelTokenHash: sha256(token),
          cancelTokenExpiresAt: session.startAt,
          lead: lead?.id ?? null,
          idempotencyKey,
        },
      })
    } catch (e) {
      await release(req.payload, session.id, seats) // give the seat back
      const again = await waitForKey(byKey)
      if (again) return json({ ok: true, reference: again.reference, status: again.status, repeated: true })
      req.payload.logger.error(`Gagal menyimpan kunjungan: ${(e as Error).message}`)
      return json({ ok: false, error: 'Maaf, pemesanan belum tersimpan. Coba lagi.' }, 500)
    }
    if (flags.visitorAnalytics) await recordEvent(req.payload, 'form_success', 'kunjungan')
    return json({ ok: true, reference, status, cancelToken: token, session: { title: session.title, startAt: session.startAt, endAt: session.endAt, location: session.location } })
  },
}

/**
 * POST /api/visit-bookings/cancel { token, confirm? }
 * Without `confirm`: shows minimum info (session + status, no contact data).
 * Same generic answer for unknown/expired tokens to prevent enumeration. Token travels in the body, never in a URL query.
 */
export const visitCancelEndpoint: Endpoint = {
  path: '/cancel',
  method: 'post',
  handler: async (req) => {
    if (!(await readFlags(req.payload)).schoolVisits) return flagOff()
    if (rateLimited(`cancel:${clientIp(req)}`)) return json({ ok: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, 429)
    let body: Record<string, unknown> = {}
    try {
      body = ((await req.json?.()) ?? {}) as Record<string, unknown>
    } catch {
      return json({ ok: false, error: 'Format permintaan tidak valid.' }, 400)
    }
    const token = typeof body.token === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(body.token) ? body.token : null
    const invalid = json({ ok: false, error: 'Tautan pembatalan tidak berlaku atau sudah kedaluwarsa. Hubungi sekolah bila perlu bantuan.' }, 404)
    if (!token) return invalid
    const b = (
      await req.payload.find({ collection: 'visit-bookings', where: { cancelTokenHash: { equals: sha256(token) } }, limit: 1, depth: 1, overrideAccess: true })
    ).docs[0]
    if (!b || !consumes(b.status) || !b.cancelTokenExpiresAt || new Date(b.cancelTokenExpiresAt).getTime() <= Date.now()) return invalid
    const s = b.session && typeof b.session === 'object' ? b.session : null
    const info = { reference: b.reference, status: b.status, session: s ? { title: s.title, startAt: s.startAt } : null }
    if (!truthy(body.confirm)) return json({ ok: true, booking: info })
    await req.payload.update({
      collection: 'visit-bookings',
      id: b.id,
      overrideAccess: true,
      context: { systemActor: 'pemesan (tautan pembatalan)' },
      data: { status: 'cancelled', statusReason: 'Dibatalkan sendiri oleh pemesan', cancelTokenHash: null },
    })
    return json({ ok: true, cancelled: true, booking: { ...info, status: 'cancelled' } })
  },
}
