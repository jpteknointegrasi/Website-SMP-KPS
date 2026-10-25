import { randomUUID } from 'crypto'
import { APIError, type CollectionBeforeOperationHook } from 'payload'

type Sig = { mime: string; ext: string; test: (b: Buffer) => boolean }

const SIGNATURES: Sig[] = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { mime: 'image/avif', ext: 'avif', test: (b) => b.subarray(4, 12).toString() === 'ftypavif' },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-' },
  // OOXML (docx/xlsx/pptx) are ZIP containers
  { mime: 'application/zip-ooxml', ext: 'zip', test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 },
]

const OOXML: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

/**
 * Validates uploads by magic bytes (not just the declared MIME / extension),
 * enforces a size limit and replaces the storage filename with a random one.
 * SVG, HTML, scripts and executables are always rejected.
 */
export const secureUpload =
  (allowed: string[], maxBytes: number): CollectionBeforeOperationHook =>
  ({ args, operation, req }) => {
    if (operation !== 'create' && operation !== 'update') return args
    const file = req.file
    if (!file?.data) return args

    const buf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data)
    if (buf.length > maxBytes) {
      throw new APIError(`Ukuran berkas melebihi batas ${Math.round(maxBytes / 1_000_000)} MB.`, 400, null, true)
    }

    const declared = String(file.mimetype || '').toLowerCase()
    if (!allowed.includes(declared)) {
      throw new APIError('Jenis berkas tidak diizinkan.', 400, null, true)
    }

    let ext: string | null = null
    if (OOXML[declared]) {
      ext = SIGNATURES.find((s) => s.mime === 'application/zip-ooxml')!.test(buf) ? OOXML[declared] : null
    } else {
      const sig = SIGNATURES.find((s) => s.mime === declared)
      ext = sig && sig.test(buf) ? sig.ext : null
    }
    if (!ext) {
      throw new APIError('Isi berkas tidak sesuai dengan jenisnya. Unggahan ditolak.', 400, null, true)
    }

    const original = file.name
    file.name = `${randomUUID()}.${ext}`
    if (args.data && typeof args.data === 'object' && !(args.data as Record<string, unknown>).originalFilename) {
      ;(args.data as Record<string, unknown>).originalFilename = original
    }
    return args
  }
