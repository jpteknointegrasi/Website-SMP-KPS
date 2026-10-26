/**
 * Admission cycle set-up (§19.2): cycle → waves → paths (quota, documents, selection components, fees, re-enrolment
 * checklist) → form. Status: draft → ready_for_review → approved → open → closed → archived. Opening, early closing,
 * extension and reopening need the right permission and a reason; set-up is frozen once approved.
 */
import { and, asc, count, eq, inArray, ne } from 'drizzle-orm'
import { admissionCycles, admissionPaths, admissionWaves, applications, type ChecklistItemDef, type DocumentReq, type FormFieldDef, type SelectionComponent } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command, expectVersion, type Db } from '@/server/command'
import { fail, notFound } from '@/server/errors'

const manage = (ctx: Ctx) => requireStaff(ctx, 'admissions.manage')

export const DEFAULT_DOCUMENTS: DocumentReq[] = [
  { code: 'pasfoto', label: 'Pas foto terbaru', required: true, help: 'JPG/PNG maks. 2 MB, latar polos.' },
  { code: 'akta', label: 'Akta kelahiran', required: true },
  { code: 'kk', label: 'Kartu keluarga', required: true },
  { code: 'skl', label: 'Surat keterangan lulus / ijazah', required: false, help: 'Boleh menyusul bila belum terbit.' },
  { code: 'rapor', label: 'Rapor kelas 5–6', required: false },
]
export const DEFAULT_COMPONENTS: SelectionComponent[] = [
  { code: 'tes', label: 'Tes tertulis', max: 100, weight: 60 },
  { code: 'wawancara', label: 'Wawancara', max: 100, weight: 40 },
]
export const DEFAULT_CHECKLIST: ChecklistItemDef[] = [
  { code: 'konfirmasi', label: 'Konfirmasi kesediaan daftar ulang', kind: 'confirm' },
  { code: 'surat_pernyataan', label: 'Surat pernyataan orang tua (ditandatangani)', kind: 'document' },
  { code: 'skl', label: 'Surat keterangan lulus / ijazah', kind: 'document' },
  { code: 'validasi_data', label: 'Validasi data oleh panitia', kind: 'staff' },
]

export const loadCycle = async (db: Db, id: string) => (await db.select().from(admissionCycles).where(eq(admissionCycles.id, id)))[0] ?? null
const editable = (status: string) => status === 'draft' || status === 'ready_for_review'

export async function createCycle(ctx: Ctx, input: { code: string; name: string; targetYear: string; targetGrade: string }) {
  const s = manage(ctx)
  if (!/^[A-Z0-9-]{3,16}$/.test(input.code.toUpperCase())) fail('Kode periode 3–16 huruf/angka, contoh PPDB27.', 'invalid', 'kode')
  if (!input.name.trim()) fail('Isi nama periode.')
  if (!/^\d{4}\/\d{4}$/.test(input.targetYear)) fail('Tahun masuk berformat 2027/2028.')
  if (!input.targetGrade.trim()) fail('Isi tingkat tujuan, contoh VII.')
  return command(ctx, 'admissions.cycle_create', {}, async (tx, fx) => {
    const [dup] = await tx.select({ id: admissionCycles.id }).from(admissionCycles).where(eq(admissionCycles.code, input.code.toUpperCase()))
    if (dup) fail('Kode periode sudah dipakai.', 'conflict')
    const [c] = await tx
      .insert(admissionCycles)
      .values({ code: input.code.toUpperCase(), name: input.name.trim(), targetYear: input.targetYear, targetGrade: input.targetGrade.trim(), createdBy: s.id })
      .returning({ id: admissionCycles.id })
    await tx.insert(admissionPaths).values({ cycleId: c!.id, name: 'Reguler', quota: 32, documents: DEFAULT_DOCUMENTS, components: DEFAULT_COMPONENTS, checklist: DEFAULT_CHECKLIST, ordinal: 1 })
    fx.audit('admissions.cycle_create', 'admission_cycle', c!.id)
    return c!.id
  })
}

