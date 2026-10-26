/**
 * Application shell: navy sidebar with the school's crest, navigation by role and active modules, top bar with
 * notifications. Menus are a convenience only — every page and action checks permissions on the server.
 */
import React from 'react'
import Link from 'next/link'
import { fmtDateTime } from '@/server/time'
import { and, count, eq, isNull } from 'drizzle-orm'
import { notifications } from '@/db/schema'
import type { Ctx } from '@/server/context'
import type { Permission } from '@/server/roles'
import { ROLES } from '@/server/roles'
import { moduleOpen, type Branding, type ModuleCode, type ModuleMap } from '@/server/settings'
import { Icon, type IconName } from './icons'
import { NavLink, FormEnhancer } from './client'
import { Avatar, P, publicFileUrl } from './kit'

type Item = { label: string; href: string; icon: IconName; perms?: Permission[]; mod?: ModuleCode; when?: (ctx: Ctx) => boolean; exact?: boolean }
type Group = { label?: string; items: Item[] }

export const STAFF_NAV: Group[] = [
  { items: [{ label: 'Beranda', href: '/staf', icon: 'home', exact: true }] },
  {
    label: 'Administrasi siswa',
    items: [
      { label: 'Dashboard TU', href: '/staf/siswa', icon: 'chart', perms: ['students.read'], mod: 'buku_induk', exact: true },
      { label: 'Buku Induk', href: '/staf/siswa/daftar', icon: 'book', perms: ['students.read'], mod: 'buku_induk' },
      { label: 'Koreksi data', href: '/staf/siswa/koreksi', icon: 'edit', perms: ['students.review', 'students.write'], mod: 'buku_induk' },
      { label: 'Impor Excel', href: '/staf/siswa/impor', icon: 'upload', perms: ['students.import'], mod: 'buku_induk' },
      { label: 'Kartu siswa', href: '/staf/kartu', icon: 'card', perms: ['cards.manage'], mod: 'kartu' },
      { label: 'Verifikasi kartu', href: '/staf/kartu/verifikasi', icon: 'qr', perms: ['cards.verify', 'cards.manage'], mod: 'kartu' },
    ],
  },
  {
    label: 'Penerimaan',
    items: [
      { label: 'Penerimaan siswa', href: '/staf/ppdb', icon: 'clipboard', perms: ['admissions.manage', 'admissions.verify', 'admissions.assess', 'admissions.approve', 'admissions.release', 'admissions.reenroll', 'admissions.convert'], mod: 'penerimaan' },
    ],
  },
  {
    label: 'Akademik',
    items: [
      { label: 'Kelas saya', href: '/staf/guru', icon: 'users', perms: ['teach'], mod: 'akademik' },
      { label: 'Jadwal & kalender', href: '/staf/jadwal', icon: 'calendar', perms: ['academic.manage', 'teach'], mod: 'akademik' },
      { label: 'Presensi', href: '/staf/presensi', icon: 'checkCircle', perms: ['teach', 'academic.manage'], mod: 'akademik' },
      { label: 'Buku nilai', href: '/staf/nilai', icon: 'list', perms: ['teach'], mod: 'nilai_rapor' },
      { label: 'Rapor', href: '/staf/rapor', icon: 'file', perms: ['teach', 'reports.review', 'reports.release'], mod: 'nilai_rapor' },
      { label: 'Data akademik', href: '/staf/akademik', icon: 'school', perms: ['academic.manage'] },
    ],
  },
  {
    label: 'Kesiswaan',
    items: [
      { label: 'Bimbingan & Konseling', href: '/staf/bk', icon: 'heart', perms: ['counseling', 'counseling.coordinate', 'teach'], mod: 'bk' },
      { label: 'Ekstrakurikuler', href: '/staf/ekskul', icon: 'ball', perms: ['activities.manage', 'activities.coach'], mod: 'ekskul' },
      { label: 'Kesiswaan', href: '/staf/kesiswaan', icon: 'star', perms: ['student_affairs', 'teach'], mod: 'kesiswaan' },
      { label: 'Organisasi & kegiatan', href: '/staf/organisasi', icon: 'flag', perms: ['organizations.manage'], mod: 'organisasi' },
      { label: 'Alumni', href: '/staf/alumni', icon: 'grad', perms: ['alumni.manage'], mod: 'alumni' },
    ],
  },
  {
    label: 'Layanan',
    items: [
      { label: 'Pengumuman', href: '/staf/pengumuman', icon: 'megaphone', perms: ['announcements.publish', 'teach'], mod: 'pengumuman' },
      { label: 'Layanan TU', href: '/staf/layanan', icon: 'inbox', perms: ['services.process'], mod: 'layanan' },
      { label: 'Keuangan', href: '/staf/keuangan', icon: 'wallet', perms: ['finance.manage', 'finance.verify'], mod: 'keuangan' },
      { label: 'Perpustakaan', href: '/staf/perpustakaan', icon: 'library', perms: ['library.manage'], mod: 'perpustakaan' },
      { label: 'UKS', href: '/staf/uks', icon: 'medical', perms: ['health.manage'], mod: 'uks' },
    ],
  },
  {
    label: 'Tata kelola',
    items: [
      { label: 'Dashboard pimpinan', href: '/staf/dashboard', icon: 'chart', perms: ['dashboard.view'] },
      { label: 'Akun keluarga', href: '/staf/akun', icon: 'key', perms: ['family.manage'] },
      { label: 'Staf & peran', href: '/staf/pengaturan/staf', icon: 'shield', perms: ['staff.manage', 'roles.restricted'] },
      { label: 'Aktivasi modul', href: '/staf/pengaturan/modul', icon: 'layers', perms: ['settings.manage'] },
      { label: 'Pengaturan sekolah', href: '/staf/pengaturan', icon: 'settings', perms: ['settings.manage'], exact: true },
      { label: 'Audit & operasional', href: '/staf/audit', icon: 'eye', perms: ['audit.view'] },
    ],
  },
]

