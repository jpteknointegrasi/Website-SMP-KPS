/**
 * Alumni (§44.6): graduates (students with status "graduated") with a profile kept only with consent. Contact data
 * is stored only when consent to be contacted is recorded; stories are public only with explicit consent. Consent
 * changes are kept in the consents history.
 */
import { and, asc, desc, eq, ilike } from 'drizzle-orm'
import { alumniProfiles, consents, persons, students } from '@/db/schema'
import { requireStaff, type Ctx } from '@/server/context'
import { command, type Db } from '@/server/command'
import { fail, notFound } from '@/server/errors'
import { sql } from 'drizzle-orm'

export async function graduates(ctx: Ctx, q: string | null) {
  requireStaff(ctx, 'alumni.manage')
  return ctx.db
    .select({
      id: students.id,
      name: persons.fullName,
      nis: students.nis,
      exitDate: students.exitDate,
      profile: alumniProfiles,
      year: sql<string | null>`(SELECT max(e.end_date)::text FROM enrollments e WHERE e.student_id = ${students.id} AND e.outcome = 'graduated')`,
    })
    .from(students)
    .innerJoin(persons, eq(persons.id, students.personId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.studentId, students.id))
    .where(and(eq(students.status, 'graduated'), q ? ilike(persons.fullName, `%${q}%`) : undefined))
    .orderBy(desc(students.exitDate), asc(persons.fullName))
    .limit(300)
}

export async function saveProfile(ctx: Ctx, studentId: string, p: { graduationYear: string; continuingTo: string | null; contactEmail: string | null; contactPhone: string | null; story: string | null; consentContact: boolean; consentPublic: boolean }) {
  const s = requireStaff(ctx, 'alumni.manage')
  if (!/^\d{4}$/.test(p.graduationYear)) fail('Tahun lulus 4 digit.')
  if (!p.consentContact && (p.contactEmail || p.contactPhone)) fail('Kontak hanya disimpan bila alumni setuju dihubungi.')
  await command(ctx, 'alumni.profile', {}, async (tx, fx) => {
    const [st] = await tx.select().from(students).where(eq(students.id, studentId))
    if (!st || st.status !== 'graduated') notFound('Alumni')
    const [cur] = await tx.select().from(alumniProfiles).where(eq(alumniProfiles.studentId, studentId))
    const consentChanged = !cur || cur.consentContact !== p.consentContact || cur.consentPublic !== p.consentPublic
    const values = { graduationYear: p.graduationYear, continuingTo: p.continuingTo, contactEmail: p.consentContact ? p.contactEmail : null, contactPhone: p.consentContact ? p.contactPhone : null, story: p.story, consentContact: p.consentContact, consentPublic: p.consentPublic, updatedAt: ctx.now, ...(consentChanged ? { consentRecordedBy: s.id, consentAt: ctx.now } : {}) }
    await tx.insert(alumniProfiles).values({ studentId, ...values }).onConflictDoUpdate({ target: alumniProfiles.studentId, set: values })
    if (consentChanged) {
      await tx.insert(consents).values({ personId: st!.personId, purpose: 'alumni.contact', granted: p.consentContact, givenByStaffId: s.id, note: 'Dicatat petugas alumni' })
      await tx.insert(consents).values({ personId: st!.personId, purpose: 'alumni.public', granted: p.consentPublic, givenByStaffId: s.id, note: 'Dicatat petugas alumni' })
    }
    fx.audit('alumni.profile', 'student', studentId, { contact: p.consentContact, public: p.consentPublic })
  })
}

/** Public alumni stories (consented) for the school website: name, year, continuing to, story. */
export async function publicStories(db: Db, limit = 12) {
  return db
    .select({ name: persons.fullName, year: alumniProfiles.graduationYear, continuingTo: alumniProfiles.continuingTo, story: alumniProfiles.story })
    .from(alumniProfiles)
    .innerJoin(students, eq(students.id, alumniProfiles.studentId))
    .innerJoin(persons, eq(persons.id, students.personId))
    .where(and(eq(alumniProfiles.consentPublic, true), sql`${alumniProfiles.story} IS NOT NULL`))
    .orderBy(desc(alumniProfiles.updatedAt))
    .limit(limit)
}