export async function updateCycle(
  ctx: Ctx,
  id: string,
  input: { name: string; openAt: Date | null; closeAt: Date | null; selectionEnabled: boolean; offerDays: number; reenrollDays: number; requireNik: boolean; info: string | null; dataNotice: string | null; helpContact: string | null },
  version: string | null,
) {
  manage(ctx)
  if (input.openAt && input.closeAt && input.closeAt <= input.openAt) fail('Waktu tutup harus setelah waktu buka.')
  await command(ctx, 'admissions.cycle_update', {}, async (tx, fx) => {
    const c = await loadCycle(tx, id)
    if (!c) notFound('Periode')
    expectVersion(c!.version, version)
    // published texts and contact can change any time; rules only while still being prepared
    const rules = editable(c!.status)
      ? { openAt: input.openAt, closeAt: input.closeAt, selectionEnabled: input.selectionEnabled, offerDays: input.offerDays, reenrollDays: input.reenrollDays, requireNik: input.requireNik }
      : {}
    await tx.update(admissionCycles).set({ name: input.name, info: input.info, dataNotice: input.dataNotice, helpContact: input.helpContact, ...rules, version: c!.version + 1 }).where(eq(admissionCycles.id, id))
    fx.audit('admissions.cycle_update', 'admission_cycle', id)
  })
}

export async function saveForm(ctx: Ctx, id: string, fields: FormFieldDef[]) {
  manage(ctx)
  const keys = new Set<string>()
  for (const f of fields) {
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(f.key)) fail(`Kode pertanyaan "${f.key}" hanya huruf kecil/angka/garis bawah.`)
    if (keys.has(f.key)) fail(`Kode pertanyaan "${f.key}" ganda.`)
    keys.add(f.key)
    if (!f.label.trim()) fail('Setiap pertanyaan perlu label.')
    if (f.type === 'select' && !f.options?.length) fail(`Pertanyaan "${f.label}" perlu pilihan.`)
  }
  await command(ctx, 'admissions.form', {}, async (tx, fx) => {
    const c = await loadCycle(tx, id)
    if (!c) notFound('Periode')
    if (!editable(c!.status)) fail('Formulir tidak dapat diubah setelah periode disetujui. Buat periode/versi baru.')
    await tx.update(admissionCycles).set({ formFields: fields, formVersion: c!.formVersion + 1, version: c!.version + 1 }).where(eq(admissionCycles.id, id))
    fx.audit('admissions.form', 'admission_cycle', id, { version: c!.formVersion + 1 })
  })
}

export async function saveWave(ctx: Ctx, cycleId: string, input: { id?: string | null; name: string; openAt: Date; closeAt: Date }) {
  manage(ctx)
  if (input.closeAt <= input.openAt) fail('Waktu tutup gelombang harus setelah waktu buka.')
  await command(ctx, 'admissions.wave', {}, async (tx, fx) => {
    const c = await loadCycle(tx, cycleId)
    if (!c) notFound('Periode')
    if (c!.status === 'archived') fail('Periode sudah diarsipkan.')
    if (input.id) await tx.update(admissionWaves).set({ name: input.name, openAt: input.openAt, closeAt: input.closeAt }).where(and(eq(admissionWaves.id, input.id), eq(admissionWaves.cycleId, cycleId)))
    else await tx.insert(admissionWaves).values({ cycleId, name: input.name, openAt: input.openAt, closeAt: input.closeAt })
    fx.audit(c!.status === 'open' ? 'admissions.wave_changed_while_open' : 'admissions.wave', 'admission_cycle', cycleId)
  })
}

