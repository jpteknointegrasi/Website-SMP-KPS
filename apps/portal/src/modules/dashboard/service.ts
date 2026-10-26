/**
 * M20 dashboard pimpinan & ekspor (§45): aggregated indicators only (counts, rates, sums) — never lists of students
 * or restricted content. Exports are purpose-bound: the user states a purpose, the file is generated on request, and
 * the export (purpose, type, row count) is audited (§47.4).
 */
import { and, count, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import {
  applications as admissionApplications,
  admissionCycles,
  announcementReceipts,
  announcements,
  classPlacements,
  counselingCases,
  dailyAttendance,
  enrollments,
  gradeLevels,
  homerooms,
  invoices,
  persons,
  reportCards,
  serviceRequests,
  students,
  subjectResults,
  subjects,
  teachingAssignments,
  tasks,
  submissions,
} from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command } from '@/server/command'
import { fail } from '@/server/errors'
import { addDays, isDate, today } from '@/server/time'
import { activeYear, currentTerm } from '../scope'

export async function overview(ctx: Ctx) {
  requireStaff(ctx, 'dashboard.view')
  const d = today(ctx.tz, ctx.now)
  const from = addDays(d, -30)
  const year = await activeYear(ctx.db)
  const term = await currentTerm(ctx)
  const [act] = await ctx.db.select({ n: count() }).from(students).where(eq(students.status, 'active'))
  const byGrade = year
    ? await ctx.db
        .select({ grade: gradeLevels.name, n: count(), l: sql<number>`count(*) FILTER (WHERE ${persons.gender} = 'L')`.mapWith(Number), p: sql<number>`count(*) FILTER (WHERE ${persons.gender} = 'P')`.mapWith(Number) })
        .from(enrollments)
        .innerJoin(gradeLevels, eq(gradeLevels.id, enrollments.gradeLevelId))
        .innerJoin(students, eq(students.id, enrollments.studentId))
        .innerJoin(persons, eq(persons.id, students.personId))
        .where(and(eq(enrollments.yearId, year.id), eq(enrollments.status, 'active')))
        .groupBy(gradeLevels.name, gradeLevels.ordinal)
        .orderBy(gradeLevels.ordinal)
    : []
  const att = await ctx.db
    .select({ homeroom: homerooms.name, total: count(), present: sql<number>`count(*) FILTER (WHERE ${dailyAttendance.status} IN ('H','D'))`.mapWith(Number), absent: sql<number>`count(*) FILTER (WHERE ${dailyAttendance.status} = 'A')`.mapWith(Number) })
    .from(dailyAttendance)
    .innerJoin(homerooms, eq(homerooms.id, dailyAttendance.homeroomId))
    .where(and(gte(dailyAttendance.date, from), lte(dailyAttendance.date, d)))
    .groupBy(homerooms.name)
    .orderBy(homerooms.name)
  const attTotal = att.reduce((a, r) => ({ total: a.total + r.total, present: a.present + r.present }), { total: 0, present: 0 })
  const [tk] = await ctx.db.select({ n: count() }).from(tasks).where(and(inArray(tasks.status, ['published', 'closed']), gte(tasks.publishedAt, new Date(ctx.now.getTime() - 30 * 86400_000))))
  const [sb] = await ctx.db.select({ n: sql<number>`count(DISTINCT (${submissions.taskId}, ${submissions.studentId}))`.mapWith(Number) }).from(submissions).where(gte(submissions.submittedAt, new Date(ctx.now.getTime() - 30 * 86400_000)))
  const reports = term ? await ctx.db.select({ status: reportCards.status, n: count() }).from(reportCards).where(eq(reportCards.termId, term.id)).groupBy(reportCards.status) : []
  const ppdb = await ctx.db
    .select({ status: admissionApplications.status, n: count() })
    .from(admissionApplications)
    .innerJoin(admissionCycles, eq(admissionCycles.id, admissionApplications.cycleId))
    .where(inArray(admissionCycles.status, ['open', 'closed']))
    .groupBy(admissionApplications.status)
  const [svcOpen] = await ctx.db.select({ n: count(), late: sql<number>`count(*) FILTER (WHERE ${serviceRequests.dueAt} < now())`.mapWith(Number) }).from(serviceRequests).where(inArray(serviceRequests.status, ['submitted', 'in_progress', 'needs_info']))
  const [fin] = await ctx.db.select({ outstanding: sql<number>`coalesce(sum(${invoices.amount} - ${invoices.paid}) FILTER (WHERE ${invoices.status} IN ('unpaid','partial')), 0)`.mapWith(Number), paid: sql<number>`coalesce(sum(${invoices.paid}), 0)`.mapWith(Number) }).from(invoices)
  const [bk] = await ctx.db.select({ open: sql<number>`count(*) FILTER (WHERE ${counselingCases.status} <> 'closed')`.mapWith(Number), month: sql<number>`count(*) FILTER (WHERE ${counselingCases.createdAt} >= now() - interval '30 days')`.mapWith(Number) }).from(counselingCases)
  const ann = await ctx.db
    .select({ title: announcements.title, total: count(), read: sql<number>`count(${announcementReceipts.readAt})`.mapWith(Number) })
    .from(announcements)
    .innerJoin(announcementReceipts, eq(announcementReceipts.announcementId, announcements.id))
    .where(eq(announcements.status, 'published'))
    .groupBy(announcements.id, announcements.title, announcements.publishedAt)
    .orderBy(sql`${announcements.publishedAt} DESC`)
    .limit(5)
  return {
    students: act!.n,
    byGrade,
    attendance: { rate: attTotal.total ? Math.round((attTotal.present / attTotal.total) * 1000) / 10 : null, byHomeroom: att, from, to: d },
    learning: { tasks: tk!.n, submissions: sb!.n },
    reports,
    ppdb,
    services: svcOpen!,
    finance: fin!,
    counseling: bk!,
    announcements: ann,
    term,
  }
}

