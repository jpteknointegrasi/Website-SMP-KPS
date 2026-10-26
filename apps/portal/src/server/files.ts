/**
 * Uploads and downloads. Uploads are checked by content (magic bytes), not by the name or the browser's claim.
 * Downloads ask the module that owns the file's context whether this person may read it.
 */
import { eq } from 'drizzle-orm'
import { files } from '@/db/schema'
import type { Ctx } from './context'
import type { Db } from './command'
import { fail } from './errors'
import { sha256 } from './secrets'
import { getStorage } from './storage'

export const KINDS = {
  pdf: { mime: 'application/pdf', ext: 'pdf', label: 'PDF' },
  jpg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG' },
  png: { mime: 'image/png', ext: 'png', label: 'PNG' },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WEBP' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx', label: 'XLSX' },
  csv: { mime: 'text/csv', ext: 'csv', label: 'CSV' },
} as const
export type FileKind = keyof typeof KINDS
export const DOCS: FileKind[] = ['pdf', 'jpg', 'png']
export const IMAGES: FileKind[] = ['jpg', 'png', 'webp']

export function sniff(b: Buffer, name = ''): FileKind | null {
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf'
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 && /\.xlsx$/i.test(name)) return 'xlsx'
  if (/\.csv$/i.test(name) && !b.subarray(0, 2048).includes(0)) return 'csv'
  return null
}

const safeName = (n: string) => n.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').slice(-120) || 'berkas'

/** A file from a multipart form field, or null when nothing was chosen. */
export async function formFile(form: FormData, field: string) {
  const f = form.get(field)
  if (!f || typeof f === 'string' || f.size === 0) return null
  return { name: f.name, buffer: Buffer.from(await f.arrayBuffer()) }
}

/**
 * Stores an upload and records it. The object is written before the row; a failed transaction leaves at most an
 * orphaned object (never a row pointing at nothing).
 */
export async function saveFile(
  ctx: Ctx,
  tx: Db,
  up: { name: string; buffer: Buffer },
  o: { allow: FileKind[]; maxMb: number; classification: 'public' | 'private' | 'restricted'; contextType: string; contextId?: string | null; label?: string },
) {
  const what = o.label ?? 'Berkas'
  if (up.buffer.length > o.maxMb * 1024 * 1024) fail(`${what} terlalu besar (maksimal ${o.maxMb} MB).`)
  const kind = sniff(up.buffer, up.name)
  if (!kind || !o.allow.includes(kind)) fail(`${what} harus berformat ${o.allow.map((k) => KINDS[k].label).join('/')}.`)
  const id = crypto.randomUUID()
  const d = ctx.now
  const key = `${ctx.school.slug}/${o.classification}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${id}.${KINDS[kind!].ext}`
  await getStorage().put(key, up.buffer, KINDS[kind!].mime)
  const [row] = await tx
    .insert(files)
    .values({
      id,
      classification: o.classification,
      contextType: o.contextType,
      contextId: o.contextId ?? null,
      storageKey: key,
      originalName: safeName(up.name),
      mime: KINDS[kind!].mime,
      size: up.buffer.length,
      sha256: sha256(up.buffer),
      uploadedByType: ctx.staff ? 'staff' : ctx.account ? 'account' : 'system',
      uploadedById: ctx.staff?.id ?? ctx.account?.id ?? null,
    })
    .returning()
  return row!
}

/** Re-points a file at its owning record once that record exists (uploads made while creating it). */
export const attachFile = (tx: Db, fileId: string, contextType: string, contextId: string) =>
  tx.update(files).set({ contextType, contextId }).where(eq(files.id, fileId))

export type FileRow = typeof files.$inferSelect
type Checker = (ctx: Ctx, f: FileRow) => Promise<boolean>
const checkers = new Map<string, Checker>()
/** Modules declare who may read files of their context types. Unknown context → nobody. */
export const fileAccess = (contextType: string, c: Checker) => void checkers.set(contextType, c)

export async function canReadFile(ctx: Ctx, f: FileRow) {
  if (f.deletedAt) return false
  if (f.classification === 'public') return true
  // support access is for looking at screens, never for downloading pupils' documents
  if (ctx.staff?.support) return false
  const c = checkers.get(f.contextType)
  return c ? c(ctx, f) : false
}

export async function readFile(f: FileRow) {
  return getStorage().get(f.storageKey)
}
