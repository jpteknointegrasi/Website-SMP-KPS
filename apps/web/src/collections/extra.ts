import { defineContent } from './_factory'
import { safeUrlField, seoFields, slugField } from '../fields/common'
import { isStaff } from '../access/roles'

export const FAQ_CATEGORIES = [
  { label: 'Pendaftaran', value: 'pendaftaran' },
  { label: 'Pembelajaran', value: 'pembelajaran' },
  { label: 'Kegiatan', value: 'kegiatan' },
  { label: 'Administrasi', value: 'administrasi' },
  { label: 'Penggunaan website', value: 'website' },
]

export const Faqs = defineContent({
  slug: 'faqs',
  labels: { singular: 'FAQ', plural: 'FAQ' },
  group: 'Konten',
  defaultSort: 'order',
  defaultColumns: ['title', 'category', 'featured', 'lastReviewedAt', '_status'],
  description: 'Hanya jawaban resmi. Bila belum ada jawaban, jangan diterbitkan — arahkan ke kontak.',
  fields: [
    { name: 'title', type: 'text', label: 'Pertanyaan', required: true, maxLength: 200 },
    slugField(),
    { name: 'answer', type: 'richText', label: 'Jawaban', required: true },
    { name: 'category', type: 'select', label: 'Kategori', required: true, defaultValue: 'pendaftaran', options: FAQ_CATEGORIES, index: true },
    safeUrlField('relatedPage', 'Halaman terkait (opsional)', { description: 'Contoh: /pendaftaran atau /kunjungan' }),
    { name: 'featured', type: 'checkbox', label: 'FAQ pilihan', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Urutan', defaultValue: 10, admin: { position: 'sidebar' } },
    { name: 'lastReviewedAt', type: 'date', label: 'Terakhir ditinjau', admin: { position: 'sidebar' } },
  ],
})

export const StudentWorks = defineContent({
  slug: 'student-works',
  labels: { singular: 'Karya Siswa', plural: 'Karya Siswa' },
  group: 'Akademik & Kehidupan Siswa',
  defaultSort: '-year',
  defaultColumns: ['title', 'category', 'year', 'consentStatus', 'workflowStatus', '_status'],
  description: 'Diunggah guru/kontributor, ditinjau Editor. Tampil publik hanya bila terbit DAN persetujuan publikasi sudah ada.',
  // public only with consent; drafts/in-review are already excluded by the published filter
  publicWhere: () => ({ consentStatus: { equals: 'obtained' } }),
  fields: [
    { name: 'title', type: 'text', label: 'Judul karya', required: true, maxLength: 140 },
    slugField(),
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      required: true,
      index: true,
      options: [
        { label: 'Tulisan', value: 'tulisan' },
        { label: 'Seni', value: 'seni' },
        { label: 'Sains', value: 'sains' },
        { label: 'Teknologi', value: 'teknologi' },
        { label: 'Video', value: 'video' },
        { label: 'Proyek sosial', value: 'proyek_sosial' },
      ],
    },
    { name: 'excerpt', type: 'textarea', label: 'Ringkasan', maxLength: 220 },
    { name: 'content', type: 'richText', label: 'Isi / deskripsi' },
    { type: 'row', fields: [
      { name: 'creatorsPublic', type: 'text', label: 'Pembuat (nama publik yang disetujui)', admin: { description: 'Contoh: "Siswa kelas 8" bila nama tidak disetujui.' } },
      { name: 'year', type: 'number', label: 'Tahun', min: 2000, max: 2100, index: true },
    ] },
    { name: 'mentorPublic', type: 'text', label: 'Pembimbing (opsional, publik)' },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Gambar sampul' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true, label: 'Foto karya' },
    { name: 'relatedMedia', type: 'relationship', relationTo: 'media-items', hasMany: true, maxRows: 4, label: 'Video karya (tautan YouTube, bukan unggah berkas besar)' },
    {
      name: 'consentStatus',
      type: 'select',
      label: 'Persetujuan publikasi',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Menunggu', value: 'pending' },
        { label: 'Ada (tertulis)', value: 'obtained' },
        { label: 'Ditarik', value: 'withdrawn' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'consentRecord',
      type: 'upload',
      relationTo: 'private-files',
      label: 'Bukti persetujuan (privat)',
      access: { read: ({ req: { user } }) => isStaff(user) },
      admin: { position: 'sidebar', description: 'Tidak pernah tampil publik.' },
    },
    {
      name: 'appRef',
      type: 'text',
      label: 'Asal: SatuSekolah App',
      index: true,
      access: { read: ({ req: { user } }) => isStaff(user), update: () => false },
      admin: { position: 'sidebar', readOnly: true, description: 'Diisi otomatis untuk karya dari App (izin orang tua tercatat di App). Bila izin ditarik di App, status persetujuan menjadi "Ditarik".' },
    },
    seoFields,
  ],
})
