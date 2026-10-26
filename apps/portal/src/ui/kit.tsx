/** Server-rendered UI building blocks of the portal (no client JavaScript needed). */
import React from 'react'
import Link from 'next/link'
import { randomBytes } from 'crypto'
import { Icon, type IconName } from './icons'

export const P = '/portal'
export type SP = Record<string, string | string[] | undefined>
export const sp1 = (sp: SP | undefined, k: string) => {
  const v = sp?.[k]
  return Array.isArray(v) ? v[0] : v
}

// ---------- page frame ----------
export function PageHead({ title, sub, crumbs, actions }: { title: React.ReactNode; sub?: React.ReactNode; crumbs?: [string, string?][]; actions?: React.ReactNode }) {
  return (
    <header className="phead">
      <div className="phead__text">
        {crumbs?.length ? (
          <nav className="crumbs" aria-label="Lokasi">
            {crumbs.map(([label, href], i) => (
              <React.Fragment key={i}>
                {i ? ' › ' : ''}
                {href ? <Link href={href}>{label}</Link> : label}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="phead__actions">{actions}</div> : null}
    </header>
  )
}

/** Result of the last form action (?ok= / ?galat= set by the action dispatcher). */
export function Flash({ sp }: { sp?: SP }) {
  const ok = sp1(sp, 'ok')
  const bad = sp1(sp, 'galat')
  return (
    <>
      {ok ? <Notice tone="ok">{ok}</Notice> : null}
      {bad ? (
        <Notice tone="bad" role="alert">
          {bad}
        </Notice>
      ) : null}
    </>
  )
}

export function Notice({ tone = 'info', title, children, role }: { tone?: 'ok' | 'bad' | 'warn' | 'info'; title?: string; children?: React.ReactNode; role?: string }) {
  const icon: IconName = tone === 'ok' ? 'checkCircle' : tone === 'info' ? 'info' : 'alert'
  return (
    <div className={`notice notice--${tone}`} role={role ?? (tone === 'bad' ? 'alert' : 'status')}>
      <Icon name={icon} />
      <div>
        {title ? <strong>{title}</strong> : null}
        {children}
      </div>
    </div>
  )
}

export function Card({ title, actions, children, flush, id }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; flush?: boolean; id?: string }) {
  return (
    <section className={`card${flush ? ' card--flush' : ''}`} id={id} aria-label={typeof title === 'string' ? title : undefined}>
      {title || actions ? (
        <div className="card__head">
          {title ? <h2>{title}</h2> : <span style={{ flex: 1 }} />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function Stat({ icon, label, value, note, tone, href }: { icon: IconName; label: string; value: React.ReactNode; note?: string; tone?: 'ok' | 'warn' | 'bad'; href?: string }) {
  const inner = (
    <>
      <span className="stat__icon">
        <Icon name={icon} />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </span>
    </>
  )
  return href ? (
    <Link className={`stat${tone ? ` stat--${tone}` : ''}`} href={href}>
      {inner}
    </Link>
  ) : (
    <div className={`stat${tone ? ` stat--${tone}` : ''}`}>{inner}</div>
  )
}

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'brand' | 'draft'
export const Badge = ({ tone = 'muted', children }: { tone?: Tone; children: React.ReactNode }) => <span className={`b b--${tone}`}>{children}</span>
/** Status with label and tone from a map: { value: [label, tone] }. */
export function Status({ value, map }: { value: string | null | undefined; map: Record<string, [string, Tone]> }) {
  const m = value ? map[value] : undefined
  return <Badge tone={m?.[1] ?? 'muted'}>{m?.[0] ?? value ?? '—'}</Badge>
}

export function Empty({ icon = 'inbox', children }: { icon?: IconName; children: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <p>{children}</p>
    </div>
  )
}

export function Progress({ value, ok }: { value: number; ok?: boolean }) {
  return (
    <div className={`progress${ok ? ' progress--ok' : ''}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Tabs({ items, current }: { items: [string, string][]; current: string }) {
  return (
    <nav className="tabs" aria-label="Bagian">
      {items.map(([label, href]) => (
        <Link key={href} href={href} aria-current={href === current ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function Steps({ items, current }: { items: string[]; current: number }) {
  return (
    <ol className="steps">
      {items.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'now' : ''} aria-current={i === current ? 'step' : undefined}>
          {s}
        </li>
      ))}
    </ol>
  )
}

export function Pager({ page, perPage, total, href }: { page: number; perPage: number; total: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (total === 0) return null
  const from = (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)
  const list = [...new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))].sort((a, b) => a - b)
  return (
    <nav className="pager" aria-label="Halaman">
      <span>
        Menampilkan {from}–{to} dari {total}
      </span>
      {list.map((p) => (p === page ? <span key={p} className="cur" aria-current="page">{p}</span> : <Link key={p} href={href(p)}>{p}</Link>))}
    </nav>
  )
}

export function Avatar({ name, src, size }: { name: string; src?: string | null; size?: 'lg' }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className={`avatar${size ? ` avatar--${size}` : ''}`} src={src} alt="" /> : <span className={`avatar${size ? ` avatar--${size}` : ''}`} aria-hidden="true">{ini}</span>
}
export const fileUrl = (id: string | null | undefined) => (id ? `${P}/berkas/${id}` : null)
export const publicFileUrl = (id: string | null | undefined) => (id ? `${P}/berkas/publik/${id}` : null)

// ---------- forms ----------
/**
 * A form posting to the portal action dispatcher. `back` is where to return (with the result message); `op` adds an
 * operation key so a double submit acts once.
 */
export function ActionForm({
  action,
  back,
  children,
  files,
  op,
  className = 'f',
  hidden,
  id,
  confirm,
}: {
  action: string
  back: string
  children: React.ReactNode
  files?: boolean
  op?: boolean
  className?: string
  hidden?: Record<string, string | number | null | undefined>
  id?: string
  confirm?: string
}) {
  return (
    <form method="post" action={`${P}/aksi/${action}`} encType={files ? 'multipart/form-data' : undefined} className={className} id={id} data-confirm={confirm}>
      <input type="hidden" name="_kembali" value={back} />
      {op ? <input type="hidden" name="_op" value={randomBytes(12).toString('base64url')} /> : null}
      {hidden ? Object.entries(hidden).map(([k, v]) => (v === null || v === undefined ? null : <input key={k} type="hidden" name={k} value={String(v)} />)) : null}
      {children}
    </form>
  )
}

/** One-button form (e.g. approve, revoke). */
export function ActionButton({
  action,
  back,
  label,
  hidden,
  tone,
  small,
  op,
  icon,
}: {
  action: string
  back: string
  label: string
  hidden?: Record<string, string | number | null | undefined>
  tone?: 'ghost' | 'danger' | 'danger-ghost' | 'ok'
  small?: boolean
  op?: boolean
  icon?: IconName
}) {
  return (
    <ActionForm action={action} back={back} hidden={hidden} op={op} className="inline">
      <button className={`btn${tone ? ` btn--${tone}` : ''}${small ? ' btn--sm' : ''}`} type="submit">
        {icon ? <Icon name={icon} /> : null}
        {label}
      </button>
    </ActionForm>
  )
}

type FieldBase = { name: string; label: string; hint?: React.ReactNode; required?: boolean; className?: string }
export function Field({ name, label, hint, required, className, type = 'text', value, placeholder, autoComplete, min, max, step, pattern, maxLength, inputMode }: FieldBase & {
  type?: string
  value?: string | number | null
  placeholder?: string
  autoComplete?: string
  min?: string | number
  max?: string | number
  step?: string | number
  pattern?: string
  maxLength?: number
  inputMode?: 'numeric' | 'email' | 'tel' | 'text'
}) {
  return (
    <label className={`fld ${className ?? ''}`}>
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input name={name} type={type} defaultValue={value ?? undefined} required={required} placeholder={placeholder} autoComplete={autoComplete} min={min} max={max} step={step} pattern={pattern} maxLength={maxLength} inputMode={inputMode} />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}
export function Select({ name, label, hint, required, className, value, options, empty }: FieldBase & { value?: string | null; options: readonly (readonly [string, string])[] | [string, string][]; empty?: string }) {
  return (
    <label className={`fld ${className ?? ''}`}>
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <select name={name} defaultValue={value ?? ''} required={required}>
        {empty !== undefined ? <option value="">{empty}</option> : null}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}
export function TextArea({ name, label, hint, required, className, value, rows = 4, maxLength, placeholder }: FieldBase & { value?: string | null; rows?: number; maxLength?: number; placeholder?: string }) {
  return (
    <label className={`fld ${className ?? ''}`}>
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <textarea name={name} defaultValue={value ?? undefined} required={required} rows={rows} maxLength={maxLength} placeholder={placeholder} />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}
export function Check({ name, label, checked, value = 'on', disabled }: { name: string; label: React.ReactNode; checked?: boolean; value?: string; disabled?: boolean }) {
  return (
    <label className="check" style={disabled ? { opacity: 0.6 } : undefined}>
      <input type="checkbox" name={name} value={value} defaultChecked={checked} disabled={disabled} />
      <span>{label}</span>
    </label>
  )
}
export function FileField({ name, label, hint, required, accept }: FieldBase & { accept?: string }) {
  return (
    <label className="fld">
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input type="file" name={name} required={required} accept={accept} />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}
export const Submit = ({ children, tone, icon, name, value }: { children: React.ReactNode; tone?: 'ghost' | 'danger' | 'ok'; icon?: IconName; name?: string; value?: string }) => (
  <button className={`btn${tone ? ` btn--${tone}` : ''}`} type="submit" name={name} value={value}>
    {icon ? <Icon name={icon} /> : null}
    {children}
  </button>
)
export const LinkBtn = ({ href, children, tone, icon, small }: { href: string; children: React.ReactNode; tone?: 'ghost' | 'danger-ghost'; icon?: IconName; small?: boolean }) => (
  <Link className={`btn${tone ? ` btn--${tone}` : ''}${small ? ' btn--sm' : ''}`} href={href}>
    {icon ? <Icon name={icon} /> : null}
    {children}
  </Link>
)

export const rupiah = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `Rp${Math.round(n).toLocaleString('id-ID')}`)
export const plural = (n: number, w: string) => `${n.toLocaleString('id-ID')} ${w}`
