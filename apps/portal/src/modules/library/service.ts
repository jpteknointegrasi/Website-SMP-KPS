/**
 * M16 perpustakaan: catalogue (copies per title), loans to students or staff with due date, renewals, returns and
 * lost marking. Families see the catalogue and their children's loans. Borrowers are found by NIS or by the student
 * card's QR token (the same token the card verification uses).
 */
import { and, asc, count, desc, eq, ilike, lt, or, sql } from 'drizzle-orm'
import { libraryBooks, libraryLoans, persons, staffMembers, studentCards, students } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, notFound } from '@/server/errors'
import { addDays, today } from '@/server/time'
import { sha256 } from '@/server/secrets'
import { visibleStudentIds } from '../scope'

export const LOAN_DAYS = 7
export const MAX_LOANS = 3

export async function saveBook(ctx: Ctx, b: { id?: string | null; code: string; isbn: string | null; title: string; author: string | null; publisher: string | null; year: number | null; category: string | null; location: string | null; copies: number; active: boolean }) {
  requireStaff(ctx, 'library.manage')
  if (!b.code.trim() || !b.title.trim()) fail('Isi kode dan judul buku.')
  if (!(b.copies >= 0 && b.copies <= 1000)) fail('Jumlah eksemplar 0–1000.')
  return command(ctx, 'library.book', {}, async (tx, fx) => {
    const [dup] = await tx.select().from(libraryBooks).where(eq(libraryBooks.code, b.code.trim()))
    if (dup && dup.id !== b.id) fail('Kode buku sudah dipakai.')
    const values = { code: b.code.trim(), isbn: b.isbn, title: b.title.trim(), author: b.author, publisher: b.publisher, year: b.year, category: b.category, location: b.location, copies: b.copies, active: b.active }
    let id = b.id
    if (id) await tx.update(libraryBooks).set(values).where(eq(libraryBooks.id, id))
    else id = (await tx.insert(libraryBooks).values(values).returning({ id: libraryBooks.id }))[0]!.id
    fx.audit('library.book', 'library_book', id)
    return id!
  })
}

/** Imports catalogue rows "kode;judul;pengarang;penerbit;tahun;kategori;lokasi;eksemplar" (one per line). */
export async function importBooks(ctx: Ctx, text: string) {
  requireStaff(ctx, 'library.manage')
  const rows = text.split(/\r?\n/).map((l) => l.split(/[;\t]/).map((x) => x.trim())).filter((r) => r[0] && r[1])
  if (!rows.length) fail('Tidak ada baris yang dapat dibaca.')
  if (rows.length > 2000) fail('Maksimal 2.000 baris sekali impor.')
  return command(ctx, 'library.import', {}, async (tx, fx) => {
    let n = 0
    for (const [code, title, author, publisher, year, category, location, copies] of rows) {
      const values = { code: code!, title: title!, author: author || null, publisher: publisher || null, year: Number(year) || null, category: category || null, location: location || null, copies: Math.max(0, Math.min(1000, Number(copies) || 1)) }
      await tx.insert(libraryBooks).values(values).onConflictDoUpdate({ target: libraryBooks.code, set: values })
      n++
    }
    fx.audit('library.import', 'library_book', null, { rows: n })
    return n
  })
}

const activeLoans = (db: Db) => db.select({ bookId: libraryLoans.bookId, n: count() }).from(libraryLoans).where(eq(libraryLoans.status, 'active')).groupBy(libraryLoans.bookId)

export async function catalogue(db: Db, q: string | null, limit = 50) {
  const term = q?.trim()
  const rows = await db
    .select()
    .from(libraryBooks)
    .where(and(eq(libraryBooks.active, true), term ? or(ilike(libraryBooks.title, `%${term}%`), ilike(libraryBooks.author, `%${term}%`), eq(libraryBooks.code, term), eq(libraryBooks.isbn, term)) : undefined))
    .orderBy(asc(libraryBooks.title))
    .limit(limit)
  const on = await activeLoans(db)
  return rows.map((b) => ({ ...b, available: b.copies - (on.find((x) => x.bookId === b.id)?.n ?? 0) }))
}

/** Finds a borrower by NIS, or by the token inside the student card QR (full verification URL or raw token). */
export async function findBorrower(ctx: Ctx, input: string) {
  requireStaff(ctx, 'library.manage')
  const v = input.trim()
  if (!v) return null
  const token = /\/v\/([A-Za-z0-9_-]{16,})/.exec(v)?.[1] ?? (/^[A-Za-z0-9_-]{20,}$/.test(v) ? v : null)
  let studentId: string | null = null
  if (token) {
    const [c] = await ctx.db.select({ studentId: studentCards.studentId }).from(studentCards).where(and(eq(studentCards.tokenHash, sha256(token)), eq(studentCards.status, 'active')))
    studentId = c?.studentId ?? null
  }
  if (!studentId) {
    const [s] = await ctx.db.select({ id: students.id }).from(students).where(and(eq(students.nis, v), eq(students.status, 'active')))
    studentId = s?.id ?? null
  }
  if (!studentId) return null
  const [p] = await ctx.db.select({ id: students.id, name: persons.fullName, nis: students.nis }).from(students).innerJoin(persons, eq(persons.id, students.personId)).where(eq(students.id, studentId))
  return p ?? null
}

