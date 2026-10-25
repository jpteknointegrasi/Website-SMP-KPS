import Link from 'next/link'
import { listEvents } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination, DemoBadge } from '@/components/ui/bits'
import { EVENT_STATUS, TZ, dayParts, formatEventWhen } from '@/lib/format'
import type { Event } from '@/payload-types'

export const metadata = { title: 'Agenda', description: 'Kalender kegiatan SMP Nasional KPS (waktu WITA).', alternates: { canonical: '/agenda' } }
type SP = { searchParams: Promise<{ waktu?: string; status?: string; page?: string }> }

const monthLabel = (iso: string) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, month: 'long', year: 'numeric' }).format(new Date(iso))

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const past = sp.waktu === 'lalu'
  const status = sp.status && sp.status in EVENT_STATUS ? sp.status : undefined
  const page = Math.max(1, Number(sp.page) || 1)
  const startOfToday = new Date(Date.now() - 12 * 3600_000).toISOString()
  const res = await listEvents({ from: past ? undefined : startOfToday, to: past ? startOfToday : undefined, status, page, sort: past ? '-startAt' : 'startAt' })
  const events = res.docs as Event[]

  const groups = new Map<string, Event[]>()
  events.forEach((e) => {
    const k = monthLabel(e.startAt)
    groups.set(k, [...(groups.get(k) ?? []), e])
  })
  const q = (o: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ waktu: past ? 'lalu' : undefined, status, ...o }).filter(([, v]) => v) as [string, string][]).toString()
    return s ? `/agenda?${s}` : '/agenda'
  }

  return (
    <>
      <PageHeader title="Agenda Sekolah" lead="Jadwal kegiatan dalam Waktu Indonesia Tengah (WITA). Tambahkan ke kalender Anda dari halaman detail." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Agenda' }]} />
      <section className="section">
        <Container>
          <nav className="filters" aria-label="Rentang waktu">
            <Link className="chip" href={q({ waktu: undefined })} aria-current={!past ? 'true' : undefined}>Mendatang</Link>
            <Link className="chip" href={q({ waktu: 'lalu' })} aria-current={past ? 'true' : undefined}>Sudah lewat</Link>
          </nav>
          <nav className="filters" aria-label="Status kegiatan">
            <Link className="chip" href={q({ status: undefined })} aria-current={!status ? 'true' : undefined}>Semua status</Link>
            {Object.entries(EVENT_STATUS).map(([k, v]) => (
              <Link key={k} className="chip" href={q({ status: k })} aria-current={status === k ? 'true' : undefined}>{v}</Link>
            ))}
          </nav>
          {events.length ? (
            [...groups.entries()].map(([month, list]) => (
              <div key={month} className="block">
                <h2 className="agenda-month">{month}</h2>
                <ul className="ev-list">
                  {list.map((e) => {
                    const d = dayParts(e.startAt)
                    return (
                      <li key={e.id}>
                        <Link href={`/agenda/${e.slug}`} className={`ev ev--${e.eventStatus}`}>
                          <span className="ev__date"><b>{d.day}</b><small>{d.month}</small></span>
                          <span className="ev__body">
                            <strong>{e.title} <DemoBadge show={e.isDemo} /></strong>
                            <span>{formatEventWhen(e)}{e.location ? ` · ${e.location}` : ''}</span>
                            {e.eventStatus !== 'scheduled' ? <span className={`badge badge--${e.eventStatus}`}>{EVENT_STATUS[e.eventStatus]}</span> : null}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          ) : (
            <EmptyState title="Belum ada agenda" text={past ? 'Belum ada kegiatan lampau yang tercatat untuk filter ini.' : 'Belum ada kegiatan mendatang yang diumumkan untuk filter ini.'} action={{ label: 'Lihat semua agenda', href: '/agenda' }} />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/agenda" params={{ waktu: past ? 'lalu' : undefined, status }} />
        </Container>
      </section>
    </>
  )
}
