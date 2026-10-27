import 'server-only'
/**
 * Request → Ctx for pages and route handlers. The school comes from the address (passed on by the website), the staff
 * member from the CMS session (confirmed by the website), the family account from the portal's own session cookie.
 */
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { hasProduct } from '@sekolahku/core'
import { portalOperator, portalSchool, portalStaff } from '@/lib/context'
import { schoolDb } from '@/db/school-db'
import { loadAccount, loadPlatformAdmin, loadStaff, makeCtx, type Ctx } from './context'
import type { Permission } from './roles'
import { getBranding, getModules, moduleOpen, type ModuleCode } from './settings'

export const SESSION_COOKIE = 'sekolahku_sesi'
export const BASE = '/portal'

/** Context of this request, or null when the address has no school with an active App and a ready database. */
export const requestCtx = cache(async (): Promise<Ctx | null> => {
  const school = await portalSchool()
  if (!school || !hasProduct(school, 'app')) return null
  let db
  try {
    db = await schoolDb(school)
  } catch {
    return null
  }
  const member = await portalStaff()
  const operator = member ? null : await portalOperator()
  const staff = member ? await loadStaff(db, member) : operator ? await loadPlatformAdmin(db, operator) : null
  const account = await loadAccount(db, (await cookies()).get(SESSION_COOKIE)?.value)
  return makeCtx({ school, db, staff, account })
})

export const requestBranding = cache(async () => {
  const ctx = await requestCtx()
  return ctx ? getBranding(ctx.db) : null
})
export const requestModules = cache(async () => {
  const ctx = await requestCtx()
  return ctx ? getModules(ctx.db) : null
})

/** Page guard for staff pages: signed-in staff with one of the permissions, module open for staff. */
export async function staffPage(path: string, perms: Permission[] = [], mod?: ModuleCode) {
  const ctx = await requestCtx()
  if (!ctx) redirect('/')
  if (!ctx.staff) redirect(`/masuk-staf?lanjut=${encodeURIComponent(BASE + path)}`)
  if (perms.length && !perms.some((p) => ctx.staff!.perms.has(p))) redirect('/tidak-berwenang')
  if (mod && !moduleOpen((await requestModules())!, mod, 'staff')) redirect('/modul-belum-aktif')
  return ctx as Ctx & { staff: NonNullable<Ctx['staff']> }
}

/** Page guard for family/student pages. */
export async function accountPage(path: string, mod?: ModuleCode, opts: { allowPasswordChange?: boolean } = {}) {
  const ctx = await requestCtx()
  if (!ctx) redirect('/')
  if (!ctx.account) redirect(`/masuk?lanjut=${encodeURIComponent(BASE + path)}`)
  if (ctx.account.mustChangePassword && !opts.allowPasswordChange) redirect('/akun/sandi?wajib=1')
  if (mod && !moduleOpen((await requestModules())!, mod, 'family')) redirect('/modul-belum-aktif')
  return ctx as Ctx & { account: NonNullable<Ctx['account']> }
}
