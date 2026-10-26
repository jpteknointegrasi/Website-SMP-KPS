import Link from 'next/link'
import { cookies } from 'next/headers'
import { asc, eq, ilike, or, sql } from 'drizzle-orm'
import { accounts, guardians, persons, students } from '@/db/schema'
import { staffPage } from '@/server/request'
import { ONCE_COOKIE, readOnce } from '@/server/once'
import { fmtDateTime } from '@/server/time'
import { ActionButton, Badge, Card, Empty, Flash, Notice, PageHead, sp1, type SP } from '@/ui/kit'

export const metadata = { title: 'Akun keluarga' }

/** ACC-01 family/student accounts: status, linked students, reset password, disable. */
export default async function FamilyAccounts({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/akun', ['family.manage'])
  const sp = await searchParams
  const q = sp1(sp, 'q') ?? ''
  const once = readOnce((await cookies()).get(ONCE_COOKIE)?.value)
  const rows = await ctx.db
    .select({
      a: accounts,
      name: persons.fullName,
      student: sql<string | null>`(SELECT s.id FROM students s WHERE s.account_id = ${accounts.id} LIMIT 1)`,
      children: sql<number>`(SELECT count(*) FROM guardian_student_links l JOIN guardians g ON g.id = l.guardian_id WHERE g.account_id = ${accounts.id} AND l.status = 'active')`.mapWith(Number),
    })
    .from(accounts)
    .innerJoin(persons, eq(persons.id, accounts.personId))
    .where(q ? or(ilike(accounts.login, `%${q}%`), ilike(persons.fullName, `%${q}%`)) : undefined)
    .orderBy(asc(persons.fullName))
    .limit(200)
  void guardians
  void students
  return (
    <>
      <PageHead title="Akun keluarga & siswa" sub="Akun portal orang tua/wali, pendaftar dan siswa. Relasi wali-murid dikelola dari halaman detail siswa." />
      <Flash sp={sp} />
      {once?.kind === 'password' ? (
        <Notice tone="info" title="Kata sandi sementara (tampil sekali)">
          Nama pengguna <strong>{once.login}</strong> · kata sandi <span className="secret">{once.password}</span>
        </Notice>
      ) : null}
      <Card flush>
        <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
          <label className="fld fld--grow">
            <span>Cari</span>
            <input type="search" name="q" defaultValue={q} placeholder="Nama atau email/nama pengguna" />
          </label>
          <button className="btn" type="submit">
            Cari
          </button>
        </form>
        {rows.length ? (
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Login</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Terakhir masuk</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.a.id}>
                    <td>{r.student ? <Link href={`/staf/siswa/${r.student}`}>{r.name}</Link> : r.name}</td>
                    <td className="small">{r.a.login}</td>
                    <td>{r.student ? <Badge tone="info">Siswa</Badge> : r.children ? <Badge tone="ok">Wali · {r.children} anak</Badge> : <Badge>Pendaftar / belum terhubung</Badge>}</td>
                    <td>
                      {r.a.status !== 'active' ? <Badge tone="muted">Nonaktif</Badge> : r.a.mustChangePassword ? <Badge tone="warn">Menunggu aktivasi</Badge> : r.a.emailVerifiedAt ? <Badge tone="ok">Aktif</Badge> : <Badge tone="warn">Email belum diverifikasi</Badge>}
                    </td>
                    <td className="small">{r.a.lastLoginAt ? fmtDateTime(r.a.lastLoginAt, ctx.tz) : '—'}</td>
                    <td className="actions">
                      <ActionButton action="akun.reset_staf" back="/staf/akun" hidden={{ akun: r.a.id }} label="Atur ulang sandi" small tone="ghost" />{' '}
                      <ActionButton action="akun.status" back="/staf/akun" hidden={{ akun: r.a.id, aktif: r.a.status === 'active' ? '0' : '1' }} label={r.a.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'} small tone={r.a.status === 'active' ? 'danger-ghost' : 'ghost'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="users">Belum ada akun.</Empty>
        )}
      </Card>
    </>
  )
}
