import type { CollectionConfig } from 'payload'
import { adminOnly, canCreateContent, canUpdateContent, publishedOrStaff, isStaff } from '../access/roles'
import { workflowFields } from '../fields/common'
import { enforceWorkflow } from '../hooks/workflow'
import { secureUpload } from '../hooks/uploadSecurity'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const DOC_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

/** Public documents (Unduhan & Transparansi BOS) with version metadata. */
export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: { singular: 'Dokumen', plural: 'Unduhan / Dokumen BOS' },
  trash: true,
  admin: {
    group: 'Konten',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'period', 'version', '_status'],
  },
  access: {
    read: publishedOrStaff(),
    readVersions: ({ req: { user } }) => isStaff(user),
    create: canCreateContent,
    update: canUpdateContent,
    delete: adminOnly,
  },
  versions: { drafts: true, maxPerDoc: 20 },
  hooks: {
    beforeOperation: [secureUpload(DOC_MIMES, 25_000_000)],
    beforeChange: [enforceWorkflow()],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  upload: { staticDir: path.resolve(dirname, '../../documents'), mimeTypes: DOC_MIMES },
  fields: [
    { name: 'title', type: 'text', label: 'Judul dokumen', required: true },
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      required: true,
      defaultValue: 'umum',
      index: true,
      options: [
        { label: 'Umum', value: 'umum' },
        { label: 'Transparansi BOS', value: 'bos' },
        { label: 'Kalender Akademik', value: 'kalender' },
        { label: 'Panduan / Formulir', value: 'panduan' },
        { label: 'E-Buletin', value: 'buletin' },
      ],
    },
    { name: 'period', type: 'text', label: 'Periode / tahun', index: true, admin: { description: 'Contoh: 2026 atau 2026/2027' } },
    { name: 'version', type: 'text', label: 'Nomor versi', defaultValue: '1.0' },
    { name: 'description', type: 'textarea', label: 'Deskripsi' },
    { name: 'approvedAt', type: 'date', label: 'Tanggal persetujuan publikasi' },
    { name: 'reviewDue', type: 'date', label: 'Tinjau ulang paling lambat', index: true, admin: { description: 'Muncul sebagai pengingat di dasbor setelah lewat.' } },
    {
      name: 'supersedes',
      type: 'relationship',
      relationTo: 'documents',
      label: 'Menggantikan versi',
      admin: { description: 'Pilih dokumen versi lama. Versi lama sebaiknya diarsipkan; tautannya tetap menyajikan berkas lama dengan label versinya.' },
    },
    { name: 'originalFilename', type: 'text', label: 'Nama berkas asli', admin: { readOnly: true } },
    { name: 'publishedAt', type: 'date', label: 'Tanggal terbit', admin: { position: 'sidebar' } },
    ...workflowFields,
  ],
}
