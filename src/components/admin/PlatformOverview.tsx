import type { Payload } from 'payload'
import React from 'react'
import { isSuperAdmin } from '@/access/roles'
import { toInfo } from '@/tenancy/resolve'
import { tzAbbr } from '@/tenancy/config'

const STATUS: Record<string, string> = { active: 'Aktif', trial: 'Uji coba', suspended: 'Ditangguhkan' }

/**
 * Super Admin on the platform's own address: list of schools with headline numbers and links into each school's
 * CMS. Opening /admin on a school's address shows that school's dashboard instead.
 */
export async function PlatformOverview({ payload, user }: { payload: Payload; user?: unknown }) {
  if (!isSuperAdmin(user as never)) {
    return (
      <section className="kps-dash" aria-label="Ringkasan">
        <p className="kps-dash__empty">Akun ini belum terhubung ke sekolah. Hubungi pengelola platform.</p>
      </section>
    )
  }
  const schools = await payload.find({ collection: 'tenants', sort: 'name', limit: 500, depth: 0, overrideAccess: true, pagination: false })
  const rows = await Promise.all(
    schools.docs.map(async (d) => {
      const t = toInfo(d as never)
      const count = async (collection: 'users' | 'posts' | 'leads') =>
        (await payload.count({ collection, where: { tenant: { equals: t.id } }, overrideAccess: true })).totalDocs
      const [users, posts, leads] = await Promise.all([count('users'), count('posts'), count('leads')])
      return { t, users, posts, leads }
    }),
  )
  return (
    <section className="kps-dash" aria-label="Ringkasan platform">
      <div className="kps-dash__hero">
        <div className="kps-dash__hero-inner">
          <p className="kps-dash__eyebrow">Super Admin Platform</p>
          <h2 className="kps-dash__title">{rows.length} sekolah</h2>
          <p className="kps-dash__sub">
            Buka CMS sebuah sekolah dari alamatnya sendiri untuk mengelola kontennya. <a href="/admin/collections/tenants/create">+ Tambah sekolah</a>
          </p>
        </div>
      </div>
      <div className="kps-dash__panels">
        <div className="kps-dash__panel" style={{ gridColumn: '1 / -1' }}>
          <h3>Sekolah</h3>
          {rows.length ? (
            <ul>
              {rows.map(({ t, users, posts, leads }) => (
                <li key={t.id}>
                  <a href={`/admin/collections/tenants/${t.id}`}>{t.name}</a>
                  <span>
                    {STATUS[t.status] ?? t.status} · paket {t.plan} · {tzAbbr(t.timezone)} · {users} pengguna · {posts} berita · {leads} minat
                  </span>
                  {t.primaryDomain ? (
                    <a href={`https://${t.primaryDomain}/admin`} target="_blank" rel="noreferrer">
                      Buka CMS ↗
                    </a>
                  ) : (
                    <em>belum ada domain</em>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="kps-dash__empty">Belum ada sekolah. Tambahkan sekolah pertama.</p>
          )}
        </div>
      </div>
    </section>
  )
}
