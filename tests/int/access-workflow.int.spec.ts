/**
 * Integration tests against the real Payload instance + database (DATABASE_URI in .env).
 * Every record created here is tagged with RUN and removed in afterAll.
 */
import { getPayload, type Payload } from 'payload'
import { randomBytes } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { search, activeAnnouncementWhere } from '@/lib/queries'

const RUN = `t${Date.now().toString(36)}`
let payload: Payload
const users: Record<string, any> = {}
const created: { collection: string; id: number }[] = []
const lexical = (t: string) => ({ root: { type: 'root', direction: 'ltr', format: '', indent: 0, version: 1, children: [{ type: 'paragraph', direction: 'ltr', format: '', indent: 0, version: 1, textFormat: 0, children: [{ type: 'text', text: t, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }] }] } })
const track = <T extends { id: number }>(collection: string, doc: T) => (created.push({ collection, id: doc.id }), doc)
const pub = { overrideAccess: false as const, draft: false as const }

beforeAll(async () => {
  payload = await getPayload({ config })
  for (const role of ['admin', 'editor', 'contributor', 'admissions'] as const) {
    const u = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email: `${RUN}-${role}@test.invalid`, password: randomBytes(18).toString('base64url'), name: `Uji ${role}`, role },
    })
    users[role] = { ...u, collection: 'users' }
  }
})

afterAll(async () => {
  for (const c of created.reverse()) {
    await payload.delete({ collection: c.collection as 'posts', id: c.id, overrideAccess: true, trash: false } as never).catch(() => {})
  }
  for (const u of Object.values(users)) await payload.delete({ collection: 'users', id: u.id, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'audit-logs', where: { actorEmail: { like: RUN } }, overrideAccess: true }).catch(() => {})
})

describe('CMS-02 kontributor', () => {
  it('dapat menyimpan draf / ajukan review', async () => {
    const d = track('posts', await payload.create({ collection: 'posts', user: users.contributor, overrideAccess: false, draft: true, data: { title: `Draf ${RUN}`, slug: `draf-${RUN}`, content: lexical('x'), workflowStatus: 'in_review', _status: 'draft' } as never }))
    expect(d.id).toBeTruthy()
  })
  it('tidak dapat menerbitkan lewat API', async () => {
    await expect(
      payload.create({ collection: 'posts', user: users.contributor, overrideAccess: false, data: { title: `Terbit ${RUN}`, slug: `terbit-${RUN}`, content: lexical('x'), _status: 'published' } as never }),
    ).rejects.toThrow()
  })
  it('tidak dapat mengubah konten milik orang lain', async () => {
    const other = track('posts', await payload.create({ collection: 'posts', user: users.editor, overrideAccess: false, draft: true, data: { title: `Milik editor ${RUN}`, slug: `milik-editor-${RUN}`, _status: 'draft' } as never }))
    await expect(payload.update({ collection: 'posts', id: other.id, user: users.contributor, overrideAccess: false, draft: true, data: { title: 'diubah' } as never })).rejects.toThrow()
  })
})

describe('CMS-03/04 draf tidak bocor', () => {
  it('draf tidak muncul di kueri publik maupun pencarian', async () => {
    const word = `kata${RUN}`
    track('posts', await payload.create({ collection: 'posts', user: users.editor, overrideAccess: false, draft: true, data: { title: `Rahasia ${word}`, slug: `rahasia-${RUN}`, _status: 'draft' } as never }))
    const res = await payload.find({ collection: 'posts', where: { slug: { equals: `rahasia-${RUN}` } }, ...pub })
    expect(res.totalDocs).toBe(0)
    const s = await search(word)
    expect(s.total).toBe(0)
  })
  it('versi terbit lama tetap tampil saat revisi masih draf', async () => {
    const p = track('posts', await payload.create({ collection: 'posts', user: users.editor, overrideAccess: false, data: { title: `Asli ${RUN}`, slug: `asli-${RUN}`, publishedAt: new Date(Date.now() - 6e4).toISOString(), _status: 'published' } as never }))
    await payload.update({ collection: 'posts', id: p.id, user: users.editor, overrideAccess: false, draft: true, data: { title: `Revisi ${RUN}`, _status: 'draft' } as never })
    const res = await payload.find({ collection: 'posts', where: { slug: { equals: `asli-${RUN}` } }, ...pub })
    expect(res.docs[0]?.title).toBe(`Asli ${RUN}`)
  })
  it('konten terjadwal (publishedAt di masa depan) belum publik', async () => {
    track('posts', await payload.create({ collection: 'posts', user: users.editor, overrideAccess: false, data: { title: `Nanti ${RUN}`, slug: `nanti-${RUN}`, publishedAt: new Date(Date.now() + 864e5).toISOString(), _status: 'published' } as never }))
    const res = await payload.find({ collection: 'posts', where: { slug: { equals: `nanti-${RUN}` } }, ...pub })
    expect(res.totalDocs).toBe(0)
  })
})

describe('CMS-05 / PUB-04 kedaluwarsa pengumuman', () => {
  it('pengumuman yang lewat display_end tidak aktif walau scheduler tidak berjalan', async () => {
    const a = track('announcements', await payload.create({
      collection: 'announcements', user: users.editor, overrideAccess: false,
      data: { title: `Lewat ${RUN}`, slug: `lewat-${RUN}`, priority: 99, displayStart: new Date(Date.now() - 3 * 864e5).toISOString(), displayEnd: new Date(Date.now() - 60e3).toISOString(), _status: 'published' } as never,
    }))
    const res = await payload.find({ collection: 'announcements', where: { and: [activeAnnouncementWhere(), { id: { equals: a.id } }] }, ...pub })
    expect(res.totalDocs).toBe(0)
  })
})

describe('SEC-01 peran & pengaturan', () => {
  it('editor tidak bisa menaikkan perannya sendiri', async () => {
    await payload.update({ collection: 'users', id: users.editor.id, user: users.editor, overrideAccess: false, data: { role: 'admin' } as never }).catch(() => null)
    const u = await payload.findByID({ collection: 'users', id: users.editor.id, overrideAccess: true })
    expect(u.role).toBe('editor')
  })
  it('kontributor tidak bisa mengubah pengaturan sekolah', async () => {
    await expect(payload.updateGlobal({ slug: 'site-settings', user: users.contributor, overrideAccess: false, data: { schoolName: 'X' } as never })).rejects.toThrow()
  })
  it('petugas pendaftaran tanpa izin eksplisit tidak bisa menerbitkan', async () => {
    await expect(
      payload.create({ collection: 'admissions-cycles', user: users.admissions, overrideAccess: false, data: { academicYear: `9999/${RUN}`, admissionStatus: 'unconfirmed', _status: 'published' } as never }),
    ).rejects.toThrow()
  })
  it('publik tidak dapat membaca pesan masuk', async () => {
    const res = await payload.find({ collection: 'contact-messages', overrideAccess: false }).catch(() => ({ totalDocs: 0, docs: [] }))
    expect(res.docs.length).toBe(0)
  })
})
