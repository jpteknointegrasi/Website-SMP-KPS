import type { CollectionConfig, Field } from 'payload'
import { defineContent } from './_factory'
import { safeUrlField, seoFields, slugField } from '../fields/common'
import { editorialOnly, anyone, adminOnly } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

const nowLte = () => ({ publishedAt: { less_than_equal: new Date().toISOString() } })

const cover = (label = 'Foto sampul', required = false): Field => ({
  name: 'cover',
  type: 'upload',
  relationTo: 'media',
  label,
  required,
  filterOptions: { reviewStatus: { not_equals: 'blocked' } },
})
const gallery: Field = { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true, label: 'Galeri foto' }
const excerpt = (max = 220): Field => ({
  name: 'excerpt',
  type: 'textarea',
  label: 'Ringkasan',
  maxLength: max,
  admin: { description: `Maksimal ${max} karakter. Tampil di kartu dan hasil pencarian.` },
})
const body: Field = { name: 'content', type: 'richText', label: 'Isi' }
const publishedAt: Field = {
  name: 'publishedAt',
  type: 'date',
  label: 'Tanggal publikasi (asli)',
  index: true,
  admin: {
    position: 'sidebar',
    date: { pickerAppearance: 'dayAndTime' },
    description: 'Untuk materi migrasi, isi tanggal asli. Tanggal di masa depan = terjadwal tampil.',
  },
}
const featured: Field = { name: 'featured', type: 'checkbox', label: 'Tampilkan di beranda', defaultValue: false, index: true, admin: { position: 'sidebar' } }
const order: Field = { name: 'order', type: 'number', label: 'Urutan', defaultValue: 10, admin: { position: 'sidebar' } }
const titleField = (label = 'Judul', max = 120): Field => ({ name: 'title', type: 'text', label, required: true, maxLength: max })

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Kategori', plural: 'Kategori Berita' },
  admin: { group: 'Konten', useAsTitle: 'title' },
  access: { read: anyone, create: editorialOnly, update: editorialOnly, delete: adminOnly },
  hooks: { afterChange: [auditAfterChange], afterDelete: [auditAfterDelete] },
  fields: [titleField('Nama kategori', 60), slugField()],
}

export const Posts = defineContent({
  slug: 'posts',
  labels: { singular: 'Berita', plural: 'Berita' },
  group: 'Konten',
  defaultSort: '-publishedAt',
  defaultColumns: ['title', 'publishedAt', 'workflowStatus', '_status'],
  publicWhere: nowLte,
  fields: [
    titleField('Judul berita', 140),
    slugField(),
    excerpt(),
    cover('Foto sampul'),
    { name: 'coverCaption', type: 'text', label: 'Keterangan foto sampul' },
    body,
    gallery,
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, label: 'Kategori', admin: { position: 'sidebar' } },
    { name: 'authorName', type: 'text', label: 'Nama penulis publik', admin: { position: 'sidebar', description: 'Kosongkan bila belum disetujui.' } },
    publishedAt,
    { name: 'sourceUrl', type: 'text', label: 'URL sumber (hasil migrasi)', admin: { position: 'sidebar' } },
    seoFields,
  ],
})

export const Announcements = defineContent({
  slug: 'announcements',
  labels: { singular: 'Pengumuman', plural: 'Pengumuman' },
  group: 'Konten',
  defaultSort: '-displayStart',
  defaultColumns: ['title', 'priority', 'displayStart', 'displayEnd', '_status'],
  fields: [
    titleField('Judul pengumuman', 140),
    slugField(),
    excerpt(200),
    body,
    {
      name: 'audience',
      type: 'select',
      label: 'Sasaran',
      hasMany: true,
      defaultValue: ['umum'],
      options: [
        { label: 'Umum', value: 'umum' },
        { label: 'Orang tua', value: 'orang_tua' },
        { label: 'Siswa', value: 'siswa' },
        { label: 'Alumni', value: 'alumni' },
      ],
    },
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      defaultValue: 'umum',
      options: [
        { label: 'Umum', value: 'umum' },
        { label: 'Akademik', value: 'akademik' },
        { label: 'Pendaftaran', value: 'pendaftaran' },
        { label: 'Kegiatan', value: 'kegiatan' },
      ],
    },
    {
      name: 'priority',
      type: 'number',
      label: 'Prioritas (0–100)',
      defaultValue: 0,
      min: 0,
      max: 100,
      index: true,
      admin: { position: 'sidebar', description: '≥ 50 dan aktif = tampil sebagai strip "Penting" di beranda.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'displayStart', type: 'date', label: 'Mulai tampil', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
        {
          name: 'displayEnd',
          type: 'date',
          label: 'Berakhir tampil',
          index: true,
          admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Setelah lewat, otomatis tidak aktif (tanpa menunggu scheduler).' },
          validate: (val: unknown, { siblingData }: { siblingData?: { displayStart?: string } }) =>
            !val || !siblingData?.displayStart || new Date(String(val)) >= new Date(siblingData.displayStart)
              ? true
              : 'Tanggal berakhir harus sesudah tanggal mulai.',
        },
      ],
    },
    { name: 'attachments', type: 'relationship', relationTo: 'documents', hasMany: true, label: 'Lampiran publik' },
    { name: 'contact', type: 'text', label: 'Kontak terkait' },
    cover('Gambar (opsional)'),
    { name: 'publishedAt', type: 'date', label: 'Tanggal terbit', admin: { position: 'sidebar' } },
    seoFields,
  ],
})

