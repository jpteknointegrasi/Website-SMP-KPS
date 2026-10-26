import type { GlobalConfig } from 'payload'
import { editorialOnly, anyone, isAdmin, isEditorial } from '../access/roles'
import { safeUrlField } from '../fields/common'
import { auditGlobal } from '../hooks/audit'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Pengaturan Sekolah',
  admin: { group: 'Pengaturan' },
  access: { read: anyone, update: editorialOnly },
  versions: { max: 30 },
  hooks: { afterChange: [auditGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identitas',
          fields: [
            {
              name: 'schoolName',
              type: 'text',
              label: 'Nama sekolah',
              required: true,
              defaultValue: 'SMP Nasional KPS',
            },
            { name: 'city', type: 'text', label: 'Kota', defaultValue: 'Balikpapan' },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Logo resmi (PNG transparan)',
            },
            {
              name: 'valuesLine',
              type: 'text',
              label: 'Nilai utama',
              defaultValue: 'Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional',
            },
            { name: 'shortProfile', type: 'textarea', label: 'Profil singkat' },
          ],
        },
        {
          label: 'Kontak',
          description:
            'Isi hanya data resmi yang sudah dikonfirmasi sekolah. Kolom kosong = tidak ditampilkan.',
          fields: [
            { name: 'address', type: 'textarea', label: 'Alamat' },
            { name: 'email', type: 'email', label: 'Email' },
            { name: 'phone', type: 'text', label: 'Telepon' },
            { name: 'fax', type: 'text', label: 'Fax' },
            {
              name: 'whatsapp',
              type: 'text',
              label: 'WhatsApp resmi (terverifikasi)',
              admin: {
                description:
                  'Jangan isi dari nomor telepon kantor kecuali sudah dipastikan nomor WhatsApp resmi.',
              },
            },
            {
              name: 'serviceHours',
              type: 'text',
              label: 'Jam layanan',
              admin: {
                description:
                  'Contoh: Senin–Jumat 07.00–15.00 WITA. Kosongkan bila belum dikonfirmasi.',
              },
            },
            safeUrlField('mapUrl', 'Tautan peta (Google Maps)'),
            {
              name: 'contactVerified',
              type: 'checkbox',
              label: 'Data kontak sudah dikonfirmasi sekolah',
              defaultValue: false,
            },
          ],
        },
        {
          label: 'Tautan & Sosial',
          fields: [
            safeUrlField('portalUrl', 'URL Portal Sekolah', {
              description: 'Kosong = tombol Portal Sekolah disembunyikan.',
            }),
            safeUrlField('alumniUrl', 'URL Portal Alumni', {
              description: 'Kosong = memakai https://alumniku.my.id/ (portal alumni KPS).',
            }),
            {
              name: 'socials',
              type: 'array',
              label: 'Media sosial (lama)',
              admin: {
                description:
                  'Digantikan oleh Video & Media Sosial → Akun Media Sosial Resmi. Dipakai hanya bila koleksi itu kosong.',
              },
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: ['instagram', 'youtube', 'facebook', 'tiktok'].map((v) => ({
                    label: v,
                    value: v,
                  })),
                },
                { name: 'handle', type: 'text', label: 'Nama akun' },
                safeUrlField('url', 'URL', { required: true }),
              ],
            },
          ],
        },
      ],
    },
  ],
}

