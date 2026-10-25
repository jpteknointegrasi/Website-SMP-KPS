import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export type Role = 'admin' | 'editor' | 'contributor' | 'admissions'

export const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'Admin Teknis', value: 'admin' },
  { label: 'Editor / Humas', value: 'editor' },
  { label: 'Kontributor', value: 'contributor' },
  { label: 'Petugas Pendaftaran', value: 'admissions' },
]

type MaybeUser = PayloadRequest['user'] | null | undefined

export const roleOf = (user: MaybeUser): Role | null => {
  if (!user || (user as { collection?: string }).collection !== 'users') return null
  return ((user as { role?: Role }).role ?? null) as Role | null
}

export const hasRole = (user: MaybeUser, ...roles: Role[]) => {
  const r = roleOf(user)
  return r !== null && roles.includes(r)
}

export const isAdmin = (user: MaybeUser) => hasRole(user, 'admin')
export const isEditorial = (user: MaybeUser) => hasRole(user, 'admin', 'editor')
export const isStaff = (user: MaybeUser) => roleOf(user) !== null

/** Whether demo content (isDemo = true) may be shown publicly. Must be false in production. */
export const demoAllowed = () => process.env.SHOW_DEMO_CONTENT === 'true'

// ---------- collection access ----------
export const adminOnly: Access = ({ req: { user } }) => isAdmin(user)
export const editorialOnly: Access = ({ req: { user } }) => isEditorial(user)
export const staffOnly: Access = ({ req: { user } }) => isStaff(user)
export const anyone: Access = () => true
export const nobody: Access = () => false

/** Public read for versioned content: published only (+ optional extra constraint), staff see everything. */
export const publishedOrStaff =
  (extra?: () => Where): Access =>
  ({ req: { user } }) => {
    if (isStaff(user)) return true
    // Archived records are never public (archivedAt is a staff-only field, so it is enforced here, not in queries).
    const and: Where[] = [{ _status: { equals: 'published' } }, { or: [{ archivedAt: { exists: false } }, { archivedAt: { equals: null } }] }]
    if (!demoAllowed()) and.push({ isDemo: { not_equals: true } })
    if (extra) and.push(extra())
    return { and }
  }

/** Editorial roles may create; contributors may create drafts (publish blocked by hook). */
export const canCreateContent: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'editor', 'contributor')

/** Editors/admin: any doc. Contributors: only own docs. */
export const canUpdateContent: Access = ({ req: { user } }) => {
  if (isEditorial(user)) return true
  if (hasRole(user, 'contributor')) return { createdBy: { equals: user!.id } }
  return false
}

/** Admissions-related modules: admin/editor + admissions officer. */
export const admissionsStaff: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'editor', 'admissions')

// ---------- field access ----------
export const fieldStaffOnly: FieldAccess = ({ req: { user } }) => isStaff(user)
export const fieldAdminOnly: FieldAccess = ({ req: { user } }) => isAdmin(user)
export const fieldEditorialOnly: FieldAccess = ({ req: { user } }) => isEditorial(user)