export const Events = defineContent({
  slug: 'events',
  labels: { singular: 'Agenda', plural: 'Agenda' },
  group: 'Konten',
  defaultSort: 'startAt',
  defaultColumns: ['title', 'startAt', 'eventStatus', '_status'],
  fields: [
    titleField('Nama kegiatan', 140),
    slugField(),
    {
      type: 'row',
      fields: [
        {
          name: 'startAt',
          type: 'date',
          label: 'Mulai (WITA)',
          required: true,
          index: true,
          timezone: { defaultTimezone: 'Asia/Makassar', supportedTimezones: [{ label: 'WITA (Balikpapan)', value: 'Asia/Makassar' }] },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'endAt',
          type: 'date',
          label: 'Selesai (WITA)',
          timezone: { defaultTimezone: 'Asia/Makassar', supportedTimezones: [{ label: 'WITA (Balikpapan)', value: 'Asia/Makassar' }] },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
          validate: (val: unknown, { siblingData }: { siblingData?: { startAt?: string } }) =>
            !val || !siblingData?.startAt || new Date(String(val)) >= new Date(siblingData.startAt)
              ? true
              : 'Waktu selesai harus sama atau sesudah waktu mulai.',
        },
      ],
    },
    { name: 'allDay', type: 'checkbox', label: 'Sepanjang hari (tanggal saja)', defaultValue: false },
    { name: 'location', type: 'text', label: 'Lokasi publik' },
    { name: 'organizer', type: 'text', label: 'Penyelenggara' },
    {
      name: 'eventStatus',
      type: 'select',
      label: 'Status kegiatan',
      defaultValue: 'scheduled',
      required: true,
      options: [
        { label: 'Terjadwal', value: 'scheduled' },
        { label: 'Ditunda', value: 'postponed' },
        { label: 'Dibatalkan', value: 'cancelled' },
        { label: 'Selesai', value: 'completed' },
      ],
    },
    excerpt(200),
    body,
    safeUrlField('registrationUrl', 'Tautan pendaftaran kegiatan (opsional)'),
    cover('Gambar (opsional)'),
    seoFields,
  ],
})

const programLike = (slug: string, singular: string, plural: string, extra: Field[] = []) =>
  defineContent({
    slug,
    labels: { singular, plural },
    group: 'Akademik & Kehidupan Siswa',
    defaultSort: 'order',
    defaultColumns: ['title', 'featured', 'order', '_status'],
    fields: [titleField('Nama'), slugField(), excerpt(), cover(), body, ...extra, gallery, featured, order, seoFields],
  })

export const Programs = programLike('programs', 'Program', 'Program Pembelajaran', [
  {
    name: 'benefits',
    type: 'array',
    label: 'Tujuan / manfaat',
    maxRows: 6,
    fields: [{ name: 'text', type: 'text', label: 'Butir', required: true }],
  },
])

export const Extracurriculars = programLike('extracurriculars', 'Ekstrakurikuler', 'Ekstrakurikuler & Kegiatan', [
  { name: 'kind', type: 'select', label: 'Jenis', defaultValue: 'ekskul', options: [
    { label: 'Ekstrakurikuler', value: 'ekskul' },
    { label: 'Organisasi siswa', value: 'organisasi' },
    { label: 'Kegiatan/karya', value: 'kegiatan' },
  ] },
  { name: 'mentor', type: 'text', label: 'Pembina (publik)' },
  { name: 'schedule', type: 'text', label: 'Jadwal (publik)' },
])

