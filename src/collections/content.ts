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
const relatedMedia: Field = { name: 'relatedMedia', type: 'relationship', relationTo: 'media-items', hasMany: true, maxRows: 4, label: 'Video / media sosial terkait', admin: { description: 'Pilih dari Video & Media. Item yang sama bisa dipakai di beberapa halaman tanpa duplikasi.' } }
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
    relatedMedia,
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
      admin: { description: 'Label relevansi, BUKAN pembatas akses: pengumuman tetap bisa dibaca umum. Jangan memuat data pribadi.' },
      options: [
        { label: 'Umum', value: 'umum' },
        { label: 'Orang tua', value: 'orang_tua' },
        { label: 'Siswa', value: 'siswa' },
        { label: 'Kelas 7', value: 'kelas_7' },
        { label: 'Kelas 8', value: 'kelas_8' },
        { label: 'Kelas 9', value: 'kelas_9' },
        { label: 'Calon siswa', value: 'calon_siswa' },
        { label: 'Guru', value: 'guru' },
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
    {
      name: 'endDateWarning',
      type: 'ui',
      admin: { components: { Field: '@/components/admin/EndDateWarning#EndDateWarning' } },
    },
    { name: 'attachments', type: 'relationship', relationTo: 'documents', hasMany: true, label: 'Lampiran publik' },
    { name: 'relatedEvent', type: 'relationship', relationTo: 'events', label: 'Agenda terkait' },
    { name: 'contact', type: 'text', label: 'Kontak terkait' },
    cover('Gambar (opsional)'),
    { name: 'publishedAt', type: 'date', label: 'Tanggal terbit', admin: { position: 'sidebar' } },
    seoFields,
  ],
})

export const AUDIENCE_OPTIONS = [
  { label: 'Semua', value: 'semua' },
  { label: 'Kelas 7', value: 'kelas_7' },
  { label: 'Kelas 8', value: 'kelas_8' },
  { label: 'Kelas 9', value: 'kelas_9' },
  { label: 'Orang tua', value: 'orang_tua' },
  { label: 'Calon siswa', value: 'calon_siswa' },
  { label: 'Guru', value: 'guru' },
  { label: 'Alumni', value: 'alumni' },
]

export const EventCategories: CollectionConfig = {
  slug: 'event-categories',
  labels: { singular: 'Kategori Agenda', plural: 'Kategori Agenda' },
  admin: { group: 'Konten', useAsTitle: 'title', defaultColumns: ['title', 'color', 'order'] },
  defaultSort: 'order',
  access: { read: anyone, create: editorialOnly, update: editorialOnly, delete: adminOnly },
  hooks: { afterChange: [auditAfterChange], afterDelete: [auditAfterDelete] },
  fields: [
    titleField('Nama kategori', 40),
    slugField(),
    {
      name: 'color',
      type: 'select',
      label: 'Warna penanda',
      defaultValue: 'teal',
      options: ['teal', 'gold', 'navy', 'red', 'green', 'purple', 'grey'].map((v) => ({ label: v, value: v })),
    },
    order,
  ],
}

/** Bumps the ICS SEQUENCE when anything a calendar app shows has changed (RFC 5545 §3.8.7.4). */
const ICS_FIELDS = ['title', 'startAt', 'endAt', 'allDay', 'location', 'eventStatus', 'excerpt'] as const
const bumpSequence: import('payload').CollectionBeforeChangeHook = ({ data, originalDoc, operation }) => {
  if (operation === 'create') {
    data.sequence = 0
    return data
  }
  const prev = (originalDoc ?? {}) as Record<string, unknown>
  const changed = ICS_FIELDS.some((k) => k in data && JSON.stringify(data[k] ?? null) !== JSON.stringify(prev[k] ?? null))
  data.sequence = Number(prev.sequence ?? 0) + (changed && data._status === 'published' ? 1 : 0)
  return data
}

