import { and, count, desc, eq, gte, isNull, like, lte, sql, type SQL } from 'drizzle-orm'
import { auditEvents, mailLog, outboxEvents, staffMembers, supportGrants } from '@/db/schema'
import { staffPage } from '@/server/request'
import { hasPerm } from '@/server/context'
import { fmtDateTime, parseLocalDateTime, today, addDays } from '@/server/time'
import { mailConfigured } from '@/server/mail'
import { ActionButton, ActionForm, Badge, Card, Empty, Field, Flash, Notice, PageHead, sp1, Stat, Submit, TextArea, type SP, Select } from '@/ui/kit'

export const metadata = { title: 'Audit & operasional' }

const mask = (s: string) => (s.length <= 3 ? `${s[0] ?? ''}**` : `${s.slice(0, Math.min(4, s.length - 2))}**`)

/** GOV-01: audit log (masked details), delivery queue health, support access grants. */
export default async function Audit({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/audit', ['audit.view'])
  const sp = await searchParams
  const from = sp1(sp, 'dari') || addDays(today(ctx.tz, ctx.now), -7)
  const to = sp1(sp, 'sampai') || today(ctx.tz, ctx.now)
  const mod = sp1(sp, 'modul') ?? ''
  const where: SQL[] = [gte(auditEvents.occurredAt, parseLocalDateTime(`${from}T00:00`, ctx.tz) ?? new Date(0)), lte(auditEvents.occurredAt, parseLocalDateTime(`${to}T23:59`, ctx.tz) ?? ctx.now)]
  if (mod) where.push(like(auditEvents.action, `${mod.replace(/[%_]/g, '')}.%`))
  const rows = await ctx.db.select().from(auditEvents).where(and(...where)).orderBy(desc(auditEvents.occurredAt)).limit(200)
  const staff = await ctx.db.select({ id: staffMembers.id, name: staffMembers.name }).from(staffMembers)
  const modules = (await ctx.db.select({ m: sql<string>`split_part(${auditEvents.action}, '.', 1)` }).from(auditEvents).groupBy(sql`1`)).map((r) => r.m)
  const [pending] = await ctx.db.select({ n: count() }).from(outboxEvents).where(and(isNull(outboxEvents.processedAt), eq(outboxEvents.dead, false)))
  const dead = await ctx.db.select().from(outboxEvents).where(eq(outboxEvents.dead, true)).orderBy(desc(outboxEvents.id)).limit(20)
  const [mails] = await ctx.db.select({ n: count() }).from(mailLog).where(gte(mailLog.createdAt, new Date(ctx.now.getTime() - 86_400_000)))
  const grants = await ctx.db.select().from(supportGrants).orderBy(desc(supportGrants.createdAt)).limit(10)
  const who = (t: string, id: string | null) => (t === 'staff' ? mask(staff.find((s) => s.id === id)?.name ?? 'staf') : t === 'account' ? 'keluarga**' : 'sistem')
  return (
    <>
      <PageHead title="Audit & operasional" sub="Log aktivitas (disamarkan), antrean pengiriman dan akses bantuan." />
      <Flash sp={sp} />
      <div className="grid grid--3" style={{ marginBottom: 18 }}>
        <Stat icon="inbox" label="Antrean pengiriman" value={pending!.n} note="Menunggu dikirim" />
        <Stat icon="alert" tone={dead.length ? 'bad' : 'ok'} label="Gagal terkirim" value={dead.length} note="Perlu dicoba ulang" />
        <Stat icon="megaphone" label="Email 24 jam" value={mails!.n} note={mailConfigured() ? 'via server email' : 'server email belum diatur'} />
      </div>
      <div className="grid grid--side">
        <Card title="Log aktivitas" flush>
          <form method="get" className="filters" style={{ padding: '16px 20px 0' }}>
            <Field name="dari" type="date" label="Dari" value={from} />
            <Field name="sampai" type="date" label="Sampai" value={to} />
            <label className="fld">
              <span>Modul</span>
              <select name="modul" defaultValue={mod}>
                <option value="">Semua modul</option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit">
              Terapkan
            </button>
          </form>
          {rows.length ? (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pengguna</th>
                    <th>Aksi</th>
                    <th>Objek</th>
                    <th>Detail (disamarkan)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="nowrap">{fmtDateTime(a.occurredAt, ctx.tz, { zone: false })}</td>
                      <td>{who(a.actorType, a.actorId)}</td>
                      <td className="mono small">{a.action}</td>
                      <td className="small">{a.objectType ?? '—'}</td>
                      <td className="small muted">{a.meta ? Object.keys(a.meta).join(', ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Tidak ada aktivitas pada rentang ini.</Empty>
          )}
        </Card>
        <div>
          <Card title="Backup & pemulihan">
            <p className="small">Database App sekolah dicadangkan oleh platform (point-in-time restore penyedia database). Uji pemulihan dilakukan pengelola platform secara berkala; minta laporan uji terakhir bila diperlukan.</p>
            <Notice tone="info">Ekspor data sekolah (portabilitas) dapat diminta ke pengelola platform.</Notice>
          </Card>
          {dead.length ? (
            <Card title="Pengiriman gagal">
              <ul className="list">
                {dead.map((e) => (
                  <li key={e.id}>
                    <span className="grow small">
                      {e.type} · {e.attempts}× · <span className="muted">{e.lastError}</span>
                    </span>
                    <ActionButton action="outbox.ulang" back="/staf/audit" hidden={{ id: e.id }} label="Coba ulang" small tone="ghost" />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {hasPerm(ctx, 'staff.manage') && !ctx.staff.platform ? (
            <Card title="Akses bantuan platform">
              <p className="small muted">Super Admin platform hanya dapat mengelola pengaturan, modul, staf & peran, dan melihat angka agregat; ia tidak dapat membuka data siswa atau keluarga. Beri akses baca Buku Induk sementara bila diminta untuk penanganan masalah.</p>
              {grants.length ? (
                <ul className="list">
                  {grants.map((g) => {
                    const active = !g.revokedAt && g.expiresAt > ctx.now
                    return (
                      <li key={g.id}>
                        <span className="grow small">
                          {g.operatorEmail} · {g.scope === 'data_siswa' ? 'operasional + Buku Induk' : 'operasional'} · s.d. {fmtDateTime(g.expiresAt, ctx.tz)}
                          <div className="muted">{g.reason}</div>
                        </span>
                        {active ? <ActionButton action="bantuan.cabut" back="/staf/audit" hidden={{ id: g.id }} label="Cabut" tone="danger-ghost" small /> : <Badge>Berakhir</Badge>}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              <ActionForm action="bantuan.beri" back="/staf/audit">
                <Field name="email" type="email" label="Email pengelola platform" required />
                <TextArea name="alasan" label="Alasan" required rows={2} />
                <Field name="jam" type="number" label="Durasi (jam)" value={4} min={1} max={72} />
                <Select
                  name="cakupan"
                  label="Cakupan"
                  options={[
                    ['operasional', 'Operasional saja (audit, antrean, dashboard agregat)'],
                    ['data_siswa', 'Termasuk melihat data Buku Induk (tanpa unduh berkas)'],
                  ]}
                />
                <Submit tone="ghost">Beri akses sementara</Submit>
              </ActionForm>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}