export const Facilities = programLike('facilities', 'Fasilitas', 'Fasilitas', [
  { name: 'category', type: 'text', label: 'Kategori' },
  {
    name: 'availability',
    type: 'select',
    label: 'Status fasilitas',
    required: true,
    defaultValue: 'available',
    options: [
      { label: 'Tersedia', value: 'available' },
      { label: 'Sedang direnovasi', value: 'renovation' },
      { label: 'Rencana', value: 'planned' },
    ],
  },
])

export const Staff = defineContent({
  slug: 'staff',
  labels: { singular: 'Guru / Pimpinan', plural: 'Guru & Pimpinan' },
  group: 'Akademik & Kehidupan Siswa',
  useAsTitle: 'name',
  defaultSort: 'order',
  defaultColumns: ['name', 'position', 'group', 'order', '_status'],
  fields: [
    { name: 'name', type: 'text', label: 'Nama', required: true },
    slugField('name'),
    { name: 'position', type: 'text', label: 'Jabatan', required: true },
    { name: 'group', type: 'select', label: 'Kelompok', defaultValue: 'pimpinan', options: [
      { label: 'Pimpinan', value: 'pimpinan' },
      { label: 'Guru', value: 'guru' },
      { label: 'Tenaga kependidikan', value: 'staf' },
    ] },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto (setelah identitas diverifikasi)' },
    { name: 'bio', type: 'textarea', label: 'Bio singkat' },
    { name: 'publicationConsent', type: 'checkbox', label: 'Persetujuan publikasi', defaultValue: false },
    order,
  ],
})

export const Achievements = defineContent({
  slug: 'achievements',
  labels: { singular: 'Prestasi', plural: 'Prestasi' },
  group: 'Akademik & Kehidupan Siswa',
  defaultSort: '-year',
  defaultColumns: ['title', 'level', 'year', 'verified', '_status'],
  fields: [
    titleField('Nama capaian', 140),
    slugField(),
    { type: 'row', fields: [
      { name: 'category', type: 'select', label: 'Kategori', options: [
        { label: 'Akademik', value: 'akademik' },
        { label: 'Olahraga', value: 'olahraga' },
        { label: 'Seni & Budaya', value: 'seni' },
        { label: 'Keagamaan', value: 'keagamaan' },
        { label: 'Lainnya', value: 'lainnya' },
      ] },
      { name: 'level', type: 'select', label: 'Tingkat', options: [
        { label: 'Sekolah', value: 'sekolah' },
        { label: 'Kota', value: 'kota' },
        { label: 'Provinsi', value: 'provinsi' },
        { label: 'Nasional', value: 'nasional' },
        { label: 'Internasional', value: 'internasional' },
      ] },
      { name: 'year', type: 'number', label: 'Tahun', index: true, min: 1990, max: 2100 },
    ] },
    { name: 'recipientPublic', type: 'text', label: 'Penerima (sesuai persetujuan publikasi)' },
    { name: 'organizer', type: 'text', label: 'Penyelenggara' },
    { name: 'date', type: 'date', label: 'Tanggal' },
    excerpt(),
    body,
    cover(),
    gallery,
    { name: 'verified', type: 'checkbox', label: 'Capaian terverifikasi dari sumber tertulis', defaultValue: false, admin: { position: 'sidebar' } },
    {
      name: 'proof',
      type: 'upload',
      relationTo: 'private-files',
      label: 'Bukti internal (privat)',
      access: { read: ({ req: { user } }) => Boolean(user) },
      admin: { description: 'Tidak pernah ditampilkan publik.' },
    },
    featured,
    seoFields,
  ],
})