export const FAMILY_NAV: Item[] = [
  { label: 'Beranda', href: '/keluarga', icon: 'home', exact: true },
  { label: 'Jadwal', href: '/keluarga/jadwal', icon: 'calendar', mod: 'akademik' },
  { label: 'Tugas & nilai', href: '/keluarga/tugas', icon: 'clipboard', mod: 'akademik' },
  { label: 'Presensi & izin', href: '/keluarga/presensi', icon: 'checkCircle', mod: 'akademik' },
  { label: 'Rapor', href: '/keluarga/rapor', icon: 'file', mod: 'nilai_rapor' },
  { label: 'Pengumuman', href: '/keluarga/pengumuman', icon: 'megaphone', mod: 'pengumuman' },
  { label: 'Kartu siswa', href: '/keluarga/kartu', icon: 'card', mod: 'kartu' },
  { label: 'Ekstrakurikuler', href: '/keluarga/ekskul', icon: 'ball', mod: 'ekskul' },
  { label: 'Layanan sekolah', href: '/keluarga/layanan', icon: 'inbox', mod: 'layanan' },
  { label: 'Tagihan', href: '/keluarga/tagihan', icon: 'wallet', mod: 'keuangan' },
  { label: 'Konseling (BK)', href: '/keluarga/bk', icon: 'heart', mod: 'bk' },
  { label: 'Prestasi & laporan', href: '/keluarga/kesiswaan', icon: 'star', mod: 'kesiswaan' },
  { label: 'Perpustakaan', href: '/keluarga/perpustakaan', icon: 'library', mod: 'perpustakaan' },
  { label: 'Kesehatan (UKS)', href: '/keluarga/uks', icon: 'medical', mod: 'uks' },
  { label: 'Organisasi siswa', href: '/keluarga/organisasi', icon: 'flag', mod: 'organisasi' },
  { label: 'Data siswa', href: '/keluarga/data', icon: 'user', mod: 'buku_induk' },
  { label: 'Penerimaan siswa baru', href: '/keluarga/penerimaan', icon: 'clipboard', mod: 'penerimaan' },
  { label: 'Akun saya', href: '/akun', icon: 'settings' },
]

function allowed(ctx: Ctx, modules: ModuleMap, it: Item, who: 'staff' | 'family') {
  if (it.mod && !moduleOpen(modules, it.mod, who)) return false
  if (it.perms && !(ctx.staff && it.perms.some((p) => ctx.staff!.perms.has(p)))) return false
  if (it.when && !it.when(ctx)) return false
  return true
}

