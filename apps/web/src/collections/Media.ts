import type { CollectionConfig } from 'payload'
import { adminOnly, canCreateContent, isStaff, fieldStaffOnly } from '../access/roles'
import { blockDeleteIfUsed } from '../hooks/mediaInUse'
import { secureUpload } from '../hooks/uploadSecurity'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: {
    group: 'Media',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'reviewStatus', 'sourceId', 'updatedAt'],
    description: 'Foto publik. Wajib alt teks (atau tandai dekoratif). Hapus diblokir bila gambar masih dipakai.',
  },
  access: {
    read: () => true,
    create: canCreateContent,
    update: ({ req: { user } }) => isStaff(user),
    delete: adminOnly,
  },
  hooks: {
    beforeOperation: [secureUpload(IMAGE_MIMES, 15_000_000)],
    beforeDelete: [blockDeleteIfUsed],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  upload: {
    staticDir: path.resolve(dirname, '../../media'),
    mimeTypes: IMAGE_MIMES,
    focalPoint: true,
    crop: true,
    // derivatives are re-encoded by sharp => EXIF/GPS metadata is stripped; originals are kept as archive
    imageSizes: [
      { name: 'thumb', width: 480, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'card', width: 768, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'large', width: 1200, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'hero', width: 1920, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Teks alternatif (alt)',
      admin: { description: 'Gambarkan adegan yang terlihat, bukan nama file. Kosongkan hanya bila gambar dekoratif.' },
      validate: (val: unknown, { siblingData }: { siblingData?: { decorative?: boolean } }) =>
        siblingData?.decorative || (typeof val === 'string' && val.trim().length >= 5)
          ? true
          : 'Isi alt teks (min. 5 karakter) atau centang "Dekoratif".',
    },
    { name: 'decorative', type: 'checkbox', label: 'Dekoratif (alt kosong)', defaultValue: false },
    { name: 'caption', type: 'textarea', label: 'Keterangan foto' },
    {
      type: 'collapsible',
      label: 'Sumber, hak & review',
      admin: { initCollapsed: true },
      fields: [
        { name: 'sourceId', type: 'text', label: 'ID aset (manifest)', index: true, access: { read: fieldStaffOnly } },
        { name: 'sourceUrl', type: 'text', label: 'URL sumber', access: { read: fieldStaffOnly } },
        { name: 'sourcePage', type: 'text', label: 'Halaman sumber', access: { read: fieldStaffOnly } },
        { name: 'originalFilename', type: 'text', label: 'Nama berkas asli', access: { read: fieldStaffOnly } },
        { name: 'downloadedAt', type: 'date', label: 'Tanggal unduh', access: { read: fieldStaffOnly } },
        { name: 'sha256', type: 'text', label: 'SHA-256', unique: true, index: true, access: { read: fieldStaffOnly } },
        { name: 'license', type: 'text', label: 'Lisensi / otorisasi', access: { read: fieldStaffOnly } },
        {
          name: 'consent',
          type: 'select',
          label: 'Persetujuan publikasi foto anak',
          defaultValue: 'unknown',
          access: { read: fieldStaffOnly },
          options: [
            { label: 'Belum diketahui', value: 'unknown' },
            { label: 'Disetujui sekolah', value: 'approved' },
            { label: 'Tidak perlu (tanpa anak)', value: 'not_required' },
          ],
        },
        {
          name: 'reviewStatus',
          type: 'select',
          label: 'Status review',
          defaultValue: 'pending',
          access: { read: fieldStaffOnly },
          options: [
            { label: 'Perlu review', value: 'pending' },
            { label: 'Disetujui', value: 'approved' },
            { label: 'Jangan dipublikasikan', value: 'blocked' },
          ],
        },
        { name: 'editorialNote', type: 'textarea', label: 'Catatan editorial', access: { read: fieldStaffOnly } },
      ],
    },
  ],
}
