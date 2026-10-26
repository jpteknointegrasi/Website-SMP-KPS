/**
 * REG-04 Excel/CSV import: upload → column mapping → validated preview → confirmed commit. Nothing is written to the
 * Buku Induk before the confirmation, and only rows that passed validation are imported.
 */
import ExcelJS from 'exceljs'
import { and, eq, inArray } from 'drizzle-orm'
import { guardianLinks, guardians, homerooms, importBatches, persons, students } from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command } from '@/server/command'
import { fail, notFound } from '@/server/errors'
import { fileAccess, saveFile } from '@/server/files'
import { today } from '@/server/time'
import { activeYear } from '../scope'
import { checkField, FIELD, STUDENT_FIELDS } from './fields'
import { placeInHomeroom } from './service'

/** Target fields of the import (Buku Induk fields + homeroom + parents). */
export const IMPORT_TARGETS: { key: string; label: string; synonyms: string[] }[] = [
  ...STUDENT_FIELDS.map((f) => ({ key: f.key, label: f.label, synonyms: [f.label] })),
  { key: 'homeroom', label: 'Rombel (tahun aktif)', synonyms: ['rombel', 'kelas', 'rombongan belajar'] },
  { key: 'fatherName', label: 'Nama ayah', synonyms: ['nama ayah', 'ayah'] },
  { key: 'motherName', label: 'Nama ibu', synonyms: ['nama ibu', 'ibu', 'nama ibu kandung'] },
  { key: 'guardianName', label: 'Nama wali', synonyms: ['nama wali', 'wali'] },
  { key: 'parentPhone', label: 'Nomor HP orang tua/wali', synonyms: ['hp orang tua', 'no hp orang tua', 'telepon orang tua', 'hp ortu', 'no. hp orang tua'] },
]
const EXTRA_SYNONYMS: Record<string, string[]> = {
  fullName: ['nama', 'nama siswa', 'nama lengkap', 'nama peserta didik'],
  gender: ['jk', 'l/p', 'jenis kelamin'],
  birthPlace: ['tempat lahir'],
  birthDate: ['tanggal lahir', 'tgl lahir'],
  religion: ['agama'],
  address: ['alamat', 'alamat domisili', 'alamat rumah'],
  nis: ['nis', 'nipd'],
  nisn: ['nisn'],
  entryYear: ['angkatan', 'tahun masuk'],
  originSchool: ['sekolah asal', 'asal sekolah'],
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9/]+/g, ' ').trim()

fileAccess('import', async (ctx) => hasPerm(ctx, 'students.import'))

async function parse(up: { name: string; buffer: Buffer }) {
  const rows: string[][] = []
  if (/\.csv$/i.test(up.name)) {
    const text = up.buffer.toString('utf8').replace(/^﻿/, '')
    const sep = (text.split('\n')[0]!.match(/;/g)?.length ?? 0) > (text.split('\n')[0]!.match(/,/g)?.length ?? 0) ? ';' : ','
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue
      const cells: string[] = []
      let cur = ''
      let q = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!
        if (q) {
          if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++
          else if (ch === '"') q = false
          else cur += ch
        } else if (ch === '"') q = true
        else if (ch === sep) cells.push(cur), (cur = '')
        else cur += ch
      }
      cells.push(cur)
      rows.push(cells.map((c) => c.trim()))
    }
  } else {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(up.buffer as never)
    const ws = wb.worksheets[0]
    if (!ws) fail('Berkas Excel tidak berisi lembar kerja.')
    ws!.eachRow({ includeEmpty: false }, (row) => {
      const vals: string[] = []
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const v = cell.value
        let s = ''
        if (v instanceof Date) s = v.toISOString().slice(0, 10)
        else if (v && typeof v === 'object' && 'text' in v) s = String((v as { text: unknown }).text)
        else if (v && typeof v === 'object' && 'result' in v) s = String((v as { result: unknown }).result ?? '')
        else if (v !== null && v !== undefined) s = String(v)
        vals[col - 1] = s.trim()
      })
      rows.push(Array.from({ length: vals.length }, (_, i) => vals[i] ?? ''))
    })
  }
  if (rows.length < 2) fail('Berkas harus berisi baris judul kolom dan minimal satu baris data.')
  if (rows.length > 2001) fail('Maksimal 2.000 baris per impor. Bagi berkas menjadi beberapa bagian.')
  const headers = rows[0]!.map((h, i) => h || `Kolom ${i + 1}`)
  const data = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
  return { headers, data }
}

