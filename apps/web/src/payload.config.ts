import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { id } from '@payloadcms/translations/languages/id'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

import { Users } from './collections/Users'
import { Tenants } from './collections/Tenants'
import { withTenancy } from './tenancy/collection'
import { asSingleton } from './tenancy/singleton'
import { PLATFORM_NAME } from './tenancy/config'
import { scopePayload } from './tenancy/scoped'
import { toInfo } from './tenancy/resolve'
import { syncAppWorks } from './lib/app-works'
import { Media } from './collections/Media'
import { PrivateFiles } from './collections/PrivateFiles'
import { Documents } from './collections/Documents'
import {
  Achievements,
  Albums,
  Announcements,
  Categories,
  EventCategories,
  Events,
  Extracurriculars,
  Facilities,
  Guides,
  Pages,
  Posts,
  Programs,
  Services,
  Staff,
  Testimonials,
} from './collections/content'
import { AdmissionsCycles, AuditLogs, ContactMessages, Redirects } from './collections/system'
import { Homepage, Navigation, SiteSettings } from './globals'
import { FeatureFlags } from './globals/flags'
import { Faqs, StudentWorks } from './collections/extra'
import { MediaItems, SocialAccounts } from './collections/media-hub'
import { Leads, VisitBookings, VisitSessions } from './collections/admissions'
import { AnalyticsDaily } from './collections/analytics'
import { isSuperAdmin } from './access/roles'
import { readFlags } from './lib/flags'
import { releaseExpiredHolds } from './lib/capacity'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// DATABASE_URL / POSTGRES_URL are what the Vercel ↔ Neon integration injects
const dbUri = process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
// PostgreSQL is the production target. `file:./kps.db` (SQLite) is a zero-setup option for local trials only.
const db = dbUri.startsWith('file:')
  ? sqliteAdapter({ client: { url: dbUri }, migrationDir: path.resolve(dirname, 'migrations-sqlite') })
  : postgresAdapter({
      pool: { connectionString: dbUri },
      migrationDir: path.resolve(dirname, 'migrations'),
      // Schema changes only through versioned migrations (npm run migrate), also in development and tests,
      // so what is tested is exactly what production gets.
      push: false,
    })

