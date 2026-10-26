import Link from 'next/link'
import { staffPage, requestModules } from '@/server/request'
import { staffQueues } from '@/modules/queues'
import '@/modules/register'
import { STAFF_NAV } from '@/ui/shell'
import { moduleOpen } from '@/server/settings'
import { Icon } from '@/ui/icons'
import { Card, Empty, Flash, PageHead, type SP } from '@/ui/kit'
import { fmtDayDate, today } from '@/server/time'

export const metadata = { title: 'Beranda staf' }

export default async function StaffHome({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf')
  const sp = await searchParams
  const modules = (await requestModules())!
  const queues = await staffQueues(ctx)
  const tiles = STAFF_NAV.flatMap((g) => g.items)
    .filter((i) => i.href !== '/staf')
    .filter((i) => (!i.mod || moduleOpen(modules, i.mod, 'staff')) && (!i.perms || i.perms.some((p) => ctx.staff.perms.has(p))))
  return (
    <>
      <PageHead title={`Selamat datang, ${ctx.staff.name}`} sub={fmtDayDate(today(ctx.tz, ctx.now))} />
      <Flash sp={sp} />
      {ctx.staff.roles.size === 0 ? (
        <div className="notice notice--info">
          <div>
            <strong>Akun Anda belum memiliki peran di portal.</strong>
            Minta Admin App sekolah memberi peran (misalnya Guru, Tata Usaha, atau Panitia PPDB) agar menu yang sesuai muncul.
          </div>
        </div>
      ) : null}
      <div className="grid grid--side">
        <Card title="Akses cepat">
          {tiles.length ? (
            <div className="grid grid--3">
              {tiles.map((t) => (
                <Link key={t.href} className="tile" href={t.href}>
                  <Icon name={t.icon} />
                  <span>
                    <strong>{t.label}</strong>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>Belum ada modul yang dapat Anda akses.</Empty>
          )}
        </Card>
        <Card title="Antrean tindakan">
          {queues.length ? (
            <ul className="list">
              {queues.map((q) => (
                <li key={q.href + q.label}>
                  <span className={`b b--${q.tone ?? 'info'}`}>
                    <Icon name={q.icon} className="" />
                  </span>
                  <Link className="grow" href={q.href}>
                    {q.label}
                  </Link>
                  <strong>{q.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="checkCircle">Tidak ada yang menunggu tindakan Anda.</Empty>
          )}
        </Card>
      </div>
    </>
  )
}
