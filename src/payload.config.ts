import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { id } from '@payloadcms/translations/languages/id'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { PrivateFiles } from './collections/PrivateFiles'
import { Documents } from './collections/Documents'
import {
  Achievements,
  Albums,
  Announcements,
  Categories,
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
import { isStaff } from './access/roles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const dbUri = process.env.DATABASE_URI || ''
// PostgreSQL is the production target. `file:./kps.db` (SQLite) is a zero-setup option for local trials only.
const db = dbUri.startsWith('file:')
  ? sqliteAdapter({ client: { url: dbUri }, migrationDir: path.resolve(dirname, 'migrations-sqlite') })
  : postgresAdapter({
      pool: { connectionString: dbUri },
      migrationDir: path.resolve(dirname, 'migrations'),
    })

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' · CMS SMP Nasional KPS',
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
  collections: [
    Pages,
    Posts,
    Categories,
    Announcements,
    Events,
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
    AdmissionsCycles,
    ContactMessages,
    Media,
    PrivateFiles,
    Redirects,
    Users,
    AuditLogs,
  ],
  globals: [Homepage, SiteSettings, Navigation],
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
  graphQL: { disable: true },
  jobs: {
    access: { run: ({ req }) => isStaff(req.user) || req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}` },
    // Runs scheduled publish/unpublish jobs every minute while the server is up.
    // Expiry of announcements does not depend on this: public queries filter by date.
    autoRun: [{ cron: '* * * * *', queue: 'default', limit: 20 }],
    shouldAutoRun: () => process.env.DISABLE_JOB_AUTORUN !== 'true',
  },
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || ''].filter(Boolean),
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL || ''].filter(Boolean),
})