export async function savePath(
  ctx: Ctx,
  cycleId: string,
  input: { id?: string | null; name: string; description: string | null; quota: number; registrationFee: number; reenrollFee: number; documents: DocumentReq[]; components: SelectionComponent[]; checklist: ChecklistItemDef[]; active: boolean },
) {
  manage(ctx)
  if (!input.name.trim()) fail('Isi nama jalur.')
  if (!(input.quota >= 0)) fail('Kuota tidak valid.')
  if (input.components.some((c) => !(c.max > 0) || !(c.weight >= 0))) fail('Nilai maksimum harus > 0 dan bobot ≥ 0.')
  await command(ctx, 'admissions.path', {}, async (tx, fx) => {
    const c = await loadCycle(tx, cycleId)
    if (!c) notFound('Periode')
    const values = { name: input.name.trim(), description: input.description, quota: input.quota, registrationFee: input.registrationFee, reenrollFee: input.reenrollFee, documents: input.documents, components: input.components, checklist: input.checklist, active: input.active }
    if (!editable(c!.status)) {
      // after approval only the quota and description may change (audited); requirements stay as published
      if (!input.id) fail('Jalur baru hanya dapat ditambahkan sebelum periode disetujui.')
      await tx.update(admissionPaths).set({ quota: input.quota, description: input.description }).where(and(eq(admissionPaths.id, input.id!), eq(admissionPaths.cycleId, cycleId)))
      fx.audit('admissions.path_quota', 'admission_cycle', cycleId, { path: input.id!, quota: input.quota })
      return
    }
    if (input.id) await tx.update(admissionPaths).set(values).where(and(eq(admissionPaths.id, input.id), eq(admissionPaths.cycleId, cycleId)))
    else await tx.insert(admissionPaths).values({ ...values, cycleId })
    fx.audit('admissions.path', 'admission_cycle', cycleId)
  })
}

const TRANSITIONS: Record<string, { to: string[]; perm: 'admissions.manage' | 'admissions.approve' }> = {
  ready_for_review: { to: ['draft'], perm: 'admissions.manage' },
  draft: { to: ['ready_for_review'], perm: 'admissions.manage' },
  approved: { to: ['ready_for_review'], perm: 'admissions.approve' },
  open: { to: ['approved', 'closed'], perm: 'admissions.approve' },
  closed: { to: ['open'], perm: 'admissions.manage' },
  archived: { to: ['closed'], perm: 'admissions.manage' },
}

/** Moves a cycle to `to` (with reason when opening/closing/reopening). */
export async function setCycleStatus(ctx: Ctx, id: string, to: string, reason: string | null) {
  const rule = TRANSITIONS[to]
  if (!rule) fail('Status tidak dikenal.')
  const s = requireStaff(ctx, rule!.perm)
  await command(ctx, 'admissions.cycle_status', {}, async (tx, fx) => {
    const c = await loadCycle(tx, id)
    if (!c) notFound('Periode')
    if (!rule!.to.includes(c!.status)) fail(`Periode berstatus "${c!.status}" tidak dapat diubah ke "${to}".`)
    const paths = await tx.select().from(admissionPaths).where(and(eq(admissionPaths.cycleId, id), eq(admissionPaths.active, true)))
    if (to === 'ready_for_review' || to === 'approved' || to === 'open') {
      if (!c!.openAt || !c!.closeAt) fail('Isi waktu buka dan tutup pendaftaran.')
      if (!paths.length) fail('Periode belum punya jalur aktif.')
      if (paths.some((p) => !p.documents.length)) fail('Setiap jalur perlu daftar berkas.')
      if (c!.selectionEnabled && paths.some((p) => !p.components.length)) fail('Seleksi aktif: setiap jalur perlu komponen penilaian.')
    }
    if (to === 'approved' && c!.createdBy === s.id) fail('Periode harus disetujui oleh orang lain selain pembuatnya.')
    const needsReason = to === 'closed' || (to === 'open' && c!.status === 'closed') || (to === 'ready_for_review' && c!.status === 'approved')
    if (needsReason && (!reason || reason.trim().length < 5)) fail('Tuliskan alasan perubahan status (minimal 5 karakter).')
    if (to === 'open') {
      const [other] = await tx.select({ n: count() }).from(admissionCycles).where(and(eq(admissionCycles.status, 'open'), ne(admissionCycles.id, id), eq(admissionCycles.targetYear, c!.targetYear), eq(admissionCycles.targetGrade, c!.targetGrade)))
      // one official registration channel per intake (§19.1, addendum C)
      if (other!.n) fail('Sudah ada periode terbuka untuk tahun & tingkat yang sama.')
    }
    await tx
      .update(admissionCycles)
      .set({ status: to, ...(to === 'approved' ? { approvedBy: s.id, approvedAt: ctx.now } : {}), version: c!.version + 1 })
      .where(eq(admissionCycles.id, id))
    fx.audit('admissions.cycle_status', 'admission_cycle', id, { from: c!.status, to, reason: reason?.slice(0, 200) ?? null })
    if (to === 'open' || to === 'closed') fx.event(to === 'open' ? 'admission.cycle_opened' : 'admission.cycle_closed', { cycleId: id })
  })
}

