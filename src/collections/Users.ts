import type { CollectionConfig } from 'payload'
import { ROLE_OPTIONS, adminOnly, fieldAdminOnly, isAdmin } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Pengguna', plural: 'Pengguna' },
  admin: { useAsTitle: 'name', group: 'Pengguna & Akses', defaultColumns: ['name', 'email', 'role', 'active'] },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 60 * 60 * 8,
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
    useAPIKey: false,
  },
  access: {
    // Users see themselves; admin sees all
    read: ({ req: { user } }) => (isAdmin(user) ? true : user ? { id: { equals: user.id } } : false),
    create: adminOnly,
    update: ({ req: { user } }) => (isAdmin(user) ? true : user ? { id: { equals: user.id } } : false),
    delete: adminOnly,
    admin: ({ req: { user } }) => Boolean(user && (user as { active?: boolean }).active !== false),
  },
  hooks: {
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
    beforeChange: [
      async ({ data, req, operation }) => {
        // The very first account (Payload "create first user") becomes Admin Teknis.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
          if (totalDocs === 0) data.role = 'admin'
          else if (!isAdmin(req.user) && req.user) data.role = 'contributor'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nama lengkap', required: true },
    {
      name: 'role',
      type: 'select',
      label: 'Peran',
      required: true,
      defaultValue: 'contributor',
      options: ROLE_OPTIONS,
      access: { create: fieldAdminOnly, update: fieldAdminOnly },
      saveToJWT: true,
      admin: { description: 'Hanya Admin Teknis yang dapat mengubah peran.' },
    },
    {
      name: 'canPublishAdmissions',
      type: 'checkbox',
      label: 'Boleh menerbitkan informasi pendaftaran',
      defaultValue: false,
      access: { create: fieldAdminOnly, update: fieldAdminOnly },
      saveToJWT: true,
      admin: { condition: (d) => d?.role === 'admissions' },
    },
    {
      name: 'canAccessLeads',
      type: 'checkbox',
      label: 'Boleh melihat data calon orang tua (minat & kunjungan)',
      defaultValue: false,
      access: { create: fieldAdminOnly, update: fieldAdminOnly },
      saveToJWT: true,
      admin: {
        condition: (d) => d?.role !== 'admissions' && d?.role !== 'contributor',
        description: 'Petugas Pendaftaran otomatis boleh. Peran lain hanya bila dicentang Admin Teknis (tercatat di audit).',
      },
    },
    {
      name: 'canExportLeads',
      type: 'checkbox',
      label: 'Boleh mengekspor kontak calon orang tua (CSV)',
      defaultValue: false,
      access: { create: fieldAdminOnly, update: fieldAdminOnly },
      saveToJWT: true,
      admin: { condition: (d) => Boolean(d?.canAccessLeads) && d?.role !== 'admissions' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Akun aktif',
      defaultValue: true,
      access: { create: fieldAdminOnly, update: fieldAdminOnly },
    },
  ],
}
