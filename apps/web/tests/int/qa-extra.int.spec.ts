/**
 * Remaining QA scenarios (QA_REPORT): CMS-06 restore, CMS-07 media in use, SEC-02 malicious upload,
 * SEC-03 rich text XSS, SEC-04 private files, FORM-01 contact end-to-end at API level.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { randomBytes } from 'crypto'
import sharp from 'sharp'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import type { TenantPayload } from '@/tenancy/scoped'
import { createTestSchool, dropTestSchool, type TestSchool } from './school'
import { contactSubmitEndpoint } from '@/endpoints/contact'
import { RichText } from '@/components/ui/RichText'
import { lexical } from '@/lib/lexical'

const RUN = `q${Date.now().toString(36)}`
let raw: Payload
let school: TestSchool
/** school-scoped Payload (as used by pages/endpoints) */
let payload: TenantPayload
const users: Record<string, any> = {}
const created: { collection: string; id: number }[] = []
const track = <T extends { id: number }>(collection: string, doc: T) => (created.push({ collection, id: doc.id }), doc)
let png: Buffer

const file = (data: Buffer, mimetype: string, name: string) => ({ data, mimetype, name, size: data.length })

beforeAll(async () => {
  raw = await getPayload({ config })
  school = await createTestSchool(raw, RUN)
  payload = school.payload
  for (const role of ['admin', 'editor', 'contributor'] as const) {
    const u = await payload.create({ collection: 'users', overrideAccess: true, data: { email: `${RUN}-${role}@test.invalid`, password: randomBytes(18).toString('base64url'), name: `QA ${role}`, role } })
    users[role] = { ...u, collection: 'users' }
  }
  png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#167467' } }).png().toBuffer()
})

afterAll(async () => {
  for (const c of created.reverse())
    await payload.delete({ collection: c.collection as 'posts', id: c.id, overrideAccess: true, trash: false, context: { forceMediaDelete: true } } as never).catch(() => {})
  await payload.delete({ collection: 'contact-messages', where: { name: { like: RUN } }, overrideAccess: true }).catch(() => {})
  for (const u of Object.values(users)) await payload.delete({ collection: 'users', id: u.id, overrideAccess: true }).catch(() => {})
  await dropTestSchool(raw, school.id)
})

describe('CMS-06 pulihkan revisi', () => {
  it('versi lama dapat dipulihkan; versi terbit tetap konsisten', async () => {
    const p = track('posts', await payload.create({ collection: 'posts', user: users.editor, overrideAccess: false, data: { title: `Judul A ${RUN}`, slug: `revisi-${RUN}`, _status: 'published' } as never }))
    await payload.update({ collection: 'posts', id: p.id, user: users.editor, overrideAccess: false, data: { title: `Judul B ${RUN}`, _status: 'published' } as never })
    const versions = await payload.findVersions({ collection: 'posts', where: { parent: { equals: p.id } }, sort: 'createdAt', user: users.editor, overrideAccess: false })
    const first = versions.docs.find((v) => (v.version as { title?: string }).title === `Judul A ${RUN}`)
    expect(first).toBeTruthy()
    await payload.restoreVersion({ collection: 'posts', id: String(first!.id), user: users.editor, overrideAccess: false })
    const now = await payload.findByID({ collection: 'posts', id: p.id, overrideAccess: true, draft: true })
    expect(now.title).toBe(`Judul A ${RUN}`)
  })
  it('kontributor tidak bisa membaca riwayat versi konten orang lain secara publik', async () => {
    await expect(payload.findVersions({ collection: 'posts', overrideAccess: false })).rejects.toThrow()
  })
})

