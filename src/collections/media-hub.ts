import type { CollectionConfig, Field, Where } from 'payload'
import { APIError } from 'payload'
import { defineContent } from './_factory'
import { slugField } from '../fields/common'
import { adminOnly, editorialOnly, isStaff } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { parseMediaUrl, type ContentType } from '../lib/media-url'

const PLATFORMS = [
  { label: 'YouTube', value: 'youtube' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'WhatsApp (kanal/grup resmi)', value: 'whatsapp' },
  { label: 'Situs lain', value: 'web' },
]

/** Official school accounts (footer, contact page, /media). Public only when enabled AND verified by the school. */
export const SocialAccounts: CollectionConfig = {
  slug: 'social-accounts',
  labels: { singular: 'Akun Media Sosial', plural: 'Akun Media Sosial Resmi' },
  admin: {
    group: 'Video & Media Sosial',
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'platform', 'verifiedBySchool', 'showInFooter', 'enabled'],
    description: 'Akun/kanal tempat mengikuti sekolah. Tampil publik hanya bila Aktif dan sudah diverifikasi sekolah.',
  },
  defaultSort: 'order',
  access: {
    read: ({ req: { user } }) => (isStaff(user) ? true : ({ and: [{ enabled: { equals: true } }, { verifiedBySchool: { equals: true } }] } as Where)),
    create: editorialOnly,
    update: editorialOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data?.profileUrl) return data
        const p = parseMediaUrl(String(data.profileUrl))
        if (!p.ok) throw new APIError(p.error, 400, null, true)
        if (data.platform && data.platform !== 'web' && p.platform !== data.platform)
          throw new APIError(`URL ini bukan alamat ${data.platform}. Periksa kembali tautannya.`, 400, null, true)
        data.profileUrl = p.normalizedUrl
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, req }) => {
        // verification stamp comes from the session, never from the form
        if (data.verifiedBySchool && !originalDoc?.verifiedBySchool) {
          data.verifiedAt = new Date().toISOString()
          data.verifiedBy = req.user?.id ?? null
        }
        if (!data.verifiedBySchool) {
          data.verifiedAt = null
          data.verifiedBy = null
        }
        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: [
    { name: 'platform', type: 'select', required: true, options: PLATFORMS },
    { name: 'displayName', type: 'text', label: 'Nama tampilan', required: true, admin: { description: 'Contoh: KPS TV SMP Nasional KPS Balikpapan' } },
    { name: 'handle', type: 'text', label: 'Nama akun / handle', admin: { description: 'Contoh: @smpnas.kps' } },
    { name: 'profileUrl', type: 'text', label: 'URL profil/kanal', required: true, admin: { description: 'Salin dari tautan asli (https://). Jangan menebak dari tangkapan layar.' } },
    { name: 'profileImage', type: 'upload', relationTo: 'media', label: 'Foto profil (opsional, berizin)' },
    {
      name: 'owner',
      type: 'select',
      label: 'Pemilik akun',
      defaultValue: 'sekolah',
      options: [
        { label: 'SMP Nasional KPS', value: 'sekolah' },
        { label: 'Yayasan / unit lain (sebutkan di catatan)', value: 'lainnya' },
      ],
      admin: { description: 'Akun yayasan tidak otomatis sama dengan akun sekolah.' },
    },
    { name: 'verificationNote', type: 'text', label: 'Catatan verifikasi', admin: { description: 'Siapa/kapan mengonfirmasi, atau sumber tautan.' } },
    { type: 'row', fields: [
      { name: 'verifiedBySchool', type: 'checkbox', label: 'Sudah diverifikasi sekolah', defaultValue: false },
      { name: 'enabled', type: 'checkbox', label: 'Aktif', defaultValue: true },
    ] },
    { type: 'row', fields: [
      { name: 'showInFooter', type: 'checkbox', label: 'Tampil di footer', defaultValue: true },
      { name: 'showOnContact', type: 'checkbox', label: 'Tampil di halaman Kontak', defaultValue: true },
      { name: 'showOnMediaPage', type: 'checkbox', label: 'Tampil di /media', defaultValue: true },
    ] },
    { name: 'verifiedAt', type: 'date', label: 'Diverifikasi pada', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'verifiedBy', type: 'relationship', relationTo: 'users', label: 'Diverifikasi oleh', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Urutan', defaultValue: 10, admin: { position: 'sidebar' } },
  ],
}

const CONTENT_TYPES: { label: string; value: ContentType }[] = [
  { label: 'Video', value: 'video' },
  { label: 'Video pendek (Shorts/Reel)', value: 'short' },
  { label: 'Podcast (video)', value: 'podcast' },
  { label: 'Playlist', value: 'playlist' },
  { label: 'Postingan media sosial', value: 'social_post' },
  { label: 'Kanal / akun', value: 'channel' },
  { label: 'Artikel / liputan eksternal', value: 'external_article' },
]

const parseIntoDoc: NonNullable<NonNullable<CollectionConfig['hooks']>['beforeValidate']>[number] = async ({ data, req, originalDoc }) => {
  if (!data) return data
  const url = data.originalUrl ?? originalDoc?.originalUrl
  if (!url) return data
  const p = parseMediaUrl(String(url))
  if (!p.ok) throw new APIError(p.error, 400, null, true)
  data.platform = p.platform
  data.providerItemId = p.providerId
  data.normalizedUrl = p.normalizedUrl
  // editors may label a YouTube video as "podcast"; otherwise the detected type wins
  const requested = data.contentType ?? originalDoc?.contentType
  data.contentType = requested === 'podcast' && p.contentType === 'video' ? 'podcast' : p.contentType
  const mode = data.displayMode ?? originalDoc?.displayMode
  if (mode === 'click_to_load_embed' && !p.embeddable) {
    if (p.contentType === 'channel') throw new APIError('Ini tautan kanal. Pilih video tertentu untuk menampilkan pemutar, atau gunakan mode "Kartu tautan".', 400, null, true)
    data.displayMode = 'link_card'
  }
  if (!data.aspectRatio && !originalDoc?.aspectRatio) data.aspectRatio = p.contentType === 'short' ? '9:16' : '16:9'
  // duplicate check (platform + id, or normalized URL)
  const id = originalDoc?.id
  const dup = await req.payload.find({
    collection: 'media-items',
    where: { and: [{ normalizedUrl: { equals: p.normalizedUrl } }, ...(id ? [{ id: { not_equals: id } }] : [])] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    draft: true,
    trash: true,
    req,
  })
  if (dup.docs[0]) throw new APIError(`Tautan ini sudah ada: "${(dup.docs[0] as { title?: string }).title}". Gunakan item yang sama, jangan menduplikasi.`, 400, null, true)
  return data
}

const readOnlySidebar = (name: string, label: string, extra: Partial<Field> = {}): Field =>
  ({ name, type: 'text', label, admin: { readOnly: true, position: 'sidebar' }, ...extra }) as Field

/** Curated video / social posts. URLs and structured fields only — never raw <iframe>/<script>. */
export const MediaItems = defineContent({
  slug: 'media-items',
  labels: { singular: 'Video / Media', plural: 'Video & Media' },
  group: 'Video & Media Sosial',
  defaultSort: '-sourcePublishedAt',
  defaultColumns: ['title', 'platform', 'contentType', 'homepageFeatured', '_status'],
  description: 'Tempel tautan video/postingan, isi judul & ringkasan sendiri, lalu terbitkan. Pemutar baru dimuat ketika pengunjung menekan Putar.',
  beforeValidate: [parseIntoDoc],
  publicWhere: () => ({ consentStatus: { not_equals: 'pending' } }),
  fields: [
    { name: 'title', type: 'text', label: 'Judul (di website)', required: true, maxLength: 140, admin: { description: 'Boleh berbeda dari judul asli di platform.' } },
    slugField(),
    {
      name: 'originalUrl',
      type: 'text',
      label: 'Tautan asli',
      required: true,
      admin: {
        description: 'Salin dari tombol Bagikan / alamat browser. Video, Shorts, playlist, kanal, Reel, TikTok, Facebook atau artikel. Bukan kode iframe.',
        components: { afterInput: ['@/components/admin/MediaUrlHint#MediaUrlHint'] },
      },
    },
    { name: 'excerpt', type: 'textarea', label: 'Ringkasan / konteks', maxLength: 300 },
    { name: 'editorialBody', type: 'richText', label: 'Catatan editorial / transkrip ringkas (opsional)', admin: { description: 'Jangan klaim transkrip otomatis akurat tanpa ditinjau.' } },
    { type: 'row', fields: [
      { name: 'contentType', type: 'select', label: 'Jenis konten', options: CONTENT_TYPES, admin: { description: 'Terdeteksi otomatis. Video YouTube boleh diberi label Podcast.' } },
      {
        name: 'displayMode',
        type: 'select',
        label: 'Tampilan',
        defaultValue: 'click_to_load_embed',
        options: [
          { label: 'Klik untuk memuat pemutar', value: 'click_to_load_embed' },
          { label: 'Kartu tautan', value: 'link_card' },
        ],
        admin: { description: 'Pemutar hanya untuk video/playlist YouTube. Lainnya otomatis kartu tautan.' },
      },
      { name: 'aspectRatio', type: 'select', label: 'Rasio', options: ['16:9', '9:16', '1:1'].map((v) => ({ label: v, value: v })) },
    ] },
    { name: 'thumbnail', type: 'upload', relationTo: 'media', label: 'Gambar sampul (berizin)', admin: { description: 'Opsional untuk video YouTube (memakai gambar resmi YouTube). Disarankan untuk platform lain.' } },
    { name: 'thumbnailAlt', type: 'text', label: 'Teks alternatif gambar sampul' },
    { name: 'caption', type: 'text', label: 'Keterangan singkat (kartu)', maxLength: 140 },
    { type: 'row', fields: [
      { name: 'sourcePublishedAt', type: 'date', label: 'Tanggal terbit di sumber', index: true },
      { name: 'durationSeconds', type: 'number', label: 'Durasi (detik, opsional)', min: 0 },
    ] },
    { name: 'sourceAccount', type: 'relationship', relationTo: 'social-accounts', label: 'Akun sumber (opsional)' },
    { name: 'relatedEvents', type: 'relationship', relationTo: 'events', hasMany: true, label: 'Agenda terkait' },
    { name: 'publishedAt', type: 'date', label: 'Tanggal tampil di website', admin: { position: 'sidebar' } },
    { name: 'homepageFeatured', type: 'checkbox', label: 'Tampilkan di beranda (KPS TV)', defaultValue: false, index: true, admin: { position: 'sidebar', description: 'Maksimal 3 tampil; urutan kecil di depan.' } },
    { name: 'homepageOrder', type: 'number', label: 'Urutan di beranda', defaultValue: 10, admin: { position: 'sidebar' } },
    {
      name: 'consentStatus',
      type: 'select',
      label: 'Izin identitas/karya siswa',
      defaultValue: 'not_needed',
      required: true,
      options: [
        { label: 'Tidak menampilkan siswa / tidak perlu', value: 'not_needed' },
        { label: 'Izin sudah ada', value: 'obtained' },
        { label: 'Menunggu izin (tidak tampil publik)', value: 'pending' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'contentPermissionNote', type: 'textarea', label: 'Catatan izin konten', admin: { position: 'sidebar' } },
    {
      name: 'availability',
      type: 'select',
      label: 'Ketersediaan di sumber',
      defaultValue: 'unchecked',
      options: [
        { label: 'Belum dicek', value: 'unchecked' },
        { label: 'Tersedia', value: 'available' },
        { label: 'Tidak tersedia (dihapus/privat)', value: 'unavailable' },
        { label: 'Dibatasi (login/wilayah/embed dimatikan)', value: 'restricted' },
      ],
      admin: { position: 'sidebar', description: 'Tidak tersedia/dibatasi = tampil sebagai kartu tautan tanpa pemutar.' },
    },
    { name: 'lastVerifiedAt', type: 'date', label: 'Terakhir dicek', admin: { position: 'sidebar' } },
    readOnlySidebar('platform', 'Platform (otomatis)'),
    readOnlySidebar('providerItemId', 'ID di platform (otomatis)'),
    readOnlySidebar('normalizedUrl', 'URL baku (otomatis)', { unique: true, index: true } as Partial<Field>),
  ],
})
