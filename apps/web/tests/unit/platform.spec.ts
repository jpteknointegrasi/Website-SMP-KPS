import { describe, expect, it } from 'vitest'
import { applicationReference, readApplication, readApproval, suggestSlug, validSlug } from '@/platform/validation'

const form = (o: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(o)) fd.set(k, v)
  return fd
}
const good = { schoolName: 'SMA Negeri 1 Contoh', city: 'Balikpapan', province: 'Kalimantan Timur', adminName: 'Budi', adminEmail: 'Budi@Sekolah.sch.id', wantWeb: 'on', consent: 'on' }

describe('formulir pendaftaran sekolah', () => {
  it('membersihkan isian dan menormalkan domain/email', () => {
    const { value, errors } = readApplication(form({ ...good, domain: 'https://WWW.SMAN1contoh.sch.id/beranda', npsn: '3010 1234', level: 'xx', timezone: 'Europe/Paris' }))
    expect(errors).toEqual({})
    expect(value).toMatchObject({ adminEmail: 'budi@sekolah.sch.id', domain: 'www.sman1contoh.sch.id', npsn: '30101234', level: null, timezone: 'Asia/Jakarta', wantWeb: true, wantApp: false })
  })
  it('menandai isian yang salah', () => {
    const { errors } = readApplication(form({ schoolName: 'X', adminEmail: 'bukan-email', npsn: '123', domain: 'tidak valid' }))
    expect(Object.keys(errors).sort()).toEqual(['adminEmail', 'adminName', 'city', 'consent', 'domain', 'npsn', 'products', 'province', 'schoolName'])
  })
})

describe('persetujuan', () => {
  it('kode sekolah: aman, unik per platform, bukan kata cadangan', () => {
    expect(suggestSlug('', 'SMA Negeri 1 Contoh', 'Balikpapan')).toBe('sman1contohbalikpapan')
    expect(suggestSlug('SMAN 1 Contoh', 'x')).toBe('sman1contoh')
    expect(validSlug('www')).toBe(false)
    expect(validSlug('-abc')).toBe(false)
    expect(validSlug('sman1-contoh')).toBe(true)
  })
  it('menolak paket kosong dan kode/zona yang salah', () => {
    const { errors } = readApproval(form({ applicationId: '0', slug: 'Admin', name: 'ab', timezone: 'UTC', webPlan: 'none', appPlan: 'none' }))
    expect(errors.length).toBe(5)
    const ok = readApproval(form({ applicationId: '7', slug: 'sman1', name: 'SMAN 1', timezone: 'Asia/Makassar', domain: 'WWW.Sman1.sch.id', webPlan: 'basic', appPlan: 'none' }))
    expect(ok.errors).toEqual([])
    expect(ok.value.domain).toBe('www.sman1.sch.id')
  })
  it('nomor pendaftaran tanpa huruf/angka yang mirip', () => {
    for (let i = 0; i < 50; i++) expect(applicationReference()).toMatch(/^SK-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
  })
})
