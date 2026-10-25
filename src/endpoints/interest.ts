import type { Endpoint, Where } from 'payload'
import { endpointPayload, noSchool, notifyAddress } from '../tenancy/endpoint'
import { rateLimited } from './contact'
import { readFlags, flagOff } from '../lib/flags'
import { canExportLeads } from '../access/roles'
import { auditAction } from '../hooks/audit'
import { recordEvent } from '../lib/analytics'
import {
  CONSENT_VERSION,
  EMAIL_RE,
  clientIp,
  csvCell,
  idempotencyKeyOf,
  waitForKey,
  json,
  looksLikeBot,
  makeReference,
  normalizePhone,
  str,
  truthy,
} from '../lib/forms'

const INTERESTS = ['info', 'kunjungan', 'biaya_program', 'lainnya'] as const
const SOURCES = ['website', 'pendaftaran', 'kunjungan', 'beranda', 'brosur', 'media_sosial'] as const

export type InterestInput = Record<string, unknown>

/** Pure validation (unit-tested). Minimal data: no NIK/KK/akta/rapor/foto/payment fields exist at all. */
export const validateInterest = (b: InterestInput) => {
  const errors: Record<string, string> = {}
  const parentName = str(b.parentName, 100)
  const email = str(b.email, 160).toLowerCase()
  const phoneRaw = str(b.phone, 25)
  const phone = phoneRaw ? normalizePhone(phoneRaw) : ''
  const message = str(b.message, 1000)
  const studentName = str(b.studentName, 100)
  const originSchool = str(b.originSchool, 120)
  const interests = (Array.isArray(b.interests) ? b.interests : typeof b.interests === 'string' ? [b.interests] : []).filter((i): i is (typeof INTERESTS)[number] =>
    (INTERESTS as readonly string[]).includes(String(i)),
  )
  if (parentName.length < 2) errors.parentName = 'Nama orang tua/wali wajib diisi.'
  if (!email && !phoneRaw) errors.email = 'Isi minimal satu: email atau nomor telepon.'
  if (email && !EMAIL_RE.test(email)) errors.email = 'Format email tidak valid.'
  if (phoneRaw && !phone) errors.phone = 'Nomor telepon tidak valid (contoh: 0812xxxxxxx).'
  if (!interests.length) errors.interests = 'Pilih minimal satu minat.'
  if (typeof b.message === 'string' && b.message.trim().length > 1000) errors.message = 'Pesan maksimal 1000 karakter.'
  if (!truthy(b.consent)) errors.consent = 'Persetujuan wajib dicentang agar kami dapat memproses permintaan Anda.'
  const source = (SOURCES as readonly string[]).includes(String(b.source)) ? (b.source as (typeof SOURCES)[number]) : 'website'
  return {
    errors,
    value: { parentName, email: email || undefined, phone: phoneRaw || undefined, phoneNormalized: phone || undefined, message, studentName, originSchool, interests, source, marketingOptIn: truthy(b.marketingOptIn) },
  }
}