const sectionTypes = [
  { label: 'Akses cepat', value: 'quickLinks' },
  { label: 'Pencarian', value: 'search' },
  { label: 'Sekilas KPS (angka otomatis dari CMS)', value: 'highlights' },
  { label: 'Mengenal sekolah', value: 'schoolIntro' },
  { label: 'Program pembelajaran', value: 'programs' },
  { label: 'Kehidupan siswa', value: 'studentLife' },
  { label: 'Prestasi', value: 'achievements' },
  { label: 'Pengumuman & agenda', value: 'announcementsAgenda' },
  { label: 'Berita terbaru', value: 'latestNews' },
  { label: 'KPS TV & Cerita Digital (video & media)', value: 'mediaHub' },
  { label: 'Fasilitas', value: 'facilities' },
  { label: 'Komunitas & alumni', value: 'communityAlumni' },
  { label: 'Ajakan pendaftaran', value: 'admissionsCta' },
]

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  label: 'Beranda',
  admin: {
    group: 'Pengaturan',
    description: 'Atur hero, urutan blok dan teks beranda. Perubahan tampil setelah Terbitkan.',
  },
  access: {
    read: ({ req: { user } }) => (isEditorial(user) ? true : { _status: { equals: 'published' } }),
    readVersions: ({ req: { user } }) => isEditorial(user),
    update: editorialOnly,
  },
  versions: { drafts: true, max: 30 },
  hooks: { afterChange: [auditGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          description: 'Judul, foto bergantian dan tombol di bagian paling atas.',
          fields: [
            {
              name: 'hero',
              type: 'group',
              label: 'Hero',
              fields: [
                { name: 'eyebrow', type: 'text', label: 'Eyebrow', maxLength: 60 },
                { name: 'title', type: 'text', label: 'Judul', required: true, maxLength: 80 },
                { name: 'description', type: 'textarea', label: 'Deskripsi', maxLength: 200 },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Foto utama (desktop)',
                  required: true,
                  admin: {
                    description:
                      'Gunakan foto horizontal resmi. Atur titik fokus di Media agar wajah tidak terpotong.',
                  },
                },
                {
                  name: 'imageMobile',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Foto mobile (opsional)',
                },
                {
                  name: 'slides',
                  type: 'upload',
                  relationTo: 'media',
                  hasMany: true,
                  maxRows: 6,
                  label: 'Foto hero bergantian (maks. 6)',
                  admin: {
                    description:
                      'Bila diisi, foto-foto ini tampil bergantian (crossfade). Gunakan foto horizontal lebar; atur titik fokus di Media. Kosongkan untuk memakai satu foto utama.',
                  },
                },
                {
                  name: 'slideInterval',
                  type: 'number',
                  label: 'Jeda antar foto (detik)',
                  defaultValue: 6,
                  min: 4,
                  max: 15,
                },
                {
                  name: 'accentImages',
                  type: 'upload',
                  relationTo: 'media',
                  hasMany: true,
                  maxRows: 2,
                  label: 'Foto aksen melayang (maks. 2)',
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'primaryLabel',
                      type: 'text',
                      label: 'Tombol utama',
                      defaultValue: 'Kenali KPS',
                    },
                    safeUrlField('primaryHref', 'Tujuan tombol utama'),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'secondaryLabel',
                      type: 'text',
                      label: 'Tombol kedua',
                      defaultValue: 'Informasi Pendaftaran',
                    },
                    safeUrlField('secondaryHref', 'Tujuan tombol kedua'),
                  ],
                },
                {
                  name: 'showLiveClock',
                  type: 'checkbox',
                  label: 'Tampilkan jam & sapaan WITA',
                  defaultValue: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Akses cepat',
          description: 'Maksimal 6 tombol di bawah hero.',
          fields: [
            {
              name: 'quickLinks',
              type: 'array',
              label: 'Akses cepat (maks. 6)',
              maxRows: 6,
              fields: [
                { name: 'label', type: 'text', required: true, maxLength: 30 },
                {
                  name: 'icon',
                  type: 'select',
                  defaultValue: 'link',
                  options: [
                    'link',
                    'book',
                    'report',
                    'calendar',
                    'megaphone',
                    'users',
                    'grid',
                    'pencil',
                    'file',
                    'school',
                  ].map((v) => ({ label: v, value: v })),
                },
                safeUrlField('href', 'Tujuan', { required: true }),
              ],
            },
          ],
        },
        {
          label: 'Mengenal sekolah',
          description: 'Kolase foto dan pilar di blok "Mengenal".',
          fields: [
            {
              name: 'intro',
              type: 'group',
              label: 'Mengenal sekolah',
              fields: [
                { name: 'eyebrow', type: 'text', label: 'Label kecil', defaultValue: 'Mengenal' },
                {
                  name: 'heading',
                  type: 'text',
                  label: 'Judul',
                  defaultValue: 'Mengenal SMP Nasional KPS',
                },
                { name: 'text', type: 'textarea', label: 'Teks' },
                {
                  name: 'introImage',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Gambar utama kolase',
                },
                {
                  name: 'collage',
                  type: 'upload',
                  relationTo: 'media',
                  hasMany: true,
                  maxRows: 2,
                  label: 'Foto kecil kolase (maks. 2)',
                },
                {
                  name: 'pillars',
                  type: 'array',
                  maxRows: 3,
                  label: 'Pilar',
                  fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'text', type: 'textarea' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Teks blok',
          description: 'Judul dan teks untuk tiap blok beranda.',
          fields: [
            {
              name: 'texts',
              type: 'group',
              label: 'Judul & teks tiap blok',
              admin: {
                description:
                  'Buka bagian blok yang ingin diubah. Kosongkan untuk memakai teks bawaan.',
              },
              fields: [
                {
                  type: 'collapsible',
                  label: 'Program pembelajaran',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'programsEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'Pembelajaran',
                    },
                    {
                      name: 'programsHeading',
                      label: 'Judul',
                      type: 'text',
                      defaultValue: 'Belajar dengan Makna',
                    },
                    {
                      name: 'programsIntro',
                      type: 'textarea',
                      label: 'Keterangan (kanan judul)',
                      maxLength: 180,
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Kehidupan siswa',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'studentLifeEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'Kehidupan Siswa',
                    },
                    {
                      name: 'studentLifeHeading',
                      label: 'Judul',
                      type: 'text',
                      defaultValue: 'Ruang untuk Setiap Potensi',
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Prestasi',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'achievementsEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'Prestasi',
                    },
                    {
                      name: 'achievementsHeading',
                      label: 'Judul',
                      type: 'text',
                      defaultValue: 'Semangat untuk Berprestasi',
                    },
                    { name: 'achievementsText', type: 'textarea', label: 'Teks', maxLength: 200 },
                    {
                      name: 'achievementsAlbum',
                      type: 'relationship',
                      relationTo: 'albums',
                      label: 'Album arsip (tumpukan foto)',
                      admin: {
                        description: 'Opsional. Tampil sebagai tumpukan foto di blok prestasi.',
                      },
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Pengumuman & agenda',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'infoEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'Informasi',
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Berita',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'newsEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'Berita Sekolah',
                    },
                    {
                      name: 'newsHeading',
                      label: 'Judul',
                      type: 'text',
                      defaultValue: 'Cerita dari KPS',
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'KPS TV & Cerita Digital',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'mediaEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'KPS TV',
                    },
                    {
                      name: 'mediaHeading',
                      type: 'text',
                      label: 'Judul',
                      defaultValue: 'KPS TV & Cerita Digital',
                    },
                    {
                      name: 'mediaIntro',
                      type: 'textarea',
                      label: 'Teks',
                      maxLength: 200,
                      defaultValue:
                        'Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas KPS.',
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Komunitas & alumni',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'communityEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'Komunitas',
                    },
                    {
                      name: 'communityHeading',
                      label: 'Judul',
                      type: 'text',
                      defaultValue: 'Terhubung dalam Keluarga KPS',
                    },
                    { name: 'communityText', label: 'Teks', type: 'textarea' },
                    {
                      name: 'communityImage',
                      type: 'upload',
                      relationTo: 'media',
                      label: 'Foto blok komunitas/alumni',
                    },
                    {
                      name: 'alumniTitle',
                      type: 'text',
                      label: 'Judul kotak alumni',
                      defaultValue: 'Jejaring Alumni',
                    },
                    {
                      name: 'alumniText',
                      type: 'textarea',
                      label: 'Teks kotak alumni',
                      maxLength: 200,
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Ajakan pendaftaran (bagian bawah)',
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      name: 'ctaEyebrow',
                      type: 'text',
                      label: 'Label kecil',
                      defaultValue: 'Pendaftaran Siswa Baru',
                    },
                    {
                      name: 'ctaHeading',
                      label: 'Judul',
                      type: 'text',
                      defaultValue: 'Mari Mengenal KPS Lebih Dekat',
                    },
                    { name: 'ctaText', label: 'Teks', type: 'textarea' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Urutan blok',
          description: 'Urutan tampil dan aktif/nonaktif tiap blok.',
          fields: [
            {
              name: 'sections',
              type: 'array',
              label: 'Urutan & status blok',
              admin: {
                description:
                  'Seret untuk mengubah urutan. Nonaktifkan blok yang belum memiliki konten layak.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'type',
                      type: 'select',
                      label: 'Blok',
                      required: true,
                      options: sectionTypes,
                    },
                    { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Aktif' },
                    { name: 'limit', type: 'number', min: 1, max: 4, label: 'Batas kartu' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigasi',
  admin: { group: 'Navigasi' },
  access: { read: anyone, update: editorialOnly },
  versions: { max: 20 },
  hooks: { afterChange: [auditGlobal] },
  fields: [
    {
      name: 'header',
      type: 'array',
      label: 'Menu utama (maks. 2 tingkat — mencegah siklus)',
      maxRows: 8,
      fields: [
        { name: 'label', type: 'text', required: true },
        safeUrlField('href', 'Tujuan', { required: true }),
        {
          name: 'children',
          type: 'array',
          label: 'Submenu',
          maxRows: 10,
          fields: [
            { name: 'label', type: 'text', required: true },
            safeUrlField('href', 'Tujuan', { required: true }),
            { name: 'description', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'footer',
      type: 'array',
      label: 'Tautan penting footer',
      maxRows: 12,
      fields: [
        { name: 'label', type: 'text', required: true },
        safeUrlField('href', 'Tujuan', { required: true }),
      ],
    },
  ],
}
void isAdmin
