/**
 * Minat → Portal Penerimaan (Web↔App, addendum D). In Sekolahku App a family can ask, with explicit consent, that
 * their application be linked to the interest form (minat) they filled on this website. The scheduler pulls those
 * requests (application id, its number, the account's verified e-mail), finds this school's interest form with that
 * e-mail, marks it "Masuk proses resmi" with the application number, and reports back only the interest reference
 * number and date. No other interest data goes to the App; nothing else of the application comes here.
 * Calls are server-to-server with the shared secret (PORTAL_SYNC_HEADER); browsers cannot make them.
 */
import type { Payload, Where } from 'payload'
import { PORTAL_BASE_PATH, PORTAL_HOST_HEADER, PORTAL_PROXY_HEADER, PORTAL_SYNC_HEADER, hasProduct, type SchoolInfo } from '@sekolahku/core'
import { scopePayload } from '../tenancy/scoped'

type Feed = { requests: { ref: string; email: string; registrationNo: string | null }[] }
type Lead = { id: number; reference?: string | null; createdAt: string; status?: string | null; convertedNote?: string | null; appLinkRef?: string | null }

const UUID = /^[0-9a-f-]{36}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Interest forms closed as duplicate or test/spam are never linked. */
const NEVER: Where = { or: [{ status: { not_equals: 'closed' } }, { closeReason: { not_in: ['duplicate', 'test_spam'] } }] }

export async function syncAppLeads(payload: Payload, school: SchoolInfo, fetcher: typeof fetch = fetch) {
  const origin = process.env.PORTAL_ORIGIN
  const secret = process.env.PORTAL_PROXY_SECRET
  if (!origin || !secret || !hasProduct(school, 'app') || !school.primaryDomain) return { skipped: 'tidak berlangganan App / portal belum diatur' }
  const p = scopePayload(payload, school.id)
  const headers = { [PORTAL_HOST_HEADER]: school.primaryDomain, [PORTAL_PROXY_HEADER]: secret, [PORTAL_SYNC_HEADER]: secret }
  const base = `${origin}${PORTAL_BASE_PATH}/api/sinkron/minat`
  const res = await fetcher(base, { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Portal menjawab ${res.status}`)
  const feed = (await res.json()) as Feed
  const results: { ref: string; leadRef: string | null; leadDate: string | null }[] = []
  let linked = 0
  for (const r of (feed.requests ?? []).slice(0, 500)) {
    if (!UUID.test(r.ref)) continue
    const email = String(r.email ?? '').toLowerCase().trim()
    if (!EMAIL.test(email)) {
      results.push({ ref: r.ref, leadRef: null, leadDate: null })
      continue
    }
    const regNo = typeof r.registrationNo === 'string' ? r.registrationNo.slice(0, 40) : null
    // already linked to this application (a retry after a lost answer)
    const same = await p.find({ collection: 'leads', where: { appLinkRef: { equals: r.ref } }, limit: 1, depth: 0, overrideAccess: true })
    let lead = same.docs[0] as Lead | undefined
    if (!lead) {
      const found = await p.find({
        collection: 'leads',
        where: { and: [{ email: { equals: email } }, { isTest: { not_equals: true } }, NEVER] },
        sort: '-createdAt',
        limit: 10,
        depth: 0,
        overrideAccess: true,
      })
      const docs = found.docs as Lead[]
      // prefer an interest not yet linked to another application (siblings may share one interest form)
      lead = docs.find((d) => !d.appLinkRef) ?? docs[0]
      if (lead && !lead.appLinkRef) {
        await p.update({
          collection: 'leads',
          id: lead.id,
          overrideAccess: true,
          data: {
            appLinkRef: r.ref,
            appApplicationNo: regNo,
            appLinkedAt: new Date().toISOString(),
            status: 'converted',
            convertedNote: lead.convertedNote || `Mendaftar di Portal Penerimaan${regNo ? ` (no. ${regNo})` : ''}`,
          },
        } as never)
        linked++
      }
    } else if (regNo) {
      await p.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { appApplicationNo: regNo } } as never)
    }
    results.push({ ref: r.ref, leadRef: lead ? (lead.reference ?? String(lead.id)) : null, leadDate: lead?.createdAt ?? null })
  }
  if (results.length) {
    const ack = await fetcher(base, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ results }), signal: AbortSignal.timeout(10_000) })
    if (!ack.ok) throw new Error(`Portal menolak hasil penautan (${ack.status})`)
  }
  return { linked, answered: results.length }
}
