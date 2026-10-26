import Link from 'next/link'
import { staffPage } from '@/server/request'
import { listStudents } from '@/modules/students/service'
import { STUDENT_STATUS } from '@/modules/students/fields'
import { activeYear } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { hasPerm } from '@/server/context'
import { STATUS_TONE } from '@/ui/tones'
import { Avatar, Badge, Card, Empty, fileUrl, Flash, LinkBtn, PageHead, Pager, sp1, Status, type SP } from '@/ui/kit'

export const metadata = { title: 'Buku Induk' }

/** REG-01 Register Buku Induk: search, filters, pagination. */
export default async function Register({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/siswa/daftar', ['students.read'], 'buku_induk')
  const sp = await searchParams
  const q = sp1(sp, 'q') ?? ''
  const rombel = sp1(sp, 'rombel') ?? ''
  const status = sp1(sp, 'status') ?? 'active'
  const kel = sp1(sp, 'kelengkapan') ?? ''
  const page = Number(sp1(sp, 'hal') ?? 1) || 1
  const year = await activeYear(ctx.db)
  const rooms = year ? await homeroomsOfYear(ctx, year.id) : []
  const res = await listStudents(ctx, { q, homeroomId: rombel || undefined, status: status || undefined, completeness: (kel || undefined) as never, page })
  const qs = (p: number) => `/staf/siswa/daftar?${new URLSearchParams({ q, rombel, status, kelengkapan: kel, hal: String(p) })}`
  return (
    <>
      <PageHead
        title="Register Buku Induk"
        sub={`Daftar siswa ${ctx.school.name}${year ? ` — Tahun Ajaran ${year.name}` : ''}.`}
        crumbs={[['Administrasi siswa', '/staf/siswa'], ['Buku Induk']]}
        actions={
          <>
            {hasPerm(ctx, 'students.print') ? <LinkBtn href={`/staf/siswa/cetak${rombel ? `?rombel=${rombel}` : ''}`} tone="ghost" icon="print">Cetak</LinkBtn> : null}
            {hasPerm(ctx, 'students.write') ? <LinkBtn href="/staf/siswa/baru" icon="plus">Tambah siswa</LinkBtn> : null}
          </>
        }
      />
      <Flash sp={sp} />
      <Card flush>
        <form className="filters" method="get" style={{ padding: '16px 20px 0' }}>
          <label className="fld fld--grow">
            <span>Cari</span>
            <input type="search" name="q" defaultValue={q} placeholder="NIS, NISN atau nama siswa…" />
          </label>
          <label className="fld">
            <span>Rombel</span>
            <select name="rombel" defaultValue={rombel}>
              <option value="">Semua rombel</option>
              {rooms.map((r) => (
                <option key={r.h.id} value={r.h.id}>
                  {r.h.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>Status</span>
            <select name="status" defaultValue={status}>
              <option value="">Semua status</option>
              {Object.entries(STUDENT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>Kelengkapan</span>
            <select name="kelengkapan" defaultValue={kel}>
              <option value="">Semua</option>
              <option value="complete">Lengkap</option>
              <option value="incomplete">Belum lengkap</option>
              <option value="unverified">Belum diverifikasi</option>
            </select>
          </label>
          <button className="btn" type="submit">
            Terapkan
          </button>
          <Link className="btn btn--ghost" href="/staf/siswa/daftar">
            Reset
          </Link>
        </form>
        {res.rows.length ? (
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>No</th>
                  <th>NIS</th>
                  <th>Nama siswa</th>
                  <th>Rombel</th>
                  <th>Status</th>
                  <th>Kelengkapan</th>
                  <th>Verifikasi</th>
                  <th className="right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{(res.page - 1) * res.perPage + i + 1}</td>
                    <td className="mono">{r.nis ?? '—'}</td>
                    <td>
                      <div className="who">
                        <Avatar name={r.name} src={fileUrl(r.photo)} />
                        <strong>{r.name}</strong>
                      </div>
                    </td>
                    <td>{r.homeroom ?? <span className="muted">—</span>}</td>
                    <td>
                      <Status value={r.status} map={STATUS_TONE} />
                    </td>
                    <td title={r.completeness.missing.join(', ')}>
                      {r.completeness.percent === 100 ? <Badge tone="ok">Lengkap</Badge> : <Badge tone="bad">{r.completeness.percent}% · belum lengkap</Badge>}
                    </td>
                    <td>{r.verifiedAt ? <Badge tone="ok">Terverifikasi</Badge> : <Badge tone="warn">Perlu verifikasi</Badge>}</td>
                    <td className="actions">
                      <Link className="btn btn--ghost btn--sm" href={`/staf/siswa/${r.id}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="search">{q || rombel || kel ? 'Tidak ada siswa yang cocok dengan filter.' : 'Buku Induk masih kosong. Tambahkan siswa atau impor dari Excel.'}</Empty>
        )}
        <Pager page={res.page} perPage={res.perPage} total={res.total} href={qs} />
      </Card>
    </>
  )
}