export const Albums = defineContent({
  slug: 'albums',
  labels: { singular: 'Album', plural: 'Album Galeri' },
  group: 'Konten',
  defaultSort: '-eventDate',
  fields: [
    titleField('Judul album'),
    slugField(),
    { name: 'eventDate', type: 'date', label: 'Tanggal kegiatan', index: true },
    excerpt(),
    cover('Sampul album', true),
    {
      name: 'items',
      type: 'array',
      label: 'Foto',
      fields: [
        { name: 'media', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', label: 'Keterangan' },
      ],
    },
    { name: 'publicationConsent', type: 'checkbox', label: 'Persetujuan publikasi foto', defaultValue: false, admin: { position: 'sidebar' } },
  ],
})

export const Guides = defineContent({
  slug: 'guides',
  labels: { singular: 'Panduan', plural: 'Panduan' },
  group: 'Konten',
  fields: [
    titleField('Judul panduan'),
    slugField(),
    { name: 'category', type: 'text', label: 'Kategori' },
    excerpt(),
    { name: 'steps', type: 'array', label: 'Langkah', fields: [
      { name: 'title', type: 'text', label: 'Langkah', required: true },
      { name: 'detail', type: 'textarea', label: 'Penjelasan' },
    ] },
    body,
    { name: 'attachments', type: 'relationship', relationTo: 'documents', hasMany: true, label: 'Lampiran' },
    { name: 'lastReviewedAt', type: 'date', label: 'Terakhir ditinjau', admin: { position: 'sidebar' } },
  ],
})

export const Services = defineContent({
  slug: 'services',
  labels: { singular: 'Layanan', plural: 'Layanan & Tautan' },
  group: 'Konten',
  defaultSort: 'order',
  defaultColumns: ['title', 'url', 'order', '_status'],
  fields: [
    titleField('Nama layanan', 60),
    slugField(),
    excerpt(160),
    { name: 'icon', type: 'select', label: 'Ikon', defaultValue: 'link', options: ['link', 'book', 'report', 'calendar', 'megaphone', 'users', 'grid', 'pencil', 'file', 'school'].map((v) => ({ label: v, value: v })) },
    safeUrlField('url', 'URL layanan', { description: 'Kosong = layanan tampil sebagai "segera tersedia" tanpa tombol.' }),
    { name: 'external', type: 'checkbox', label: 'Tautan eksternal (buka tab baru)', defaultValue: true },
    order,
  ],
})

export const Testimonials = defineContent({
  slug: 'testimonials',
  labels: { singular: 'Cerita Alumni', plural: 'Cerita Alumni' },
  group: 'Konten',
  useAsTitle: 'publicName',
  fields: [
    { name: 'publicName', type: 'text', label: 'Nama publik', required: true },
    slugField('publicName'),
    { name: 'roleLine', type: 'text', label: 'Peran / angkatan (jika disetujui)' },
    { name: 'quote', type: 'textarea', label: 'Cerita', required: true, maxLength: 600 },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto' },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Persetujuan tertulis tersedia',
      required: true,
      defaultValue: false,
      validate: (v: unknown, { siblingData }: { siblingData?: { _status?: string } }) =>
        siblingData?._status === 'published' && !v ? 'Cerita tidak boleh terbit tanpa persetujuan.' : true,
    },
  ],
})

const blocks = [
  { slug: 'richText', labels: { singular: 'Teks', plural: 'Teks' }, fields: [{ name: 'content', type: 'richText', label: 'Isi' }] },
  {
    slug: 'imageText',
    labels: { singular: 'Gambar + Teks', plural: 'Gambar + Teks' },
    fields: [
      { name: 'heading', type: 'text', label: 'Judul' },
      { name: 'content', type: 'richText', label: 'Isi' },
      { name: 'image', type: 'upload', relationTo: 'media', label: 'Gambar' },
      { name: 'imageSide', type: 'select', defaultValue: 'right', options: ['left', 'right'] },
    ],
  },
  {
    slug: 'values',
    labels: { singular: 'Daftar Nilai', plural: 'Daftar Nilai' },
    fields: [
      { name: 'heading', type: 'text', label: 'Judul' },
      { name: 'items', type: 'array', fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ] },
    ],
  },
  {
    slug: 'cta',
    labels: { singular: 'Ajakan (CTA)', plural: 'Ajakan (CTA)' },
    fields: [
      { name: 'heading', type: 'text', required: true },
      { name: 'text', type: 'textarea' },
      { name: 'label', type: 'text' },
      safeUrlField('href', 'Tujuan'),
    ],
  },
] as const

export const Pages = defineContent({
  slug: 'pages',
  labels: { singular: 'Halaman', plural: 'Halaman' },
  group: 'Konten',
  defaultColumns: ['title', 'slug', '_status'],
  fields: [
    titleField('Judul halaman'),
    slugField(),
    excerpt(240),
    cover('Gambar sampul'),
    // typed block whitelist — editors cannot inject HTML/script/stylesheet
    { name: 'layout', type: 'blocks', label: 'Isi halaman (blok)', blocks: blocks as unknown as import('payload').Block[] },
    seoFields,
  ],
})
