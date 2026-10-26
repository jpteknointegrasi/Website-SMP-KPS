/**
 * M04 timetable & calendar (ACA-01, §42.1): time slots, versioned timetables per term (draft → published →
 * superseded) with teacher/room conflict guard, date exceptions (holiday, cancellation, substitute), academic
 * calendar events (optionally public for the website), lesson sessions and teaching journals.
 */
import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm'
import {
  academicEvents,
  gradeLevels,
  homerooms,
  lessonSessions,
  scheduleExceptions,
  staffMembers,
  subjects,
  teachingAssignments,
  terms,
  timeSlots,
  timetableEntries,
  timetableVersions,
} from '@/db/schema'
import { hasPerm, requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, forbidden, notFound } from '@/server/errors'
import { isDate, weekday } from '@/server/time'

export const DAY_NAMES = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const manage = (ctx: Ctx) => requireStaff(ctx, 'academic.manage')

export async function saveSlots(ctx: Ctx, rows: { ordinal: number; label: string; startTime: string; endTime: string; kind: string }[]) {
  manage(ctx)
  for (const r of rows) {
    if (!/^\d{2}:\d{2}$/.test(r.startTime) || !/^\d{2}:\d{2}$/.test(r.endTime) || r.endTime <= r.startTime) fail(`Jam "${r.label}": format HH:MM dan selesai setelah mulai.`)
    if (!['lesson', 'break'].includes(r.kind)) fail('Jenis jam: pelajaran atau istirahat.')
  }
  const sorted = [...rows].sort((a, b) => a.startTime.localeCompare(b.startTime))
  for (let i = 1; i < sorted.length; i++) if (sorted[i]!.startTime < sorted[i - 1]!.endTime) fail(`Jam "${sorted[i]!.label}" tumpang tindih dengan "${sorted[i - 1]!.label}".`)
  await command(ctx, 'schedule.slots', {}, async (tx, fx) => {
    const existing = await tx.select().from(timeSlots)
    for (const r of rows) {
      const hit = existing.find((e) => e.ordinal === r.ordinal)
      if (hit) await tx.update(timeSlots).set(r).where(eq(timeSlots.id, hit.id))
      else await tx.insert(timeSlots).values(r)
    }
    // slots no longer listed are removed only when unused
    for (const e of existing.filter((e) => !rows.some((r) => r.ordinal === e.ordinal))) {
      const [used] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(timetableEntries).where(eq(timetableEntries.slotId, e.id))
      if (used!.n) fail(`Jam "${e.label}" masih dipakai di jadwal.`)
      await tx.delete(timeSlots).where(eq(timeSlots.id, e.id))
    }
    fx.audit('schedule.slots', 'schedule', null, { count: rows.length })
  })
}

export const slots = (db: Db) => db.select().from(timeSlots).orderBy(asc(timeSlots.ordinal))

/** New draft for a term, copied from the latest published (or latest) version. */
export async function newVersion(ctx: Ctx, termId: string, note: string | null) {
  const s = manage(ctx)
  return command(ctx, 'schedule.version_new', {}, async (tx, fx) => {
    const [draft] = await tx.select().from(timetableVersions).where(and(eq(timetableVersions.termId, termId), eq(timetableVersions.status, 'draft')))
    if (draft) fail('Masih ada draf jadwal untuk semester ini. Lanjutkan draf tersebut.')
    const [last] = await tx.select().from(timetableVersions).where(eq(timetableVersions.termId, termId)).orderBy(desc(timetableVersions.versionNo)).limit(1)
    const [v] = await tx.insert(timetableVersions).values({ termId, versionNo: (last?.versionNo ?? 0) + 1, note, createdBy: s.id }).returning({ id: timetableVersions.id })
    if (last) {
      const rows = await tx.select().from(timetableEntries).where(eq(timetableEntries.versionId, last.id))
      if (rows.length) await tx.insert(timetableEntries).values(rows.map(({ id: _id, versionId: _v, ...r }) => ({ ...r, versionId: v!.id })))
    }
    fx.audit('schedule.version_new', 'timetable', v!.id)
    return v!.id
  })
}

async function loadVersion(tx: Db, id: string) {
  const [v] = await tx.select().from(timetableVersions).where(eq(timetableVersions.id, id))
  if (!v) notFound('Versi jadwal')
  return v!
}

