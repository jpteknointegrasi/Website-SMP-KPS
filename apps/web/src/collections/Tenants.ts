import { APIError, type CollectionConfig } from 'payload'
import { fieldSuperAdminOnly, isStaff, isSuperAdmin, superAdminOnly } from '../access/roles'
import { PLANS, PLAN_LABELS, PRODUCT_STATUS, sealSecret } from '@sekolahku/core'
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
  },
  versions: { maxPerDoc: 20 },
  lockDocuments: false,
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.slug) data.slug = String(data.slug).trim().toLowerCase()
        if (Array.isArray(data?.domains)) {
          data.domains = data.domains.map((d: { domain?: string }) => ({ ...d, domain: normalizeHost(d?.domain) }))
        }
        return data
      },
    ],
    beforeChange: [
      // App database URL: sealed before it is stored; the plain value is never kept.
      ({ data, originalDoc }) => {
        const input = (data.app as { databaseInput?: string } | undefined)?.databaseInput?.trim()
        if (data.app) delete (data.app as { databaseInput?: string }).databaseInput
        if (input) {
          if (!/^postgres(ql)?:\/\/\S+$/i.test(input)) throw new APIError('URL database App harus diawali postgres:// atau postgresql://', 400, null, true)
          data.app = { ...(data.app ?? {}), database: sealSecret(input) }
        } else if (data.app && originalDoc?.app?.database && !(data.app as { database?: string }).database) {
          ;(data.app as { database?: string }).database = originalDoc.app.database
        }
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
      admin: { description: 'Sekolahku Web dan Sekolahku App dijual terpisah. Setiap produk memeriksa langganannya sendiri di server.' },
      fields: [
        {
          name: 'web',
          type: 'group',
          label: 'Sekolahku Web (website & CMS, minat, kunjungan/open house)',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'plan', type: 'select', label: 'Paket', required: true, defaultValue: 'basic', options: PLANS.web.map((v) => ({ label: PLAN_LABELS[v]!, value: v })) },
                { name: 'status', type: 'select', label: 'Status', required: true, defaultValue: 'active', options: PRODUCT_STATUS.map((o) => ({ ...o })) },
              ],
            },
          ],
        },
        {
          name: 'app',
          type: 'group',
          label: 'Sekolahku App (portal /portal: penerimaan siswa baru, akademik, layanan)',
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
              admin: {
                description:
                  'Satu database per sekolah. Tempel URL koneksi (postgres://…) untuk mengatur atau mengganti; disimpan terenkripsi dan tidak pernah ditampilkan lagi. Kosongkan untuk tidak mengubah. Setelah itu jalankan: npm run portal:migrate -- --sekolah <kode>.',
              },
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
