import { describe, expect, it } from 'vitest'
import { interestOpenFor } from '@/lib/admissions'

describe('AUD-11 aturan form minat (satu predikat untuk halaman & API)', () => {
  it.each([
    [{ admissionStatus: 'open', interestFormEnabled: true }, true],
    [{ admissionStatus: 'not_open', mode: 'interest_form' }, true],
    [{ admissionStatus: 'open', interestFormEnabled: false, mode: 'external_system' }, false],
    [{ admissionStatus: 'closed', interestFormEnabled: true, closedOffer: 'contact' }, false],
    [{ admissionStatus: 'closed', interestFormEnabled: true, closedOffer: null }, false],
    [{ admissionStatus: 'closed', interestFormEnabled: true, closedOffer: 'interest_next' }, true],
    [null, false],
  ])('%j → %s', (c, ok) => expect(interestOpenFor(c as never)).toBe(ok))
})
