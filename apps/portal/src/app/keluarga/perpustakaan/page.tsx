import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { catalogue, studentLoans } from '@/modules/library/service'
import { fmtDate, today } from '@/server/time'
import { ChildPicker } from '@/ui/child-picker'
import { Badge, Card, Empty, Field, Flash, PageHead, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Perpustakaan' }

export default async function FamilyLibrary({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/perpustakaan', 'perpustakaan')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const q = sp1(sp, 'q') ?? null
  const books = q ? await catalogue(ctx.db, q, 40) : []
  const loans = current ? await studentLoans(ctx, current.studentId) : []
  const d = today(ctx.tz, ctx.now)
  return (
    <>
      <PageHead title="Perpustakaan" sub="Pinjaman buku dan katalog perpustakaan sekolah." />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/perpustakaan" />
      <div className="grid grid--side">
        <Card title="Pinjaman" flush>
          {loans.length ? (
            <table className="t">
              <tbody>
                {loans.map(({ l, title, author }) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{title}</strong>
                      <div className="small muted">{author ?? ''}</div>
                    </td>
                    <td className="small nowrap">dipinjam {fmtDate(l.borrowedOn, undefined, true)}</td>
                    <td>{l.status === 'active' ? l.dueOn < d ? <Badge tone="bad">Lewat tenggat {fmtDate(l.dueOn, undefined, true)}</Badge> : <Badge tone="info">Kembali {fmtDate(l.dueOn, undefined, true)}</Badge> : l.status === 'lost' ? <Badge tone="warn">Hilang</Badge> : <Badge tone="ok">Dikembalikan</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty icon="library">Belum ada pinjaman.</Empty>
          )}
        </Card>
        <Card title="Cari buku">
          <form method="get" className="row">
            {current ? <input type="hidden" name="anak" value={current.studentId} /> : null}
            <Field name="q" label="Judul / pengarang" value={q} className="fld--grow" />
            <Submit tone="ghost">Cari</Submit>
          </form>
          {q ? (
            books.length ? (
              <ul className="list">
                {books.map((b) => (
                  <li key={b.id}>
                    <span className="grow">
                      <strong>{b.title}</strong>
                      <div className="small muted">{[b.author, b.location].filter(Boolean).join(' · ')}</div>
                    </span>
                    {b.available > 0 ? <Badge tone="ok">Tersedia {b.available}</Badge> : <Badge tone="muted">Dipinjam</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Tidak ditemukan.</p>
            )
          ) : null}
        </Card>
      </div>
    </>
  )
}