/** Whether new applications may be submitted now (cycle open, inside its window and the wave's, if any). */
export function acceptsApplications(c: typeof admissionCycles.$inferSelect, waves: (typeof admissionWaves.$inferSelect)[], now: Date) {
  if (c.status !== 'open') return { ok: false as const, why: 'Pendaftaran belum/tidak dibuka.' }
  if (c.openAt && now < c.openAt) return { ok: false as const, why: 'Pendaftaran belum dibuka.' }
  if (c.closeAt && now > c.closeAt) return { ok: false as const, why: 'Pendaftaran sudah ditutup.' }
  if (waves.length) {
    const w = waves.find((x) => now >= x.openAt && now <= x.closeAt)
    if (!w) return { ok: false as const, why: 'Tidak ada gelombang yang sedang dibuka.' }
    return { ok: true as const, wave: w }
  }
  return { ok: true as const, wave: null }
}

export async function cyclesOverview(ctx: Ctx) {
  const cycles = await ctx.db.select().from(admissionCycles).orderBy(asc(admissionCycles.createdAt))
  const ids = cycles.map((c) => c.id)
  const counts = ids.length
    ? await ctx.db.select({ cycleId: applications.cycleId, status: applications.status, n: count() }).from(applications).where(inArray(applications.cycleId, ids)).groupBy(applications.cycleId, applications.status)
    : []
  return cycles.map((c) => ({ ...c, counts: Object.fromEntries(counts.filter((x) => x.cycleId === c.id).map((x) => [x.status, x.n])) as Record<string, number> }))
}

export async function cycleDetail(db: Db, id: string) {
  const c = await loadCycle(db, id)
  if (!c) return null
  const waves = await db.select().from(admissionWaves).where(eq(admissionWaves.cycleId, id)).orderBy(asc(admissionWaves.openAt))
  const paths = await db.select().from(admissionPaths).where(eq(admissionPaths.cycleId, id)).orderBy(asc(admissionPaths.ordinal), asc(admissionPaths.name))
  return { cycle: c, waves, paths }
}

/** Public summary for the website and the public admissions page (no applicant data). */
export async function publicSummary(db: Db, now: Date) {
  const cycles = await db.select().from(admissionCycles).where(inArray(admissionCycles.status, ['approved', 'open', 'closed']))
  const out = []
  for (const c of cycles) {
    const d = (await cycleDetail(db, c.id))!
    const acc = acceptsApplications(c, d.waves, now)
    out.push({
      id: c.id,
      name: c.name,
      targetYear: c.targetYear,
      targetGrade: c.targetGrade,
      status: acc.ok ? 'open' : c.status === 'closed' || (c.closeAt && now > c.closeAt) ? 'closed' : 'upcoming',
      openAt: c.openAt,
      closeAt: c.closeAt,
      info: c.info,
      helpContact: c.helpContact,
      waves: d.waves.map((w) => ({ name: w.name, openAt: w.openAt, closeAt: w.closeAt })),
      paths: d.paths.filter((p) => p.active).map((p) => ({ name: p.name, description: p.description, registrationFee: p.registrationFee, documents: p.documents.map((x) => ({ label: x.label, required: x.required })) })),
    })
  }
  return out
}
