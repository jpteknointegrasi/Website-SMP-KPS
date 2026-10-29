/**
 * WEB-APP-02: minat ↔ Portal Penerimaan. A link request the family consented to in Sekolahku App marks this school's
 * interest form with the same e-mail "Masuk proses resmi" with the application number and a timeline entry; only the
 * interest reference and date go back; interests of another school, test data or forms closed as duplicate/spam are
 * never matched; re-runs are idempotent; calls carry the shared secret.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { syncAppLeads } from '@/lib/app-leads'
import { toInfo } from '@/tenancy/resolve'
import { PORTAL_SYNC_HEADER } from '@sekolahku/core'
import { createTestSchool, dropTestSchool, type TestSchool } from './school'

const RUN = `l${Date.now().toString(36)}`
const APP1 = '11111111-2222-4333-8444-aaaaaaaaaaaa'
const APP2 = '11111111-2222-4333-8444-bbbbbbbbbbbb'
const APP3 = '11111111-2222-4333-8444-cccccccccccc'
let raw: Payload
let school: TestSchool
let other: TestSchool
const env = { origin: process.env.PORTAL_ORIGIN, secret: process.env.PORTAL_PROXY_SECRET }
let requests: { ref: string; email: string; registrationNo: string | null }[] = []
const calls: { url: string; secret: string | null; body?: string }[] = []

const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  calls.push({ url, secret: new Headers(init?.headers).get(PORTAL_SYNC_HEADER), body: init?.body as string | undefined })
  if (url.endsWith('/api/sinkron/minat') && init?.method === 'POST') return Response.json({ linked: 1, notFound: 0 })
  if (url.endsWith('/api/sinkron/minat')) return Response.json({ requests })
  return new Response('x', { status: 404 })
}) as typeof fetch

const lead = (s: TestSchool, data: Record<string, unknown>) =>
  s.payload.create({ collection: 'leads', overrideAccess: true, data: { parentName: 'Ibu Uji', status: 'new', source: 'website', ...data } as never })

beforeAll(async () => {
  raw = await getPayload({ config })
  school = await createTestSchool(raw, RUN)
  other = await createTestSchool(raw, `${RUN}b`)
  await raw.update({ collection: 'tenants', id: school.id, overrideAccess: true, data: { app: { plan: 'pilot', status: 'active' } } as never })
  process.env.PORTAL_ORIGIN = 'http://portal.test'
  process.env.PORTAL_PROXY_SECRET = 'rahasia-sinkron-uji-0123456789'
})
afterAll(async () => {
  process.env.PORTAL_ORIGIN = env.origin
  process.env.PORTAL_PROXY_SECRET = env.secret
  await dropTestSchool(raw, school.id)
  await dropTestSchool(raw, other.id)
})

const info = async () => toInfo((await raw.findByID({ collection: 'tenants', id: school.id, overrideAccess: true, depth: 0 })) as never)
const sentResults = () => JSON.parse(calls.filter((c) => c.body).at(-1)!.body!).results as { ref: string; leadRef: string | null }[]

describe('WEB-APP-02 penautan minat', () => {
  it('mencocokkan email di sekolah ini saja, menandai Masuk proses resmi + riwayat, mengirim balik nomor minat', async () => {
    await lead(other, { reference: `X-${RUN}`, email: 'ortu@contoh.test' }) // another school
    await lead(school, { reference: `T-${RUN}`, email: 'ortu@contoh.test', isTest: true })
    await lead(school, { reference: `S-${RUN}`, email: 'ortu@contoh.test', status: 'closed', closeReason: 'test_spam' })
    const real = await lead(school, { reference: `M-${RUN}`, email: 'ortu@contoh.test' })
    requests = [
      { ref: APP1, email: 'Ortu@Contoh.test', registrationNo: 'PPDB27-0001' },
      { ref: APP2, email: 'tidak.ada@contoh.test', registrationNo: null },
    ]
    expect(await syncAppLeads(raw, await info(), fetcher)).toEqual({ linked: 1, answered: 2 })
    expect(calls.every((c) => c.secret === 'rahasia-sinkron-uji-0123456789')).toBe(true)
    expect(sentResults()).toEqual([
      expect.objectContaining({ ref: APP1, leadRef: `M-${RUN}` }),
      { ref: APP2, leadRef: null, leadDate: null },
    ])
    const l = (await school.payload.findByID({ collection: 'leads', id: real.id, overrideAccess: true, depth: 0 })) as any
    expect(l).toMatchObject({ status: 'converted', appLinkRef: APP1, appApplicationNo: 'PPDB27-0001' })
    expect(l.appLinkedAt).toBeTruthy()
    expect(l.history.some((h: { event: string }) => /Tertaut ke Portal Penerimaan/.test(h.event))).toBe(true)
    // untouched: the other school's interest, test data, spam
    const others = await raw.find({ collection: 'leads', where: { reference: { in: [`X-${RUN}`, `T-${RUN}`, `S-${RUN}`] } }, overrideAccess: true, depth: 0 })
    expect(others.docs.every((d: any) => !d.appLinkRef)).toBe(true)
  })

  it('ulang (jawaban hilang) tidak menautkan dua kali; saudara kandung memakai minat yang sama', async () => {
    requests = [
      { ref: APP1, email: 'ortu@contoh.test', registrationNo: 'PPDB27-0001' },
      { ref: APP3, email: 'ortu@contoh.test', registrationNo: null },
    ]
    expect(await syncAppLeads(raw, await info(), fetcher)).toEqual({ linked: 0, answered: 2 })
    expect(sentResults().map((r) => r.leadRef)).toEqual([`M-${RUN}`, `M-${RUN}`])
    const l = await school.payload.find({ collection: 'leads', where: { appLinkRef: { equals: APP1 } }, overrideAccess: true, depth: 0 })
    expect(l.docs).toHaveLength(1)
  })

  it('dilewati bila sekolah tidak berlangganan App', async () => {
    await raw.update({ collection: 'tenants', id: school.id, overrideAccess: true, data: { app: { plan: 'none', status: 'active' } } as never })
    expect(await syncAppLeads(raw, await info(), fetcher)).toHaveProperty('skipped')
  })
})