describe('CMS-07 media yang dipakai tidak bisa dihapus', () => {
  const blocked = (id: number) => expect(payload.delete({ collection: 'media', id, user: users.admin, overrideAccess: false })).rejects.toThrow(/masih dipakai/)
  it('dipakai berita, blok halaman, dan beranda → ditolak dengan daftar pemakaian', async () => {
    const m = track('media', await payload.create({ collection: 'media', user: users.editor, overrideAccess: false, data: { alt: `uji ${RUN}` }, file: file(png, 'image/png', 'a.png') } as never))
    const post = track('posts', await payload.create({ collection: 'posts', overrideAccess: true, data: { title: `Pakai ${RUN}`, slug: `pakai-${RUN}`, cover: m.id, _status: 'published' } as never }))
    await blocked(m.id)
    await payload.update({ collection: 'posts', id: post.id, overrideAccess: true, data: { cover: null } as never })
    // used only inside a page block
    const pg = track('pages', await payload.create({ collection: 'pages', overrideAccess: true, data: { title: `Hal ${RUN}`, slug: `hal-${RUN}`, layout: [{ blockType: 'imageText', heading: 'x', image: m.id }], _status: 'published' } as never }))
    await blocked(m.id)
    await payload.update({ collection: 'pages', id: pg.id, overrideAccess: true, data: { layout: [] } as never })
    // used only on the homepage (hero slides, still a draft for a new school)
    const home = (await payload.findGlobal({ slug: 'homepage', depth: 0, draft: true, overrideAccess: true })) as any
    await payload.updateGlobal({ slug: 'homepage', overrideAccess: true, draft: true, data: { hero: { ...home.hero, slides: [m.id] } } as never })
    await expect(payload.delete({ collection: 'media', id: m.id, user: users.admin, overrideAccess: false })).rejects.toThrow(/homepage\.hero\.slides/)
    await payload.updateGlobal({ slug: 'homepage', overrideAccess: true, draft: true, data: { hero: { ...home.hero, slides: [] } } as never })
    // free now
    const del = await payload.delete({ collection: 'media', id: m.id, user: users.admin, overrideAccess: false })
    expect(del.id).toBe(m.id)
    created.splice(created.findIndex((c) => c.collection === 'media' && c.id === m.id), 1)
  })
  it.each([
    ['foto pembuka', 'heroImage', (id: number) => ({ heroImage: id }), /alumni-page\.heroImage/],
    ['foto pengurus (array)', 'committee', (id: number) => ({ committee: [{ name: 'Ketua', role: 'Ketua IKA', photo: id }] }), /alumni-page\.committee\[0\]\.photo/],
    ['gambar kegiatan (array)', 'activities', (id: number) => ({ activities: [{ title: 'Reuni', image: id }] }), /alumni-page\.activities\[0\]\.image/],
  ])('dipakai halaman alumni: %s → ditolak', async (_n, key, data, where) => {
    const m = track('media', await payload.create({ collection: 'media', user: users.editor, overrideAccess: false, data: { alt: `alumni ${RUN}` }, file: file(png, 'image/png', 'al.png') } as never))
    await payload.updateGlobal({ slug: 'alumni-page', overrideAccess: true, data: data(m.id) as never })
    await expect(payload.delete({ collection: 'media', id: m.id, user: users.admin, overrideAccess: false })).rejects.toThrow(where)
    await payload.updateGlobal({ slug: 'alumni-page', overrideAccess: true, data: { [key]: key === 'heroImage' ? null : [] } as never })
    expect((await payload.delete({ collection: 'media', id: m.id, user: users.admin, overrideAccess: false })).id).toBe(m.id)
    created.splice(created.findIndex((c) => c.collection === 'media' && c.id === m.id), 1)
  })
})