export async function lend(ctx: Ctx, bookId: string, borrower: { studentId?: string | null; staffId?: string | null }, days = LOAN_DAYS) {
  const s = requireStaff(ctx, 'library.manage')
  if (!borrower.studentId === !borrower.staffId) fail('Pilih satu peminjam.')
  if (!(days >= 1 && days <= 60)) fail('Lama pinjam 1–60 hari.')
  return command(ctx, 'library.lend', {}, async (tx, fx) => {
    const [b] = await tx.select().from(libraryBooks).where(eq(libraryBooks.id, bookId)).for('update')
    if (!b || !b.active) notFound('Buku')
    const [on] = await tx.select({ n: count() }).from(libraryLoans).where(and(eq(libraryLoans.bookId, bookId), eq(libraryLoans.status, 'active')))
    if (on!.n >= b!.copies) fail('Semua eksemplar sedang dipinjam.')
    const who = borrower.studentId ? eq(libraryLoans.studentId, borrower.studentId) : eq(libraryLoans.staffId, borrower.staffId!)
    const [mine] = await tx.select({ n: count() }).from(libraryLoans).where(and(who, eq(libraryLoans.status, 'active')))
    if (borrower.studentId && mine!.n >= MAX_LOANS) fail(`Batas pinjam ${MAX_LOANS} buku sekaligus.`)
    const d = today(ctx.tz, ctx.now)
    const [overdue] = await tx.select({ n: count() }).from(libraryLoans).where(and(who, eq(libraryLoans.status, 'active'), lt(libraryLoans.dueOn, d)))
    if (overdue!.n) fail('Peminjam masih memiliki pinjaman yang lewat tenggat.')
    const [l] = await tx.insert(libraryLoans).values({ bookId, studentId: borrower.studentId ?? null, staffId: borrower.staffId ?? null, borrowedOn: d, dueOn: addDays(d, days), handledBy: s.id }).returning({ id: libraryLoans.id })
    fx.audit('library.lend', 'library_book', bookId, { loan: l!.id })
    return l!.id
  })
}

export async function returnLoan(ctx: Ctx, loanId: string, action: 'return' | 'renew' | 'lost', note: string | null) {
  const s = requireStaff(ctx, 'library.manage')
  await command(ctx, `library.${action}`, {}, async (tx, fx) => {
    const [l] = await tx.select().from(libraryLoans).where(eq(libraryLoans.id, loanId)).for('update')
    if (!l || l.status !== 'active') fail('Pinjaman tidak aktif.')
    const d = today(ctx.tz, ctx.now)
    if (action === 'renew') {
      if (l!.renewals >= 2) fail('Perpanjangan maksimal 2 kali.')
      await tx.update(libraryLoans).set({ dueOn: addDays(d > l!.dueOn ? d : l!.dueOn, LOAN_DAYS), renewals: l!.renewals + 1 }).where(eq(libraryLoans.id, loanId))
    } else await tx.update(libraryLoans).set({ status: action === 'lost' ? 'lost' : 'returned', returnedOn: d, note: note ?? l!.note }).where(eq(libraryLoans.id, loanId))
    if (action === 'lost') await tx.update(libraryBooks).set({ copies: sql`greatest(${libraryBooks.copies} - 1, 0)` }).where(eq(libraryBooks.id, l!.bookId))
    fx.audit(`library.${action}`, 'library_book', l!.bookId, { loan: loanId, by: s.id })
  })
}

export async function loans(ctx: Ctx, f: { overdue?: boolean; studentId?: string }) {
  requireStaff(ctx, 'library.manage')
  const d = today(ctx.tz, ctx.now)
  return ctx.db
    .select({ l: libraryLoans, title: libraryBooks.title, code: libraryBooks.code, student: persons.fullName, nis: students.nis, staff: staffMembers.name })
    .from(libraryLoans)
    .innerJoin(libraryBooks, eq(libraryBooks.id, libraryLoans.bookId))
    .leftJoin(students, eq(students.id, libraryLoans.studentId))
    .leftJoin(persons, eq(persons.id, students.personId))
    .leftJoin(staffMembers, eq(staffMembers.id, libraryLoans.staffId))
    .where(and(eq(libraryLoans.status, 'active'), f.overdue ? lt(libraryLoans.dueOn, d) : undefined, f.studentId ? eq(libraryLoans.studentId, f.studentId) : undefined))
    .orderBy(asc(libraryLoans.dueOn))
}

export async function studentLoans(ctx: Ctx, studentId: string) {
  if (!(await visibleStudentIds(ctx)).has(studentId)) fail('Data tidak dapat diakses.', 'forbidden')
  return ctx.db
    .select({ l: libraryLoans, title: libraryBooks.title, author: libraryBooks.author })
    .from(libraryLoans)
    .innerJoin(libraryBooks, eq(libraryBooks.id, libraryLoans.bookId))
    .where(eq(libraryLoans.studentId, studentId))
    .orderBy(desc(libraryLoans.borrowedOn))
    .limit(50)
}

export async function libraryStats(ctx: Ctx) {
  requireStaff(ctx, 'library.manage')
  const d = today(ctx.tz, ctx.now)
  const [titles] = await ctx.db.select({ n: count(), copies: sql<number>`coalesce(sum(${libraryBooks.copies}),0)`.mapWith(Number) }).from(libraryBooks).where(eq(libraryBooks.active, true))
  const [active] = await ctx.db.select({ n: count() }).from(libraryLoans).where(eq(libraryLoans.status, 'active'))
  const [late] = await ctx.db.select({ n: count() }).from(libraryLoans).where(and(eq(libraryLoans.status, 'active'), lt(libraryLoans.dueOn, d)))
  return { titles: titles!.n, copies: titles!.copies, active: active!.n, overdue: late!.n }
}
