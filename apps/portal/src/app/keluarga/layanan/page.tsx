import Link from 'next/link'
import { accountPage } from '@/server/request'
import { catalogue, myRequests } from '@/modules/services/service'
import { familyStudents } from '@/modules/family'
import { fmtDate } from '@/server/time'
import { SERVICE_TONE } from '@/ui/tones'
import { ActionForm, Card, Empty, Field, FileField, Flash, PageHead, Select, sp1, Status, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Layanan sekolah' }

/** LAY-01 family: request letters & administrative services, follow their progress. */
export default async function FamilyServices({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/layanan', 'layanan')
  const sp = await searchParams
  const types = await catalogue(ctx.db)
  const kids = await familyStudents(ctx)
  const mine = await myRequests(ctx)
  const t = types.find((x) => x.id === sp1(sp, 'jenis'))
  return (
    <>
      <PageHead title="Layanan sekolah" sub="Ajukan surat dan layanan administrasi ke tata usaha, lalu pantau prosesnya di sini." />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <div className="stack">
          <Card title="Permohonan saya" flush>
            {mine.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Nomor</th>
                      <th>Layanan</th>
                      <th>Target</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mine.map(({ r, type, student }) => (
                      <tr key={r.id}>
                        <td className="mono">
                          <Link href={`/keluarga/layanan/${r.id}`}>{r.number}</Link>
                        </td>
                        <td>
                          {type}
                          <div className="small muted">{student ?? ''}</div>
                        </td>
                        <td className="nowrap">{fmtDate(r.dueAt, ctx.tz, true)}</td>
                        <td>
                          <Status value={r.status} map={SERVICE_TONE} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="inbox">Belum ada permohonan.</Empty>
            )}
          </Card>
        </div>
        <Card title={t ? t.name : 'Ajukan layanan'}>
          {!t ? (
            <ul className="list">
              {types.map((x) => (
                <li key={x.id}>
                  <span className="grow">
                    <strong>{x.name}</strong>
                    <div className="small muted">
                      {x.description} · ±{x.slaDays} hari kerja
                    </div>
                  </span>
                  <Link className="btn btn--ghost btn--sm" href={`/keluarga/layanan?jenis=${x.id}`}>
                    Pilih
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ActionForm action="layanan.ajukan" back={`/keluarga/layanan?jenis=${t.id}`} hidden={{ jenis: t.id }} files op>
              {t.description ? <p className="small muted">{t.description}</p> : null}
              {kids.length ? <Select name="siswa" label="Siswa" options={kids.map((k) => [k.studentId, k.name])} required={t.category === 'surat'} empty={t.category === 'surat' ? undefined : '— tidak terkait siswa tertentu —'} /> : null}
              {t.questions.map((q) => (
                <Field key={q.key} name={`q_${q.key}`} label={q.label} required={q.required} maxLength={2000} />
              ))}
              <FileField name="berkas" label={t.requiresFile ? 'Lampiran (wajib)' : 'Lampiran (opsional)'} required={t.requiresFile} accept=".pdf,.jpg,.jpeg,.png" hint="PDF atau foto, maks. 5 MB." />
              <div className="f__actions">
                <Submit icon="arrowRight">Kirim permohonan</Submit>
                <Link className="btn btn--ghost" href="/keluarga/layanan">
                  Batal
                </Link>
              </div>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  )
}
