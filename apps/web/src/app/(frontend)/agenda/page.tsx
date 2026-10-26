import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { listEvents, listEventCategories, listEventsInRange, getFlags } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination, DemoBadge } from '@/components/ui/bits'
import { AUDIENCE, EVENT_AUDIENCE, EVENT_STATUS, dayParts, formatEventWhen, formatTime } from '@/lib/format'
import { requestTimezone, zoneLong } from '@/lib/tz'
import { eventDayKeys, localYmd, monthGrid, parseMonth, shiftMonth, ymKey } from '@/lib/calendar'
import type { Event, EventCategory } from '@/payload-types'
import { AppCalendar } from '@/components/sections/portal'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Agenda & Kalender Akademik', description: `Kalender kegiatan ${name}: akademik, ujian, libur, penerimaan dan kegiatan sekolah.`, alternates: { canonical: '/agenda' } }))
type SP = { searchParams: Promise<{ waktu?: string; status?: string; page?: string; tampilan?: string; bulan?: string; kategori?: string; sasaran?: string }> }

const monthLabel = (iso: string) => new Intl.DateTimeFormat('id-ID', { timeZone: requestTimezone(), month: 'long', year: 'numeric' }).format(new Date(iso))
const longDay = (key: string) => new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(key + 'T00:00:00Z'))
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const catOf = (e: Event) => (e.category && typeof e.category === 'object' ? (e.category as EventCategory) : null)

