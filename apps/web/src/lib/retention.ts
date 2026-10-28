import type { Payload, Where } from 'payload'
import type { TenantPayload } from '../tenancy/scoped'
import { scopePayload } from '../tenancy/scoped'

/**
 * Data retention (privacy). Each school decides how long closed records keep personal data
 * (Pengaturan Sekolah → Privasi & Retensi; empty = off, the default). Records that are finished AND older than the
 * chosen number of months are ANONYMISED, not deleted: names, contacts, messages and notes are cleared, while the
 * record itself (status, dates, cycle, source, reference) stays so statistics keep working. `anonymizedAt` marks
 * them; a run only writes one audit entry with counts per school.
 */

export const ANONYMIZED_NAME = 'Dianonimkan'
const ANONYMIZED_TEXT = '[dianonimkan sesuai kebijakan retensi]'

type Rule = { collection: 'leads' | 'contact-messages' | 'visit-bookings'; setting: 'retensiMinatBulan' | 'retensiPesanBulan' | 'retensiKunjunganBulan'; finished: string[]; clear: Record<string, unknown> }

/** What counts as "finished" and which fields are cleared, per collection. */
export const RETENTION_RULES: Rule[] = [
  {
    collection: 'leads',
    setting: 'retensiMinatBulan',
    finished: ['closed', 'converted'],
    clear: { parentName: ANONYMIZED_NAME, email: null, phone: null, phoneNormalized: null, message: null, studentName: null, originSchool: null, notes: [], convertedNote: null },
  },
  {
    collection: 'contact-messages',
    setting: 'retensiPesanBulan',
    finished: ['done', 'spam'],
    clear: { name: ANONYMIZED_NAME, email: null, phone: null, message: ANONYMIZED_TEXT, internalNote: null },
  },
  {
    collection: 'visit-bookings',
    setting: 'retensiKunjunganBulan',
    finished: ['attended', 'no_show', 'cancelled', 'expired'],
    clear: { parentName: ANONYMIZED_NAME, email: null, phone: null, phoneNormalized: null, note: null, internalNote: null, statusReason: null },
  },
]

/** `months` (≥1, whole) before `now`; null when the setting is empty/invalid (= retention off). */
export const cutoffDate = (months: unknown, now = new Date()): Date | null => {
  const m = Number(months)
  if (months === null || months === undefined || months === '' || !Number.isInteger(m) || m < 1) return null
  const d = new Date(now)
  d.setUTCMonth(d.getUTCMonth() - m)
  return d
}

export type RetentionResult = Record<Rule['collection'], number>

/** Anonymises one school's finished records older than its retention settings. Idempotent. */
export async function anonymizeExpired(p: TenantPayload, now = new Date()): Promise<RetentionResult> {
  const settings = (await p.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as unknown as Record<string, unknown> | null
  const out: RetentionResult = { leads: 0, 'contact-messages': 0, 'visit-bookings': 0 }
  for (const r of RETENTION_RULES) {
    const cutoff = cutoffDate(settings?.[r.setting], now)
    if (!cutoff) continue
    const where: Where = {
      and: [
        { status: { in: r.finished } },
        { createdAt: { less_than: cutoff.toISOString() } },
        { or: [{ anonymizedAt: { exists: false } }, { anonymizedAt: { equals: null } }] },
      ],
    }
    for (;;) {
      const batch = await p.find({ collection: r.collection, where, limit: 200, depth: 0, overrideAccess: true, select: { id: true } as never })
      if (!batch.docs.length) break
      const ids = (batch.docs as unknown as { id: number }[]).map((d) => d.id)
      const res = await p.update({
        collection: r.collection,
        where: { id: { in: ids } },
        overrideAccess: true,
        depth: 0,
        // one audit entry with counts below instead of one per record
        context: { skipAudit: true, systemActor: 'retensi data' },
        data: { ...r.clear, anonymizedAt: now.toISOString() } as never,
      })
      if (res.errors?.length) throw new Error(`${r.collection}: ${res.errors.map((e) => e.message).join('; ')}`)
      out[r.collection] += res.docs.length
      if (res.docs.length < ids.length) break
    }
  }
  const total = out.leads + out['contact-messages'] + out['visit-bookings']
  if (total)
    await p.create({
      collection: 'audit-logs',
      overrideAccess: true,
      data: {
        action: 'retention',
        collectionSlug: 'retensi',
        docId: '-',
        docTitle: `Anonimisasi retensi: minat ${out.leads}, pesan ${out['contact-messages']}, kunjungan ${out['visit-bookings']}`,
        actorEmail: 'sistem',
      },
    })
  return out
}

/** Scheduled job body: every school that is not suspended. */
export async function anonymizeAllSchools(payload: Payload) {
  const totals: RetentionResult = { leads: 0, 'contact-messages': 0, 'visit-bookings': 0 }
  const schools = await payload.find({ collection: 'tenants', where: { status: { not_equals: 'suspended' } }, limit: 1000, depth: 0, overrideAccess: true, pagination: false })
  for (const t of schools.docs) {
    try {
      const r = await anonymizeExpired(scopePayload(payload, t.id))
      for (const k of Object.keys(totals) as (keyof RetentionResult)[]) totals[k] += r[k]
    } catch (e) {
      payload.logger.error({ err: e, school: t.id }, 'retensi data gagal')
    }
  }
  return totals
}
