/**
 * Pure admissions decisions shared by the /pendaftaran pages and the API (unit-tested, no server imports).
 */

export type CycleLike = {
  admissionStatus?: string | null
  mode?: string | null
  interestFormEnabled?: boolean | null
  closedOffer?: string | null
}

/**
 * Whether a cycle accepts the interest form ("titipkan minat"): the form is switched on for it, and when admissions
 * are closed the school chose to offer "interest for the next cycle" (closedOffer 'interest_next') rather than
 * "contact the school". The feature flag is checked separately.
 */
export const interestOpenFor = (c: CycleLike | null | undefined): boolean =>
  Boolean(c) && Boolean(c!.interestFormEnabled || c!.mode === 'interest_form') && (c!.admissionStatus !== 'closed' || c!.closedOffer === 'interest_next')

export type AdmissionsCta =
  /** official registration in the school's external system (Sekolahku Web only) */
  | { kind: 'external'; href: string; label: string }
  /** Sekolahku App: registration in the portal (open) or sign-in to check an application (otherwise) */
  | { kind: 'portal'; href: string; label: string; open: boolean }
  | null

/**
 * The "official registration" button on /pendaftaran (PUB-05: it only appears when registration is really open and
 * leads somewhere valid). Pure: unit-tested.
 *  - School with Sekolahku App (admissionsMode 'app'): the portal is the one official process. Its open/closed state
 *    comes from the App's public summary (`appCycles`), not from the website's cycle; the button shows even when no
 *    website cycle is published. Open → "Daftar di Portal Penerimaan"; otherwise → "Masuk Portal Penerimaan".
 *  - Website only: a published cycle with status "open" AND an https registration URL.
 */
export function admissionsCta(opts: {
  mode: 'app' | 'web'
  portalPath: string
  cycle?: { admissionStatus?: string | null; registrationUrl?: string | null } | null
  appCycles?: { status?: string | null }[] | null
}): AdmissionsCta {
  if (opts.mode === 'app') {
    const open = (opts.appCycles ?? []).some((c) => c?.status === 'open')
    const href = `${opts.portalPath}/penerimaan`
    return open
      ? { kind: 'portal', href, label: 'Daftar di Portal Penerimaan', open: true }
      : { kind: 'portal', href, label: 'Masuk Portal Penerimaan (cek status pendaftaran)', open: false }
  }
  const url = opts.cycle?.registrationUrl ?? ''
  if (opts.cycle?.admissionStatus === 'open' && /^https:\/\/[^\s]+$/i.test(url)) return { kind: 'external', href: url, label: 'Daftar melalui sistem resmi' }
  return null
}

/**
 * Status shown on /pendaftaran. With Sekolahku App it follows the App (open / closed / upcoming → website labels);
 * the website cycle's own status is then only a fallback while the App has no public cycle.
 */
export function displayedAdmissionStatus(mode: 'app' | 'web', webStatus: string | null | undefined, appCycles?: { status?: string | null }[] | null): string {
  if (mode === 'app' && appCycles?.length) {
    if (appCycles.some((c) => c?.status === 'open')) return 'open'
    if (appCycles.some((c) => c?.status === 'upcoming')) return 'not_open'
    return 'closed'
  }
  return webStatus ?? 'unconfirmed'
}
