/**
 * OPS-01..02: operational safeguards — the cron endpoint compares CRON_SECRET in constant time and refuses an empty
 * secret; production refuses the local-disk file driver unless explicitly allowed.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { bearerMatches } from '@/server/secrets'
import { assertLocalStorageAllowed, getStorage, setStorage } from '@/server/storage'
import { GET as jobs } from '@/app/api/jobs/route'

describe('OPS-01 /api/jobs dan CRON_SECRET', () => {
  const saved = process.env.CRON_SECRET
  afterEach(() => {
    process.env.CRON_SECRET = saved
  })
  it('perbandingan waktu-konstan; rahasia kosong/salah/beda panjang ditolak', async () => {
    expect(bearerMatches('Bearer rahasia-cron-123', 'rahasia-cron-123')).toBe(true)
    expect(bearerMatches('Bearer rahasia-cron-124', 'rahasia-cron-123')).toBe(false)
    expect(bearerMatches('Bearer rahasia-cron-1234', 'rahasia-cron-123')).toBe(false)
    expect(bearerMatches('Bearer rahasia-cron-12', 'rahasia-cron-123')).toBe(false)
    expect(bearerMatches('rahasia-cron-123', 'rahasia-cron-123')).toBe(false)
    expect(bearerMatches(null, 'rahasia-cron-123')).toBe(false)
    expect(bearerMatches('Bearer ', '')).toBe(false)
    expect(bearerMatches('Bearer x', undefined)).toBe(false)
    process.env.CRON_SECRET = ''
    expect((await jobs(new Request('http://x/portal/api/jobs', { headers: { authorization: 'Bearer ' } }))).status).toBe(401)
    process.env.CRON_SECRET = 'rahasia-cron-123'
    expect((await jobs(new Request('http://x/portal/api/jobs', { headers: { authorization: 'Bearer salah' } }))).status).toBe(401)
    expect((await jobs(new Request('http://x/portal/api/jobs'))).status).toBe(401)
  })
})

describe('OPS-02 penyimpanan berkas produksi', () => {
  const keys = ['NODE_ENV', 'STORAGE_DRIVER', 'STORAGE_DIR', 'S3_BUCKET', 'ALLOW_LOCAL_STORAGE_IN_PRODUCTION'] as const
  const env = process.env as Record<string, string | undefined>
  const saved = Object.fromEntries(keys.map((k) => [k, env[k]]))
  afterEach(() => {
    for (const k of keys) if (saved[k] === undefined) delete env[k]
    else env[k] = saved[k]
    setStorage(null)
  })
  it('disk lokal ditolak di produksi walau STORAGE_DIR diisi, kecuali ALLOW_LOCAL_STORAGE_IN_PRODUCTION=true', () => {
    expect(() => assertLocalStorageAllowed({ NODE_ENV: 'production', STORAGE_DIR: '/data' })).toThrow(/S3\/R2/)
    expect(() => assertLocalStorageAllowed({ NODE_ENV: 'production', STORAGE_DIR: '/data', ALLOW_LOCAL_STORAGE_IN_PRODUCTION: 'true' })).not.toThrow()
    expect(() => assertLocalStorageAllowed({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).not.toThrow()
    expect(() => assertLocalStorageAllowed({ NODE_ENV: 'development' })).not.toThrow()
    // through getStorage() as the app uses it
    setStorage(null)
    Object.assign(process.env, { NODE_ENV: 'production', STORAGE_DRIVER: 'local', STORAGE_DIR: '/tmp/sekolahku-uji' })
    delete process.env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION
    expect(() => getStorage()).toThrow(/ALLOW_LOCAL_STORAGE_IN_PRODUCTION/)
    process.env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION = 'true'
    expect(getStorage()).toBeTruthy()
  })
})
