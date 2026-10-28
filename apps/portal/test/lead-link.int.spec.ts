/**
 * LEAD-01..03: linking an application to the interest form (minat) the family filled on the website (addendum D) —
 * only the owner with consent and a verified e-mail; the website only sees pending requests; results only change
 * requests still pending (a cancel in between wins); staff see the link in the summary.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { accounts, applications, auditEvents, mailLog } from '@/db/schema'
import * as cfg from '@/modules/admissions/config'
import * as apply from '@/modules/admissions/apply'
import * as academic from '@/modules/academic/service'
import { cancelLeadLink, leadLinkFeed, markLeadLinks, parseLeadResults, requestLeadLink } from '@/modules/admissions/lead-link'
import { signIn, signUp, verifyEmail } from '@/modules/identity/service'
import { processOutbox } from '@/server/outbox'
import { accountFromToken, ctxAccount, ctxAnon, ctxStaff, harness, staff, type School } from './helpers'
import type { AccountActor } from '@/server/context'

const h = harness('t9')
let A: School
let cycleId = ''
let pathId = ''
let fam1: AccountActor, fam2: AccountActor
let app1 = '', app2 = ''

async function family(email: string): Promise<AccountActor> {
  await signUp(ctxAnon(A), { name: `Orang Tua ${email}`, email, password: 'rahasia-keluarga-01' })
  await processOutbox(A.db, A.school)
  const mails = await A.db.select().from(mailLog).where(eq(mailLog.to, email.toLowerCase()))
  await verifyEmail(ctxAnon(A), /[?&]t=([A-Za-z0-9_-]+)/.exec(mails[0]!.body!)![1]!)
  const { token } = await signIn(ctxAnon(A), { login: email.toLowerCase(), password: 'rahasia-keluarga-01' })
  return (await accountFromToken(A, token))!
}

beforeAll(async () => {
  A = await h.school('minat')
  const manager = await staff(A, ['panitia_pengelola'])
  const approver = await staff(A, ['panitia_penyetuju'])
  const kur = await staff(A, ['kurikulum'])
  await academic.saveYear(ctxStaff(A, kur), { name: '2027/2028', startDate: '2027-07-12', endDate: '2028-06-24' })
  await academic.saveGradeLevel(ctxStaff(A, kur), { name: 'VII', ordinal: 7, final: false })
  const m = ctxStaff(A, manager)
  cycleId = await cfg.createCycle(m, { code: 'PPDB27', name: 'PPDB 2027/2028', targetYear: '2027/2028', targetGrade: 'VII' })
  pathId = (await cfg.cycleDetail(A.db, cycleId))!.paths[0]!.id
  await cfg.updateCycle(m, cycleId, { name: 'PPDB 2027/2028', openAt: new Date(Date.now() - 3600_000), closeAt: new Date(Date.now() + 30 * 86400_000), selectionEnabled: false, offerDays: 7, reenrollDays: 14, requireNik: false, info: 'Info', dataNotice: null, helpContact: null }, null)
  await cfg.setCycleStatus(m, cycleId, 'ready_for_review', null)
  await cfg.setCycleStatus(ctxStaff(A, approver), cycleId, 'approved', null)
  await cfg.setCycleStatus(ctxStaff(A, approver), cycleId, 'open', null)
  fam1 = await family('Ortu.Minat@Contoh.test')
  fam2 = await family('ortu.lain@contoh.test')
  app1 = await apply.startApplication(ctxAccount(A, fam1), { cycleId, pathId, childName: 'Bayu' })
  app2 = await apply.startApplication(ctxAccount(A, fam2), { cycleId, pathId, childName: 'Sari' })
})
afterAll(() => h.cleanup())

describe('LEAD-01 permintaan penautan', () => {
  it('perlu persetujuan, hanya pemilik, tercatat audit', async () => {
    await expect(requestLeadLink(ctxAccount(A, fam1), app1, false)).rejects.toThrow(/persetujuan/)
    await expect(requestLeadLink(ctxAccount(A, fam2), app1, true)).rejects.toMatchObject({ code: 'forbidden' })
    await requestLeadLink(ctxAccount(A, fam1), app1, true)
    await requestLeadLink(ctxAccount(A, fam1), app1, true) // repeat is harmless
    const [a] = await A.db.select().from(applications).where(eq(applications.id, app1))
    expect(a!.leadLinkState).toBe('requested')
    expect(a!.leadLinkConsentAt).not.toBeNull()
    const audits = await A.db.select().from(auditEvents).where(eq(auditEvents.objectId, app1))
    expect(audits.filter((x) => x.action === 'admissions.lead_link.request')).toHaveLength(1)
  })

  it('email belum terverifikasi lewat email → ditolak', async () => {
    await A.db.update(accounts).set({ verifiedBy: 'staff:x' }).where(eq(accounts.id, fam2.id))
    await expect(requestLeadLink(ctxAccount(A, fam2), app2, true)).rejects.toThrow(/diverifikasi/)
    await A.db.update(accounts).set({ verifiedBy: 'email' }).where(eq(accounts.id, fam2.id))
  })
})

describe('LEAD-02 sinkron dengan website', () => {
  it('website hanya melihat permintaan tertunda, email huruf kecil', async () => {
    const feed = await leadLinkFeed(A.db)
    expect(feed.requests).toEqual([{ ref: app1, email: 'ortu.minat@contoh.test', registrationNo: null }])
  })

  it('hasil hanya mengubah permintaan yang masih tertunda; batal di tengah menang', async () => {
    await requestLeadLink(ctxAccount(A, fam2), app2, true)
    await cancelLeadLink(ctxAccount(A, fam2), app2)
    const results = parseLeadResults({ results: [{ ref: app1, leadRef: 'MNT-2026-0007', leadDate: '2026-09-01T02:00:00.000Z' }, { ref: app2, leadRef: 'MNT-X' }, { ref: 'bukan-uuid', leadRef: 'Y' }, null] })
    expect(results).toHaveLength(2)
    expect(await markLeadLinks(A.db, results)).toEqual({ linked: 1, notFound: 0 })
    const [a1] = await A.db.select().from(applications).where(eq(applications.id, app1))
    const [a2] = await A.db.select().from(applications).where(eq(applications.id, app2))
    expect(a1).toMatchObject({ leadLinkState: 'linked', leadRef: 'MNT-2026-0007' })
    expect(a2!.leadLinkState).toBeNull()
    expect((await leadLinkFeed(A.db)).requests).toEqual([])
    await expect(requestLeadLink(ctxAccount(A, fam1), app1, true)).rejects.toThrow(/sudah tertaut/)
  })

  it('tidak ditemukan → keluarga dapat meminta lagi', async () => {
    await requestLeadLink(ctxAccount(A, fam2), app2, true)
    expect(await markLeadLinks(A.db, [{ ref: app2, leadRef: null, leadDate: null }])).toEqual({ linked: 0, notFound: 1 })
    await requestLeadLink(ctxAccount(A, fam2), app2, true)
    const [a2] = await A.db.select().from(applications).where(eq(applications.id, app2))
    expect(a2!.leadLinkState).toBe('requested')
  })
})

describe('LEAD-03 tampilan', () => {
  it('panitia melihat status penautan di data pendaftaran', async () => {
    const v = await apply.applicationView(ctxStaff(A, await staff(A, ['panitia_verifikator'])), app1)
    expect(v.app.leadLinkState).toBe('linked')
    expect(v.app.leadRef).toBe('MNT-2026-0007')
  })
})