/** POST /api/leads/submit — public interest form ("titipkan minat", not an official registration). */
export const interestSubmitEndpoint: Endpoint = {
  path: '/submit',
  method: 'post',
  handler: async (req) => {
    const p = await endpointPayload(req)
    if (!p) return noSchool()
    const flags = await readFlags(p)
    if (!flags.interestForm) return flagOff()
    if (rateLimited(`interest:${clientIp(req)}`)) return json({ ok: false, error: 'Terlalu banyak pengiriman. Coba lagi beberapa menit lagi.' }, 429)
    let body: InterestInput = {}
    try {
      body = ((await req.json?.()) ?? {}) as InterestInput
    } catch {
      return json({ ok: false, error: 'Format permintaan tidak valid.' }, 400)
    }
    if (looksLikeBot(body)) return json({ ok: true, reference: makeReference('MNT') })

    // the cycle must be published and allow the interest form
    const cycles = await p.find({ collection: 'admissions-cycles', sort: '-academicYear', limit: 5, depth: 0, overrideAccess: false, draft: false })
    const allowed = cycles.docs.filter((c) => c.interestFormEnabled || c.mode === 'interest_form')
    if (!allowed.length) return json({ ok: false, error: 'Form minat sedang tidak dibuka. Silakan hubungi sekolah.' }, 403)
    const wanted = body.cycle === 'undecided' ? null : allowed.find((c) => String(c.id) === String(body.cycle)) ?? allowed[0]

    const { errors, value } = validateInterest(body)
    if (Object.keys(errors).length) return json({ ok: false, errors }, 400)

    const idempotencyKey = idempotencyKeyOf(body.idempotencyKey)
    if (!idempotencyKey) return json({ ok: false, error: 'Muat ulang halaman lalu kirim lagi.' }, 400)
    const existing = await p.find({ collection: 'leads', where: { idempotencyKey: { equals: idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true })
    if (existing.docs[0]) return json({ ok: true, reference: existing.docs[0].reference, repeated: true })

    // soft duplicate: same contact, same cycle, still open → flag for review (siblings share parent contacts)
    const contactOr: Where[] = []
    if (value.email) contactOr.push({ email: { equals: value.email } })
    if (value.phoneNormalized) contactOr.push({ phoneNormalized: { equals: value.phoneNormalized } })
    const dup = contactOr.length
      ? await p.find({
          collection: 'leads',
          where: { and: [{ or: contactOr }, { status: { not_equals: 'closed' } }, wanted ? { cycle: { equals: wanted.id } } : { cycle: { exists: false } }] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      : { docs: [] }

    const reference = makeReference('MNT')
    try {
      await p.create({
        collection: 'leads',
        overrideAccess: true,
        data: {
          ...value,
          reference,
          cycle: wanted?.id ?? null,
          targetYearLabel: wanted ? wanted.academicYear : 'Belum ditentukan',
          status: 'new',
          consentVersion: CONSENT_VERSION,
          consentAt: new Date().toISOString(),
          possibleDuplicateOf: dup.docs[0]?.id ?? null,
          idempotencyKey,
        },
      })
    } catch (e) {
      // a concurrent duplicate submit with the same key won the race → answer with its reference
      const again = await waitForKey(async () => (await p.find({ collection: 'leads', where: { idempotencyKey: { equals: idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true })).docs[0])
      if (again) return json({ ok: true, reference: again.reference, repeated: true })
      p.logger.error(`Gagal menyimpan minat: ${(e as Error).message}`)
      return json({ ok: false, error: 'Maaf, data belum tersimpan. Coba lagi beberapa saat lagi.' }, 500)
    }

    // optional notification: never contains personal data; failure never loses the stored lead
    const { to, schoolName } = await notifyAddress(p, 'admissions')
    if (to && process.env.SMTP_HOST) {
      try {
        await p.sendEmail({ to, subject: `[Website ${schoolName}] Minat baru ${reference}`, text: `Ada data minat baru (${reference}). Buka panel admin → Pendaftaran → Minat Calon Orang Tua.` })
      } catch {
        p.logger.warn(`Notifikasi minat ${reference} gagal; data tetap tersimpan.`)
      }
    }
    if (flags.visitorAnalytics) await recordEvent(p, 'form_success', 'minat')
    return json({ ok: true, reference })
  },
}

/** GET /api/leads/export — CSV for authorised staff only; formula-injection safe; audited. */
export const leadsExportEndpoint: Endpoint = {
  path: '/export',
  method: 'get',
  handler: async (req) => {
    const p = await endpointPayload(req)
    if (!p) return noSchool()
    if (!canExportLeads(req.user)) return json({ ok: false, error: 'Tidak diizinkan.' }, 403)
    const url = new URL(req.url ?? 'http://x')
    const and: Where[] = [{ isTest: { not_equals: true } }]
    const status = url.searchParams.get('status')
    if (status && /^[a-z_]{2,20}$/.test(status)) and.push({ status: { equals: status } })
    const res = await p.find({ collection: 'leads', where: { and }, limit: 5000, depth: 1, sort: '-createdAt', overrideAccess: false, user: req.user })
    const header = ['Referensi', 'Masuk', 'Status', 'Nama wali', 'Email', 'Telepon', 'Tahun ajaran', 'Minat', 'Petugas', 'Tindak lanjut', 'Sumber']
    const rows = res.docs.map((l) => [
      l.reference,
      l.createdAt,
      l.status,
      l.parentName,
      l.email,
      l.phone,
      l.targetYearLabel,
      (l.interests ?? []).join(' '),
      l.assignee && typeof l.assignee === 'object' ? (l.assignee as { name?: string }).name : '',
      l.nextFollowUpAt,
      l.source,
    ])
    await auditAction(req, 'export', 'leads', `Ekspor CSV ${res.docs.length} baris${status ? ` (status ${status})` : ''}`)
    const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    return new Response(csv, {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="minat-${new Date().toISOString().slice(0, 10)}.csv"`, 'cache-control': 'no-store' },
    })
  },
}
