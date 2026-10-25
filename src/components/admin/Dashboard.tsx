import type { Payload } from 'payload'
import React from 'react'
import { CountUp } from './CountUp'
import { AdminClock, AdminCountdown } from './Live'
import './dashboard.scss'

type Props = { payload: Payload; user?: { name?: string; role?: string } | null }

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin Teknis',
  editor: 'Editor / Humas',
  contributor: 'Kontributor',
  admissions: 'Petugas Pendaftaran',
}

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Makassar' }).format(new Date()))
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export async function Dashboard({ payload, user }: Props) {
  const now = new Date().toISOString()
  const safeCount = async (fn: () => Promise<{ totalDocs: number }>) => {
    try {
      return (await fn()).totalDocs
    } catch {
      return 0
    }
  }
  const [inReview, activeAnn, upcoming, newMsgs, drafts] = await Promise.all([
    safeCount(() => payload.count({ collection: 'posts', where: { workflowStatus: { equals: 'in_review' } }, overrideAccess: true })),
    safeCount(() =>
      payload.count({
        collection: 'announcements',
        where: { and: [{ _status: { equals: 'published' } }, { displayStart: { less_than_equal: now } }, { or: [{ displayEnd: { exists: false } }, { displayEnd: { greater_than: now } }] }] },
        overrideAccess: true,
      }),
    ),
    safeCount(() => payload.count({ collection: 'events', where: { and: [{ _status: { equals: 'published' } }, { startAt: { greater_than_equal: now } }] }, overrideAccess: true })),
    safeCount(() => payload.count({ collection: 'contact-messages', where: { status: { equals: 'new' } }, overrideAccess: true })),
    safeCount(() => payload.count({ collection: 'posts', where: { _status: { equals: 'draft' } }, overrideAccess: true })),
  ])

  const role = user?.role ?? ''
  const editorial = role === 'admin' || role === 'editor'
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString()
  const safeFind = async <T,>(fn: () => Promise<{ docs: unknown[] }>) => {
    try {
      return (await fn()).docs as T[]
    } catch {
      return [] as T[]
    }
  }
  const [nextEvents, expiring, activity] = await Promise.all([
    safeFind<{ id: number; title: string; startAt: string; allDay?: boolean; eventStatus?: string }>(() =>
      payload.find({ collection: 'events', where: { and: [{ _status: { equals: 'published' } }, { startAt: { greater_than_equal: now } }] }, sort: 'startAt', limit: 3, depth: 0, overrideAccess: true }),
    ),
    safeFind<{ id: number; title: string; displayEnd: string }>(() =>
      payload.find({
        collection: 'announcements',
        where: { and: [{ _status: { equals: 'published' } }, { displayEnd: { greater_than: now } }, { displayEnd: { less_than_equal: in7 } }] },
        sort: 'displayEnd',
        limit: 4,
        depth: 0,
        overrideAccess: true,
      }),
    ),
    editorial
      ? safeFind<{ id: number; action?: string; collectionSlug?: string; docId?: string; docTitle?: string; actorEmail?: string; createdAt: string }>(() =>
          payload.find({ collection: 'audit-logs', sort: '-createdAt', limit: 6, depth: 0, overrideAccess: true }),
        )
      : Promise.resolve([]),
  ])
  const fmt = (iso: string, withTime = true) =>
    new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(iso))
  const ACTION: Record<string, string> = { create: 'membuat', update: 'mengubah', publish: 'menerbitkan', delete: 'menghapus', unpublish: 'menarik', restore: 'memulihkan' }

  const stats = [
    { label: 'Menunggu review', value: inReview, href: '/admin/collections/posts?where[workflowStatus][equals]=in_review', tone: 'gold' },
    { label: 'Draf berita', value: drafts, href: '/admin/collections/posts?where[_status][equals]=draft', tone: 'navy' },
    { label: 'Pengumuman aktif', value: activeAnn, href: '/admin/collections/announcements', tone: 'teal' },
    { label: 'Agenda mendatang', value: upcoming, href: '/admin/collections/events', tone: 'teal' },
    { label: 'Pesan baru', value: newMsgs, href: '/admin/collections/contact-messages?where[status][equals]=new', tone: 'gold' },
  ]

  const actions = [
    { label: 'Tulis berita', href: '/admin/collections/posts/create', icon: '✎' },
    { label: 'Buat pengumuman', href: '/admin/collections/announcements/create', icon: '📣' },
    { label: 'Tambah agenda', href: '/admin/collections/events/create', icon: '📅' },
    { label: 'Ganti hero beranda', href: '/admin/globals/homepage', icon: '🖼' },
    { label: 'Info pendaftaran', href: '/admin/collections/admissions-cycles', icon: '🎓' },
    { label: 'Lihat website', href: '/', icon: '↗' },
  ]

  return (
    <section className="kps-dash" aria-label="Ringkasan">
      <div className="kps-dash__hero">
        <div className="kps-dash__orb kps-dash__orb--a" />
        <div className="kps-dash__orb kps-dash__orb--b" />
        <svg className="kps-dash__hex" viewBox="0 0 300 120" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, k) => {
            const c = k % 8
            const r = Math.floor(k / 8)
            return <polygon key={k} style={{ animationDelay: `${(k * 0.37) % 6}s` }} transform={`translate(${c * 38 + (r % 2) * 19 + 20} ${r * 33 + 22})`} points="0,-19 16.5,-9.5 16.5,9.5 0,19 -16.5,9.5 -16.5,-9.5" />
          })}
        </svg>
        <div className="kps-dash__hero-inner">
          <AdminClock />
          <p className="kps-dash__eyebrow">{greeting()},</p>
          <h2 className="kps-dash__title">{user?.name ?? 'Tim KPS'} 👋</h2>
          <p className="kps-dash__sub">
            Peran: <strong>{ROLE_LABEL[user?.role ?? ''] ?? '-'}</strong> · Alur: Draf → Review → Terbit → Arsip
          </p>
        </div>
      </div>
      <div className="kps-dash__stats">
        {stats.map((s, i) => (
          <a key={s.label} href={s.href} className={`kps-dash__stat kps-dash__stat--${s.tone}`} style={{ animationDelay: `${i * 70}ms` }}>
            <span className="kps-dash__stat-value">
              <CountUp value={s.value} />
            </span>
            <span className="kps-dash__stat-label">{s.label}</span>
          </a>
        ))}
      </div>
      <div className="kps-dash__panels">
        <div className="kps-dash__panel" style={{ animationDelay: '120ms' }}>
          <h3>Agenda terdekat</h3>
          {nextEvents.length ? (
            <ul>
              {nextEvents.map((e) => (
                <li key={e.id}>
                  <a href={`/admin/collections/events/${e.id}`}>{e.title}</a>
                  <span>{fmt(e.startAt, !e.allDay)} WITA</span>
                  <AdminCountdown to={e.startAt} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="kps-dash__empty">Belum ada agenda mendatang yang terbit.</p>
          )}
        </div>
        <div className="kps-dash__panel" style={{ animationDelay: '200ms' }}>
          <h3>Pengumuman segera berakhir <small>(7 hari)</small></h3>
          {expiring.length ? (
            <ul>
              {expiring.map((a) => (
                <li key={a.id}>
                  <a href={`/admin/collections/announcements/${a.id}`}>{a.title}</a>
                  <span>Berakhir {fmt(a.displayEnd)} WITA — otomatis hilang dari publik</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kps-dash__empty">Tidak ada pengumuman yang berakhir dalam 7 hari.</p>
          )}
        </div>
        {editorial ? (
          <div className="kps-dash__panel" style={{ animationDelay: '280ms' }}>
            <h3>Aktivitas terbaru</h3>
            {activity.length ? (
              <ul className="kps-dash__feed">
                {activity.map((a) => (
                  <li key={a.id}>
                    <span className="kps-dash__dot" aria-hidden="true" />
                    <span>
                      <strong>{a.actorEmail ?? 'Sistem'}</strong> {ACTION[a.action ?? ''] ?? a.action}{' '}
                      {a.collectionSlug && a.docId ? <a href={`/admin/collections/${a.collectionSlug}/${a.docId}`}>{a.docTitle || `#${a.docId}`}</a> : (a.docTitle ?? '')}
                    </span>
                    <span>{fmt(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="kps-dash__empty">Belum ada aktivitas tercatat.</p>
            )}
          </div>
        ) : null}
      </div>
      <div className="kps-dash__actions">
        {actions.map((a) => (
          <a key={a.label} href={a.href} className="kps-dash__action">
            <span aria-hidden="true">{a.icon}</span> {a.label}
          </a>
        ))}
      </div>
    </section>
  )
}
