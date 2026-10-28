/**
 * WEB-APP-01: karya siswa from Sekolahku App arrive as drafts in review (never published automatically), images
 * become media awaiting review, re-runs create no duplicates, withdrawn consent hides the work, and the sync speaks
 * to the portal only with the shared secret.
 */
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { syncAppWorks } from '@/lib/app-works'
import { toInfo } from '@/tenancy/resolve'
import { PORTAL_SYNC_HEADER } from '@sekolahku/core'
import { createTestSchool, dropTestSchool, type TestSchool } from './school'

const RUN = `w${Date.now().toString(36)}`
const REF = '11111111-2222-4333-8444-555555555555'
const IMG = '66666666-7777-4888-9999-000000000000'
let raw: Payload
let school: TestSchool
let png: Buffer
const env = { origin: process.env.PORTAL_ORIGIN, secret: process.env.PORTAL_PROXY_SECRET }
let withdrawn: string[] = []
let editor: any
const calls: { url: string; secret: string | null; body?: string }[] = []

const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  const h = new Headers(init?.headers)
  calls.push({ url, secret: h.get(PORTAL_SYNC_HEADER), body: init?.body as string | undefined })
  if (url.endsWith('/api/sinkron/karya') && init?.method === 'POST') return Response.json({ marked: 1 })
  if (url.endsWith('/api/sinkron/karya'))
    return Response.json({ works: withdrawn.includes(REF) ? [] : [{ ref: REF, title: `Lukisan ${RUN}`, category: 'seni', description: 'Lukisan cat air tentang Teluk Balikpapan.\nDibuat di kelas Seni Budaya.', publicName: 'Alya P., kelas VII', mentorPublic: 'Pak Dedi', year: 2026, images: [IMG], imported: false }], withdrawn })
  if (url.endsWith(`/${REF}/${IMG}`)) return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } })
  return new Response('x', { status: 404 })
}) as typeof fetch

beforeAll(async () => {
  raw = await getPayload({ config })
  school = await createTestSchool(raw, RUN)
  await raw.update({ collection: 'tenants', id: school.id, overrideAccess: true, data: { app: { plan: 'pilot', status: 'active' } } as never })
  await school.payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { studentWorks: true } })
  process.env.PORTAL_ORIGIN = 'http://portal.test'
  process.env.PORTAL_PROXY_SECRET = 'rahasia-sinkron-uji-0123456789'
  editor = { ...(await school.payload.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-editor@test.invalid`, password: `Pw-${RUN}-0123456789`, name: 'Editor', role: 'editor' } })), collection: 'users' }
  png = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: Math.floor(Math.random() * 255), g: 120, b: 200 } } }).png().toBuffer()
})
afterAll(async () => {
  process.env.PORTAL_ORIGIN = env.origin
  process.env.PORTAL_PROXY_SECRET = env.secret
  await dropTestSchool(raw, school.id)
})

const info = async () => toInfo((await raw.findByID({ collection: 'tenants', id: school.id, overrideAccess: true, depth: 0 })) as never)

describe('WEB-APP-01 karya dari App', () => {
  it('masuk sebagai draf review dengan media, tanpa duplikat; penarikan izin menyembunyikan', async () => {
    const r1 = await syncAppWorks(raw, await info(), fetcher)
    expect(r1).toMatchObject({ created: 1 })
    expect(calls.every((c) => c.secret === 'rahasia-sinkron-uji-0123456789')).toBe(true)
    expect(calls.some((c) => c.body?.includes(REF))).toBe(true)
    const docs = await school.payload.find({ collection: 'student-works', where: { appRef: { equals: REF } }, overrideAccess: true, draft: true, depth: 1 })
    expect(docs.docs).toHaveLength(1)
    const w = docs.docs[0] as any
    expect(w._status).toBe('draft')
    expect(w.workflowStatus).toBe('in_review')
    expect(w.consentStatus).toBe('obtained')
    expect(w.creatorsPublic).toBe('Alya P., kelas VII')
    expect(w.cover?.reviewStatus).toBe('pending')
    // nothing public
    expect((await school.payload.find({ collection: 'student-works', where: { title: { equals: `Lukisan ${RUN}` } }, overrideAccess: false })).docs).toHaveLength(0)
    expect(await syncAppWorks(raw, await info(), fetcher)).toMatchObject({ created: 0 })
    // editor publishes, then consent is withdrawn in the App
    await school.payload.update({ collection: 'student-works', id: w.id, overrideAccess: true, data: { _status: 'published', workflowStatus: 'published' } as never })
    expect((await school.payload.find({ collection: 'student-works', where: { title: { equals: `Lukisan ${RUN}` } }, overrideAccess: false })).docs).toHaveLength(1)
    withdrawn = [REF]
    expect(await syncAppWorks(raw, await info(), fetcher)).toMatchObject({ hidden: 1 })
    expect((await school.payload.find({ collection: 'student-works', where: { title: { equals: `Lukisan ${RUN}` } }, overrideAccess: false })).docs).toHaveLength(0)
    // AUD-18: the work is unpublished (not just hidden) and its imported images can no longer be used
    const after = (await school.payload.findByID({ collection: 'student-works', id: w.id, overrideAccess: true, depth: 0 })) as any
    expect(after).toMatchObject({ _status: 'draft', workflowStatus: 'draft', consentStatus: 'withdrawn' })
    const img = (await school.payload.findByID({ collection: 'media', id: w.cover.id, overrideAccess: true, depth: 0 })) as any
    expect(img.reviewStatus).toBe('blocked')
    expect(img.editorialNote).toMatch(/ditarik/)
    // the cover picker of other content excludes it, and the server rejects it on publish (drafts skip validation)
    await expect(
      school.payload.create({ collection: 'posts', overrideAccess: false, user: editor, data: { title: `Pakai karya ${RUN}`, slug: `pakai-karya-${RUN}`, cover: w.cover.id, _status: 'published' } as never }),
    ).rejects.toThrow(/Foto sampul/)
    // a re-run changes nothing
    expect(await syncAppWorks(raw, await info(), fetcher)).toMatchObject({ hidden: 0 })
  })
  it('dilewati bila fitur karya nonaktif atau tidak berlangganan App', async () => {
    await school.payload.updateGlobal({ slug: 'feature-flags', overrideAccess: true, data: { studentWorks: false } })
    expect(await syncAppWorks(raw, await info(), fetcher)).toHaveProperty('skipped')
  })
})
