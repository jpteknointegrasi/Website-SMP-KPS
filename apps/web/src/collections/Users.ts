import { APIError, type Access, type CollectionConfig, type Where } from 'payload'
import { hasCms } from '@sekolahku/core'
import { ROLE_OPTIONS, fieldAdminOnly, isAdmin, isSuperAdmin } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { tenantOfUser } from '../tenancy/access'
import { idOf, isLive, tenantByHost, tenantById } from '../tenancy/resolve'

/** Super Admin: every account. School Admin Teknis: accounts of their own school. Others: themselves. */
const manageUsers =
  (selfToo: boolean): Access =>
  ({ req: { user } }) => {
    if (isSuperAdmin(user)) return true
    const own = tenantOfUser(user)
    if (isAdmin(user) && own) return { tenant: { equals: own } } as Where
    return selfToo && user ? ({ id: { equals: user.id } } as Where) : false
  }

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Pengguna', plural: 'Pengguna' },
  admin: { useAsTitle: 'name', group: 'Pengguna & Akses', defaultColumns: ['name', 'email', 'role', 'tenant', 'active'] },
  lockDocuments: false,
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 60 * 60 * 8,
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
    useAPIKey: false,
    // Reset link on the school's own domain (the platform has no single server URL).
    forgotPassword: {
      generateEmailSubject: () => 'Atur ulang kata sandi CMS website sekolah',
      generateEmailHTML: async (args) => {
        const { req, token, user } = (args ?? {}) as { req?: { payload?: never; headers?: Headers }; token?: string; user?: { tenant?: unknown } }
        const school = req?.payload ? await tenantById(req.payload, idOf(user?.tenant)) : null
        const host = school?.primaryDomain ?? req?.headers?.get?.('host') ?? ''
        const url = `https://${host}/admin/reset/${token}`
        return `<p>Ada permintaan mengatur ulang kata sandi akun CMS Anda.</p><p><a href="${url}">Atur ulang kata sandi</a></p><p>Abaikan email ini bila Anda tidak memintanya.</p>`
      },
    },
  },
  access: {
    read: manageUsers(true),
    create: ({ req: { user } }) => isSuperAdmin(user) || (isAdmin(user) && Boolean(tenantOfUser(user))),
    update: manageUsers(true),
    delete: manageUsers(false),
    // Unlocking a locked-out account: only the account's own school admin (or the Super Admin).
    unlock: manageUsers(false),
    // CMS panel: active accounts; school staff only while their school's package includes the CMS (see hasCms).
    admin: async ({ req }) => {
      const user = req.user
      if (!user || (user as { active?: boolean }).active === false) return false
      if (isSuperAdmin(user)) return true
      return hasCms(await tenantById(req.payload, tenantOfUser(user)))
    },
  },
  hooks: {
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
    beforeLogin: [
      // School staff sign in only on their own school's address, and not while the school is suspended.
      async ({ req, user }) => {
        if (isSuperAdmin({ ...user, collection: 'users' } as never)) return user
        const own = await tenantById(req.payload, idOf(user.tenant))
        if (!isLive(own)) throw new APIError('Akun ini tidak terhubung ke sekolah yang aktif. Hubungi pengelola platform.', 403, null, true)
        const host = req.headers?.get?.('host')
        const here = host ? await tenantByHost(req.payload, host) : null
        // only on the school's own address (an address that belongs to no school is the platform's, for the Super Admin)
        if (!here || here.id !== own.id) throw new APIError('Akun ini milik sekolah lain. Masuk lewat alamat website sekolah Anda.', 403, null, true)
        // Website Gratis after its first month: the website stays online, the CMS is closed.
        if (!hasCms(own))
          throw new APIError(
            'Masa akses CMS sekolah ini sudah berakhir. Website tetap tayang. Untuk mengelola konten lagi, berlangganan paket Website + CMS melalui pengelola SatuSekolah.',
            403,
            null,
            true,
          )
        return user
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        const actor = req.user
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
          // The very first account on a fresh platform ("create first user") becomes the platform Super Admin.
          if (totalDocs === 0) data.role = 'superadmin'
          else if (actor && !isAdmin(actor)) data.role = 'contributor'
        }
        // Only a Super Admin (or server code without a user) can grant or keep the Super Admin role.
        if (actor && !isSuperAdmin(actor) && data.role === 'superadmin' && originalDoc?.role !== 'superadmin')
          throw new APIError('Hanya Super Admin platform yang dapat memberi peran Super Admin.', 403, null, true)
        // School admins always create/keep accounts in their own school.
        const own = tenantOfUser(actor)
        if (own) data.tenant = operation === 'update' ? (idOf(originalDoc?.tenant) ?? own) : own
        const role = data.role ?? originalDoc?.role
        if (role === 'superadmin') data.tenant = null
        else if (!idOf(data.tenant ?? originalDoc?.tenant)) throw new APIError('Pilih sekolah untuk akun ini.', 400, null, true)
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
      // School admins never see the Super Admin role (server code without a user, e.g. scripts, may set it)
      filterOptions: ({ options, req }) =>
        !req.user || isSuperAdmin(req.user) ? options : options.filter((o) => (typeof o === 'string' ? o : o.value) !== 'superadmin'),
      access: { create: fieldAdminOnly, update: fieldAdminOnly },
      saveToJWT: true,
      admin: { description: 'Hanya Admin Teknis yang dapat mengubah peran.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      label: 'Sekolah',
      index: true,
      maxDepth: 0,
      saveToJWT: true,
      access: { update: ({ req: { user } }) => isSuperAdmin(user) },
      admin: {
        position: 'sidebar',
        condition: (data, _s, { user }) => isSuperAdmin(user as never) && data?.role !== 'superadmin',
        description: 'Sekolah tempat akun ini bekerja. Super Admin tidak terikat sekolah.',
      },
      defaultValue: ({ user }: { user: never }) => tenantOfUser(user) ?? undefined,
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