// ---------- exports ----------
export const EXPORTS = { siswa: 'Data siswa aktif (Buku Induk ringkas)', presensi: 'Rekap presensi per siswa', nilai: 'Nilai rapor per mapel (semester berjalan)' } as const
export type ExportKind = keyof typeof EXPORTS

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  // neutralise spreadsheet formulas (CSV injection)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\r\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'

export async function exportCsv(ctx: Ctx, kind: string, purpose: string, range: { from?: string; to?: string } = {}) {
  requireStaff(ctx, 'exports')
  if (!(kind in EXPORTS)) fail('Jenis ekspor tidak dikenal.')
  if (purpose.trim().length < 10) fail('Tuliskan tujuan penggunaan data (min. 10 karakter).')
  const d = today(ctx.tz, ctx.now)
  if ((range.from && !isDate(range.from)) || (range.to && !isDate(range.to))) fail('Rentang tanggal tidak valid.')
  let rows: unknown[][] = []
  if (kind === 'siswa') {
    const data = await ctx.db
      .select({ nis: students.nis, nisn: students.nisn, name: persons.fullName, gender: persons.gender, homeroom: homerooms.name, status: students.status })
      .from(students)
      .innerJoin(persons, eq(persons.id, students.personId))
      .leftJoin(enrollments, and(eq(enrollments.studentId, students.id), eq(enrollments.status, 'active')))
      .leftJoin(classPlacements, and(eq(classPlacements.enrollmentId, enrollments.id), sql`${classPlacements.validTo} IS NULL`))
      .leftJoin(homerooms, eq(homerooms.id, classPlacements.homeroomId))
      .where(eq(students.status, 'active'))
      .orderBy(homerooms.name, persons.fullName)
    rows = [['NIS', 'NISN', 'Nama', 'L/P', 'Rombel', 'Status'], ...data.map((r) => [r.nis, r.nisn, r.name, r.gender, r.homeroom, r.status])]
  } else if (kind === 'presensi') {
    const from = range.from ?? `${d.slice(0, 7)}-01`
    const to = range.to ?? d
    const data = await ctx.db
      .select({
        nis: students.nis,
        name: persons.fullName,
        homeroom: homerooms.name,
        H: sql<number>`count(*) FILTER (WHERE ${dailyAttendance.status} = 'H')`.mapWith(Number),
        S: sql<number>`count(*) FILTER (WHERE ${dailyAttendance.status} = 'S')`.mapWith(Number),
        I: sql<number>`count(*) FILTER (WHERE ${dailyAttendance.status} = 'I')`.mapWith(Number),
        A: sql<number>`count(*) FILTER (WHERE ${dailyAttendance.status} = 'A')`.mapWith(Number),
        D: sql<number>`count(*) FILTER (WHERE ${dailyAttendance.status} = 'D')`.mapWith(Number),
      })
      .from(dailyAttendance)
      .innerJoin(students, eq(students.id, dailyAttendance.studentId))
      .innerJoin(persons, eq(persons.id, students.personId))
      .innerJoin(homerooms, eq(homerooms.id, dailyAttendance.homeroomId))
      .where(and(gte(dailyAttendance.date, from), lte(dailyAttendance.date, to)))
      .groupBy(students.nis, persons.fullName, homerooms.name)
      .orderBy(homerooms.name, persons.fullName)
    rows = [[`Rekap presensi ${from} s.d. ${to}`], ['NIS', 'Nama', 'Rombel', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Dispensasi'], ...data.map((r) => [r.nis, r.name, r.homeroom, r.H, r.S, r.I, r.A, r.D])]
  } else {
    const term = await currentTerm(ctx)
    if (!term) fail('Belum ada semester aktif.')
    const data = await ctx.db
      .select({ nis: students.nis, name: persons.fullName, homeroom: homerooms.name, subject: subjects.name, score: subjectResults.finalScore })
      .from(subjectResults)
      .innerJoin(teachingAssignments, eq(teachingAssignments.id, subjectResults.assignmentId))
      .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
      .innerJoin(homerooms, eq(homerooms.id, teachingAssignments.homeroomId))
      .innerJoin(students, eq(students.id, subjectResults.studentId))
      .innerJoin(persons, eq(persons.id, students.personId))
      .where(eq(teachingAssignments.termId, term!.id))
      .orderBy(homerooms.name, persons.fullName, subjects.ordinal)
    rows = [['NIS', 'Nama', 'Rombel', 'Mata pelajaran', 'Nilai rapor'], ...data.map((r) => [r.nis, r.name, r.homeroom, r.subject, r.score === null ? '' : Math.round(Number(r.score))])]
  }
  await command(ctx, 'exports.download', {}, async (_tx, fx) => {
    fx.audit('exports.download', 'export', kind, { purpose: purpose.trim().slice(0, 200), rows: Math.max(0, rows.length - 1) })
  })
  return { filename: `${kind}-${ctx.school.slug}-${d}.csv`, body: toCsv(rows) }
}
