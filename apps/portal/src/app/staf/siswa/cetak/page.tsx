import { staffPage, requestBranding } from '@/server/request'
import { getStudent, listStudents } from '@/modules/students/service'
import { GENDER_LABEL, RELATIONS } from '@/modules/students/fields'
import { activeYear, homeroomStudents } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { fmtDate, today } from '@/server/time'
import { PrintButton } from '@/ui/client'
import { Card, Empty, fileUrl, P, PageHead, publicFileUrl, Select, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Cetak Buku Induk' }

/** REG-05 Buku Induk print: one A4 page per student from verified/current data. Unverified records print as DRAF. */
export default async function PrintRegister({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/siswa/cetak', ['students.print'], 'buku_induk')
  const sp = await searchParams
  const b = (await requestBranding())!
  const year = await activeYear(ctx.db)
  const rooms = year ? await homeroomsOfYear(ctx, year.id) : []
  const one = sp1(sp, 'siswa')
  const rombel = sp1(sp, 'rombel')
  let ids: string[] = []
  if (one && /^[0-9a-f-]{36}$/.test(one)) ids = [one]
  else if (rombel && /^[0-9a-f-]{36}$/.test(rombel)) ids = (await homeroomStudents(ctx.db, rombel, today(ctx.tz, ctx.now))).map((s) => s.studentId)
  const list = await Promise.all(ids.slice(0, 60).map((id) => getStudent(ctx, id)))
  const logo = publicFileUrl(b.logoFileId) ?? `${P}/icon.svg`
  return (
    <>
      <div className="no-print">
        <PageHead title="Cetak Buku Induk" sub="Pilih siswa atau rombel. Gunakan Cetak / Simpan PDF dari browser (kertas A4, skala 100%)." crumbs={[['Buku Induk', '/staf/siswa/daftar'], ['Cetak']]} actions={list.length ? <PrintButton /> : null} />
        <Card>
          <form method="get" className="filters">
            <Select name="rombel" label="Rombel" value={rombel ?? ''} empty="— pilih rombel —" options={rooms.map((r) => [r.h.id, `${r.h.name} (${r.students} siswa)`])} />
            <Submit tone="ghost">Tampilkan</Submit>
          </form>
        </Card>
        {!list.length ? <Empty icon="print">Pilih rombel, atau buka dari halaman detail siswa.</Empty> : null}
      </div>
      {list.map((s) => (
        <article key={s.student.id} className="doc">
          {!s.student.verifiedAt ? <div className="doc__draft">DRAF</div> : null}
          <header className="doc__head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" />
            <div>
              <strong>{(b.shortName || ctx.school.name).toUpperCase()}</strong>
              {b.city ? <span>{b.city.toUpperCase()}</span> : null}
              {b.address ? <small>{b.address}</small> : null}
            </div>
          </header>
          <h2 className="doc__title">BUKU INDUK SISWA</h2>
          <p className="doc__sub">Tahun Ajaran {year?.name ?? '—'}</p>
          <div className="doc__body">
            <table className="doc__kv">
              <tbody>
                {[
                  ['NIS', s.student.nis],
                  ['NISN', s.student.nisn],
                  ['Nama lengkap', s.person.fullName],
                  ['Nama panggilan', s.person.nickname],
                  ['Jenis kelamin', GENDER_LABEL[s.person.gender ?? ''] ?? null],
                  ['Tempat, tanggal lahir', `${s.person.birthPlace ?? '—'}, ${fmtDate(s.person.birthDate)}`],
                  ['Agama', s.person.religion],
                  ['Kewarganegaraan', s.person.nationality],
                  ['Alamat', s.person.address],
                  ['Rombel', s.placement?.homeroom],
                  ['Diterima tanggal', fmtDate(s.student.entryDate)],
                  ['Di tingkat', s.student.entryGrade],
                  ['Sekolah asal', s.student.originSchool],
                ].map(([k, v]) => (
                  <tr key={k as string}>
                    <th>{k}</th>
                    <td>{(v as string) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="doc__photo">
              {s.person.photoFileId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(s.person.photoFileId)!} alt="" />
              ) : (
                <span>Pasfoto 3×4</span>
              )}
            </div>
          </div>
          <h3 className="doc__h">Orang tua / wali</h3>
          <table className="doc__grid">
            <thead>
              <tr>
                <th>Hubungan</th>
                <th>Nama</th>
                <th>Pekerjaan</th>
                <th>Nomor HP</th>
              </tr>
            </thead>
            <tbody>
              {s.links.filter((l) => l.link.status === 'active').map((l) => (
                <tr key={l.link.id}>
                  <td>{RELATIONS[l.link.relation]}</td>
                  <td>{l.person.fullName}</td>
                  <td>{l.person.occupation ?? '—'}</td>
                  <td>{l.person.phone ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="doc__h">Riwayat rombel</h3>
          <table className="doc__grid">
            <thead>
              <tr>
                <th>Tingkat</th>
                <th>Rombel</th>
                <th>Mulai</th>
                <th>Selesai</th>
              </tr>
            </thead>
            <tbody>
              {s.history.map((h, i) => (
                <tr key={i}>
                  <td>{h.grade}</td>
                  <td>{h.homeroom ?? '—'}</td>
                  <td>{fmtDate(h.placement?.validFrom ?? null)}</td>
                  <td>{h.placement?.validTo ? fmtDate(h.placement.validTo) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="doc__sign">
            <div>
              {b.city || '…………'}, {fmtDate(today(ctx.tz, ctx.now))}
              <br />
              Kepala Sekolah
              <div style={{ height: 64 }} />
              <strong>{b.principalName || '(………………………)'}</strong>
              {b.principalNip ? <div>NIP {b.principalNip}</div> : null}
            </div>
          </footer>
          <p className="doc__foot">Dicetak dari portal {ctx.school.name} · {s.student.verifiedAt ? `Data terverifikasi ${fmtDate(s.student.verifiedAt, ctx.tz)}` : 'Data belum diverifikasi (DRAF)'}</p>
        </article>
      ))}
    </>
  )
}
