import Link from 'next/link'
import { asc, isNull, notLike } from 'drizzle-orm'
import { staffMembers, staffRoles } from '@/db/schema'
import { staffPage } from '@/server/request'
import { ROLES, IMPLICIT_ROLES, isGuardedRole } from '@/server/roles'
import { fmtDateTime } from '@/server/time'
import { roleOptions } from '@/modules/admin/service'
import { ActionForm, Avatar, Badge, Card, Field, Flash, PageHead, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Staf & peran' }

/** ACC-01 (staf): App roles per staff member. Staff sign in with their CMS account; roles live here. */
export default async function StaffList({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/pengaturan/staf', ['staff.manage', 'roles.restricted'])
  const sp = await searchParams
  // platform access records (operator:<email>) are not school staff: their visits show in the audit log instead
  const rows = await ctx.db.select().from(staffMembers).where(notLike(staffMembers.email, 'operator:%')).orderBy(asc(staffMembers.name))
  const roles = await ctx.db.select().from(staffRoles).where(isNull(staffRoles.revokedAt))
  const groups = [...new Set(roleOptions().map((r) => r.group))]
  return (
    <>
      <PageHead title="Staf & peran" sub="Peran App menentukan menu dan izin staf di portal. Akses data sensitif (BK, UKS) tidak termasuk peran Admin." />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <Card title="Daftar staf" flush>
          <table className="t">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Peran App</th>
                <th>Status</th>
                <th>Terakhir masuk</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const mine = [...roles.filter((r) => r.staffId === s.id).map((r) => r.role), ...(IMPLICIT_ROLES[s.webRole ?? ''] ?? [])]
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="who">
                        <Avatar name={s.name} />
                        <span>
                          <strong>{s.displayName || s.name}</strong>
                          <small>{s.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>{mine.length ? [...new Set(mine)].map((r) => <Badge key={r} tone="info">{ROLES[r]?.label ?? r}</Badge>) : <span className="muted">Belum ada</span>}</td>
                    <td>{!s.active ? <Badge tone="muted">Nonaktif</Badge> : s.webUserId ? <Badge tone="ok">Aktif</Badge> : <Badge tone="warn">Menunggu masuk pertama</Badge>}</td>
                    <td>{s.lastSeenAt ? fmtDateTime(s.lastSeenAt, ctx.tz) : '—'}</td>
                    <td className="actions">
                      <Link className="btn btn--ghost btn--sm" href={`/staf/pengaturan/staf/${s.id}`}>
                        Kelola
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        {ctx.staff.perms.has('staff.manage') ? (
        <Card title="Daftarkan staf">
          <ActionForm action="staf.tambah" back="/staf/pengaturan/staf">
            <Field name="email" type="email" label="Email akun CMS staf" required hint="Staf masuk dengan akun CMS ber-email ini; peran langsung berlaku." />
            <Field name="nama" label="Nama" required />
            <Field name="gelar" label="Nama tampilan (opsional)" placeholder="Bu Sari Wulandari, S.Pd." />
            <div className="f__row">
              <Field name="nip" label="NIP/NUPTK (opsional)" />
              <Field name="jabatan" label="Jabatan (opsional)" />
            </div>
            {groups.map((g) => (
              <fieldset key={g}>
                <legend>{g}</legend>
                {roleOptions()
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <label key={r.value} className="check">
                      <input type="checkbox" name="peran" value={r.value} disabled={isGuardedRole(r.value)} />
                      <span>{r.label}</span>
                    </label>
                  ))}
              </fieldset>
            ))}
            <p className="small muted">Peran pimpinan, BK dan UKS diberikan dari halaman staf setelah staf tersebut masuk pertama kali; peran BK/UKS hanya oleh pimpinan (atau Koordinator BK).</p>
            <Submit icon="plus">Daftarkan</Submit>
          </ActionForm>
        </Card>
        ) : null}
      </div>
    </>
  )
}
