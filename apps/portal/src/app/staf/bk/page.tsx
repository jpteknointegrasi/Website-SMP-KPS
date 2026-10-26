import Link from 'next/link'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { CATEGORIES, caseList, homeroomShared, STATUS } from '@/modules/counseling/service'
import { myHomerooms, homeroomStudents } from '@/modules/scope'
import { myClasses } from '@/modules/learning/service'
import { loadAssignment } from '@/modules/learning/service'
import { fmtDateTime, today } from '@/server/time'
import { ActionForm, Badge, Card, Empty, Flash, Notice, PageHead, Select, sp1, Stat, Submit, Tabs, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Bimbingan & Konseling' }

const ST_TONE: Record<string, 'info' | 'warn' | 'ok' | 'muted'> = { new: 'warn', assigned: 'info', in_progress: 'info', closed: 'ok' }

/** BK-01: counsellor queue (restricted) / referral and shared summaries for teachers. */
export default async function Counseling({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/bk', ['counseling', 'counseling.coordinate', 'teach'], 'bk')
  const sp = await searchParams
  const counselor = hasPerm(ctx, 'counseling')
  const tab = sp1(sp, 'tab') ?? (counselor ? 'antrean' : 'rujukan')
  const list = counselor && tab !== 'rujukan' ? await caseList(ctx, { status: tab === 'selesai' ? 'closed' : undefined }) : []
  const shared = tab === 'rujukan' ? await homeroomShared(ctx) : []
  // students the teacher may refer: own homerooms and classes
  const d = today(ctx.tz, ctx.now)
  const pool = new Map<string, string>()
  if (tab === 'rujukan') {
    for (const h of await myHomerooms(ctx)) for (const s of await homeroomStudents(ctx.db, h.id, d)) pool.set(s.studentId, `${s.name} (${h.name})`)
    for (const c of await myClasses(ctx)) {
      const a = await loadAssignment(ctx.db, c.a.id)
      for (const s of await homeroomStudents(ctx.db, a.a.homeroomId, d)) if (!pool.has(s.studentId)) pool.set(s.studentId, `${s.name} (${a.homeroom})`)
    }
  }
  const base = '/staf/bk'
  return (
    <>
      <PageHead title="Bimbingan & Konseling" sub={counselor ? 'Catatan sesi bersifat rahasia — hanya terlihat oleh konselor yang menangani dan koordinator BK.' : 'Rujuk siswa ke guru BK dan lihat ringkasan yang dibagikan kepada wali kelas.'} />
      <Flash sp={sp} />
      {counselor ? (
        <>
          <div className="grid grid--3" style={{ marginBottom: 16 }}>
            <Stat icon="inbox" tone="warn" label="Permintaan baru" value={list.filter((c) => c.c.status === 'new').length} />
            <Stat icon="alert" tone="bad" label="Segera" value={list.filter((c) => c.c.urgency === 'segera' && c.c.status !== 'closed').length} />
            <Stat icon="heart" label="Ditangani saya" value={list.filter((c) => c.c.assignedTo === ctx.staff.id && c.c.status !== 'closed').length} />
          </div>
          <Tabs
            current={`${base}?tab=${tab}`}
            items={[
              ['Antrean & kasus aktif', `${base}?tab=antrean`],
              ['Selesai', `${base}?tab=selesai`],
              ['Rujuk siswa', `${base}?tab=rujukan`],
            ]}
          />
        </>
      ) : null}
      {tab !== 'rujukan' && counselor ? (
        <Card flush>
          {list.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Nomor</th>
                    <th>Siswa</th>
                    <th>Kategori</th>
                    <th>Konselor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ c, student, counselor: who }) => (
                    <tr key={c.id}>
                      <td className="mono">
                        <Link href={`${base}/${c.id}`}>{c.number}</Link>
                        <div className="small muted">{fmtDateTime(c.createdAt, ctx.tz)}</div>
                      </td>
                      <td>{student}</td>
                      <td>
                        {CATEGORIES[c.category as keyof typeof CATEGORIES] ?? c.category}
                        {c.urgency === 'segera' ? <Badge tone="bad">Segera</Badge> : null}
                      </td>
                      <td className="small">{who ?? '—'}</td>
                      <td>
                        <Badge tone={ST_TONE[c.status] ?? 'muted'}>{STATUS[c.status as keyof typeof STATUS] ?? c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="heart">Tidak ada kasus.</Empty>
          )}
        </Card>
      ) : null}
      {tab === 'rujukan' ? (
        <div className="grid grid--side">
          <Card title="Rujukan & ringkasan untuk saya">
            {shared.length ? (
              <ul className="list">
                {shared.map(({ c, student }) => (
                  <li key={c.id}>
                    <Link className="grow" href={`${base}/${c.id}`}>
                      <strong>{student}</strong> · {CATEGORIES[c.category as keyof typeof CATEGORIES]}
                      <div className="small muted mono">{c.number}</div>
                    </Link>
                    <Badge tone={ST_TONE[c.status] ?? 'muted'}>{STATUS[c.status as keyof typeof STATUS]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="heart">Belum ada rujukan atau ringkasan yang dibagikan.</Empty>
            )}
          </Card>
          <Card title="Rujuk siswa ke BK">
            {pool.size ? (
              <ActionForm action="bk.ajukan" back={`${base}?tab=rujukan`} op>
                <Select name="siswa" label="Siswa" options={[...pool].sort((a, b) => a[1].localeCompare(b[1]))} required />
                <Select name="kategori" label="Kategori" options={Object.entries(CATEGORIES)} />
                <Select
                  name="urgensi"
                  label="Urgensi"
                  options={[
                    ['normal', 'Biasa'],
                    ['segera', 'Segera'],
                  ]}
                />
                <TextArea name="cerita" label="Alasan rujukan (pengamatan, bukan penilaian)" rows={4} required maxLength={3000} />
                <Submit>Kirim rujukan</Submit>
              </ActionForm>
            ) : (
              <Notice tone="info">Rujukan dapat diajukan untuk siswa di kelas yang Anda ajar atau walikan.</Notice>
            )}
          </Card>
        </div>
      ) : null}
    </>
  )
}
