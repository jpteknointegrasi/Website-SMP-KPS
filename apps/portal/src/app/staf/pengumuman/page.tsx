import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { gradeLevels } from '@/db/schema'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { AUDIENCE_LABEL, manageList, staffFeed } from '@/modules/comms/service'
import { activeYear, myHomerooms } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { fmtDateTime } from '@/server/time'
import { ANN_TONE } from '@/ui/tones'
import { ActionButton, ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, Progress, Select, sp1, Status, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Pengumuman' }

/** M13: announcements for staff (inbox) and authoring with audience, scheduling and acknowledgement tracking. */
export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/pengumuman', ['announcements.publish', 'teach'], 'pengumuman')
  const sp = await searchParams
  const wide = hasPerm(ctx, 'announcements.publish')
  const own = await myHomerooms(ctx)
  const canWrite = wide || own.length > 0
  const tab = sp1(sp, 'tab') ?? (canWrite ? 'kelola' : 'masuk')
  const inbox = tab === 'masuk' ? await staffFeed(ctx) : []
  const list = tab === 'kelola' && canWrite ? await manageList(ctx) : []
  const year = await activeYear(ctx.db)
  const rooms = wide && year ? (await homeroomsOfYear(ctx, year.id)).map((r) => r.h) : own
  const levels = wide ? await ctx.db.select().from(gradeLevels).orderBy(asc(gradeLevels.ordinal)) : []
  const base = '/staf/pengumuman'
  const audiences = wide ? (Object.entries(AUDIENCE_LABEL) as [string, string][]) : ([['homerooms', 'Rombel saya']] as [string, string][])
  return (
    <>
      <PageHead title="Pengumuman" sub="Pengumuman terarah ke warga sekolah. Penerima mendapat notifikasi di portal saat pengumuman terbit." />
      <Flash sp={sp} />
      <Tabs
        current={`${base}?tab=${tab}`}
        items={[...(canWrite ? ([['Kelola pengumuman', `${base}?tab=kelola`]] as [string, string][]) : []), ['Untuk saya', `${base}?tab=masuk`]]}
      />
      {tab === 'masuk' ? (
        <Card>
          {inbox.length ? (
            <ul className="list">
              {inbox.map(({ a, r }) => (
                <li key={a.id} className={a.pinned ? 'pin' : undefined}>
                  <Link className="grow" href={`${base}/${a.id}`}>
                    {r.readAt ? a.title : <strong>{a.title}</strong>}
                  </Link>
                  {a.requiresAck && !r.ackAt ? <Badge tone="warn">Perlu konfirmasi</Badge> : null}
                  <span className="small muted">{fmtDateTime(a.publishedAt, ctx.tz)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="megaphone">Belum ada pengumuman untuk Anda.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'kelola' && canWrite ? (
        <div className="grid grid--side">
          <Card title="Pengumuman" flush>
            {list.length ? (
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Judul</th>
                      <th>Sasaran</th>
                      <th style={{ minWidth: 150 }}>Dibaca</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <Link href={`${base}/${a.id}`}>
                            <strong>{a.title}</strong>
                          </Link>
                          <div className="small muted">
                            {a.createdByName} · {a.publishedAt ? fmtDateTime(a.publishedAt, ctx.tz) : a.publishAt ? `terjadwal ${fmtDateTime(a.publishAt, ctx.tz)}` : fmtDateTime(a.createdAt, ctx.tz)}
                          </div>
                        </td>
                        <td className="small">
                          {AUDIENCE_LABEL[a.audience.type]}
                          {a.pinned ? <Badge tone="brand">Disematkan</Badge> : null}
                        </td>
                        <td>
                          {a.stats.total ? (
                            <>
                              <Progress value={Math.round((a.stats.read / a.stats.total) * 100)} />
                              <span className="small muted">
                                {a.stats.read}/{a.stats.total}
                                {a.requiresAck ? ` · ${a.stats.ack} konfirmasi` : ''}
                              </span>
                            </>
                          ) : (
                            <span className="small muted">—</span>
                          )}
                        </td>
                        <td>
                          <Status value={a.status} map={ANN_TONE} />
                        </td>
                        <td className="actions">{a.status !== 'archived' ? <ActionButton action="pengumuman.arsip" back={base} hidden={{ id: a.id }} label="Arsipkan" tone="ghost" small /> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="megaphone">Belum ada pengumuman.</Empty>
            )}
          </Card>
          <Card title="Tulis pengumuman">
            <ActionForm action="pengumuman.simpan" back={base} files op>
              <Field name="judul" label="Judul" required maxLength={200} />
              <TextArea name="isi" label="Isi" rows={7} required maxLength={20000} />
              <Select name="sasaran" label="Sasaran" options={audiences} value={wide ? 'families' : 'homerooms'} />
              {rooms.length ? (
                <fieldset className="fld" style={{ border: 0, padding: 0 }}>
                  <span>Rombel (untuk sasaran &quot;Rombel tertentu&quot;)</span>
                  <div className="row">
                    {rooms.map((r) => (
                      <Check key={r.id} name="rombel" value={r.id} label={r.name} checked={!wide && own.length === 1} />
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {levels.length ? (
                <fieldset className="fld" style={{ border: 0, padding: 0 }}>
                  <span>Tingkat (untuk sasaran &quot;Tingkat tertentu&quot;)</span>
                  <div className="row">
                    {levels.map((l) => (
                      <Check key={l.id} name="tingkat" value={l.id} label={`Kelas ${l.name}`} />
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <Field name="terbit" label="Jadwalkan terbit (opsional)" type="datetime-local" />
              <Check name="konfirmasi" label="Minta konfirmasi telah membaca (orang tua)" />
              {wide ? <Check name="sematkan" label="Sematkan di atas" /> : null}
              <label className="fld">
                <span>Lampiran (PDF/gambar, maks. 5)</span>
                <input type="file" name="berkas" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" />
              </label>
              <div className="f__actions">
                <Submit name="aksi" value="terbit" icon="megaphone">
                  Terbitkan
                </Submit>
                <Submit name="aksi" value="draf" tone="ghost">
                  Simpan draf
                </Submit>
              </div>
            </ActionForm>
          </Card>
        </div>
      ) : null}
    </>
  )
}
