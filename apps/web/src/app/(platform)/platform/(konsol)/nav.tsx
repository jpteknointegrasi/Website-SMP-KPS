'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function ConsoleNav({ pending }: { pending: number }) {
  const path = usePathname()
  const items = [
    { href: '/platform', label: 'Dasbor' },
    { href: '/platform/pendaftaran', label: 'Pendaftaran', badge: pending },
    { href: '/platform/sekolah', label: 'Sekolah' },
    { href: '/platform/audit', label: 'Audit' },
  ]
  return (
    <nav className="pf__nav" aria-label="Konsol platform">
      {items.map((i) => {
        const current = i.href === '/platform' ? path === '/platform' : path.startsWith(i.href)
        return (
          <Link key={i.href} href={i.href} aria-current={current ? 'page' : undefined}>
            {i.label}
            {i.badge ? <b aria-label={`${i.badge} menunggu`}>{i.badge}</b> : null}
          </Link>
        )
      })}
      <a href="/admin">CMS (lanjutan) ↗</a>
    </nav>
  )
}