describe('SEC-02 unggahan berbahaya', () => {
  it.each([
    ['HTML disamarkan sebagai JPG', Buffer.from('<html><script>alert(1)</script></html>'), 'image/jpeg', 'foto.jpg'],
    ['SVG berisi script', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml', 'logo.svg'],
    ['Executable', Buffer.from('MZ\x90\x00\x03'), 'application/x-msdownload', 'setup.exe'],
    ['PNG berlabel PDF', Buffer.from('%PDX-not-a-pdf'), 'application/pdf', 'x.pdf'],
  ])('%s ditolak', async (_n, data, mime, name) => {
    await expect(payload.create({ collection: 'media', user: users.editor, overrideAccess: false, data: { alt: 'x' }, file: file(data as Buffer, mime as string, name as string) } as never)).rejects.toThrow()
  })
  it('PNG asli diterima dengan nama berkas acak', async () => {
    const m = track('media', await payload.create({ collection: 'media', user: users.editor, overrideAccess: false, data: { alt: `ok ${RUN}` }, file: file(png, 'image/png', 'nama-asli siswa.png') } as never))
    expect((m as unknown as { filename: string }).filename).toMatch(/^[0-9a-f-]{36}\.png$/)
  })
})

describe('SEC-03 rich text tidak bisa menyisipkan HTML/script', () => {
  it('teks berisi <script> dirender sebagai teks', () => {
    const html = renderToStaticMarkup(React.createElement(RichText, { data: lexical(['<script>alert(1)</script> <img src=x onerror=alert(2)>']) }))
    expect(html).not.toMatch(/<script>|<img/i)
    expect(html).toContain('&lt;script&gt;')
  })
  it('editor tidak menyediakan blok HTML mentah', async () => {
    const cfg = payload.config.collections.find((c) => c.slug === 'pages')!
    const layout = cfg.fields.find((f) => 'name' in f && f.name === 'layout') as { blocks: { slug: string }[] }
    expect(layout.blocks.map((b) => b.slug).some((s) => /html|code|embed|script/i.test(s))).toBe(false)
  })
})

describe('SEC-04 berkas privat', () => {
  it('publik tidak bisa membaca/mengunduh; bukti prestasi tidak bocor', async () => {
    const f = track('private-files', await payload.create({ collection: 'private-files', user: users.editor, overrideAccess: false, data: { title: `Bukti ${RUN}` }, file: file(png, 'image/png', 'bukti.png') } as never))
    await expect(payload.findByID({ collection: 'private-files', id: f.id, overrideAccess: false })).rejects.toThrow()
    expect((await payload.find({ collection: 'private-files', overrideAccess: false }).catch(() => ({ totalDocs: 0 }))).totalDocs).toBe(0)
    const a = track('achievements', await payload.create({ collection: 'achievements', overrideAccess: true, data: { title: `Prestasi ${RUN}`, slug: `prestasi-${RUN}`, proof: f.id, _status: 'published' } as never }))
    const pub = await payload.findByID({ collection: 'achievements', id: a.id, overrideAccess: false, depth: 1 })
    expect((pub as { proof?: unknown }).proof).toBeUndefined()
  })
})

describe('FORM-01 formulir kontak', () => {
  const call = async (body: Record<string, unknown>) => {
    const req = { payload, headers: new Headers({ host: school.domain, 'x-forwarded-for': `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }), json: async () => body } as unknown as PayloadRequest
    const res = await contactSubmitEndpoint.handler(req)
    return { status: res.status, json: await res.json() }
  }
  it('pesan valid tersimpan privat (tanpa SMTP pun), referensi dikembalikan', async () => {
    const r = await call({ name: `Ortu ${RUN}`, email: 'ortu@contoh.id', category: 'pendaftaran', message: 'Kapan pendaftaran dibuka?', consent: true, startedAt: Date.now() - 10_000 })
    expect(r.status).toBe(200)
    const saved = await payload.find({ collection: 'contact-messages', where: { reference: { equals: r.json.reference } }, overrideAccess: true })
    expect(saved.docs[0]?.status).toBe('new')
    expect((await payload.find({ collection: 'contact-messages', where: { reference: { equals: r.json.reference } }, overrideAccess: false }).catch(() => ({ totalDocs: 0 }))).totalDocs).toBe(0)
  })
  it('honeypot/bot: dijawab OK tapi tidak disimpan', async () => {
    const r = await call({ name: `Bot ${RUN}`, email: 'b@contoh.id', category: 'umum', message: 'spam spam spam', consent: true, website: 'http://spam', startedAt: Date.now() - 10_000 })
    expect(r.status).toBe(200)
    expect((await payload.find({ collection: 'contact-messages', where: { name: { equals: `Bot ${RUN}` } }, overrideAccess: true })).totalDocs).toBe(0)
  })
  it('tanpa persetujuan → 400', async () => {
    const r = await call({ name: `Ortu ${RUN}`, email: 'ortu@contoh.id', category: 'umum', message: 'Pesan tanpa persetujuan', startedAt: Date.now() - 10_000 })
    expect(r.status).toBe(400)
    expect(r.json.errors.consent).toBeTruthy()
  })
})
