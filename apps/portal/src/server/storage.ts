/**
 * Private object storage for uploaded files. Drivers:
 *  - `s3`    any S3-compatible bucket (Cloudflare R2, AWS S3, Supabase Storage S3, MinIO): S3_ENDPOINT, S3_BUCKET,
 *            S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION (default "auto"). The bucket must NOT be public.
 *  - `local` a directory on disk (development/tests): STORAGE_DIR (default ./.storage).
 * Files are never served from the bucket directly: every download goes through the portal's access check.
 */
import { promises as fs } from 'fs'
import path from 'path'
import { AwsClient } from 'aws4fetch'

export interface Storage {
  put(key: string, body: Buffer, mime: string): Promise<void>
  get(key: string): Promise<Buffer | null>
  remove(key: string): Promise<void>
}

class LocalStorage implements Storage {
  constructor(private dir: string) {}
  private file(key: string) {
    const p = path.resolve(this.dir, key)
    if (!p.startsWith(path.resolve(this.dir) + path.sep)) throw new Error('kunci berkas tidak sah')
    return p
  }
  async put(key: string, body: Buffer) {
    const p = this.file(key)
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, body)
  }
  async get(key: string) {
    return fs.readFile(this.file(key)).catch(() => null)
  }
  async remove(key: string) {
    await fs.rm(this.file(key), { force: true })
  }
}

class S3Storage implements Storage {
  private client: AwsClient
  constructor(
    private endpoint: string,
    private bucket: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
  ) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, region, service: 's3' })
  }
  private url(key: string) {
    return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
  }
  async put(key: string, body: Buffer, mime: string) {
    const r = await this.client.fetch(this.url(key), { method: 'PUT', body: new Uint8Array(body), headers: { 'content-type': mime } })
    if (!r.ok) throw new Error(`Penyimpanan berkas gagal (${r.status})`)
  }
  async get(key: string) {
    const r = await this.client.fetch(this.url(key))
    if (r.status === 404) return null
    if (!r.ok) throw new Error(`Berkas tidak dapat dibaca (${r.status})`)
    return Buffer.from(await r.arrayBuffer())
  }
  async remove(key: string) {
    await this.client.fetch(this.url(key), { method: 'DELETE' })
  }
}

let storage: Storage | null = null
export function getStorage(): Storage {
  if (storage) return storage
  const driver = process.env.STORAGE_DRIVER || (process.env.S3_BUCKET ? 's3' : 'local')
  if (driver === 's3') {
    const need = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'].filter((k) => !process.env[k])
    if (need.length) throw new Error(`Penyimpanan berkas belum diatur: ${need.join(', ')}`)
    storage = new S3Storage(process.env.S3_ENDPOINT!, process.env.S3_BUCKET!, process.env.S3_ACCESS_KEY_ID!, process.env.S3_SECRET_ACCESS_KEY!, process.env.S3_REGION || 'auto')
  } else {
    if (process.env.NODE_ENV === 'production' && !process.env.STORAGE_DIR) throw new Error('Penyimpanan berkas produksi harus memakai S3/R2 (STORAGE_DRIVER=s3).')
    storage = new LocalStorage(process.env.STORAGE_DIR || path.resolve(process.cwd(), '.storage'))
  }
  return storage
}
export const setStorage = (s: Storage | null) => void (storage = s)