/** Sets or clears one cell of a draft. Conflicts are reported (and block publishing), not silently allowed. */
export async function setCell(ctx: Ctx, versionId: string, cell: { homeroomId: string; day: number; slotId: string; assignmentId: string | null; room: string | null }) {
  manage(ctx)
  if (!(cell.day >= 1 && cell.day <= 6)) fail('Hari tidak valid.')
  await command(ctx, 'schedule.cell', {}, async (tx, fx) => {
    const v = await loadVersion(tx, versionId)
    if (v.status !== 'draft') fail('Hanya draf jadwal yang dapat diubah. Buat versi baru.')
    await tx.delete(timetableEntries).where(and(eq(timetableEntries.versionId, versionId), eq(timetableEntries.homeroomId, cell.homeroomId), eq(timetableEntries.day, cell.day), eq(timetableEntries.slotId, cell.slotId)))
    if (cell.assignmentId) {
      const [a] = await tx.select().from(teachingAssignments).where(eq(teachingAssignments.id, cell.assignmentId))
      if (!a || a.homeroomId !== cell.homeroomId || a.termId !== v.termId || !a.active) fail('Penugasan mengajar tidak sesuai rombel/semester.')
      const [slot] = await tx.select().from(timeSlots).where(eq(timeSlots.id, cell.slotId))
      if (slot?.kind !== 'lesson') fail('Jam istirahat tidak dapat diisi pelajaran.')
      await tx.insert(timetableEntries).values({ versionId, ...cell, assignmentId: cell.assignmentId })
    }
    fx.audit('schedule.cell', 'timetable', versionId, { day: cell.day })
  })
}