const EventRow = ({ e }: { e: Event }) => {
  const d = dayParts(e.startAt)
  const cat = catOf(e)
  return (
    <li>
      <Link href={`/agenda/${e.slug}`} className={`ev ev--${e.eventStatus}`}>
        <span className="ev__date"><b>{d.day}</b><small>{d.month}</small></span>
        <span className="ev__body">
          <strong>{e.title} <DemoBadge show={e.isDemo} /></strong>
          <span>{formatEventWhen(e)}{e.location ? ` · ${e.location}` : ''}</span>
          <span className="ev__tags">
            {cat ? <span className={`tag tag--${cat.color ?? 'teal'}`}>{cat.title}</span> : null}
            {(e.audience ?? []).filter((a) => a !== 'semua').map((a) => <span key={a} className="tag tag--line">{AUDIENCE[a] ?? a}</span>)}
            {e.eventStatus !== 'scheduled' ? <span className={`badge badge--${e.eventStatus}`}>{EVENT_STATUS[e.eventStatus]}</span> : null}
          </span>
        </span>
      </Link>
    </li>
  )
}

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  const [flags, categories] = await Promise.all([getFlags(), listEventCategories()])
  const calendar = flags.calendarMonthView && sp.tampilan === 'kalender'
  const past = sp.waktu === 'lalu'
  const status = sp.status && sp.status in EVENT_STATUS ? sp.status : undefined
  const cat = categories.find((c) => c.slug === sp.kategori)
  const audience = sp.sasaran && (EVENT_AUDIENCE as readonly string[]).includes(sp.sasaran) ? sp.sasaran : undefined
  const month = parseMonth(sp.bulan)
  const page = Math.max(1, Number(sp.page) || 1)

  // shareable URLs: every filter lives in the query string; old `waktu`/`status` keep working
  const base = { tampilan: calendar ? 'kalender' : undefined, waktu: !calendar && past ? 'lalu' : undefined, status, kategori: cat?.slug, sasaran: audience, bulan: calendar ? ymKey(month.y, month.m) : undefined }
  const q = (o: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ ...base, ...o }).filter(([, v]) => v) as [string, string][]).toString()
    return s ? `/agenda?${s}` : '/agenda'
  }

  const filters = (
    <>
      {flags.calendarMonthView ? (
        <nav className="tabs" aria-label="Tampilan agenda">
          <Link className="tabs__item" href={q({ tampilan: undefined, bulan: undefined })} aria-current={!calendar ? 'page' : undefined}>Daftar</Link>
          <Link className="tabs__item" href={q({ tampilan: 'kalender', waktu: undefined, bulan: ymKey(month.y, month.m) })} aria-current={calendar ? 'page' : undefined}>Kalender</Link>
        </nav>
      ) : null}
      {categories.length ? (
        <nav className="filters" aria-label="Kategori">
          <Link className="chip" href={q({ kategori: undefined, page: undefined })} aria-current={!cat ? 'true' : undefined}>Semua kategori</Link>
          {categories.map((c) => (
            <Link key={c.id} className={`chip chip--${c.color ?? 'teal'}`} href={q({ kategori: c.slug, page: undefined })} aria-current={cat?.id === c.id ? 'true' : undefined}>{c.title}</Link>
          ))}
        </nav>
      ) : null}
      <nav className="filters" aria-label="Sasaran">
        <Link className="chip" href={q({ sasaran: undefined, page: undefined })} aria-current={!audience ? 'true' : undefined}>Semua sasaran</Link>
        {EVENT_AUDIENCE.map((a) => (
          <Link key={a} className="chip" href={q({ sasaran: a, page: undefined })} aria-current={audience === a ? 'true' : undefined}>{AUDIENCE[a]}</Link>
        ))}
      </nav>
    </>
  )

  if (calendar) {
    const grid = monthGrid(month.y, month.m)
    const events = await listEventsInRange({ from: grid.from, to: grid.to, category: cat?.id, audience, status })
    const byDay = new Map<string, Event[]>()
    events.forEach((e) => eventDayKeys(e).forEach((k) => byDay.set(k, [...(byDay.get(k) ?? []), e])))
    const today = localYmd(new Date())
    const prev = shiftMonth(month.y, month.m, -1)
    const next = shiftMonth(month.y, month.m, 1)
    const title = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(month.y, month.m - 1, 1)))
    const monthKeys = grid.cells.filter((c) => c.inMonth && byDay.has(c.key)).map((c) => c.key)
    return (
      <>
        <PageHeader title="Kalender Akademik" lead={`Kegiatan sekolah dalam ${zoneLong()}. Pilih tanggal atau kegiatan untuk detail dan tombol simpan ke kalender.`} crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Agenda', href: '/agenda' }, { label: 'Kalender' }]} />
        <section className="section">
          <Container>
            {filters}
            <div className="cal-nav">
              <Link className="btn btn--ghost btn--sm" href={q({ bulan: ymKey(prev.y, prev.m) })} aria-label="Bulan sebelumnya">‹ <span className="hide-sm">Sebelumnya</span></Link>
              <h2 className="cal-nav__title" aria-live="polite">{title}</h2>
              <Link className="btn btn--ghost btn--sm" href={q({ bulan: ymKey(next.y, next.m) })} aria-label="Bulan berikutnya"><span className="hide-sm">Berikutnya</span> ›</Link>
              <Link className="btn btn--teal btn--sm" href={q({ bulan: undefined })}>Hari ini</Link>
            </div>
            <table className="cal" aria-label={`Kalender ${title}`}>
              <thead>
                <tr>{WEEKDAYS.map((w) => <th key={w} scope="col">{w}</th>)}</tr>
              </thead>
              <tbody>
                {Array.from({ length: grid.cells.length / 7 }).map((_, w) => (
                  <tr key={w}>
                    {grid.cells.slice(w * 7, w * 7 + 7).map((c) => {
                      const list = byDay.get(c.key) ?? []
                      return (
                        <td key={c.key} className={`cal__cell${c.inMonth ? '' : ' is-out'}${c.key === today ? ' is-today' : ''}${list.length ? ' has-ev' : ''}`}>
                          <span className="cal__day">{c.inMonth && list.length ? <a href={`#hari-${c.key}`} aria-label={`${longDay(c.key)}: ${list.length} kegiatan`}>{c.day}</a> : c.day}</span>
                          <ul className="cal__evs">
                            {list.slice(0, 3).map((e) => {
                              const ct = catOf(e)
                              return (
                                <li key={e.id}>
                                  <Link href={`/agenda/${e.slug}`} className={`cal__ev tag--${ct?.color ?? 'teal'}${e.eventStatus !== 'scheduled' ? ` is-${e.eventStatus}` : ''}`} title={e.title}>
                                    {!e.allDay ? <time>{formatTime(e.startAt)}</time> : null} {e.title}
                                  </Link>
                                </li>
                              )
                            })}
                            {list.length > 3 ? <li className="cal__more">+{list.length - 3} lainnya</li> : null}
                          </ul>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="block">
              <h2>Kegiatan bulan ini</h2>
              {monthKeys.length ? (
                monthKeys.map((k) => (
                  <div key={k} id={`hari-${k}`} className="cal-day">
                    <h3>{longDay(k)}</h3>
                    <ul className="ev-list">{byDay.get(k)!.map((e) => <EventRow key={e.id} e={e} />)}</ul>
                  </div>
                ))
              ) : (
                <EmptyState title="Belum ada kegiatan bulan ini" text="Belum ada kegiatan terbit untuk bulan dan filter ini." action={{ label: 'Lihat agenda mendatang', href: '/agenda' }} />
              )}
            </div>
          </Container>
        </section>
      </>
    )
  }

  const startOfToday = new Date(Date.now() - 12 * 3600_000).toISOString()
  const res = await listEvents({ from: past ? undefined : startOfToday, to: past ? startOfToday : undefined, status, page, sort: past ? '-startAt' : 'startAt', category: cat?.id, audience })
  const events = res.docs as Event[]
  const groups = new Map<string, Event[]>()
  events.forEach((e) => {
    const k = monthLabel(e.startAt)
    groups.set(k, [...(groups.get(k) ?? []), e])
  })

  return (
    <>
      <PageHeader title="Agenda Sekolah" lead={`Jadwal kegiatan dalam ${zoneLong()}. Tambahkan ke kalender Anda dari halaman detail.`} crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Agenda' }]} />
      <section className="section">
        <Container>
          {filters}
          <nav className="filters" aria-label="Rentang waktu">
            <Link className="chip" href={q({ waktu: undefined, page: undefined })} aria-current={!past ? 'true' : undefined}>Mendatang</Link>
            <Link className="chip" href={q({ waktu: 'lalu', page: undefined })} aria-current={past ? 'true' : undefined}>Sudah lewat</Link>
          </nav>
          <nav className="filters" aria-label="Status kegiatan">
            <Link className="chip" href={q({ status: undefined, page: undefined })} aria-current={!status ? 'true' : undefined}>Semua status</Link>
            {Object.entries(EVENT_STATUS).map(([k, v]) => (
              <Link key={k} className="chip" href={q({ status: k, page: undefined })} aria-current={status === k ? 'true' : undefined}>{v}</Link>
            ))}
          </nav>
          {!past ? <AppCalendar /> : null}
          {events.length ? (
            [...groups.entries()].map(([m, list]) => (
              <div key={m} className="block">
                <h2 className="agenda-month">{m}</h2>
                <ul className="ev-list">{list.map((e) => <EventRow key={e.id} e={e} />)}</ul>
              </div>
            ))
          ) : (
            <EmptyState title="Belum ada agenda" text={past ? 'Belum ada kegiatan lampau yang tercatat untuk filter ini.' : 'Belum ada kegiatan mendatang yang diumumkan untuk filter ini.'} action={{ label: 'Lihat semua agenda', href: '/agenda' }} />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/agenda" params={{ waktu: past ? 'lalu' : undefined, status, kategori: cat?.slug, sasaran: audience }} />
        </Container>
      </section>
    </>
  )
}