export async function startImport(ctx: Ctx, up: { name: string; buffer: Buffer }) {
  const s = requireStaff(ctx, 'students.import')
  const { headers, data } = await parse(up)
  // automatic first guess of the mapping by header names
  const mapping: Record<string, string> = {}
  for (const h of headers) {
    const n = norm(h)
    const t = IMPORT_TARGETS.find((t) => [...t.synonyms, ...(EXTRA_SYNONYMS[t.key] ?? [])].some((syn) => norm(syn) === n))
    if (t && !Object.values(mapping).includes(t.key)) mapping[h] = t.key
  }
  return command(ctx, 'import.start', {}, async (tx, fx) => {
    const id = crypto.randomUUID()
    const f = await saveFile(ctx, tx, up, { allow: ['xlsx', 'csv'], maxMb: 5, classification: 'restricted', contextType: 'import', contextId: id, label: 'Berkas impor' })
    await tx.insert(importBatches).values({ id, fileId: f.id, headers, rows: data, mapping, createdBy: s.id })
    fx.audit('import.start', 'import', id, { rows: data.length })
    return id
  })
}

/** Applies the mapping and validates every row (no writes to students). */
export async function validateImport(ctx: Ctx, id: string, mapping: Record<string, string>) {
  requireStaff(ctx, 'students.import')
  const [b] = await ctx.db.select().from(importBatches).where(eq(importBatches.id, id))
  if (!b || b.status === 'committed' || b.status === 'cancelled') notFound('Impor')
  const used = Object.values(mapping).filter(Boolean)
  if (new Set(used).size !== used.length) fail('Satu kolom sistem hanya boleh dipetakan dari satu kolom berkas.')
  if (!used.includes('fullName')) fail('Kolom "Nama lengkap" wajib dipetakan.')
  const year = await activeYear(ctx.db)
  const hr = year ? await ctx.db.select().from(homerooms).where(eq(homerooms.yearId, year.id)) : []
  const rows = b!.rows ?? []
  const val = (r: Record<string, string>, key: string) => {
    const h = Object.entries(mapping).find(([, k]) => k === key)?.[0]
    return h ? (r[h] ?? '') : ''
  }
  const nisList = rows.map((r) => val(r, 'nis')).filter(Boolean)
  const nisnList = rows.map((r) => val(r, 'nisn')).filter(Boolean)
  const existingNis = new Set(nisList.length ? (await ctx.db.select({ v: students.nis }).from(students).where(inArray(students.nis, nisList))).map((x) => x.v) : [])
  const existingNisn = new Set(nisnList.length ? (await ctx.db.select({ v: students.nisn }).from(students).where(inArray(students.nisn, nisnList.map((v) => v.replace(/\s/g, ''))))).map((x) => x.v) : [])
  const seen = new Map<string, number>()
  const results = rows.map((r, i) => {
    const messages: string[] = []
    let status: 'valid' | 'review' | 'error' = 'valid'
    for (const f of STUDENT_FIELDS) {
      if (!used.includes(f.key)) continue
      const c = checkField(f, val(r, f.key))
      if (c.error) (messages.push(c.error), (status = 'error'))
    }
    if (!val(r, 'fullName')) (messages.push('Nama lengkap kosong.'), (status = 'error'))
    const nis = val(r, 'nis')
    if (nis) {
      if (existingNis.has(nis)) (messages.push(`NIS ${nis} sudah ada di Buku Induk.`), status !== 'error' && (status = 'review'))
      if (seen.has(`nis:${nis}`)) (messages.push(`NIS ganda dengan baris ${seen.get(`nis:${nis}`)! + 1}.`), (status = 'error'))
      seen.set(`nis:${nis}`, i)
    }
    const nisn = val(r, 'nisn').replace(/\s/g, '')
    if (nisn && existingNisn.has(nisn)) (messages.push(`NISN ${nisn} sudah ada di Buku Induk.`), status !== 'error' && (status = 'review'))
    const h = val(r, 'homeroom')
    if (h && !hr.some((x) => norm(x.name) === norm(h))) (messages.push(`Rombel "${h}" tidak dikenal di tahun ajaran aktif.`), status !== 'error' && (status = 'review'))
    return { row: i, status, messages }
  })
  const summary = { valid: results.filter((r) => r.status === 'valid').length, review: results.filter((r) => r.status === 'review').length, error: results.filter((r) => r.status === 'error').length }
  await command(ctx, 'import.validate', {}, async (tx, fx) => {
    await tx.update(importBatches).set({ mapping, results, summary, status: 'validated' }).where(eq(importBatches.id, id))
    fx.audit('import.validate', 'import', id, summary)
  })
  return summary
}

