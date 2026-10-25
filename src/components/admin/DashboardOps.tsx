import type { Payload, Where } from 'payload'
import React from 'react'
import { readFlags } from '@/lib/flags'

type U = { role?: string; canAccessLeads?: boolean; canExportLeads?: boolean } | null | undefined

const n = async (p: Promise<{ totalDocs: number }>) => {
  try {
    return (await p).totalDocs
  } catch {
    return 0
  }
}

/**
 * Operational panels. Definitions follow the addendum §11: test/spam excluded, denominators and periods are stated,
 * nothing is shown without data. Lead numbers only for users allowed to see leads.
 */
export async function DashboardOps({ payload, user }: { payload: Payload; user: U }) {
  const role = user?.role ?? ''
  const editorial = role === 'admin' || role === 'editor'
  const leadsOk = role === 'admissions' || Boolean(user?.canAccessLeads)
  const flags = await readFlags(payload)
  const now = new Date()
  const iso = now.toISOString()
  const d30 = new Date(now.getTime() - 30 * 864e5).toISOString()
  const d90 = new Date(now.getTime() - 90 * 864e5).toISOString()
  const o = { overrideAccess: true as const }
  const valid: Where = { and: [{ isTest: { not_equals: true } }, { or: [{ closeReason: { exists: false } }, { closeReason: { not_equals: 'test_spam' } }] }] }

  const panels: React.ReactNode[] = []

  if (leadsOk) {
    const [in30, untouched, overdue, cohort, cohortConverted, pending, confirmedUpcoming, attended30, noshow30] = await Promise.all([
      n(payload.count({ collection: 'leads', where: { and: [valid, { createdAt: { greater_than_equal: d30 } }] }, ...o })),
      n(payload.count({ collection: 'leads', where: { and: [valid, { status: { in: ['new', 'assigned'] } }] }, ...o })),
      n(payload.count({ collection: 'leads', where: { and: [valid, { nextFollowUpAt: { less_than: iso } }, { status: { not_in: ['closed', 'converted'] } }] }, ...o })),
      n(payload.count({ collection: 'leads', where: { and: [valid, { createdAt: { greater_than_equal: d90 } }] }, ...o })),
      n(payload.count({ collection: 'leads', where: { and: [valid, { createdAt: { greater_than_equal: d90 } }, { status: { equals: 'converted' } }] }, ...o })),
      n(payload.count({ collection: 'visit-bookings', where: { and: [{ isTest: { not_equals: true } }, { status: { equals: 'pending' } }] }, ...o })),
      n(payload.count({ collection: 'visit-bookings', where: { and: [{ isTest: { not_equals: true } }, { status: { equals: 'confirmed' } }] }, ...o })),
      n(payload.count({ collection: 'visit-bookings', where: { and: [{ isTest: { not_equals: true } }, { status: { equals: 'attended' } }, { updatedAt: { greater_than_equal: d30 } }] }, ...o })),
      n(payload.count({ collection: 'visit-bookings', where: { and: [{ isTest: { not_equals: true } }, { status: { equals: 'no_show' } }, { updatedAt: { greater_than_equal: d30 } }] }, ...o })),
    ])
    panels.push(
      <div className="kps-dash__panel" key="leads">
        <h3>Minat & kunjungan</h3>
        <ul>
          <li><a href="/admin/collections/leads?where[status][in][0]=new&where[status][in][1]=assigned">Belum ditindaklanjuti: <strong>{untouched}</strong></a><span>Status Baru/Ditugaskan, belum dihubungi</span></li>
          <li><a href="/admin/collections/leads?sort=nextFollowUpAt">Tindak lanjut terlambat: <strong>{overdue}</strong></a><span>Jadwal lewat, belum ditutup/masuk proses resmi</span></li>
          <li><span>Minat masuk 30 hari terakhir: <strong>{in30}</strong></span><span>Tanpa data uji & spam</span></li>
          <li>
            <span>
              Masuk proses resmi: <strong>{cohortConverted}</strong> dari <strong>{cohort}</strong> minat yang masuk 90 hari terakhir
              {cohort ? ` (${Math.round((cohortConverted / cohort) * 100)}%)` : ''}
            </span>
            <span>Kohor yang sama; bukan jumlah siswa diterima</span>
          </li>
          <li><a href="/admin/collections/visit-bookings?where[status][equals]=pending">Kunjungan menunggu konfirmasi: <strong>{pending}</strong></a><span>Terkonfirmasi: {confirmedUpcoming} · 30 hari: hadir {attended30}, tidak hadir {noshow30}</span></li>
        </ul>
        {role === 'admissions' || user?.canExportLeads ? <p><a href="/api/leads/export">Unduh CSV minat (tercatat di audit)</a></p> : null}
      </div>,
    )
  }

  if (editorial) {
    const [docsDue, staleEvents, faqsOld, annNoEnd, cycleUnconfirmed] = await Promise.all([
      n(payload.count({ collection: 'documents', where: { and: [{ _status: { equals: 'published' } }, { reviewDue: { less_than: iso } }] }, ...o })),
      n(payload.count({ collection: 'events', where: { and: [{ _status: { equals: 'published' } }, { eventStatus: { equals: 'scheduled' } }, { startAt: { less_than: new Date(now.getTime() - 2 * 864e5).toISOString() } }] }, ...o })),
      n(payload.count({ collection: 'faqs', where: { and: [{ _status: { equals: 'published' } }, { or: [{ lastReviewedAt: { exists: false } }, { lastReviewedAt: { less_than: new Date(now.getTime() - 365 * 864e5).toISOString() } }] }] }, ...o })),
      n(payload.count({ collection: 'announcements', where: { and: [{ _status: { equals: 'published' } }, { category: { in: ['pendaftaran', 'kegiatan', 'akademik'] } }, { or: [{ displayEnd: { exists: false } }, { displayEnd: { equals: null } }] }] }, ...o })),
      n(payload.count({ collection: 'admissions-cycles', where: { admissionStatus: { equals: 'unconfirmed' } }, ...o })),
    ])
    const items = [
      [docsDue, 'Dokumen lewat tanggal tinjau', '/admin/collections/documents?sort=reviewDue'],
      [staleEvents, 'Agenda sudah lewat tapi masih "Terjadwal" (ubah ke Selesai/Dibatalkan)', '/admin/collections/events?where[eventStatus][equals]=scheduled&sort=startAt'],
      [faqsOld, 'FAQ belum ditinjau lebih dari setahun', '/admin/collections/faqs?sort=lastReviewedAt'],
      [annNoEnd, 'Pengumuman musiman tanpa tanggal berakhir', '/admin/collections/announcements'],
      [cycleUnconfirmed, 'Informasi pendaftaran masih "menunggu konfirmasi"', '/admin/collections/admissions-cycles'],
    ].filter(([c]) => Number(c) > 0) as [number, string, string][]
    panels.push(
      <div className="kps-dash__panel" key="reminders">
        <h3>Pengingat konten</h3>
        {items.length ? (
          <ul>
            {items.map(([c, l, h]) => (
              <li key={l}><a href={h}>{l}: <strong>{c}</strong></a></li>
            ))}
          </ul>
        ) : (
          <p className="kps-dash__empty">Tidak ada konten yang perlu ditinjau.</p>
        )}
      </div>,
    )

    if (flags.visitorAnalytics) {
      const since = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE || 'Asia/Makassar' }).format(new Date(d30))
      const rows = await payload.find({ collection: 'analytics-daily', where: { day: { greater_than_equal: since } }, limit: 5000, depth: 0, ...o }).catch(() => ({ docs: [] as { kind: string; key: string; count: number }[] }))
      const sum = (kind: string) => rows.docs.filter((r) => r.kind === kind).reduce((a, r) => a + Number(r.count), 0)
      const top = (kind: string) => {
        const m = new Map<string, number>()
        rows.docs.filter((r) => r.kind === kind).forEach((r) => m.set(r.key, (m.get(r.key) ?? 0) + Number(r.count)))
        return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      }
      panels.push(
        <div className="kps-dash__panel" key="analytics">
          <h3>Aktivitas publik <small>(30 hari, agregat)</small></h3>
          {rows.docs.length ? (
            <ul>
              <li><span>Tampilan halaman: <strong>{sum('pageview')}</strong> · Klik tombol: <strong>{sum('cta_click')}</strong> · Form berhasil (server): <strong>{sum('form_success')}</strong></span></li>
              {top('pageview').map(([k, c]) => <li key={k}><span>{k}</span><span>{c} tampilan</span></li>)}
            </ul>
          ) : (
            <p className="kps-dash__empty">Belum ada data sejak statistik dinyalakan.</p>
          )}
        </div>,
      )
    }
  }

  return panels.length ? <div className="kps-dash__panels">{panels}</div> : null
}
