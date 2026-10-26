import Link from 'next/link'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { catalogue } from '@/modules/activities/service'
import { staffOptions } from '@/modules/academic/service'
import { ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, Select, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Ekstrakurikuler' }

/** EKS-01: activities of the school year; kesiswaan manages all, coaches open their own. */
export default async function Activities({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/ekskul', ['activities.manage', 'activities.coach'], 'ekskul')
  const sp = await searchParams
  const manage = hasPerm(ctx, 'activities.manage')
  const all = await catalogue(ctx.db)
  const list = manage ? all : all.filter((a) => a.a.coachId === ctx.staff.id)
  const staff = manage ? await staffOptions(ctx) : []
  return (
    <>
      <PageHead title="Ekstrakurikuler" sub={manage ? 'Katalog kegiatan, pembina, kuota dan pendaftaran.' : 'Kegiatan yang Anda bina.'} />
      <Flash sp={sp} />
      <div className={manage ? 'grid grid--side' : undefined}>
        <Card flush>
          {list.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Kegiatan</th>
                    <th>Pembina</th>
                    <th className="num">Anggota</th>
                    <th className="num">Menunggu</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ a, coach, members, pending }) => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/staf/ekskul/${a.id}`}>
                          <strong>{a.name}</strong>
                        </Link>
                        <div className="small muted">
                          {a.category === 'wajib' ? 'Wajib' : 'Pilihan'}
                          {a.schedule ? ` · ${a.schedule}` : ''}
                        </div>
                      </td>
                      <td className="small">{coach ?? '—'}</td>
                      <td className="num">
                        {members}
                        {a.capacity ? `/${a.capacity}` : ''}
                      </td>
                      <td className="num">{pending ? <Badge tone="warn">{pending}</Badge> : 0}</td>
                      <td>{a.status === 'open' ? <Badge tone="ok">Dibuka</Badge> : <Badge tone="muted">Ditutup</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="ball">{manage ? 'Belum ada kegiatan.' : 'Anda belum ditetapkan sebagai pembina kegiatan.'}</Empty>
          )}
        </Card>
        {manage ? (
          <Card title="Tambah kegiatan">
            <ActionForm action="ekskul.simpan" back="/staf/ekskul">
              <Field name="nama" label="Nama kegiatan" required />
              <div className="f__row">
                <Select
                  name="kategori"
                  label="Jenis"
                  value="minat"
                  options={[
                    ['minat', 'Pilihan'],
                    ['wajib', 'Wajib'],
                  ]}
                />
                <Field name="kuota" label="Kuota (opsional)" type="number" min={1} />
              </div>
              <Select name="pembina" label="Pembina" empty="— belum ditetapkan —" options={staff.map((s) => [s.id, s.name])} />
              <div className="f__row">
                <Field name="jadwal" label="Jadwal" placeholder="Jumat 14.00–16.00" />
                <Field name="tempat" label="Tempat" />
              </div>
              <TextArea name="deskripsi" label="Deskripsi" rows={3} />
              <Check name="izin" label="Perlu persetujuan orang tua" checked />
              <input type="hidden" name="status" value="open" />
              <Submit>Simpan</Submit>
            </ActionForm>
            <p className="small muted" style={{ marginTop: 8 }}>Beri staf peran &quot;Pembina Ekstrakurikuler&quot; agar dapat membuka kegiatan yang dibinanya.</p>
          </Card>
        ) : null}
      </div>
    </>
  )
}
