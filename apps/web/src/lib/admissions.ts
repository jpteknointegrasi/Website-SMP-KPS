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