/** Teacher or room booked twice at the same day/slot within a version. */
export async function conflicts(db: Db, versionId: string) {
  const rows = await db
    .select({ e: timetableEntries, teacherId: teachingAssignments.teacherId, teacher: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})`, homeroom: homerooms.name, slot: timeSlots.label })
    .from(timetableEntries)
    .innerJoin(teachingAssignments, eq(teachingAssignments.id, timetableEntries.assignmentId))
    .innerJoin(staffMembers, eq(staffMembers.id, teachingAssignments.teacherId))
    .innerJoin(homerooms, eq(homerooms.id, timetableEntries.homeroomId))
    .innerJoin(timeSlots, eq(timeSlots.id, timetableEntries.slotId))
    .where(eq(timetableEntries.versionId, versionId))
  const out: { kind: 'guru' | 'ruang'; day: number; slot: string; who: string; homerooms: string[]; entryIds: string[] }[] = []
  const group = (key: (r: (typeof rows)[number]) => string | null, kind: 'guru' | 'ruang', who: (r: (typeof rows)[number]) => string) => {
    const m = new Map<string, typeof rows>()
    for (const r of rows) {
      const k = key(r)
      if (!k) continue
      m.set(k, [...(m.get(k) ?? []), r])
    }
    for (const list of m.values()) if (list.length > 1) out.push({ kind, day: list[0]!.e.day, slot: list[0]!.slot, who: who(list[0]!), homerooms: list.map((x) => x.homeroom), entryIds: list.map((x) => x.e.id) })
  }
  group((r) => `${r.teacherId}|${r.e.day}|${r.e.slotId}`, 'guru', (r) => r.teacher)
  group((r) => (r.e.room ? `${r.e.room.toLowerCase()}|${r.e.day}|${r.e.slotId}` : null), 'ruang', (r) => r.e.room!)
  return out
}

export async function publishVersion(ctx: Ctx, versionId: string, effectiveFrom: string | null) {
  const s = manage(ctx)
  if (effectiveFrom && !isDate(effectiveFrom)) fail('Tanggal berlaku tidak valid.')
  await command(ctx, 'schedule.publish', {}, async (tx, fx) => {
    const v = await loadVersion(tx, versionId)
    if (v.status !== 'draft') fail('Versi ini bukan draf.')
    const c = await conflicts(tx, versionId)
    if (c.length) fail(`Jadwal belum dapat dipublikasikan: ${c.length} bentrok (${c.slice(0, 3).map((x) => `${x.kind} ${x.who} ${DAY_NAMES[x.day]} ${x.slot}`).join('; ')}).`)
    await tx.update(timetableVersions).set({ status: 'superseded' }).where(and(eq(timetableVersions.termId, v.termId), eq(timetableVersions.status, 'published')))
    await tx.update(timetableVersions).set({ status: 'published', publishedBy: s.id, publishedAt: ctx.now, effectiveFrom }).where(eq(timetableVersions.id, versionId))
    fx.audit('schedule.publish', 'timetable', versionId, { version: v.versionNo })
    fx.event('academic.schedule_published', { versionId })
  })
}

export async function addException(ctx: Ctx, e: { date: string; homeroomId: string | null; slotId: string | null; kind: string; substituteTeacherId: string | null; note: string | null }) {
  const s = manage(ctx)
  if (!isDate(e.date)) fail('Tanggal tidak valid.')
  if (!['libur', 'batal', 'pengganti'].includes(e.kind)) fail('Jenis tidak dikenal.')
  if (e.kind === 'pengganti' && (!e.substituteTeacherId || !e.homeroomId || !e.slotId)) fail('Guru pengganti perlu rombel, jam dan guru.')
  await command(ctx, 'schedule.exception', {}, async (tx, fx) => {
    const [x] = await tx.insert(scheduleExceptions).values({ ...e, createdBy: s.id }).returning({ id: scheduleExceptions.id })
    fx.audit('schedule.exception', 'schedule', x!.id, { kind: e.kind, date: e.date })
  })
}
export async function removeException(ctx: Ctx, id: string) {
  manage(ctx)
  await command(ctx, 'schedule.exception_remove', {}, async (tx, fx) => {
    await tx.delete(scheduleExceptions).where(eq(scheduleExceptions.id, id))
    fx.audit('schedule.exception_remove', 'schedule', id)
  })
}

export async function saveEvent(ctx: Ctx, e: { id?: string | null; title: string; kind: string; startDate: string; endDate: string; audience: string; isPublic: boolean; description: string | null }) {
  const s = manage(ctx)
  if (!e.title.trim()) fail('Isi judul kegiatan.')
  if (!isDate(e.startDate) || !isDate(e.endDate) || e.endDate < e.startDate) fail('Tanggal kegiatan tidak valid.')
  await command(ctx, 'calendar.event', {}, async (tx, fx) => {
    const values = { title: e.title.trim(), kind: e.kind, startDate: e.startDate, endDate: e.endDate, audience: e.audience, isPublic: e.isPublic, description: e.description }
    if (e.id) await tx.update(academicEvents).set(values).where(eq(academicEvents.id, e.id))
    else await tx.insert(academicEvents).values({ ...values, createdBy: s.id })
    fx.audit('calendar.event', 'calendar', e.id ?? null)
    if (e.isPublic) fx.event('academic.public_event_changed', { title: e.title })
  })
}
export async function removeEvent(ctx: Ctx, id: string) {
  manage(ctx)
  await command(ctx, 'calendar.event_remove', {}, async (tx, fx) => {
    await tx.delete(academicEvents).where(eq(academicEvents.id, id))
    fx.audit('calendar.event_remove', 'calendar', id)
  })
}

export async function eventsBetween(db: Db, from: string, to: string, audience: 'staff' | 'families' | 'public') {
  const rows = await db.select().from(academicEvents).where(and(lte(academicEvents.startDate, to), gte(academicEvents.endDate, from))).orderBy(asc(academicEvents.startDate))
  return rows.filter((e) => (audience === 'public' ? e.isPublic : audience === 'staff' ? true : e.audience !== 'staff'))
}

// ---------- reading the schedule ----------
async function termOn(db: Db, date: string) {
  const [t] = await db.select().from(terms).where(and(lte(terms.startDate, date), gte(terms.endDate, date))).limit(1)
  return t ?? null
}
async function publishedVersion(db: Db, termId: string) {
  const [v] = await db.select().from(timetableVersions).where(and(eq(timetableVersions.termId, termId), eq(timetableVersions.status, 'published'))).limit(1)
  return v ?? null
}

export type Lesson = {
  entryId: string
  slotId: string
  slot: string
  start: string
  end: string
  subject: string
  subjectCode: string
  teacher: string
  teacherId: string
  homeroom: string
  homeroomId: string
  room: string | null
  assignmentId: string
  cancelled: string | null
  substitute: string | null
  substituteId: string | null
}

/** Lessons on a date for homerooms and/or a teacher, with exceptions applied. */
export async function lessonsOn(db: Db, date: string, f: { homeroomId?: string; teacherId?: string }) {
  const day = weekday(date)
  if (day < 1 || day > 6) return { lessons: [] as Lesson[], holiday: null as string | null }
  const t = await termOn(db, date)
  if (!t) return { lessons: [], holiday: null }
  const v = await publishedVersion(db, t.id)
  if (!v || (v.effectiveFrom && v.effectiveFrom > date)) return { lessons: [], holiday: null }
  const exc = await db.select().from(scheduleExceptions).where(eq(scheduleExceptions.date, date))
  const schoolHoliday = exc.find((e) => !e.homeroomId && !e.slotId && e.kind === 'libur')
  if (schoolHoliday) return { lessons: [], holiday: schoolHoliday.note ?? 'Libur' }
  const rows = await db
    .select({
      e: timetableEntries,
      slot: timeSlots,
      subject: subjects.name,
      subjectCode: subjects.code,
      teacher: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})`,
      teacherId: teachingAssignments.teacherId,
      homeroom: homerooms.name,
    })
    .from(timetableEntries)
    .innerJoin(timeSlots, eq(timeSlots.id, timetableEntries.slotId))
    .innerJoin(teachingAssignments, eq(teachingAssignments.id, timetableEntries.assignmentId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(staffMembers, eq(staffMembers.id, teachingAssignments.teacherId))
    .innerJoin(homerooms, eq(homerooms.id, timetableEntries.homeroomId))
    .where(and(eq(timetableEntries.versionId, v.id), eq(timetableEntries.day, day), f.homeroomId ? eq(timetableEntries.homeroomId, f.homeroomId) : undefined))
    .orderBy(asc(timeSlots.startTime))
  const subIds = exc.map((e) => e.substituteTeacherId).filter((x): x is string => Boolean(x))
  const subs = subIds.length ? await db.select({ id: staffMembers.id, name: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` }).from(staffMembers).where(inArray(staffMembers.id, subIds)) : []
  const lessons: Lesson[] = []
  for (const r of rows) {
    const mine = exc.filter((e) => (!e.homeroomId || e.homeroomId === r.e.homeroomId) && (!e.slotId || e.slotId === r.e.slotId))
    const off = mine.find((e) => e.kind === 'libur' || e.kind === 'batal')
    const sub = mine.find((e) => e.kind === 'pengganti')
    const subName = sub ? (subs.find((x) => x.id === sub.substituteTeacherId)?.name ?? null) : null
    const l: Lesson = {
      entryId: r.e.id,
      slotId: r.slot.id,
      slot: r.slot.label,
      start: r.slot.startTime,
      end: r.slot.endTime,
      subject: r.subject,
      subjectCode: r.subjectCode,
      teacher: r.teacher,
      teacherId: r.teacherId,
      homeroom: r.homeroom,
      homeroomId: r.e.homeroomId,
      room: r.e.room,
      assignmentId: r.e.assignmentId,
      cancelled: off ? (off.note ?? (off.kind === 'libur' ? 'Libur' : 'Dibatalkan')) : null,
      substitute: subName,
      substituteId: sub?.substituteTeacherId ?? null,
    }
    if (f.teacherId && !(l.teacherId === f.teacherId || l.substituteId === f.teacherId)) continue
    lessons.push(l)
  }
  return { lessons, holiday: null }
}

/** Week grid of a version (or the published one) for a homeroom: day → slot → cell. */
export async function weekGrid(db: Db, versionId: string, homeroomId: string) {
  return db
    .select({ e: timetableEntries, subject: subjects.name, teacher: sql<string>`coalesce(${staffMembers.displayName}, ${staffMembers.name})` })
    .from(timetableEntries)
    .innerJoin(teachingAssignments, eq(teachingAssignments.id, timetableEntries.assignmentId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(staffMembers, eq(staffMembers.id, teachingAssignments.teacherId))
    .where(and(eq(timetableEntries.versionId, versionId), eq(timetableEntries.homeroomId, homeroomId)))
}

export async function versionsOf(db: Db, termId: string) {
  return db.select().from(timetableVersions).where(eq(timetableVersions.termId, termId)).orderBy(desc(timetableVersions.versionNo))
}
export { publishedVersion, termOn }

// ---------- lesson sessions & journal ----------
/** Opens (or returns) the lesson session of a timetable entry on a date. Teacher, substitute or curriculum staff. */
export async function openLesson(ctx: Ctx, entryId: string, date: string) {
  const s = requireStaff(ctx)
  if (!isDate(date)) fail('Tanggal tidak valid.')
  return command(ctx, 'lesson.open', {}, async (tx, fx) => {
    const [ex] = await tx.select().from(lessonSessions).where(and(eq(lessonSessions.entryId, entryId), eq(lessonSessions.date, date)))
    if (ex) {
      if (!(await canTeach(tx, ctx, ex.assignmentId, { date, homeroomId: ex.homeroomId, entryId: ex.entryId }))) forbidden('Anda tidak mengajar kelas ini.')
      return ex.id
    }
    const [e] = await tx.select().from(timetableEntries).where(eq(timetableEntries.id, entryId))
    if (!e) notFound('Jadwal')
    const { lessons } = await lessonsOn(tx, date, { homeroomId: e!.homeroomId })
    const l = lessons.find((x) => x.entryId === entryId)
    if (!l) fail('Pelajaran ini tidak dijadwalkan pada tanggal tersebut.')
    if (l!.cancelled) fail(`Pelajaran ditiadakan: ${l!.cancelled}.`)
    const isTeacher = l!.teacherId === s.id || l!.substituteId === s.id
    if (!isTeacher && !hasPerm(ctx, 'academic.manage')) forbidden('Anda tidak mengajar kelas ini.')
    const [row] = await tx
      .insert(lessonSessions)
      .values({ date, entryId, assignmentId: e!.assignmentId, homeroomId: e!.homeroomId, teacherId: l!.substituteId ?? l!.teacherId })
      .onConflictDoNothing()
      .returning({ id: lessonSessions.id })
    const id = row?.id ?? (await tx.select({ id: lessonSessions.id }).from(lessonSessions).where(and(eq(lessonSessions.entryId, entryId), eq(lessonSessions.date, date))))[0]!.id
    fx.audit('lesson.open', 'lesson', id)
    return id
  })
}

/**
 * The teacher of an active assignment, or — for one lesson — the substitute named for that date, homeroom and
 * period (a substitute for one period does not get the other lessons of the day). Curriculum staff always.
 */
export async function canTeach(db: Db, ctx: Ctx, assignmentId: string, lesson?: { date: string; homeroomId: string; entryId: string }) {
  if (!ctx.staff) return false
  if (hasPerm(ctx, 'academic.manage')) return true
  const [a] = await db.select().from(teachingAssignments).where(eq(teachingAssignments.id, assignmentId))
  if (!a) return false
  if (a.teacherId === ctx.staff.id && a.active) return true
  if (lesson) {
    const [e] = await db.select({ slotId: timetableEntries.slotId }).from(timetableEntries).where(eq(timetableEntries.id, lesson.entryId))
    const subs = await db.select().from(scheduleExceptions).where(and(eq(scheduleExceptions.date, lesson.date), eq(scheduleExceptions.homeroomId, lesson.homeroomId), eq(scheduleExceptions.kind, 'pengganti'), eq(scheduleExceptions.substituteTeacherId, ctx.staff.id)))
    if (subs.some((x) => !x.slotId || x.slotId === e?.slotId)) return true
  }
  return false
}

export async function saveJournal(ctx: Ctx, sessionId: string, j: { topic: string; notes: string | null; realization: string }) {
  requireStaff(ctx)
  if (!j.topic.trim()) fail('Isi topik/materi yang diajarkan.')
  if (!['sesuai', 'sebagian', 'tidak'].includes(j.realization)) fail('Pilih realisasi.')
  await command(ctx, 'lesson.journal', {}, async (tx, fx) => {
    const [s] = await tx.select().from(lessonSessions).where(eq(lessonSessions.id, sessionId))
    if (!s) notFound('Sesi')
    if (!(await canTeach(tx, ctx, s!.assignmentId, { date: s!.date, homeroomId: s!.homeroomId, entryId: s!.entryId }))) forbidden()
    await tx.update(lessonSessions).set({ topic: j.topic.trim(), notes: j.notes, realization: j.realization, journalAt: ctx.now }).where(eq(lessonSessions.id, sessionId))
    fx.audit('lesson.journal', 'lesson', sessionId)
  })
}

export async function lessonDetail(ctx: Ctx, sessionId: string) {
  requireStaff(ctx)
  const [r] = await ctx.db
    .select({ s: lessonSessions, subject: subjects.name, homeroom: homerooms.name, grade: gradeLevels.name, slot: timeSlots })
    .from(lessonSessions)
    .innerJoin(teachingAssignments, eq(teachingAssignments.id, lessonSessions.assignmentId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .innerJoin(homerooms, eq(homerooms.id, lessonSessions.homeroomId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, homerooms.gradeLevelId))
    .innerJoin(timetableEntries, eq(timetableEntries.id, lessonSessions.entryId))
    .innerJoin(timeSlots, eq(timeSlots.id, timetableEntries.slotId))
    .where(eq(lessonSessions.id, sessionId))
  if (!r) notFound('Sesi')
  if (!(await canTeach(ctx.db, ctx, r!.s.assignmentId, { date: r!.s.date, homeroomId: r!.s.homeroomId, entryId: r!.s.entryId }))) forbidden()
  return r!
}

export async function journalsOf(ctx: Ctx, assignmentId: string) {
  if (!(await canTeach(ctx.db, ctx, assignmentId))) forbidden()
  return ctx.db.select().from(lessonSessions).where(and(eq(lessonSessions.assignmentId, assignmentId), ne(lessonSessions.status, 'cancelled'))).orderBy(desc(lessonSessions.date)).limit(60)
}