export default buildConfig({
  // Empty for a multi-school deployment: every school is served on its own domain (relative URLs).
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ` · ${PLATFORM_NAME}`,
      robots: 'noindex, nofollow',
    },
    dateFormat: 'dd MMM yyyy HH:mm',
    components: {
      graphics: {
        Logo: '@/components/admin/Brand#AdminLogo',
        Icon: '@/components/admin/Brand#AdminIcon',
      },
      beforeDashboard: ['@/components/admin/Dashboard#Dashboard'],
    },
  },
  i18n: {
    supportedLanguages: { id, en },
    fallbackLanguage: 'id',
  },
  // Every school-owned collection goes through withTenancy (tenant field, isolated access, per-school unique
  // indexes). Tenants and Users are platform collections with their own rules.
  collections: [
    ...[
      Pages,
      Posts,
      Categories,
      Announcements,
      Events,
      EventCategories,
      Faqs,
      Albums,
      Documents,
      Guides,
      Services,
      Testimonials,
      Programs,
      Extracurriculars,
      Facilities,
      Staff,
      Achievements,
      StudentWorks,
      MediaItems,
      SocialAccounts,
      AdmissionsCycles,
      Leads,
      VisitSessions,
      VisitBookings,
      ContactMessages,
      Media,
      PrivateFiles,
      Redirects,
      AnalyticsDaily,
      // former globals: one document per school
      asSingleton(Homepage),
      asSingleton(SiteSettings, { useAsTitle: 'schoolName' }),
      asSingleton(Navigation),
      asSingleton(FeatureFlags),
    ].map((c) => withTenancy(c)),
    // platform-level events (e.g. Super Admin changes) have no school
    withTenancy(AuditLogs, { optional: true }),
    Tenants,
    Users,
  ],
  editor: lexicalEditor({
    // Structured rich text only: no raw HTML/script blocks; H1 is reserved for the page title.
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter((f) => f.key !== 'heading' && f.key !== 'relationship'),
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    ],
  }),
  upload: { limits: { fileSize: 25_000_000 } },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db,
  sharp,
  plugins: [
    // Production on Vercel: files live in Vercel Blob (the serverless disk is not persistent).
    // Locally (no BLOB_READ_WRITE_TOKEN) files stay in ./media, ./documents, ./private-media.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      token: process.env.BLOB_READ_WRITE_TOKEN,
      alwaysInsertFields: true, // identical schema/migrations with or without the token
      // No random suffix: with it, resized image variants get URLs that don't match the stored blobs.
      // File names are already random UUIDs (hooks/uploadSecurity.ts).
      addRandomSuffix: false,
      collections: {
        // public images are served straight from the Blob CDN
        media: { disablePayloadAccessControl: true, prefix: 'media' },
        // documents & private files are always served through Payload so access rules apply
        documents: { prefix: 'documents' },
        'private-files': { prefix: 'private' },
      },
    }),
  ],
  graphQL: { disable: true },
  jobs: {
    // runs every school's queued jobs: platform operator or the scheduler only
    access: { run: ({ req }) => isSuperAdmin(req.user) || (Boolean(process.env.CRON_SECRET) && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) },
    // Runs scheduled publish/unpublish jobs every minute while the server is up.
    // Expiry of announcements does not depend on this: public queries filter by date.
    autoRun: [{ cron: '* * * * *', queue: 'default', limit: 20 }],
    tasks: [
      {
        // Frees seats of visit bookings left "pending" past their confirmation deadline.
        // Booking and availability requests also do this lazily, so a late scheduler never overbooks.
        slug: 'releaseVisitHolds',
        schedule: [{ cron: '0 * * * *', queue: 'default' }],
        handler: async ({ req }) => {
          // per school: each school's flag decides whether its holds are released
          let released = 0
          const schools = await req.payload.find({ collection: 'tenants', where: { status: { not_equals: 'suspended' } }, limit: 1000, depth: 0, overrideAccess: true, pagination: false })
          for (const t of schools.docs) {
            const p = scopePayload(req.payload, t.id)
            if ((await readFlags(p)).schoolVisits) released += await releaseExpiredHolds(p)
          }
          return { output: { released } }
        },
        outputSchema: [
          { name: 'released', type: 'number' },
          { name: 'skipped', type: 'text' },
        ],
      },
      {
        // Karya siswa consented in Sekolahku App → drafts for moderation; withdrawn consent → hidden.
        slug: 'syncAppWorks',
        schedule: [{ cron: '15 * * * *', queue: 'default' }],
        handler: async ({ req }) => {
          let created = 0
          let hidden = 0
          const schools = await req.payload.find({ collection: 'tenants', where: { status: { not_equals: 'suspended' } }, limit: 1000, depth: 0, overrideAccess: true, pagination: false })
          for (const t of schools.docs) {
            try {
              const r = await syncAppWorks(req.payload, toInfo(t as never))
              created += 'created' in r ? (r.created ?? 0) : 0
              hidden += 'hidden' in r ? (r.hidden ?? 0) : 0
            } catch (e) {
              req.payload.logger.error({ err: e, school: t.id }, 'sinkron karya App gagal')
            }
          }
          return { output: { created, hidden } }
        },
        outputSchema: [
          { name: 'created', type: 'number' },
          { name: 'hidden', type: 'number' },
        ],
      },
    ],
    // Serverless (Vercel) has no long-running process: jobs are triggered by cron → /api/payload-jobs/run
    shouldAutoRun: () => process.env.DISABLE_JOB_AUTORUN !== 'true' && !process.env.VERCEL,
  },
  // Same-origin only (no cross-origin API clients). CSRF for every school domain is enforced in src/proxy.ts,
  // because a static origin list cannot name the domains schools add later.
  cors: [],
  csrf: [],
})
