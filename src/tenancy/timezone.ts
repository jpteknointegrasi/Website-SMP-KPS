import type { DateField, PayloadRequest } from 'payload'
import { DEFAULT_TIMEZONE, SCHOOL_TIMEZONES } from './config'
import { contextTenant, tenantOfUser } from './access'
import { tenantById } from './resolve'

/**
 * Time zone option for date fields edited in the CMS. The picker offers WIB/WITA/WIT and starts on the zone of the
 * editor's school, so "08.00" typed by a school in Jakarta is stored as 08.00 WIB. Stored values keep their zone.
 */
export const schoolTimezone: NonNullable<DateField['timezone']> = {
  supportedTimezones: SCHOOL_TIMEZONES.map(({ label, value }) => ({ label, value })),
  defaultTimezone: DEFAULT_TIMEZONE,
  override: ({ baseField }) => ({
    ...baseField,
    defaultValue: async ({ req, user }: { req?: PayloadRequest; user?: unknown }) => {
      const id = tenantOfUser(user as never) ?? (req ? contextTenant(req) : null)
      if (!id || !req?.payload) return DEFAULT_TIMEZONE
      return (await tenantById(req.payload, id))?.timezone ?? DEFAULT_TIMEZONE
    },
  }),
}
