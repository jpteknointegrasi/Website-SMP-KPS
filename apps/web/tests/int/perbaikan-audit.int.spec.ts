/**
 * AUD-xx: fixes for the independent audit of Sekolahku Web (Oct 2026). Each describe block names its finding.
 * Runs in a throw-away school; REST calls go through Payload's real route handlers with the school's Host header.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { randomBytes } from 'crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { REST_GET } from '@payloadcms/next/routes'
import config from '@/payload.config'
import type { TenantPayload } from '@/tenancy/scoped'
import { createTestSchool, dropTestSchool, type TestSchool } from './school'

const RUN = `a${Date.now().toString(36)}`
let raw: Payload
let school: TestSchool
let payload: TenantPayload
const users: Record<string, any> = {}
let png: Buffer
const file = (data: Buffer, name: string) => ({ data, mimetype: 'image/png', name, size: data.length })

const restGet = REST_GET(config)
/** Anonymous GET /api/<path> on the school's address. */
const api = async (path: string, host = school.domain) => {
  const url = `http://${host}/api/${path}`
  const res = await restGet(new Request(url, { headers: { host } }), { params: Promise.resolve({ slug: new URL(url).pathname.replace(/^\/api\//, '').split('/') }) })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, json }
}
let ipSeq = 0
/** Minimal PayloadRequest for custom endpoint handlers; a fresh IP per call unless given. */
export const epReq = (body: unknown, opts: { ip?: string; user?: unknown; url?: string; host?: string } = {}) =>
  ({
    payload: raw,
    user: opts.user ?? null,
    url: opts.url ?? 'http://localhost/api/x',
    headers: new Headers({ host: opts.host ?? school.domain, 'x-forwarded-for': opts.ip ?? `10.55.${Math.floor(ipSeq / 250)}.${ipSeq++ % 250}` }),
    json: async () => body,
  }) as unknown as PayloadRequest

const media = async (label: string) =>
  (await payload.create({ collection: 'media', overrideAccess: true, data: { alt: `uji ${label} ${RUN}` }, file: file(png, `${label}.png`) } as never)) as unknown as { id: number }

beforeAll(async () => {
  raw = await getPayload({ config })
  school = await createTestSchool(raw, RUN)
  payload = school.payload
  for (const role of ['admin', 'editor', 'contributor', 'admissions'] as const) {
    const u = await payload.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-${role}@test.invalid`, password: randomBytes(18).toString('base64url'), name: `Audit ${role}`, role } })
    users[role] = { ...u, collection: 'users' }
  }
  png = await sharp({ create: { width: 32, height: 24, channels: 3, background: { r: Math.floor(Math.random() * 255), g: 90, b: 40 } } }).png().toBuffer()
})

afterAll(async () => {
  await dropTestSchool(raw, school.id)
})

describe('AUD-01 persetujuan publikasi album', () => {
  it('album terbit tanpa persetujuan tidak pernah publik (REST & halaman); staf tetap melihat', async () => {
    const cover = await media('album')
    const base = { cover: cover.id, _status: 'published', workflowStatus: 'published' }
    const without = await payload.create({ collection: 'albums', overrideAccess: true, data: { title: `Tanpa izin ${RUN}`, slug: `tanpa-${RUN}`, ...base } as never })
    const withC = await payload.create({ collection: 'albums', overrideAccess: true, data: { title: `Dengan izin ${RUN}`, slug: `dengan-${RUN}`, publicationConsent: true, ...base } as never })
    // REST (anonymous, school host)
    const list = await api(`albums?limit=50`)
    const ids = list.json.docs.map((d: any) => d.id)
    expect(ids).toContain(withC.id)
    expect(ids).not.toContain(without.id)
    expect((await api(`albums/${without.id}`)).status).toBe(404)
    // pages use the same access rules (overrideAccess false, no user)
    const pub = await payload.find({ collection: 'albums', where: { slug: { equals: `tanpa-${RUN}` } }, overrideAccess: false, draft: false })
    expect(pub.docs).toHaveLength(0)
    // staff
    const staffView = await payload.find({ collection: 'albums', where: { slug: { equals: `tanpa-${RUN}` } }, user: users.editor, overrideAccess: false })
    expect(staffView.docs).toHaveLength(1)
  })
})
