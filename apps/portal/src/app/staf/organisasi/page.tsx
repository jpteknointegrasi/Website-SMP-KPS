import Link from 'next/link'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { orgs } from '@/modules/organizations/service'
import { staffOptions } from '@/modules/academic/service'
import { ActionForm, Badge, Card, Empty, Field, Flash, PageHead, Select, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Organisasi & kegiatan' }

export default async function Orgs({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/organisasi', ['organizations.manage', 'teach'], 'organisasi')
  const sp = await searchParams
  const manage = hasPerm(ctx, 'organizations.manage')
  const all = await orgs(ctx.db)
  const list = manage ? all : all.filter((o) => o.o.advisorId === ctx.staff.id)
  const staff = manage ? await staffOptions(ctx) : []
  return (
    <>
      <PageHead title="Organisasi & kegiatan siswa" sub="OSIS, MPK dan organisasi siswa lain: pengurus, proposal kegiatan dan laporan." />
      <Flash sp={sp} />
      <div className={manage ? 'grid grid--side' : undefined}>
        <Card flush>
          {list.length ? (
            <table className="t">
              <thead>
                <tr>
                  <th>Organisasi</th>
                  <th>Pembina</th>
                  <th className="num">Anggota</th>
                  <th>Proposal</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ o, advisor, members, pending }) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/staf/organisasi/${o.id}`}>
                        <strong>{o.name}</strong>
                      </Link>
                    </td>
                    <td className="small">{advisor ?? '—'}</td>
                    <td className="num">{members}</td>
                    <td>{pending ? <Badge tone="warn">{pending} menunggu</Badge> : <span className="small muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty icon="flag">{manage ? 'Belum ada organisasi.' : 'Anda belum menjadi pembina organisasi siswa.'}</Empty>
          )}
        </Card>
        {manage ? (
          <Card title="Tambah organisasi">
            <ActionForm action="org.simpan" back="/staf/organisasi">
              <Field name="nama" label="Nama" placeholder="OSIS" required />
              <Select name="pembina" label="Pembina" empty="—" options={staff.map((s) => [s.id, s.name])} />
              <TextArea name="deskripsi" label="Deskripsi" rows={3} />
              <Submit>Simpan</Submit>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </>
  )
}
