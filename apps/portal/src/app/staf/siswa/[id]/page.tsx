import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { staffPage } from '@/server/request'
import { getStudent, studentAudit } from '@/modules/students/service'
import { DOC_KINDS, GENDER_LABEL, RELATIONS, STUDENT_FIELDS, STUDENT_STATUS } from '@/modules/students/fields'
import { cardsOf } from '@/modules/cards/service'
import { activeYear } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { hasPerm } from '@/server/context'
import { ONCE_COOKIE, readOnce } from '@/server/once'
import { fmtDate, fmtDateTime, today } from '@/server/time'
import { CARD_TONE, CORRECTION_TONE, LINK_TONE, STATUS_TONE } from '@/ui/tones'
import {
  ActionButton,
  ActionForm,
  Avatar,
  Badge,
  Card,
  Check,
  Empty,
  Field,
  FileField,
  fileUrl,
  Flash,
  LinkBtn,
  Notice,
  PageHead,
  Progress,
  Select,
  sp1,
  Status,
  Submit,
  Tabs,
  type SP,
} from '@/ui/kit'

export const metadata = { title: 'Detail siswa' }

const mask = (v: string | null) => (v ? `•••• •••• ${v.slice(-4)}` : '—')

/** REG-02 Detail siswa: identity, family & verified links, documents, history. */
export default async function StudentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const ctx = await staffPage(`/staf/siswa/${id}`, ['students.read', 'teach'], 'buku_induk')
  const sp = await searchParams
  const tab = sp1(sp, 'tab') ?? 'identitas'
  const s = await getStudent(ctx, id).catch((e) => {
    if (e?.code === 'not_found') notFound()
    throw e
  })
  const canWrite = hasPerm(ctx, 'students.write')
  const canFamily = hasPerm(ctx, 'family.manage')
  const seeSensitive = canWrite
  const once = readOnce((await cookies()).get(ONCE_COOKIE)?.value)
  const year = await activeYear(ctx.db)
  const rooms = year && canWrite ? await homeroomsOfYear(ctx, year.id) : []
  const studentCards = await cardsOf(ctx.db, [id])
  const audit = tab === 'riwayat' && hasPerm(ctx, 'students.read') ? await studentAudit(ctx, id) : []
  const base = `/staf/siswa/${id}`
  const values = { ...s.person, ...s.student } as Record<string, unknown>
  return (
    <>
      <PageHead
        title="Detail siswa"
        sub="Data siswa pada Buku Induk."
        crumbs={[['Administrasi siswa', '/staf/siswa'], ['Buku Induk', '/staf/siswa/daftar'], [s.person.fullName]]}
        actions={
          <>
            {canWrite ? <LinkBtn href={`${base}/ubah`} icon="edit">Ubah data</LinkBtn> : null}
            <LinkBtn href={`${base}/koreksi`} tone="ghost" icon="edit">Usulkan koreksi</LinkBtn>
            {hasPerm(ctx, 'students.print') ? <LinkBtn href={`/staf/siswa/cetak?siswa=${id}`} tone="ghost" icon="print">Cetak Buku Induk</LinkBtn> : null}
          </>
        }
      />
      <Flash sp={sp} />
      {once?.kind === 'code' ? (
        <Notice tone="info" title="Kode aktivasi wali (tampil sekali)">
          <p>
            <span className="secret">{once.code}</span>
          </p>
          Berikan kode ini langsung kepada wali yang bersangkutan. Wali membuat/masuk akun portal, lalu memasukkan kode di menu Akun saya. Berlaku 14 hari, sekali pakai.
        </Notice>
      ) : null}
      {once?.kind === 'password' ? (
        <Notice tone="info" title="Akun dibuat (kata sandi sementara tampil sekali)">
          <p>
            Nama pengguna: <strong>{once.login}</strong>
            <br />
            Kata sandi sementara: <span className="secret">{once.password}</span>
          </p>
          Pemilik akun wajib mengganti kata sandi saat pertama kali masuk.
        </Notice>
      ) : null}
      <div className="grid grid--side">
        <div>
          <Card>
            <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
              <Avatar name={s.person.fullName} src={fileUrl(s.person.photoFileId)} size="lg" />
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ fontSize: '1.3rem' }}>{s.person.fullName}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  NIS <strong className="mono">{s.student.nis ?? '—'}</strong> · Rombel <strong>{s.placement?.homeroom ?? '—'}</strong>
                </p>
                <p style={{ marginTop: 6 }}>
                  <Status value={s.student.status} map={STATUS_TONE} />
                </p>
              </div>
            </div>
          </Card>
          <Tabs
            current={`${base}?tab=${tab}`}
            items={[
              ['Identitas', `${base}?tab=identitas`],
              ['Keluarga', `${base}?tab=keluarga`],
              ['Dokumen', `${base}?tab=dokumen`],
              ['Kartu', `${base}?tab=kartu`],
              ['Riwayat', `${base}?tab=riwayat`],
            ]}
          />
          {tab === 'identitas' ? (
            <Card title="Data identitas">
              <dl className="kv">
                {STUDENT_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: 'contents' }}>
                    <dt>{f.label}</dt>
                    <dd>
                      {f.sensitive
                        ? seeSensitive
                          ? mask(values[f.key] as string | null)
                          : values[f.key]
                            ? 'Tersimpan (terbatas)'
                            : '—'
                        : f.key === 'gender'
                          ? (GENDER_LABEL[String(values.gender)] ?? '—')
                          : f.type === 'date'
                            ? fmtDate(values[f.key] as string)
                            : ((values[f.key] as string) ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          {tab === 'keluarga' ? (
            <>
              <Card title="Orang tua / wali">
                {s.links.length ? (
                  <ul className="list">
                    {s.links.map(({ link, person, hasAccount }) => (
                      <li key={link.id} style={{ alignItems: 'flex-start' }}>
                        <Avatar name={person.fullName} />
                        <div className="grow">
                          <strong>{person.fullName}</strong> <span className="muted">· {RELATIONS[link.relation]}</span> {link.isPrimary ? <Badge tone="info">Kontak utama</Badge> : null}
                          <div className="small muted">
                            {person.phone ?? 'HP —'} · {person.email ?? 'email —'} · {person.occupation ?? 'pekerjaan —'}
                          </div>
                          <div className="row small" style={{ marginTop: 4 }}>
                            <Status value={link.status} map={LINK_TONE} />
                            <Badge tone={hasAccount ? 'ok' : 'muted'}>{hasAccount ? 'Akun portal terhubung' : 'Belum punya akun portal'}</Badge>
                            {!link.canViewAcademic ? <Badge tone="warn">Tanpa akses akademik</Badge> : null}
                            {!link.canViewFinance ? <Badge tone="warn">Tanpa akses keuangan</Badge> : null}
                            {link.validTo ? <Badge tone="warn">Berlaku s.d. {fmtDate(link.validTo)}</Badge> : null}
                            <span className="muted">Verifikasi: {link.verificationMethod === 'officer' ? 'petugas' : link.verificationMethod === 'admission' ? 'penerimaan' : link.verificationMethod === 'activation_code' ? 'kode aktivasi' : '—'}</span>
                          </div>
                          {canFamily && link.status === 'active' ? (
                            <details className="more" style={{ marginTop: 8 }}>
                              <summary>Kelola akses</summary>
                              <div className="grid grid--2" style={{ marginTop: 10 }}>
                                <div className="stack">
                                  {!hasAccount ? (
                                    <>
                                      <ActionButton action="wali.kode" back={`${base}?tab=keluarga`} hidden={{ link: link.id }} label="Buat kode aktivasi" icon="key" tone="ghost" small />
                                      <ActionForm action="akun.buat_untuk" back={`${base}?tab=keluarga`} hidden={{ link: link.id }}>
                                        <Field name="login" label="Atau buatkan akun (tanpa email sendiri)" placeholder="nama.pengguna" value={person.email ?? ''} hint="Untuk keluarga tanpa email; kata sandi sementara tampil sekali." />
                                        <Submit tone="ghost">Buat akun</Submit>
                                      </ActionForm>
                                    </>
                                  ) : null}
                                  <ActionForm action="wali.izin" back={`${base}?tab=keluarga`} hidden={{ link: link.id }}>
                                    <Check name="akademik" checked={link.canViewAcademic} label="Boleh melihat informasi akademik" />
                                    <Check name="keuangan" checked={link.canViewFinance} label="Boleh melihat tagihan" />
                                    <Check name="utama" checked={link.isPrimary} label="Kontak utama" />
                                    <Field name="berlaku_sampai" type="date" label="Berlaku sampai (opsional)" value={link.validTo ?? ''} />
                                    <Submit tone="ghost">Simpan hak akses</Submit>
                                  </ActionForm>
                                </div>
                                <div className="stack">
                                  <ActionForm action="wali.ubah" back={`${base}?tab=keluarga`} hidden={{ link: link.id }}>
                                    <Field name="nama" label="Nama" value={person.fullName} required />
                                    <Field name="telepon" label="Nomor HP" value={person.phone ?? ''} />
                                    <Field name="email" label="Email" type="email" value={person.email ?? ''} />
                                    <Field name="pekerjaan" label="Pekerjaan" value={person.occupation ?? ''} />
                                    <Field name="pendidikan" label="Pendidikan terakhir" value={person.education ?? ''} />
                                    <Submit tone="ghost">Simpan data wali</Submit>
                                  </ActionForm>
                                  <ActionForm action="wali.cabut" back={`${base}?tab=keluarga`} hidden={{ link: link.id }} confirm="Cabut relasi wali ini? Akses portal wali ke siswa ini akan berhenti.">
                                    <Field name="alasan" label="Alasan pencabutan" required />
                                    <Submit tone="danger">Cabut relasi</Submit>
                                  </ActionForm>
                                </div>
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon="users">Belum ada data orang tua/wali.</Empty>
                )}
              </Card>
              {canFamily || canWrite ? (
                <Card title="Tambah orang tua / wali">
                  <ActionForm action="wali.tambah" back={`${base}?tab=keluarga`} hidden={{ id }}>
                    <div className="f__row">
                      <Select name="hubungan" label="Hubungan" required empty="— pilih —" options={Object.entries(RELATIONS)} />
                      <Field name="nama" label="Nama lengkap" required />
                      <Field name="telepon" label="Nomor HP" />
                      <Field name="email" label="Email" type="email" />
                      <Field name="pekerjaan" label="Pekerjaan" />
                      <Field name="pendidikan" label="Pendidikan terakhir" />
                      <Field name="nik" label="NIK (opsional, terbatas)" inputMode="numeric" />
                    </div>
                    <Check name="utama" label="Jadikan kontak utama" />
                    <p className="small muted">Data yang dimasukkan petugas dari dokumen sekolah dicatat sebagai verifikasi petugas. Akses portal wali tetap memerlukan akun dan kode aktivasi.</p>
                    <div className="f__actions">
                      <Submit icon="plus">Tambah</Submit>
                    </div>
                  </ActionForm>
                </Card>
              ) : null}
            </>
          ) : null}

          {tab === 'dokumen' ? (
            <>
              <Card title="Dokumen siswa">
                {s.docs.length ? (
                  <table className="t">
                    <thead>
                      <tr>
                        <th>Jenis</th>
                        <th>Berkas</th>
                        <th>Diunggah</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {s.docs.map(({ doc, file }) => (
                        <tr key={doc.id}>
                          <td>{DOC_KINDS[doc.kind] ?? doc.kind}</td>
                          <td>
                            {file.originalName} <span className="muted small">({Math.round(file.size / 1024)} KB)</span>
                          </td>
                          <td>{fmtDateTime(doc.createdAt, ctx.tz)}</td>
                          <td className="actions">
                            <a className="btn btn--ghost btn--sm" href={fileUrl(file.id)!} target="_blank" rel="noopener">
                              Lihat
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty icon="file">Belum ada dokumen.</Empty>
                )}
              </Card>
              {canWrite ? (
                <Card title="Unggah dokumen">
                  <ActionForm action="siswa.dokumen" back={`${base}?tab=dokumen`} files hidden={{ id }}>
                    <div className="f__row">
                      <Select name="jenis" label="Jenis dokumen" required options={Object.entries(DOC_KINDS)} />
                      <FileField name="berkas" label="Berkas" required accept=".pdf,.jpg,.jpeg,.png" hint="Pasfoto JPG/PNG maks. 2 MB; dokumen PDF/JPG/PNG maks. 5 MB." />
                    </div>
                    <Field name="catatan" label="Catatan (opsional)" />
                    <div className="f__actions">
                      <Submit icon="upload">Unggah</Submit>
                    </div>
                  </ActionForm>
                </Card>
              ) : null}
            </>
          ) : null}

          {tab === 'kartu' ? (
            <Card title="Kartu siswa" actions={hasPerm(ctx, 'cards.manage') ? <Link href="/staf/kartu">Penerbitan kartu</Link> : null}>
              {studentCards.length ? (
                <table className="t">
                  <thead>
                    <tr>
                      <th>Nomor kartu</th>
                      <th>Status</th>
                      <th>Terbit</th>
                      <th>Berlaku sampai</th>
                      <th>Dicetak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentCards.map(({ card }) => (
                      <tr key={card.id}>
                        <td className="mono">{card.cardNo}</td>
                        <td>
                          <Status value={card.status} map={CARD_TONE} />
                        </td>
                        <td>{fmtDate(card.issuedAt, ctx.tz)}</td>
                        <td>{fmtDate(card.validUntil)}</td>
                        <td>{card.printedAt ? fmtDate(card.printedAt, ctx.tz) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty icon="card">Belum ada kartu yang diterbitkan.</Empty>
              )}
            </Card>
          ) : null}

          {tab === 'riwayat' ? (
            <>
              <Card title="Riwayat rombel">
                {s.history.length ? (
                  <table className="t">
                    <thead>
                      <tr>
                        <th>Tingkat</th>
                        <th>Rombel</th>
                        <th>Mulai</th>
                        <th>Selesai</th>
                        <th>Hasil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.history.map((h, i) => (
                        <tr key={i}>
                          <td>{h.grade}</td>
                          <td>{h.homeroom ?? '—'}</td>
                          <td>{fmtDate(h.placement?.validFrom ?? h.enrollment.startDate)}</td>
                          <td>{h.placement?.validTo ? fmtDate(h.placement.validTo) : 'sekarang'}</td>
                          <td>{h.enrollment.outcome ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty>Belum ada riwayat rombel.</Empty>
                )}
              </Card>
              <Card title="Usulan koreksi">
                {s.corrections.length ? (
                  <ul className="list">
                    {s.corrections.map((c) => (
                      <li key={c.id}>
                        <span className="mono small">{c.number}</span>
                        <span className="grow">{c.changes.map((x) => STUDENT_FIELDS.find((f) => f.key === x.field)?.label ?? x.field).join(', ')}</span>
                        <Status value={c.status} map={CORRECTION_TONE} />
                        <Link href={`/staf/siswa/koreksi/${c.id}`}>Lihat</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Belum ada usulan koreksi.</Empty>
                )}
              </Card>
              {audit.length ? (
                <Card title="Log perubahan (disamarkan)">
                  <ul className="timeline">
                    {audit.map((a) => (
                      <li key={a.id}>
                        <time>{fmtDateTime(a.occurredAt, ctx.tz)}</time>
                        {a.action}
                        {a.meta && 'fields' in a.meta ? <span className="muted small"> · {String(a.meta.fields)}</span> : null}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>

        <aside>
          <Card title="Status & verifikasi">
            <dl className="kv">
              <dt>Status siswa</dt>
              <dd>
                <Status value={s.student.status} map={STATUS_TONE} />
              </dd>
              <dt>Kelengkapan data</dt>
              <dd>
                {s.completeness.percent === 100 ? <Badge tone="ok">Lengkap</Badge> : <Badge tone="bad">{s.completeness.percent}%</Badge>}
              </dd>
              <dt>Verifikasi</dt>
              <dd>{s.student.verifiedAt ? <Badge tone="ok">Terverifikasi {fmtDate(s.student.verifiedAt, ctx.tz)}</Badge> : <Badge tone="warn">Belum</Badge>}</dd>
              <dt>Sumber data</dt>
              <dd>{{ admission: 'Penerimaan', import: 'Impor Excel', manual: 'Input manual', transfer_in: 'Mutasi masuk' }[s.student.entryVia] ?? s.student.entryVia}</dd>
              <dt>Terakhir diperbarui</dt>
              <dd>{fmtDateTime(s.student.updatedAt, ctx.tz)}</dd>
            </dl>
            <div style={{ margin: '12px 0' }}>
              <Progress value={s.completeness.percent} ok={s.completeness.percent === 100} />
            </div>
            {s.completeness.missing.length ? <p className="small muted">Belum ada: {s.completeness.missing.join(', ')}.</p> : null}
            {hasPerm(ctx, 'students.review') && !s.student.verifiedAt ? <ActionButton action="siswa.verifikasi" back={base} hidden={{ id }} label="Tandai terverifikasi" icon="check" /> : null}
          </Card>
          {canWrite ? (
            <>
              <Card title="Penempatan rombel">
                <ActionForm action="siswa.rombel" back={base} hidden={{ id }}>
                  <Select name="rombel" label={`Rombel ${year?.name ?? ''}`} value={s.placement?.homeroomId ?? ''} required empty="— pilih —" options={rooms.map((r) => [r.h.id, r.h.name])} />
                  <Field name="tanggal" type="date" label="Berlaku mulai" value={today(ctx.tz, ctx.now)} />
                  <Submit tone="ghost">Simpan penempatan</Submit>
                </ActionForm>
              </Card>
              <Card title="Ubah status siswa">
                <ActionForm action="siswa.status" back={base} hidden={{ id }} confirm="Ubah status siswa? Siswa yang keluar/pindah/lulus diakhiri penempatan rombelnya.">
                  <Select name="status" label="Status" value={s.student.status} options={Object.entries(STUDENT_STATUS)} />
                  <Field name="tanggal" type="date" label="Tanggal" value={today(ctx.tz, ctx.now)} />
                  <Field name="alasan" label="Keterangan (mis. pindah ke sekolah lain)" />
                  <Submit tone="ghost">Simpan status</Submit>
                </ActionForm>
              </Card>
              {canFamily && !s.student.accountId ? (
                <Card title="Akun portal siswa">
                  <ActionForm action="akun.buat_untuk" back={base} hidden={{ siswa: id }}>
                    <Field name="login" label="Nama pengguna siswa" placeholder={`siswa.${s.student.nis ?? 'nis'}`} required />
                    <Submit tone="ghost">Buat akun siswa</Submit>
                  </ActionForm>
                </Card>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </>
  )
}
