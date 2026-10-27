import { eq, inArray } from 'drizzle-orm'
import { files, submissions, tasks } from '@/db/schema'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { CATEGORIES, STATUS, staffList } from '@/modules/works/service'
import { activeYear, homeroomStudents, myHomerooms } from '@/modules/scope'
import { homeroomsOfYear } from '@/modules/academic/service'
import { loadAssignment, myClasses } from '@/modules/learning/service'
import { canTeach } from '@/modules/schedule/service'
import { fmtDate, today } from '@/server/time'
import { ActionForm, Badge, Card, Check, Empty, Field, Flash, PageHead, Select, sp1, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Karya siswa untuk website' }

const TONE: Record<string, 'warn' | 'info' | 'ok' | 'muted' | 'bad'> = { awaiting_consent: 'warn', consented: 'info', imported: 'ok', refused: 'muted', withdrawn: 'bad' }

/** KRY-01: propose student works for the website; guardians consent; the website moderates imported drafts. */
export default async function Works({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/karya', ['teach', 'student_affairs'], 'kesiswaan')
  const sp = await searchParams
  const list = await staffList(ctx)
  const d = today(ctx.tz, ctx.now)
  const pool = new Map<string, string>()
  const affairs = hasPerm(ctx, 'student_affairs')
  const year = await activeYear(ctx.db)
  const rooms = affairs && year ? (await homeroomsOfYear(ctx, year.id)).map((r) => r.h) : await myHomerooms(ctx)
  for (const h of rooms) for (const s of await homeroomStudents(ctx.db, h.id, d)) pool.set(s.studentId, `${s.name} (${h.name})`)
  for (const c of await myClasses(ctx)) {
    const a = await loadAssignment(ctx.db, c.a.id)
    for (const s of await homeroomStudents(ctx.db, a.a.homeroomId, d)) if (!pool.has(s.studentId)) pool.set(s.studentId, `${s.name} (${a.homeroom})`)
  }
  // prefill from a task submission (images only, teacher of that class)
  const subId = sp1(sp, 'kiriman')
  const [sub] = subId && /^[0-9a-f-]{36}$/.test(subId) ? await ctx.db.select({ s: submissions, t: tasks }).from(submissions).innerJoin(tasks, eq(tasks.id, submissions.taskId)).where(eq(submissions.id, subId)) : []
  const subOk = sub && (await canTeach(ctx.db, ctx, sub.t.assignmentId))
  const subImages = subOk && sub!.s.fileIds.length ? (await ctx.db.select().from(files).where(inArray(files.id, sub!.s.fileIds))).filter((f) => f.mime.startsWith('image/')) : []
  return (
    <>
      <PageHead title="Karya siswa untuk website" sub="Usulkan karya siswa ke website sekolah. Orang tua memberi izin di portal, lalu redaksi website meninjau sebelum terbit." />
      <Flash sp={sp} />
      <div className="grid grid--side">
        <Card title="Usulan" flush>
          {list.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Karya</th>
                    <th>Siswa</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ w, name }) => (
                    <tr key={w.id} style={{ verticalAlign: 'top' }}>
                      <td>
                        <strong>{w.title}</strong>
                        <div className="small muted">
                          {CATEGORIES[w.category as keyof typeof CATEGORIES]} · tampil sebagai “{w.publicName}” · {fmtDate(w.createdAt, ctx.tz, true)}
                        </div>
                      </td>
                      <td>{name}</td>
                      <td>
                        <Badge tone={TONE[w.status] ?? 'muted'}>{STATUS[w.status as keyof typeof STATUS] ?? w.status}</Badge>
                        {affairs && w.status === 'awaiting_consent' ? (
                          <details className="more">
                            <summary className="small">Catat izin tertulis</summary>
                            <ActionForm action="karya.izin" back="/staf/karya" hidden={{ id: w.id, keputusan: 'setuju' }}>
                              <Field name="catatan" label="Bukti izin (mis. formulir tgl …)" required />
                              <Submit tone="ghost">Catat</Submit>
                            </ActionForm>
                          </details>
                        ) : null}
                        {affairs && ['consented', 'imported'].includes(w.status) ? (
                          <ActionForm action="karya.tarik" back="/staf/karya" hidden={{ id: w.id }} className="inline" confirm="Tarik izin publikasi karya ini?">
                            <button className="linkbtn small" type="submit">
                              Tarik dari website
                            </button>
                          </ActionForm>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="star">Belum ada usulan karya.</Empty>
          )}
        </Card>
        <Card title="Usulkan karya">
          {pool.size ? (
            <ActionForm action="karya.usul" back="/staf/karya" files op hidden={{ kiriman: subOk ? subId : null }}>
              <Select name="siswa" label="Siswa" value={subOk ? sub!.s.studentId : null} options={[...pool].sort((a, b) => a[1].localeCompare(b[1]))} required />
              <Field name="judul" label="Judul karya" value={subOk ? sub!.t.title : null} required maxLength={140} />
              <Select name="kategori" label="Kategori" options={Object.entries(CATEGORIES)} />
              <TextArea name="deskripsi" label="Deskripsi untuk pembaca website" rows={4} required />
              <Field name="nama_publik" label="Nama yang boleh tampil" placeholder="Alya P., kelas VII — atau: Siswa kelas VII" required />
              <Field name="pembimbing" label="Pembimbing (opsional)" value={ctx.staff.name} />
              {subImages.length ? (
                <fieldset className="fld" style={{ border: 0, padding: 0 }}>
                  <span>Gambar dari pengumpulan tugas</span>
                  {subImages.map((f) => (
                    <Check key={f.id} name="berkas_kiriman" value={f.id} label={f.originalName} checked />
                  ))}
                </fieldset>
              ) : null}
              <label className="fld">
                <span>Foto karya (JPG/PNG/WebP, maks. 6)</span>
                <input type="file" name="foto" multiple accept=".jpg,.jpeg,.png,.webp" />
              </label>
              <p className="small muted">Hindari foto wajah siswa kecuali memang disetujui. Orang tua menerima notifikasi untuk memberi izin.</p>
              <Submit>Kirim usulan</Submit>
            </ActionForm>
          ) : (
            <p className="small muted">Usulan dapat dibuat untuk siswa di kelas yang Anda ajar atau walikan.</p>
          )}
        </Card>
      </div>
    </>
  )
}