export const Events = defineContent({
  slug: 'events',
  labels: { singular: 'Agenda', plural: 'Agenda' },
  group: 'Konten',
  defaultSort: 'startAt',
  defaultColumns: ['title', 'startAt', 'category', 'eventStatus', '_status'],
  beforeChange: [bumpSequence],
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
    { name: 'allDay', type: 'checkbox', label: 'Sepanjang hari (tanggal saja)', defaultValue: false, admin: { description: 'Tanggal dibaca dalam zona waktu sekolah; jam diabaikan. ICS memakai DTEND eksklusif (hari berikutnya).' } },
    { type: 'row', fields: [
      { name: 'category', type: 'relationship', relationTo: 'event-categories', label: 'Kategori', index: true },
      { name: 'audience', type: 'select', hasMany: true, label: 'Sasaran', defaultValue: ['semua'], options: AUDIENCE_OPTIONS, index: true },
    ] },
    { name: 'location', type: 'text', label: 'Lokasi publik', admin: { description: 'Hanya lokasi yang boleh diketahui umum.' } },
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
    {
      name: 'rundown',
      type: 'array',
      label: 'Susunan acara (rundown)',
      admin: { initCollapsed: true, description: 'Opsional. Tampil di halaman agenda dan banner.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'time', type: 'text', label: 'Waktu', required: true, admin: { width: '25%', placeholder: '13:00 - 13:45' } },
            { name: 'activity', type: 'text', label: 'Kegiatan', required: true, admin: { width: '60%' } },
            { name: 'highlight', type: 'checkbox', label: 'Sorot', admin: { width: '15%' } },
          ],
        },
      ],
    },
    { name: 'dressCode', type: 'text', label: 'Pakaian (opsional)', admin: { placeholder: 'Batik / Smart Casual' } },
    safeUrlField('registrationUrl', 'Tautan pendaftaran kegiatan (opsional)'),
    { name: 'attachments', type: 'relationship', relationTo: 'documents', hasMany: true, label: 'Lampiran publik' },
    cover('Gambar (opsional)'),
    {
      name: 'homeBanner',
      type: 'checkbox',
      label: 'Tampilkan sebagai banner di beranda',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Banner tampil sampai acara selesai, lalu hilang otomatis. Bila ada beberapa, yang paling dekat yang tampil. Gambar (opsional) dipakai di banner.' },
    },
    {
      name: 'sequence',
      type: 'number',
      label: 'Revisi kalender (ICS SEQUENCE)',
      defaultValue: 0,
      admin: { position: 'sidebar', readOnly: true, description: 'Naik otomatis saat jadwal/status berubah agar aplikasi kalender memperbarui acara.' },
    },
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
    fields: [
      titleField('Nama'),
      slugField(),
      excerpt(),
      cover(),
      body,
      ...extra,
      { name: 'activities', type: 'array', label: 'Aktivitas', maxRows: 10, fields: [{ name: 'text', type: 'text', label: 'Aktivitas', required: true }] },
      gallery,
      relatedMedia,
      featured,
      order,
      seoFields,
    ],
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
      { label: 'Pimpinan Yayasan', value: 'yayasan' },
      { label: 'Pimpinan Sekolah', value: 'pimpinan' },
      { label: 'Guru', value: 'guru' },
      { label: 'Tenaga kependidikan', value: 'staf' },
    ] },
    { name: 'subjects', type: 'text', label: 'Mata pelajaran / bidang', admin: { description: 'Pisahkan dengan koma. Contoh: Matematika, IPA. Hanya yang dikonfirmasi sekolah.' } },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto (setelah identitas diverifikasi)' },
    { name: 'bio', type: 'textarea', label: 'Bio singkat', maxLength: 400, admin: { description: 'Jangan memuat NIK, alamat rumah, nomor pribadi atau data kepegawaian.' } },
    { name: 'publicationConsent', type: 'checkbox', label: 'Persetujuan publikasi foto', defaultValue: false, admin: { description: 'Foto hanya tampil publik bila dicentang.' } },
    { name: 'active', type: 'checkbox', label: 'Masih aktif', defaultValue: true, index: true, admin: { position: 'sidebar', description: 'Nonaktif = turun dari halaman publik; riwayat & audit tetap ada.' } },
    order,
  ],
  publicWhere: () => ({ active: { not_equals: false } }),
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
    relatedMedia,
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
    {
      name: 'serviceStatus',
      type: 'select',
      label: 'Status layanan',
      defaultValue: 'active',
      required: true,
      options: [
        { label: 'Aktif', value: 'active' },
        { label: 'Segera tersedia', value: 'coming_soon' },
        { label: 'Sedang pemeliharaan', value: 'maintenance' },
      ],
      admin: { description: 'Tombol hanya muncul bila Aktif DAN URL valid.' },
    },
    { name: 'serviceCategory', type: 'select', label: 'Kategori', defaultValue: 'umum', options: [
      { label: 'Umum', value: 'umum' },
      { label: 'Akademik', value: 'akademik' },
      { label: 'Perpustakaan', value: 'perpustakaan' },
      { label: 'Administrasi', value: 'administrasi' },
    ] },
    { name: 'verifiedAt', type: 'date', label: 'URL terakhir diverifikasi', admin: { position: 'sidebar' } },
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
    { name: 'relation', type: 'select', label: 'Hubungan dengan sekolah', defaultValue: 'alumni', options: [
      { label: 'Alumni', value: 'alumni' },
      { label: 'Orang tua / wali', value: 'orang_tua' },
      { label: 'Siswa', value: 'siswa' },
    ], admin: { description: 'Sesuai fakta. Foto kelompok guru bukan foto alumni.' } },
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
    slug: 'highlightBanner',
    labels: { singular: 'Banner sorotan (mis. prestasi)', plural: 'Banner sorotan' },
    fields: [
      { name: 'eyebrow', type: 'text', label: 'Label kecil', defaultValue: 'Prestasi' },
      { name: 'heading', type: 'text', label: 'Judul', required: true },
      { name: 'text', type: 'textarea', label: 'Teks singkat', maxLength: 240 },
      { name: 'image', type: 'upload', relationTo: 'media', label: 'Gambar (opsional; bila kosong memakai sampul berita)' },
      { type: 'row', fields: [
        { name: 'linkLabel', type: 'text', label: 'Teks tombol', defaultValue: 'Lihat semua prestasi' },
        safeUrlField('linkHref', 'Tujuan tombol'),
      ] },
      { name: 'post', type: 'relationship', relationTo: 'posts', label: 'Berita yang ditampilkan (1)', admin: { description: 'Berita yang belum terbit tidak akan ditampilkan.' } },
    ],
  },
  {
    slug: 'faqBlock',
    labels: { singular: 'FAQ', plural: 'FAQ' },
    fields: [
      { name: 'heading', type: 'text', label: 'Judul', defaultValue: 'Pertanyaan umum' },
      { name: 'category', type: 'select', label: 'Ambil dari kategori', options: ['pendaftaran', 'pembelajaran', 'kegiatan', 'administrasi', 'website'].map((v) => ({ label: v, value: v })) },
      { name: 'items', type: 'relationship', relationTo: 'faqs', hasMany: true, label: 'Atau pilih FAQ tertentu' },
    ],
  },
  {
    slug: 'eventsBlock',
    labels: { singular: 'Agenda pilihan', plural: 'Agenda pilihan' },
    fields: [
      { name: 'heading', type: 'text', label: 'Judul', defaultValue: 'Agenda terkait' },
      { name: 'items', type: 'relationship', relationTo: 'events', hasMany: true, label: 'Agenda (kosong = 3 agenda mendatang)' },
    ],
  },
  {
    slug: 'mediaBlock',
    labels: { singular: 'Video / media', plural: 'Video / media' },
    fields: [
      { name: 'heading', type: 'text', label: 'Judul (opsional)' },
      { name: 'items', type: 'relationship', relationTo: 'media-items', hasMany: true, maxRows: 3, required: true, label: 'Item media' },
    ],
  },
  {
    slug: 'worksBlock',
    labels: { singular: 'Karya siswa pilihan', plural: 'Karya siswa pilihan' },
    fields: [
      { name: 'heading', type: 'text', label: 'Judul', defaultValue: 'Karya siswa' },
      { name: 'items', type: 'relationship', relationTo: 'student-works', hasMany: true, maxRows: 6, required: true },
    ],
  },
  {
    slug: 'guideBlock',
    labels: { singular: 'Panduan', plural: 'Panduan' },
    fields: [{ name: 'guide', type: 'relationship', relationTo: 'guides', required: true }],
  },
  {
    slug: 'admissionsCta',
    labels: { singular: 'Ajakan pendaftaran', plural: 'Ajakan pendaftaran' },
    fields: [
      { name: 'heading', type: 'text', defaultValue: 'Mari Mengenal KPS Lebih Dekat' },
      { name: 'text', type: 'textarea' },
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
