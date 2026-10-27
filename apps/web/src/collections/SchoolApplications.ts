import type { CollectionConfig } from 'payload'
import { isSuperAdmin, nobody, superAdminOnly } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

export const SCHOOL_LEVELS = [
  { label: 'TK/PAUD', value: 'tk' },
  { label: 'SD/MI', value: 'sd' },
  { label: 'SMP/MTs', value: 'smp' },
  { label: 'SMA/MA', value: 'sma' },
  { label: 'SMK', value: 'smk' },
  { label: 'Lainnya', value: 'lainnya' },
] as const

export const APPLICATION_STATUS = [
  { label: 'Menunggu tinjauan', value: 'pending' },
  { label: 'Disetujui', value: 'approved' },
  { label: 'Ditolak', value: 'rejected' },
] as const

/**
 * A school asking to join the platform (public form /daftar-sekolah on the platform address). Nothing is created
 * for the school until the platform Super Admin approves it in /platform: then the school (tenant), its first
 * Admin Teknis account and its trial subscriptions are made in one go. Platform-level: no school owns this record.
 */
export const SchoolApplications: CollectionConfig = {
  slug: 'school-applications',
  labels: { singular: 'Pendaftaran Sekolah', plural: 'Pendaftaran Sekolah' },
  admin: {
    useAsTitle: 'schoolName',
    defaultColumns: ['schoolName', 'city', 'adminEmail', 'status', 'createdAt'],
    description: 'Pengajuan sekolah baru. Tinjau dan putuskan di konsol platform (/platform/pendaftaran).',
    hidden: ({ user }) => !isSuperAdmin(user as never),
  },
  defaultSort: '-createdAt',
  lockDocuments: false,
  access: {
    read: superAdminOnly,
    // only the public form (server code) creates; only the console decides
    create: nobody,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  hooks: { afterChange: [auditAfterChange], afterDelete: [auditAfterDelete] },
  fields: [
    { name: 'reference', type: 'text', label: 'Nomor pendaftaran', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'schoolName', type: 'text', label: 'Nama sekolah', required: true },
    { name: 'shortName', type: 'text', label: 'Nama singkat' },
    { name: 'level', type: 'select', label: 'Jenjang', options: SCHOOL_LEVELS.map((o) => ({ ...o })) },
    { name: 'npsn', type: 'text', label: 'NPSN' },
    { name: 'city', type: 'text', label: 'Kota/Kabupaten', required: true },
    { name: 'province', type: 'text', label: 'Provinsi', required: true },
    { name: 'timezone', type: 'text', label: 'Zona waktu' },
    { name: 'domain', type: 'text', label: 'Domain yang diinginkan', admin: { description: 'Mis. www.sman1contoh.sch.id. Boleh kosong.' } },
    { name: 'wantWeb', type: 'checkbox', label: 'Ingin Sekolahku Web', defaultValue: true },
    { name: 'wantApp', type: 'checkbox', label: 'Ingin Sekolahku App', defaultValue: false },
    { name: 'adminName', type: 'text', label: 'Nama pengelola (calon Admin Teknis)', required: true },
    { name: 'adminEmail', type: 'email', label: 'Email pengelola', required: true, index: true },
    { name: 'adminPhone', type: 'text', label: 'Telepon/WhatsApp' },
    { name: 'adminPosition', type: 'text', label: 'Jabatan di sekolah' },
    { name: 'note', type: 'textarea', label: 'Catatan dari sekolah' },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: APPLICATION_STATUS.map((o) => ({ ...o })),
      admin: { position: 'sidebar' },
    },
    { name: 'decidedAt', type: 'date', label: 'Diputuskan', admin: { position: 'sidebar', readOnly: true } },
    { name: 'decidedBy', type: 'relationship', relationTo: 'users', label: 'Diputuskan oleh', maxDepth: 0, admin: { position: 'sidebar', readOnly: true } },
    { name: 'decisionNote', type: 'textarea', label: 'Catatan keputusan' },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', label: 'Sekolah yang dibuat', maxDepth: 0, admin: { position: 'sidebar', readOnly: true } },
    { name: 'adminUser', type: 'relationship', relationTo: 'users', label: 'Akun Admin Teknis', maxDepth: 0, admin: { position: 'sidebar', readOnly: true } },
  ],
}