export async function Shell({ ctx, branding, modules, children, who }: { ctx: Ctx; branding: Branding; modules: ModuleMap; children: React.ReactNode; who: 'staff' | 'family' }) {
  const shortName = branding.shortName || ctx.school.name
  const logo = publicFileUrl(branding.logoFileId) ?? `${P}/icon.svg`
  const groups: Group[] =
    who === 'staff'
      ? STAFF_NAV.map((g) => ({ ...g, items: g.items.filter((i) => allowed(ctx, modules, i, 'staff')) })).filter((g) => g.items.length)
      : [{ items: FAMILY_NAV.filter((i) => allowed(ctx, modules, i, 'family')) }]
  const me = who === 'staff' ? ctx.staff! : ctx.account!
  const recipient = who === 'staff' ? { type: 'staff', id: ctx.staff!.id } : { type: 'account', id: ctx.account!.id }
  const [unread] = await ctx.db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientType, recipient.type), eq(notifications.recipientId, recipient.id), isNull(notifications.readAt)))
  const roleLabel =
    who === 'staff'
      ? [...ctx.staff!.roles].map((r) => ROLES[r]?.label).filter(Boolean).slice(0, 2).join(', ') || 'Staf sekolah'
      : 'Siswa / orang tua'
  const nav = (
    <nav className="nav" aria-label="Menu utama">
      {groups.map((g, i) => (
        <React.Fragment key={i}>
          {g.label ? <div className="nav__group">{g.label}</div> : null}
          {g.items.map((it) => (
            <NavLink key={it.href} href={it.href} exact={it.exact}>
              <Icon name={it.icon} />
              {it.label}
            </NavLink>
          ))}
        </React.Fragment>
      ))}
    </nav>
  )
  const style = { '--brand': branding.primary, '--navy': branding.navy } as React.CSSProperties
  return (
    <div className="app" style={style}>
      <aside className="side">
        <Link className="side__brand" href={who === 'staff' ? '/staf' : '/keluarga'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" />
          <span>
            <strong>{shortName}</strong>
            {branding.city ? <span>{branding.city}</span> : null}
          </span>
        </Link>
        {nav}
        <div className="side__user">
          <strong>{me.name}</strong>
          <span>{roleLabel}</span>
        </div>
        <div className="side__foot">Didukung Sekolahku</div>
      </aside>
      <div className="main">
        <details className="mobilebar">
          <summary>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" />
            <strong>{shortName}</strong>
            <Icon name="menu" className="" />
            <span className="sr">Buka menu</span>
          </summary>
          {nav}
        </details>
        <div className="topbar">
          <div className="topbar__title">{ctx.school.name}</div>
          <Link className="topbar__bell" href={who === 'staff' ? '/staf/notifikasi' : '/keluarga/notifikasi'} aria-label={`Notifikasi${unread!.n ? `, ${unread!.n} belum dibaca` : ''}`}>
            <Icon name="bell" />
            {unread!.n ? <b>{unread!.n > 99 ? '99+' : unread!.n}</b> : null}
          </Link>
          <div className="topbar__who">
            <Avatar name={me.name} />
            <span className="hide-sm">{me.name}</span>
          </div>
          {who === 'staff' ? (
            <Link className="btn btn--ghost btn--sm" href="/keluar-staf">
              <Icon name="logout" />
              Keluar
            </Link>
          ) : (
            <form method="post" action={`${P}/aksi/akun.keluar`} className="inline">
              <input type="hidden" name="_kembali" value="/masuk" />
              <button className="btn btn--ghost btn--sm" type="submit">
                <Icon name="logout" />
                Keluar
              </button>
            </form>
          )}
        </div>
        <main id="main" className="content" tabIndex={-1}>
          {ctx.staff?.support ? (
            <div className="notice notice--warn" role="status" style={{ marginBottom: 16 }}>
              <div>
                <strong>Mode bantuan teknis — hanya melihat.</strong> Akses diberikan sekolah sampai {fmtDateTime(ctx.staff.support.expiresAt, ctx.tz)} dan setiap kunjungan tercatat di audit. Data BK, UKS dan keuangan tidak tersedia.
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
      <FormEnhancer />
    </div>
  )
}
