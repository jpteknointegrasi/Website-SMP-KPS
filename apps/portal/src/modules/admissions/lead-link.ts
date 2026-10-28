/**
 * Interest form (minat, Sekolahku Web) → application (Sekolahku App), addendum D: "App dapat menautkan minat ke
 * aplikasi pendaftaran dengan persetujuan pendaftar".
 *
 * - Only the family who owns the application can ask for the link, with an explicit consent. Staff cannot do it for
 *   them (the consent must be the family's own).
 * - The link is matched on the account's e-mail, and only when that e-mail was verified by e-mail (an address a family
 *   merely typed in proves nothing about who filled the interest form).
 * - The website pulls the pending requests server-to-server (shared secret), marks the matching interest as
 *   "Masuk proses resmi", and reports back the interest reference number — or that none was found. No other data of
 *   the interest form comes to the App, and nothing of the application goes to the website beyond its number.
 */
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { accounts, applications } from '@/db/schema'
import { requireAccount, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { loadApplication } from './apply'

export const LEAD_LINK_LABEL: Record<string, string> = {
  requested: 'Menunggu pencocokan dengan website',
  linked: 'Tertaut dengan formulir minat',
  not_found: 'Formulir minat tidak ditemukan',
}

async function verifiedEmail(db: Db, accountId: string) {
  const [acc] = await db.select({ email: accounts.email, verifiedAt: accounts.emailVerifiedAt, verifiedBy: accounts.verifiedBy }).from(accounts).where(eq(accounts.id, accountId))
  return acc?.email && acc.verifiedAt && acc.verifiedBy === 'email' ? acc.email.toLowerCase() : null
}

/** The family asks the school to link this application to the interest form they filled on the website. */
export async function requestLeadLink(ctx: Ctx, id: string, consent: boolean) {
  const me = requireAccount(ctx)
  if (!consent) fail('Centang persetujuan untuk menautkan formulir minat.', 'invalid', 'setuju')
  await command(ctx, 'admissions.lead_link', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    if (a!.ownerAccountId !== me.id) forbidden('Hanya akun pemilik pendaftaran yang dapat memberi persetujuan ini.')
    if (['withdrawn', 'rejected'].includes(a!.status)) fail('Pendaftaran ini sudah berakhir.')
    if (a!.leadLinkState === 'linked') fail('Pendaftaran ini sudah tertaut dengan formulir minat.')
    if (a!.leadLinkState === 'requested') return
    if (!(await verifiedEmail(tx, me.id))) fail('Penautan memakai email akun yang sudah diverifikasi. Verifikasi email akun Anda dulu.')
    await tx.update(applications).set({ leadLinkState: 'requested', leadLinkConsentAt: ctx.now, leadRef: null, leadDate: null, leadCheckedAt: null }).where(eq(applications.id, id))
    fx.audit('admissions.lead_link.request', 'application', id)
  })
}

/** The family withdraws a request that the website has not processed yet. */
export async function cancelLeadLink(ctx: Ctx, id: string) {
  const me = requireAccount(ctx)
  await command(ctx, 'admissions.lead_link_cancel', {}, async (tx, fx) => {
    const a = await loadApplication(tx, id, true)
    if (!a) notFound('Pendaftaran')
    if (a!.ownerAccountId !== me.id) forbidden()
    if (a!.leadLinkState !== 'requested') fail('Tidak ada permintaan penautan yang dapat dibatalkan.')
    await tx.update(applications).set({ leadLinkState: null, leadLinkConsentAt: null }).where(eq(applications.id, id))
    fx.audit('admissions.lead_link.cancel', 'application', id)
  })
}

/** Pending requests for the website: application id, its number (if submitted) and the verified account e-mail. */
export async function leadLinkFeed(db: Db) {
  const rows = await db
    .select({ id: applications.id, registrationNo: applications.registrationNo, email: accounts.email, verifiedBy: accounts.verifiedBy })
    .from(applications)
    .innerJoin(accounts, eq(accounts.id, applications.ownerAccountId))
    .where(and(eq(applications.leadLinkState, 'requested'), isNotNull(accounts.emailVerifiedAt), isNotNull(accounts.email)))
    .limit(500)
  return {
    requests: rows.filter((r) => r.verifiedBy === 'email').map((r) => ({ ref: r.id, email: r.email!.toLowerCase(), registrationNo: r.registrationNo })),
  }
}

export type LeadLinkResult = { ref: string; leadRef: string | null; leadDate: string | null }

/** The website reports what it matched. Only requests still pending are changed (a cancel in between wins). */
export async function markLeadLinks(db: Db, results: LeadLinkResult[], now = new Date()) {
  let linked = 0
  let notFoundCount = 0
  for (const r of results) {
    const date = r.leadDate && !Number.isNaN(Date.parse(r.leadDate)) ? new Date(r.leadDate) : null
    const done = await db
      .update(applications)
      .set(r.leadRef ? { leadLinkState: 'linked', leadRef: r.leadRef.slice(0, 60), leadDate: date, leadCheckedAt: now } : { leadLinkState: 'not_found', leadCheckedAt: now })
      .where(and(eq(applications.id, r.ref), inArray(applications.leadLinkState, ['requested'])))
      .returning({ id: applications.id })
    if (done.length) r.leadRef ? linked++ : notFoundCount++
  }
  return { linked, notFound: notFoundCount }
}

/** Parses the website's POST body; anything malformed is dropped. */
export function parseLeadResults(body: unknown): LeadLinkResult[] {
  const list = (body as { results?: unknown } | null)?.results
  if (!Array.isArray(list)) return []
  return list
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .filter((x) => typeof x.ref === 'string' && /^[0-9a-f-]{36}$/.test(x.ref))
    .map((x) => ({
      ref: x.ref as string,
      leadRef: typeof x.leadRef === 'string' && x.leadRef.trim() ? x.leadRef.trim() : null,
      leadDate: typeof x.leadDate === 'string' ? x.leadDate : null,
    }))
    .slice(0, 500)
}
