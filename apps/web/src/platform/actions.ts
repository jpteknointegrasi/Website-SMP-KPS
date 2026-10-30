'use server'
/**
 * Server actions of the platform pages. Thin wrappers: each re-checks the platform address and (for the console)
 * the signed-in Super Admin here — never trusting the page that rendered the form — then calls platform/service.ts.
 */
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { rawPayload } from '@/lib/payload'
import { PLATFORM_ROOT_DOMAIN } from '@/tenancy/config'
import { onPlatformHost, platformOperator } from './session'
import { approve, createApplication, reject } from './service'
import { readApplication, readApproval } from './validation'

export type FormState = { errors?: Record<string, string>; message?: string; values?: Record<string, string> } | null

const valuesOf = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string').map(([k, v]) => [k, String(v)]))

/** Public sign-up form (no account needed). Creates nothing but a pending application. */
export async function submitApplication(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await onPlatformHost())) return { message: 'Formulir ini hanya tersedia di alamat platform.' }
  // honeypot: real people never fill this hidden field
  if (String(fd.get('website') ?? '').trim()) redirect('/daftar-sekolah/terkirim')
  const { value, errors } = readApplication(fd)
  if (Object.keys(errors).length) return { errors, message: 'Periksa kembali isian yang ditandai.', values: valuesOf(fd) }
  const r = await createApplication(await rawPayload(), value)
  if (!r.ok) return { message: r.message, values: valuesOf(fd) }
  redirect(`/daftar-sekolah/terkirim?ref=${encodeURIComponent(r.reference)}${value.package === 'lengkap' ? '&demo=1' : ''}`)
}

export type ApproveState =
  | { ok: false; errors: string[] }
  | { ok: true; schoolName: string; slug: string; domain: string; inviteUrl: string; emailed: boolean; adminEmail: string; app: boolean }
  | null

/** Super Admin approves: school + first Admin Teknis + trial subscriptions, atomically. */
export async function approveApplication(_prev: ApproveState, fd: FormData): Promise<ApproveState> {
  if (!(await onPlatformHost())) return { ok: false, errors: ['Hanya di alamat platform.'] }
  const operator = await platformOperator()
  if (!operator) return { ok: false, errors: ['Sesi Super Admin berakhir. Masuk lagi.'] }
  const { value, errors } = readApproval(fd)
  if (errors.length) return { ok: false, errors }
  const r = await approve(await rawPayload(), operator, value, String(fd.get('decisionNote') ?? ''), PLATFORM_ROOT_DOMAIN)
  if (!r.ok) return r
  // no revalidatePath here: refreshing would re-render the queue and unmount the one-time invitation link
  return { ok: true, schoolName: r.schoolName, slug: r.slug, domain: r.domain, inviteUrl: r.inviteUrl, emailed: r.emailed, adminEmail: r.adminEmail, app: r.app }
}

/** Super Admin rejects with a reason (sent to the applicant when e-mail is configured). */
export async function rejectApplication(fd: FormData): Promise<void> {
  if (!(await onPlatformHost())) return
  const operator = await platformOperator()
  if (!operator) redirect('/platform/masuk')
  if (await reject(await rawPayload(), operator, Number(fd.get('applicationId')), String(fd.get('decisionNote') ?? ''))) revalidatePath('/platform', 'layout')
}
