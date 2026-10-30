import { APIError, type CollectionConfig } from 'payload'
import { fieldSuperAdminOnly, isStaff, isSuperAdmin, superAdminOnly } from '../access/roles'
import { FREE_CMS_DAYS, PLANS, PLAN_LABELS, PRODUCT_STATUS, sealSecret } from '@sekolahku/core'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { RESERVED_SLUGS, SCHOOL_TIMEZONES, DEFAULT_TIMEZONE } from '../tenancy/config'
import { clearTenantCache, normalizeHost } from '../tenancy/resolve'
import { tenantOfUser } from '../tenancy/access'
import { provisionTenant } from '../tenancy/provision'

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/** A school using the platform. Only the platform Super Admin manages schools. */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: { singular: 'Sekolah', plural: 'Sekolah' },
  admin: {
    group: 'Platform',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'timezone', 'updatedAt'],
    description: 'Setiap sekolah punya data, pengguna, pengaturan dan domainnya sendiri. Hanya Super Admin platform.',
    hidden: ({ user }) => !isSuperAdmin(user as never),
  },
  access: {
    // School staff can read their own school (name, time zone); visitors never read this collection directly.
    read: ({ req: { user } }) => (isSuperAdmin(user) ? true : isStaff(user) && tenantOfUser(user) ? { id: { equals: tenantOfUser(user)! } } : false),
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
    // history holds every school's contacts and subscriptions: platform operator only
    readVersions: superAdminOnly,
  },
  versions: { maxPerDoc: 20 },
  lockDocuments: false,
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, operation }) => {
        if (data?.slug) data.slug = String(data.slug).trim().toLowerCase()
        if (Array.isArray(data?.domains)) {
          data.domains = data.domains.map((d: { domain?: string }) => ({ ...d, domain: normalizeHost(d?.domain) }))
        }
        // Packages: an App subscription always comes with Website + CMS (Paket Lengkap); there is no App-only school.
        const web = { ...((originalDoc?.web as object) ?? {}), ...((data?.web as object) ?? {}) } as { plan?: string; cmsUntil?: string | null }
        const app = { ...((originalDoc?.app as object) ?? {}), ...((data?.app as object) ?? {}) } as { plan?: string }
        if (data && app.plan && app.plan !== 'none' && web.plan !== 'pro') data.web = { ...web, plan: 'pro' }
        // Website Gratis: the CMS is open for the first FREE_CMS_DAYS after the school is created.
        if (data && operation === 'create' && (web.plan ?? 'basic') === 'basic' && !web.cmsUntil)
          data.web = { ...web, ...((data.web as object) ?? {}), cmsUntil: new Date(Date.now() + FREE_CMS_DAYS * 86_400_000).toISOString() }
        return data
      },
    ],
    beforeChange: [
      // App database URL: sealed before it is stored; the plain value is never kept.
      // The stored value can only come from this hook: whatever `database` a request sends is ignored.
      ({ data, originalDoc }) => {
        const app = (data.app ?? {}) as { databaseInput?: string; databaseClear?: boolean; database?: string | null }
        const input = app.databaseInput?.trim()
        const clear = app.databaseClear === true
        delete app.databaseInput
        delete app.databaseClear
        let sealed: string | null = (originalDoc?.app as { database?: string | null } | undefined)?.database ?? null
        if (input) {
          if (!/^postgres(ql)?:\/\/\S+$/i.test(input)) throw new APIError('URL database App harus diawali postgres:// atau postgresql://', 400, null, true)
          sealed = sealSecret(input)
        } else if (clear) sealed = null
        app.database = sealed
        data.app = app
        return data
      },
      // A domain can only point at one school.
      async ({ data, req, originalDoc }) => {
        const domains: string[] = (data.domains ?? []).map((d: { domain?: string }) => d?.domain).filter(Boolean)
        if (new Set(domains).size !== domains.length) throw new APIError('Domain yang sama tercantum dua kali.', 400, null, true)
        for (const domain of domains) {
          const clash = await req.payload.find({
            collection: 'tenants',
            where: { and: [{ 'domains.domain': { equals: domain } }, ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : [])] },
            limit: 1,
            depth: 0,
            overrideAccess: true,
            req,
          })
          if (clash.docs[0]) throw new APIError(`Domain ${domain} sudah dipakai sekolah lain (${clash.docs[0].name}).`, 400, null, true)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        clearTenantCache()
        if (operation === 'create' && !req.context?.skipProvision) await provisionTenant(req.payload, doc, req)
        return doc
      },
      auditAfterChange,
    ],
    beforeDelete: [
      // Deleting a school with data would orphan it: suspend it instead.
      async ({ id, req }) => {
        for (const collection of ['users', 'posts', 'media', 'leads'] as const) {
          const n = await req.payload.count({ collection, where: { tenant: { equals: id } }, overrideAccess: true, req })
          if (n.totalDocs > 0)
            throw new APIError('Sekolah ini masih punya data/pengguna. Ubah status menjadi "Ditangguhkan" alih-alih menghapus.', 409, null, true)
        }
      },
    ],
    afterDelete: [
      ({ doc }) => {
        clearTenantCache()
        return doc
      },
      auditAfterDelete,
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nama sekolah', required: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Kode sekolah (subdomain)',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Huruf kecil, angka, tanda hubung. Dipakai sebagai <kode>.domain-platform. Jangan diubah setelah tayang.' },
      validate: (v: unknown) =>
        typeof v === 'string' && SLUG_RE.test(v) && !RESERVED_SLUGS.has(v) ? true : 'Kode 1–42 karakter: huruf kecil, angka, tanda hubung; bukan kata cadangan (www, admin, api, …).',
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      required: true,
      defaultValue: 'trial',
      options: [
        { label: 'Aktif', value: 'active' },
        { label: 'Uji coba', value: 'trial' },
        { label: 'Ditangguhkan (situs & login ditutup)', value: 'suspended' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'collapsible',
      label: 'Langganan produk',
      admin: {
        description:
          'Paket SatuSekolah: Website Gratis (Web: Website Gratis), Website + CMS (Web: Website + CMS), Paket Lengkap (Web: Website + CMS + App). Memilih paket App otomatis menjadikan Web "Website + CMS".',
      },
      fields: [
        {
          name: 'web',
          type: 'group',
          label: 'SatuSekolah Web (website & CMS, minat, kunjungan/open house)',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'plan', type: 'select', label: 'Paket', required: true, defaultValue: 'basic', options: PLANS.web.map((v) => ({ label: PLAN_LABELS[v]!, value: v })) },
                { name: 'status', type: 'select', label: 'Status', required: true, defaultValue: 'active', options: PRODUCT_STATUS.map((o) => ({ ...o })) },
              ],
            },
            {
              name: 'cmsUntil',
              type: 'date',
              label: 'Akses CMS sampai (Website Gratis)',
              admin: {
                date: { pickerAppearance: 'dayAndTime' },
                condition: (_d, sibling) => (sibling as { plan?: string })?.plan === 'basic',
                description: `Diisi otomatis ${FREE_CMS_DAYS} hari sejak sekolah dibuat. Setelah lewat, website tetap tayang tetapi staf tidak bisa masuk CMS. Perpanjang tanggal ini, atau ubah paket ke "Website + CMS".`,
              },
            },
          ],
        },
        {
          name: 'app',
          type: 'group',
          label: 'SatuSekolah App (portal /portal: penerimaan siswa baru, akademik, layanan) — Paket Lengkap',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'plan', type: 'select', label: 'Paket', required: true, defaultValue: 'none', options: PLANS.app.map((v) => ({ label: PLAN_LABELS[v]!, value: v })) },
                { name: 'status', type: 'select', label: 'Status', required: true, defaultValue: 'trial', options: PRODUCT_STATUS.map((o) => ({ ...o })) },
              ],
            },
            {
              // Sealed (AES-256-GCM, PLATFORM_SECRET). Never readable through the API or the admin, not even by the Super Admin.
              name: 'database',
              type: 'text',
              access: { read: () => false, create: fieldSuperAdminOnly, update: fieldSuperAdminOnly },
              admin: { hidden: true },
            },
            {
              name: 'databaseInput',
              type: 'text',
              label: 'Database App sekolah ini (URL PostgreSQL)',
              virtual: true,
              access: { create: fieldSuperAdminOnly, update: fieldSuperAdminOnly },
              // Payload marks virtual fields read-only in the admin unless readOnly is explicitly false
              admin: {
                readOnly: false,
                description:
                  'Satu database per sekolah. Tempel URL koneksi (postgres://…) untuk mengatur atau mengganti; disimpan terenkripsi dan tidak pernah ditampilkan lagi. Kosongkan untuk tidak mengubah. Setelah itu jalankan: npm run portal:migrate -- --sekolah <kode>.',
              },
            },
            {
              name: 'databaseClear',
              type: 'checkbox',
              label: 'Hapus pengaturan database App',
              virtual: true,
              access: { create: fieldSuperAdminOnly, update: fieldSuperAdminOnly },
              admin: { readOnly: false, description: 'Hanya memutus portal dari database itu; database dan isinya tidak dihapus.' },
            },
            {
              name: 'databaseConfigured',
              type: 'checkbox',
              label: 'Database App sudah diatur',
              virtual: true,
              admin: { readOnly: true },
              hooks: { afterRead: [({ siblingData }) => Boolean((siblingData as { database?: string })?.database)] },
            },
          ],
        },
      ],
    },
    {
      name: 'timezone',
      type: 'select',
      label: 'Zona waktu sekolah',
      required: true,
      defaultValue: DEFAULT_TIMEZONE,
      options: SCHOOL_TIMEZONES.map(({ label, value }) => ({ label, value })),
      admin: { position: 'sidebar', description: 'Dipakai untuk jam di situs, agenda, kalender (ICS) dan dasbor.' },
    },
    {
      name: 'domains',
      type: 'array',
      label: 'Domain',
      labels: { singular: 'Domain', plural: 'Domain' },
      admin: { description: 'Domain milik sekolah, mis. www.smpkps.sch.id. Arahkan DNS-nya ke platform lalu tambahkan juga di Vercel → Domains.' },
      fields: [
        {
          name: 'domain',
          type: 'text',
          label: 'Nama domain',
          required: true,
          index: true,
          validate: (v: unknown) => (typeof v === 'string' && DOMAIN_RE.test(normalizeHost(v)) ? true : 'Contoh: www.namasekolah.sch.id (tanpa https://).'),
        },
        { name: 'primary', type: 'checkbox', label: 'Domain utama (dipakai di tautan, sitemap, email)', defaultValue: false },
      ],
    },
    {
      type: 'collapsible',
      label: 'Kontak pengelola (internal platform)',
      admin: { initCollapsed: true },
      fields: [
        { name: 'contactName', type: 'text', label: 'Nama penanggung jawab' },
        { name: 'contactEmail', type: 'email', label: 'Email' },
        { name: 'contactPhone', type: 'text', label: 'Telepon' },
        { name: 'notes', type: 'textarea', label: 'Catatan internal' },
      ],
    },
  ],
}
