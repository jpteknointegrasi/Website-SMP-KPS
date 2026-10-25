import Link from 'next/link'
import React from 'react'
import { Icon } from './Icon'

export const Container = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`container ${className}`}>{children}</div>
)

export const Breadcrumbs = ({ items }: { items: { label: string; href?: string }[] }) => {
  const all = [{ label: 'Beranda', href: '/' }, ...items]
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, item: it.href })),
  }
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {all.map((it, i) => (
          <li key={i}>
            {it.href && i < all.length - 1 ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </nav>
  )
}

export const PageHeader = ({
  title,
  lead,
  crumbs,
  children,
}: {
  title: string
  lead?: string | null
  crumbs?: { label: string; href?: string }[]
  children?: React.ReactNode
}) => (
  <header className="page-head">
    <div className="page-head__hex" aria-hidden="true" />
    <Container>
      {crumbs ? <Breadcrumbs items={crumbs} /> : null}
      <h1>{title}</h1>
      {lead ? <p className="page-head__lead">{lead}</p> : null}
      {children}
    </Container>
  </header>
)

export const EmptyState = ({ title, text, action }: { title: string; text?: string; action?: { label: string; href: string } }) => (
  <div className="empty">
    <span className="empty__hex" aria-hidden="true" />
    <h2>{title}</h2>
    {text ? <p>{text}</p> : null}
    {action ? (
      <Link className="btn btn--ghost" href={action.href}>
        {action.label}
      </Link>
    ) : null}
  </div>
)

export const Pagination = ({ page, totalPages, base, params = {} }: { page: number; totalPages: number; base: string; params?: Record<string, string | undefined> }) => {
  if (totalPages <= 1) return null
  const href = (p: number) => {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v))
    if (p > 1) sp.set('page', String(p))
    const s = sp.toString()
    return s ? `${base}?${s}` : base
  }
  return (
    <nav className="pager" aria-label="Halaman">
      {page > 1 ? <Link href={href(page - 1)} rel="prev">Sebelumnya</Link> : <span aria-disabled="true">Sebelumnya</span>}
      <span>
        Halaman {page} dari {totalPages}
      </span>
      {page < totalPages ? <Link href={href(page + 1)} rel="next">Berikutnya</Link> : <span aria-disabled="true">Berikutnya</span>}
    </nav>
  )
}

export const SmartLink = ({ href, children, className, ...rest }: { href: string; children: React.ReactNode; className?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
  /^https?:\/\//.test(href) ? (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <span className="sr-only"> (membuka tab baru)</span>
    </a>
  ) : (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  )

export const DemoBadge = ({ show }: { show?: boolean | null }) => (show ? <span className="badge badge--demo">Contoh</span> : null)

export const ArrowLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="arrow-link">
    {children}
    <Icon name="arrow" size={18} />
  </Link>
)
