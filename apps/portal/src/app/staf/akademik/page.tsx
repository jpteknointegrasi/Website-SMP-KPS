import { staffPage } from '@/server/request'
import { academicOverview, assignmentsOfTerm, homeroomsOfYear, staffOptions } from '@/modules/academic/service'
import { fmtDate } from '@/server/time'
import { ActionButton, ActionForm, Badge, Card, Check, Empty, Field, Flash, LinkBtn, PageHead, Select, sp1, Submit, Tabs, type SP } from '@/ui/kit'

export const metadata = { title: 'Data akademik' }

const YEAR_TONE = { planned: ['Direncanakan', 'muted'], active: ['Aktif', 'ok'], closed: ['Ditutup', 'info'] } as const

/** M03 master data: years & terms, levels, homerooms with homeroom teachers, subjects, teaching assignments. */
export default async function Academic({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/akademik', ['academic.manage'])
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'tahun'
  const ov = await academicOverview(ctx)
  const year = ov.years.find((y) => y.id === sp1(sp, 'tahun')) ?? ov.years.find((y) => y.status === 'active') ?? ov.years[0]
  const yearTerms = ov.terms.filter((t) => t.yearId === year?.id)
  const term = yearTerms.find((t) => t.id === sp1(sp, 'semester')) ?? yearTerms.find((t) => t.status === 'active') ?? yearTerms[0]
  const staff = await staffOptions(ctx)
  const rooms = year ? await homeroomsOfYear(ctx, year.id) : []
  const assigns = term ? await assignmentsOfTerm(ctx, term.id) : []
  const base = '/staf/akademik'
  const back = `${base}?tab=${tab}${year ? `&tahun=${year.id}` : ''}`
  return (
    <>
      <PageHead title="Data akademik" sub="Tahun ajaran, rombel, mata pelajaran dan penugasan mengajar." actions={<LinkBtn tone="ghost" icon="grad" href="/staf/akademik/kenaikan">Kenaikan kelas & kelulusan</LinkBtn>} />
      <Flash sp={sp} />
      <Tabs
        current={`${base}?tab=${tab}`}
        items={[
          ['Tahun ajaran', `${base}?tab=tahun`],
          ['Tingkat & rombel', `${base}?tab=rombel`],
          ['Mata pelajaran', `${base}?tab=mapel`],
          ['Penugasan mengajar', `${base}?tab=penugasan`],
        ]}
      />
      {tab === 'tahun' ? (
        <div className="grid grid--side">
          <Card title="Tahun ajaran & semester">
            {ov.years.length ? (
              ov.years.map((y) => (
                <div key={y.id} style={{ marginBottom: 16 }}>
                  <div className="row">
                    <strong style={{ fontSize: '1.05rem' }}>{y.name}</strong>
                    <Badge tone={YEAR_TONE[y.status as keyof typeof YEAR_TONE]?.[1] ?? 'muted'}>{YEAR_TONE[y.status as keyof typeof YEAR_TONE]?.[0] ?? y.status}</Badge>
                    <span className="muted small">
                      {fmtDate(y.startDate)} – {fmtDate(y.endDate)}
                    </span>
                    {y.status !== 'active' ? <ActionButton action="akademik.tahun_aktif" back={back} hidden={{ id: y.id }} label="Jadikan aktif" tone="ghost" small /> : null}
                  </div>
                  <table className="t" style={{ marginTop: 6 }}>
                    <tbody>
                      {ov.terms
                        .filter((t) => t.yearId === y.id)
                        .map((t) => (
                          <tr key={t.id}>
                            <td>Semester {t.name}</td>
                            <td colSpan={2}>
                              <ActionForm action="akademik.semester" back={back} hidden={{ id: t.id }} className="row">
                                <input type="date" name="mulai" defaultValue={t.startDate} aria-label="Mulai" style={{ maxWidth: 160 }} />
                                <input type="date" name="selesai" defaultValue={t.endDate} aria-label="Selesai" style={{ maxWidth: 160 }} />
                                <select name="status" defaultValue={t.status} aria-label="Status" style={{ maxWidth: 150 }}>
                                  <option value="planned">Direncanakan</option>
                                  <option value="active">Aktif</option>
                                  <option value="closed">Ditutup</option>
                                </select>
                                <button className="btn btn--ghost btn--sm" type="submit">
                                  Simpan
                                </button>
                              </ActionForm>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              <Empty>Belum ada tahun ajaran.</Empty>
            )}
          </Card>
          <Card title="Tambah tahun ajaran">
            <ActionForm action="akademik.tahun" back={back}>
              <Field name="nama" label="Nama" placeholder="2026/2027" required />
              <Field name="mulai" type="date" label="Mulai" required />
              <Field name="selesai" type="date" label="Selesai" required />
              <Submit icon="plus">Tambah</Submit>
            </ActionForm>
          </Card>
        </div>
      ) : null}

      {tab === 'rombel' ? (
        <div className="grid grid--side">
          <Card title={`Rombel ${year?.name ?? ''}`}>
            {ov.years.length > 1 ? (
              <form method="get" className="filters">
                <input type="hidden" name="tab" value="rombel" />
                <Select name="tahun" label="Tahun ajaran" value={year?.id} options={ov.years.map((y) => [y.id, y.name])} />
                <button className="btn btn--ghost" type="submit">
                  Tampilkan
                </button>
              </form>
            ) : null}
            {rooms.length ? (
              <table className="t">
                <thead>
                  <tr>
                    <th>Rombel</th>
                    <th>Tingkat</th>
                    <th>Wali kelas</th>
                    <th>Ruang</th>
                    <th className="num">Siswa</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.h.id}>
                      <td>
                        <strong>{r.h.name}</strong>
                      </td>
                      <td>{r.grade}</td>
                      <td>{r.teacher ?? <span className="muted">—</span>}</td>
                      <td>{r.h.room ?? '—'}</td>
                      <td className="num">
                        {r.students}
                        {r.h.capacity ? `/${r.h.capacity}` : ''}
                      </td>
                      <td>
                        <details className="more">
                          <summary>Ubah</summary>
                          <ActionForm action="akademik.rombel" back={back} hidden={{ id: r.h.id, tahun: year!.id, tingkat: r.h.gradeLevelId }}>
                            <Field name="nama" label="Nama" value={r.h.name} required />
                            <Select name="wali_kelas" label="Wali kelas" value={r.h.homeroomTeacherId} empty="— belum —" options={staff.map((s) => [s.id, s.name])} />
                            <Field name="ruang" label="Ruang" value={r.h.room ?? ''} />
                            <Field name="kapasitas" type="number" label="Kapasitas" value={r.h.capacity ?? ''} />
                            <Submit tone="ghost">Simpan</Submit>
                          </ActionForm>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty>Belum ada rombel untuk tahun ini.</Empty>
            )}
          </Card>
          <div>
            <Card title="Tambah rombel">
              {year && ov.levels.length ? (
                <ActionForm action="akademik.rombel" back={back} hidden={{ tahun: year.id }}>
                  <Select name="tingkat" label="Tingkat" required options={ov.levels.map((l) => [l.id, l.name])} />
                  <Field name="nama" label="Nama rombel" placeholder="VII A" required />
                  <Select name="wali_kelas" label="Wali kelas" empty="— belum —" options={staff.map((s) => [s.id, s.name])} hint="Daftar berisi staf yang sudah pernah masuk portal atau didaftarkan di Staf & peran." />
                  <Field name="ruang" label="Ruang" />
                  <Field name="kapasitas" type="number" label="Kapasitas" min={1} max={60} />
                  <Submit icon="plus">Tambah rombel</Submit>
                </ActionForm>
              ) : (
                <Empty>Buat tahun ajaran dan tingkat terlebih dahulu.</Empty>
              )}
            </Card>
            <Card title="Tingkat">
              <ul className="list">
                {ov.levels.map((l) => (
                  <li key={l.id}>
                    <span className="grow">
                      Kelas {l.name} {l.final ? <Badge tone="info">Tingkat akhir</Badge> : null}
                    </span>
                    <span className="muted small">urutan {l.ordinal}</span>
                  </li>
                ))}
              </ul>
              <ActionForm action="akademik.tingkat" back={back}>
                <div className="f__row">
                  <Field name="nama" label="Nama tingkat" placeholder="VII" required />
                  <Field name="urutan" type="number" label="Urutan" placeholder="7" required />
                </div>
                <Check name="akhir" label="Tingkat akhir (lulus setelah tingkat ini)" />
                <Submit tone="ghost" icon="plus">Tambah tingkat</Submit>
              </ActionForm>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'mapel' ? (
        <div className="grid grid--side">
          <Card title="Mata pelajaran" flush>
            {ov.subjects.length ? (
              <table className="t">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Kelompok</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ov.subjects.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.code}</td>
                      <td>{s.name}</td>
                      <td>{s.group ?? '—'}</td>
                      <td>{s.active ? <Badge tone="ok">Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                      <td>
                        <details className="more">
                          <summary>Ubah</summary>
                          <ActionForm action="akademik.mapel" back={back} hidden={{ id: s.id, aktif_ada: 1 }}>
                            <Field name="kode" label="Kode" value={s.code} required />
                            <Field name="nama" label="Nama" value={s.name} required />
                            <Field name="kelompok" label="Kelompok" value={s.group ?? ''} />
                            <Field name="urutan" type="number" label="Urutan" value={s.ordinal} />
                            <Check name="aktif" checked={s.active} label="Aktif" />
                            <Submit tone="ghost">Simpan</Submit>
                          </ActionForm>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty>Belum ada mata pelajaran.</Empty>
            )}
          </Card>
          <Card title="Tambah mata pelajaran">
            <ActionForm action="akademik.mapel" back={back}>
              <Field name="kode" label="Kode" placeholder="MTK" required />
              <Field name="nama" label="Nama" placeholder="Matematika" required />
              <Field name="kelompok" label="Kelompok (opsional)" placeholder="Umum" />
              <Field name="urutan" type="number" label="Urutan di rapor" />
              <Submit icon="plus">Tambah</Submit>
            </ActionForm>
          </Card>
        </div>
      ) : null}

      {tab === 'penugasan' ? (
        <div className="grid grid--side">
          <Card title={`Penugasan mengajar ${term ? `— Semester ${term.name} ${year?.name}` : ''}`} flush>
            <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
              <input type="hidden" name="tab" value="penugasan" />
              <Select name="semester" label="Semester" value={term?.id} options={ov.terms.map((t) => [t.id, `${ov.years.find((y) => y.id === t.yearId)?.name} ${t.name}`])} />
              <button className="btn btn--ghost" type="submit">
                Tampilkan
              </button>
            </form>
            {assigns.length ? (
              <table className="t">
                <thead>
                  <tr>
                    <th>Rombel</th>
                    <th>Mata pelajaran</th>
                    <th>Guru</th>
                    <th className="num">JP/minggu</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {assigns.map((a) => (
                    <tr key={a.a.id}>
                      <td>{a.homeroom}</td>
                      <td>{a.subject}</td>
                      <td>{a.teacher}</td>
                      <td className="num">{a.a.hoursPerWeek ?? '—'}</td>
                      <td className="actions">
                        <ActionButton action="akademik.penugasan_hapus" back={`${back}&semester=${term!.id}`} hidden={{ id: a.a.id }} label="Hapus" tone="danger-ghost" small />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty>Belum ada penugasan pada semester ini.</Empty>
            )}
          </Card>
          <Card title="Tambah / ganti penugasan">
            {term && rooms.length && ov.subjects.length ? (
              <ActionForm action="akademik.penugasan" back={`${back}&semester=${term.id}`} hidden={{ semester: term.id }}>
                <Select name="rombel" label="Rombel" required options={rooms.map((r) => [r.h.id, r.h.name])} />
                <Select name="mapel" label="Mata pelajaran" required options={ov.subjects.filter((s) => s.active).map((s) => [s.id, s.name])} />
                <Select name="guru" label="Guru" required options={staff.map((s) => [s.id, s.name])} />
                <Field name="jam" type="number" label="Jam pelajaran per minggu" min={0} max={40} />
                <p className="small muted">Bila rombel+mapel sudah punya guru pada semester ini, guru diganti.</p>
                <Submit icon="plus">Simpan penugasan</Submit>
              </ActionForm>
            ) : (
              <Empty>Lengkapi semester, rombel dan mata pelajaran terlebih dahulu.</Empty>
            )}
          </Card>
        </div>
      ) : null}
    </>
  )
}
