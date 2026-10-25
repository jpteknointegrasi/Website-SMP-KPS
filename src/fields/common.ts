import type { Field } from 'payload'
import { fieldStaffOnly } from '../access/roles'
import { slugify } from '../lib/slug'

/** Unique slug, auto-generated from the title field when empty. */
export const slugField = (from = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  label: 'Slug (alamat URL)',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'Huruf kecil, angka dan tanda hubung. Dibuat otomatis dari judul bila kosong.',
  },
  validate: (val: unknown) =>
    typeof val === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)
      ? true
      : 'Slug hanya boleh huruf kecil, angka dan tanda hubung (contoh: kegiatan-pramuka-2025).',
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim()) return slugify(value)
        const source = data?.[from]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
})

/** Workflow + audit-ish metadata shared by every public content collection. */
export const workflowFields: Field[] = [
  {
    name: 'workflowStatus',
    type: 'select',
    label: 'Status alur kerja',
    defaultValue: 'draft',
    required: true,
    index: true,
    access: { read: fieldStaffOnly },
    options: [
      { label: 'Draf', value: 'draft' },
      { label: 'Ajukan Review', value: 'in_review' },
      { label: 'Terbit', value: 'published' },
      { label: 'Diarsipkan', value: 'archived' },
    ],
    admin: {
      position: 'sidebar',
      description:
        'Kontributor: pilih "Ajukan Review" lalu klik Simpan Draf. Editor menerbitkan setelah review.',
    },
  },
  {
    name: 'reviewNote',
    type: 'textarea',
    label: 'Catatan reviewer (alasan dikembalikan)',
    access: { read: fieldStaffOnly },
    admin: { position: 'sidebar' },
  },
  {
    name: 'isDemo',
    type: 'checkbox',
    label: 'Data contoh (demo)',
    defaultValue: false,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Data contoh hanya tampil bila SHOW_DEMO_CONTENT=true. Produksi wajib false.',
    },
  },
  {
    name: 'archivedAt',
    type: 'date',
    label: 'Diarsipkan pada',
    access: { read: fieldStaffOnly },
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'createdBy',
    type: 'relationship',
    relationTo: 'users',
    label: 'Dibuat oleh',
    index: true,
    access: { read: fieldStaffOnly, update: () => false },
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'updatedBy',
    type: 'relationship',
    relationTo: 'users',
    label: 'Diubah oleh',
    access: { read: fieldStaffOnly, update: () => false },
    admin: { position: 'sidebar', readOnly: true },
  },
]

/** URL field that only accepts https://, internal paths (/...), and controlled mailto:/tel:. */
export const safeUrlField = (name: string, label: string, opts: { required?: boolean; description?: string } = {}): Field => ({
  name,
  type: 'text',
  label,
  required: opts.required,
  admin: { description: opts.description ?? 'Gunakan https://… atau tautan internal yang diawali "/".' },
  validate: (val: unknown) => {
    if (val === undefined || val === null || val === '') return opts.required ? 'Wajib diisi.' : true
    return isSafeUrl(String(val)) ? true : 'URL harus diawali https://, "/" (internal), mailto: atau tel:.'
  },
})

export const isSafeUrl = (v: string) =>
  /^https:\/\/[^\s]+$/i.test(v) ||
  /^\/(?!\/)[^\s]*$/.test(v) ||
  /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(v) ||
  /^tel:\+?[0-9\s\-()]{5,20}$/i.test(v)

export const seoFields: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  admin: { position: 'sidebar' },
  fields: [
    { name: 'title', type: 'text', label: 'Judul SEO', maxLength: 70 },
    { name: 'description', type: 'textarea', label: 'Deskripsi SEO', maxLength: 170 },
  ],
}
