import Link from 'next/link'
import type { LinkedChild } from '@/modules/scope'
import { Avatar } from './kit'

export type Child = { studentId: string; name: string; self?: boolean; canViewAcademic?: boolean; canViewFinance?: boolean }

/** WLI-01 child selector: every page section follows the selected child (?anak=). */
export function ChildPicker({ items, current, path }: { items: Child[]; current: string | null; path: string }) {
  if (items.length <= 1) return null
  return (
    <nav className="row" aria-label="Pilih anak" style={{ marginBottom: 16 }}>
      {items.map((c) => (
        <Link key={c.studentId} href={`${path}?anak=${c.studentId}`} className={`tile`} aria-current={c.studentId === current ? 'true' : undefined} style={{ padding: '8px 14px', alignItems: 'center', borderColor: c.studentId === current ? 'var(--brand)' : undefined, boxShadow: c.studentId === current ? '0 0 0 2px rgba(8,123,240,.2)' : undefined }}>
          <Avatar name={c.name} />
          <span>
            <strong>{c.name}</strong>
            <span>{c.self ? 'Akun saya' : 'Anak'}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}
export type { LinkedChild }