/** Imports the valid rows. Rows needing review or with errors are not imported (fix the file or enter manually). */
export async function commitImport(ctx: Ctx, id: string, key?: string | null) {
  const s = requireStaff(ctx, 'students.import')
  return command(ctx, 'import.commit', { key, input: id }, async (tx, fx) => {
    const [b] = await tx.select().from(importBatches).where(eq(importBatches.id, id)).for('update')
    if (!b) notFound('Impor')
    if (b!.status !== 'validated') fail(b!.status === 'committed' ? 'Impor ini sudah dikonfirmasi.' : 'Validasi data terlebih dahulu.')
    const mapping = b!.mapping ?? {}
    const val = (r: Record<string, string>, key: string) => {
      const h = Object.entries(mapping).find(([, k]) => k === key)?.[0]
      return h ? (r[h] ?? '') : ''
    }
    const year = await activeYear(tx)
    const hr = year ? await tx.select().from(homerooms).where(eq(homerooms.yearId, year.id)) : []
    const d = today(ctx.tz, ctx.now)
    let created = 0
    for (const res of b!.results ?? []) {
      if (res.status !== 'valid') continue
      const r = b!.rows![res.row]!
      const person: Record<string, unknown> = {}
      const student: Record<string, unknown> = {}
      for (const f of STUDENT_FIELDS) {
        if (!Object.values(mapping).includes(f.key)) continue
        const c = checkField(FIELD[f.key]!, val(r, f.key))
        ;(f.target === 'person' ? person : student)[f.key] = c.value
      }
      // re-check uniqueness inside the transaction (data may have changed since validation)
      if (student.nis && (await tx.select({ id: students.id }).from(students).where(eq(students.nis, String(student.nis)))).length) continue
      if (student.nisn && (await tx.select({ id: students.id }).from(students).where(eq(students.nisn, String(student.nisn)))).length) continue
      const [p] = await tx.insert(persons).values(person as typeof persons.$inferInsert).returning({ id: persons.id })
      const [st] = await tx.insert(students).values({ ...(student as object), personId: p!.id, entryVia: 'import', updatedBy: s.id } as typeof students.$inferInsert).returning({ id: students.id })
      const h = hr.find((x) => norm(x.name) === norm(val(r, 'homeroom')))
      if (h) await placeInHomeroom(ctx, tx, st!.id, h.id, d)
      const phone = val(r, 'parentPhone') || null
      for (const [key, relation] of [['fatherName', 'ayah'], ['motherName', 'ibu'], ['guardianName', 'wali']] as const) {
        const name = val(r, key)
        if (!name) continue
        const [gp] = await tx.insert(persons).values({ fullName: name, phone }).returning({ id: persons.id })
        const [g] = await tx.insert(guardians).values({ personId: gp!.id }).returning({ id: guardians.id })
        await tx.insert(guardianLinks).values({ guardianId: g!.id, studentId: st!.id, relation, status: 'active', verificationMethod: 'officer', verifiedBy: s.id, verifiedAt: ctx.now, validFrom: d, isPrimary: relation === 'ibu' })
      }
      created++
    }
    await tx.update(importBatches).set({ status: 'committed', committedAt: ctx.now, summary: { ...(b!.summary ?? {}), created } }).where(eq(importBatches.id, id))
    fx.audit('import.commit', 'import', id, { created })
    return { created }
  })
}

export async function cancelImport(ctx: Ctx, id: string) {
  requireStaff(ctx, 'students.import')
  await command(ctx, 'import.cancel', {}, async (tx, fx) => {
    await tx.update(importBatches).set({ status: 'cancelled', rows: [] }).where(and(eq(importBatches.id, id), inArray(importBatches.status, ['uploaded', 'validated'])))
    fx.audit('import.cancel', 'import', id)
  })
}
