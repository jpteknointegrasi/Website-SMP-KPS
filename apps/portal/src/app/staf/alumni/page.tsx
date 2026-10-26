import Link from 'next/link'
import { staffPage } from '@/server/request'
import { graduates } from '@/modules/alumni/service'
import { fmtDate } from '@/server/time'
import { ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, sp1, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Alumni' }

/** ALM-01: graduates; profile & contact kept only with recorded consent; public stories only with consent. */
export default async function Alumni({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/alumni', ['alumni.manage'], 'alumni')
  const sp = await searchParams
  const list = await graduates(ctx, sp1(sp, 'q') ?? null)
  const sel = list.find((g) => g.id === sp1(sp, 'siswa'))
  return (
    <>
      <PageHead title="Alumni" sub="Lulusan sekolah. Kontak disimpan hanya bila alumni menyetujui; cerita tampil di website hanya dengan izin." />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <Card flush>
          <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
            <Field name="q" label="Cari nama" value={sp1(sp, 'q')} className="fld--grow" />
            <Submit tone="ghost">Cari</Submit>
          </form>
          {list.length ? (
            <table className="t">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Lulus</th>
                  <th>Melanjutkan ke</th>
                  <th>Izin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <strong>{g.name}</strong>
                      <div className="small muted">{g.nis ?? '—'}</div>
                    </td>
                    <td>{g.profile?.graduationYear ?? (g.exitDate ? fmtDate(g.exitDate, undefined, true) : '—')}</td>
                    <td className="small">{g.profile?.continuingTo ?? '—'}</td>
                    <td>
                      {g.profile?.consentContact ? <Badge tone="ok">Kontak</Badge> : null} {g.profile?.consentPublic ? <Badge tone="brand">Publik</Badge> : null}
                    </td>
                    <td className="actions">
                      <Link href={`/staf/alumni?siswa=${g.id}`}>Profil</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty icon="grad">Belum ada lulusan. Lulusan tercatat setelah kenaikan kelas/kelulusan dijalankan.</Empty>
          )}
        </Card>
        {sel ? (
          <Card title={`Profil ${sel.name}`}>
            <ActionForm action="alumni.profil" back={`/staf/alumni?siswa=${sel.id}`} hidden={{ siswa: sel.id }} key={sel.id}>
              <Field name="tahun" label="Tahun lulus" value={sel.profile?.graduationYear ?? (sel.year ?? sel.exitDate ?? '').slice(0, 4)} required pattern="\d{4}" />
              <Field name="lanjut" label="Melanjutkan ke" value={sel.profile?.continuingTo} />
              <Check name="izin_kontak" label="Alumni setuju dihubungi sekolah" checked={sel.profile?.consentContact} />
              <div className="f__row">
                <Field name="email" label="Email" type="email" value={sel.profile?.contactEmail} />
                <Field name="telepon" label="Telepon" value={sel.profile?.contactPhone} />
              </div>
              <TextArea name="cerita" label="Cerita alumni" rows={4} value={sel.profile?.story} />
              <Check name="izin_publik" label="Alumni setuju nama & cerita ditampilkan di website" checked={sel.profile?.consentPublic} />
              <Submit>Simpan</Submit>
              <p className="small muted">Perubahan izin tercatat di riwayat persetujuan.</p>
            </ActionForm>
          </Card>
        ) : (
          <Card title="Profil alumni">
            <p className="small muted">Pilih alumni untuk mencatat kelanjutan studi, kontak (dengan izin) dan cerita.</p>
          </Card>
        )}
      </div>
    </>
  )
}
