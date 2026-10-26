import { and, eq, isNull } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { staffMembers, staffRoles } from '@/db/schema'
import { staffPage } from '@/server/request'
import { IMPLICIT_ROLES, PERMISSIONS, permissionsOf } from '@/server/roles'
import { roleOptions } from '@/modules/admin/service'
import { ActionForm, Badge, Card, Check, Field, Flash, Notice, PageHead, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Kelola staf' }

export default async function StaffEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  const ctx = await staffPage(`/staf/pengaturan/staf/${id}`, ['staff.manage'])
  const sp = await searchParams
  const [s] = /^[0-9a-f-]{36}$/.test(id) ? await ctx.db.select().from(staffMembers).where(eq(staffMembers.id, id)) : []
  if (!s) notFound()
  const roles = (await ctx.db.select().from(staffRoles).where(and(eq(staffRoles.staffId, id), isNull(staffRoles.revokedAt)))).map((r) => r.role)
  const implicit = IMPLICIT_ROLES[s.webRole ?? ''] ?? []
  const perms = permissionsOf([...roles, ...implicit])
  const groups = [...new Set(roleOptions().map((r) => r.group))]
  return (
    <>
      <PageHead title={s.displayName || s.name} sub={s.email} crumbs={[['Staf & peran', '/staf/pengaturan/staf'], [s.name]]} />
      <Flash sp={sp} />
      {implicit.length ? <Notice tone="info">Sebagai Admin Teknis CMS, staf ini otomatis menjadi Admin App sekolah.</Notice> : null}
      <div className="grid grid--2">
        <Card title="Peran App">
          <ActionForm action="staf.peran" back={`/staf/pengaturan/staf/${id}`} hidden={{ id }}>
            {groups.map((g) => (
              <fieldset key={g}>
                <legend>{g}</legend>
                {roleOptions()
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <Check key={r.value} name="peran" value={r.value} checked={roles.includes(r.value)} label={r.label} />
                  ))}
              </fieldset>
            ))}
            <Submit>Simpan peran</Submit>
          </ActionForm>
        </Card>
        <div>
          <Card title="Data staf">
            <ActionForm action="staf.ubah" back={`/staf/pengaturan/staf/${id}`} hidden={{ id }}>
              <Field name="gelar" label="Nama tampilan" value={s.displayName ?? ''} />
              <Field name="nip" label="NIP/NUPTK" value={s.nip ?? ''} />
              <Field name="jabatan" label="Jabatan" value={s.position ?? ''} />
              <Check name="aktif" checked={s.active} label="Aktif di portal" />
              <Submit tone="ghost">Simpan</Submit>
            </ActionForm>
          </Card>
          <Card title="Izin efektif">
            <div className="row">
              {[...perms].map((p) => (
                <Badge key={p} tone="muted">
                  {PERMISSIONS[p]}
                </Badge>
              ))}
              {!perms.size ? <span className="muted">Tidak ada.</span> : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
