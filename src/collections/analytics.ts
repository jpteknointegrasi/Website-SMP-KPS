import type { CollectionConfig, Endpoint } from 'payload'
import { isEditorial, nobody } from '../access/roles'
import { readFlags, flagOff } from '../lib/flags'
import { ANALYTIC_KINDS, recordEvent, sanitizeKey, type AnalyticKind } from '../lib/analytics'
import { clientIp } from '../lib/forms'

const WINDOW = 10 * 60_000
const hits = new Map<string, number[]>()
const limited = (ip: string) => {
  const now = Date.now()
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 10_000) hits.clear()
  return arr.length > 200
}

/** POST /api/analytics-daily/track { kind: 'pageview' | 'cta_click', key } — form successes are counted server-side only. */
const trackEndpoint: Endpoint = {
  path: '/track',
  method: 'post',
  handler: async (req) => {
    if (!(await readFlags(req.payload)).visitorAnalytics) return flagOff()
    if (limited(clientIp(req))) return new Response(null, { status: 204 })
    let body: { kind?: unknown; key?: unknown } = {}
    try {
      body = JSON.parse((await req.text?.()) || '{}')
    } catch {
      return new Response(null, { status: 204 })
    }
    const kind = body.kind as AnalyticKind
    if (kind !== 'pageview' && kind !== 'cta_click') return new Response(null, { status: 204 })
    const key = sanitizeKey(kind, body.key)
    if (key) await recordEvent(req.payload, kind, key)
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
  },
}

export const AnalyticsDaily: CollectionConfig = {
  slug: 'analytics-daily',
  labels: { singular: 'Statistik Harian', plural: 'Statistik Pengunjung' },
  admin: {
    group: 'Audit',
    useAsTitle: 'key',
    defaultColumns: ['day', 'kind', 'key', 'count'],
    description: 'Agregat harian tanpa data pribadi (tanpa IP, cookie, isi form). Aktif bila fitur Statistik pengunjung dinyalakan.',
    hidden: ({ user }) => !isEditorial(user as never),
  },
  defaultSort: '-day',
  access: { read: ({ req: { user } }) => isEditorial(user), create: nobody, update: nobody, delete: ({ req: { user } }) => isEditorial(user) },
  endpoints: [trackEndpoint],
  indexes: [{ fields: ['day', 'kind', 'key'], unique: true }],
  fields: [
    { name: 'day', type: 'text', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: ANALYTIC_KINDS.map((k) => ({ label: k, value: k })) },
    { name: 'key', type: 'text', required: true },
    { name: 'count', type: 'number', required: true, defaultValue: 0 },
  ],
}
