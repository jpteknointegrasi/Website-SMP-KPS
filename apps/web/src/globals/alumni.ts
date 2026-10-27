import type { Field, GlobalConfig } from 'payload'
import { anyone, editorialOnly } from '../access/roles'
import { safeUrlField } from '../fields/common'

/**
 * /alumni (IKA KPS — Ikatan Keluarga Alumni KPS). Every field is optional: an empty field or list
 * falls back to the starting content in src/lib/alumni-defaults.ts (IKA KPS material, Oct 2026).
 */
const EMPTY = 'Kosongkan untuk memakai isi awal dari materi IKA KPS.'

const img = (name: string, label: string, description?: string): Field => ({
  name,
  type: 'upload',
  relationTo: 'media',
  label,
  admin: { description: description ?? EMPTY },
})

export const AlumniPage: GlobalConfig = {
  slug: 'alumni-page',
  label: 'Halaman Alumni (IKA KPS)',
  admin: {
    description:
      'Halaman /alumni untuk Ikatan Keluarga Alumni KPS. Bagian yang dikosongkan memakai isi awal. URL Portal Alumni diatur di Identitas & Kontak Sekolah → Tautan & Sosial.',
    preview: () => '/alumni',
  },
  access: { read: anyone, update: editorialOnly },
  versions: { max: 20 },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Pembuka',
          fields: [
            { name: 'eyebrow', type: 'text', label: 'Label kecil', admin: { placeholder: 'IKATAN KELUARGA ALUMNI KPS' } },
            {
              type: 'row',
              fields: [
                { name: 'heading', type: 'text', label: 'Judul', admin: { placeholder: 'Satu Almamater.', width: '50%' } },
                { name: 'headingAccent', type: 'text', label: 'Judul (warna emas)', admin: { placeholder: 'Sejuta Cerita.', width: '50%' } },
              ],
            },
            { name: 'tagline', type: 'text', label: 'Tagline', admin: { placeholder: 'Connect • Collaborate • Contribute' } },
            { name: 'intro', type: 'textarea', label: 'Deskripsi' },
            img('heroImage', 'Foto pembuka'),
            { name: 'heroCaption', type: 'text', label: 'Keterangan foto' },
            safeUrlField('joinUrl', 'Tautan formulir bergabung', { description: `Formulir pendaftaran anggota IKA KPS. ${EMPTY}` }),
            safeUrlField('instagramUrl', 'Instagram IKA KPS', { description: `Kanal resmi IKA KPS. ${EMPTY}` }),
          ],
        },
        {
          label: 'Tentang',
          fields: [
            { name: 'aboutHeading', type: 'text', label: 'Judul' },
            { name: 'aboutText', type: 'textarea', label: 'Isi', admin: { description: `Pisahkan paragraf dengan baris kosong. ${EMPTY}` } },
            img('aboutImage', 'Foto', `Kosong = foto Pelantikan Ikatan Alumni (foto Komunitas di beranda).`),
            {
              name: 'values',
              type: 'array',
              label: 'Tiga nilai',
              maxRows: 4,
              admin: { description: EMPTY, initCollapsed: true },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'title', type: 'text', label: 'Judul', required: true, admin: { width: '40%' } },
                    {
                      name: 'icon',
                      type: 'select',
                      label: 'Ikon',
                      defaultValue: 'users',
                      admin: { width: '30%' },
                      options: [
                        { label: 'Orang', value: 'users' },
                        { label: 'Jabat tangan', value: 'handshake' },
                        { label: 'Bintang', value: 'star' },
                        { label: 'Hati', value: 'heart' },
                      ],
                    },
                  ],
                },
                { name: 'text', type: 'textarea', label: 'Teks' },
              ],
            },
          ],
        },
        {
          label: 'Pengurus',
          fields: [
            {
              name: 'committeeNote',
              type: 'text',
              label: 'Catatan di bawah judul',
              admin: { placeholder: 'Susunan lengkap menunggu konfirmasi pengurus' },
            },
            {
              name: 'committee',
              type: 'array',
              label: 'Pengurus',
              admin: {
                description: 'Isi hanya sesuai SK atau konfirmasi pengurus. Kosong = data awal (Ketua IKA KPS dan Ketua Dewan Penasihat).',
                initCollapsed: true,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', label: 'Nama lengkap', required: true, admin: { width: '50%' } },
                    { name: 'role', type: 'text', label: 'Jabatan (sesuai SK)', required: true, admin: { width: '50%' } },
                  ],
                },
                { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto resmi (opsional)' },
                { name: 'note', type: 'text', label: 'Keterangan singkat (opsional)', admin: { description: 'Mis. angkatan, bila disetujui yang bersangkutan.' } },
              ],
            },
            safeUrlField('committeeUrl', 'Tautan struktur lengkap (opsional)', { description: 'Mis. dokumen SK di menu Dokumen. Kosong = tombol disembunyikan.' }),
          ],
        },
        {
          label: 'Kegiatan',
          fields: [
            {
              name: 'activities',
              type: 'array',
              label: 'Kabar & kegiatan',
              maxRows: 6,
              admin: { description: `Tiga kartu tampil berurutan. ${EMPTY}`, initCollapsed: true },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'title', type: 'text', label: 'Judul', required: true, admin: { width: '60%' } },
                    { name: 'category', type: 'text', label: 'Kategori', admin: { width: '40%', placeholder: 'Organisasi' } },
                  ],
                },
                { name: 'summary', type: 'textarea', label: 'Ringkasan' },
                { name: 'image', type: 'upload', relationTo: 'media', label: 'Gambar' },
                safeUrlField('url', 'Tautan "Baca selengkapnya"', { description: 'Artikel di website (/berita/...) atau unggahan Instagram.' }),
              ],
            },
            {
              type: 'collapsible',
              label: 'Agenda alumni',
              admin: {
                initCollapsed: true,
                description: 'Agenda yang sasarannya "Alumni" (menu Agenda & Kalender) tampil otomatis di sini. Teks ini tampil saat belum ada agenda.',
              },
              fields: [
                { name: 'agendaHeading', type: 'text', label: 'Judul saat kosong', admin: { placeholder: 'Nantikan agenda berikutnya' } },
                { name: 'agendaText', type: 'textarea', label: 'Teks saat kosong' },
              ],
            },
            {
              name: 'stories',
              type: 'array',
              label: 'Cerita dari almamater',
              maxRows: 4,
              admin: { description: `Mis. seri IKA Spill The Tea. ${EMPTY}`, initCollapsed: true },
              fields: [
                { name: 'title', type: 'text', label: 'Judul', required: true },
                { name: 'text', type: 'textarea', label: 'Teks' },
                { name: 'image', type: 'upload', relationTo: 'media', label: 'Gambar' },
                safeUrlField('url', 'Tautan'),
              ],
            },
          ],
        },
        {
          label: 'Galeri & Ajakan',
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: 'Galeri kebersamaan',
              maxRows: 16,
              admin: { description: `Foto kegiatan, dibuka dalam pembesar. ${EMPTY}`, initCollapsed: true },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', label: 'Foto', required: true },
                { name: 'caption', type: 'text', label: 'Keterangan' },
              ],
            },
            { name: 'photoCredit', type: 'text', label: 'Kredit foto', admin: { description: 'Tampil di bawah galeri, mis. "Foto kegiatan: Instagram @ika_kps". Kosong = tidak tampil.' } },
            {
              type: 'row',
              fields: [
                { name: 'ctaHeading', type: 'text', label: 'Judul ajakan', admin: { width: '50%', placeholder: 'Sudah terhubung dengan keluarga KPS?' } },
                { name: 'ctaText', type: 'text', label: 'Teks ajakan', admin: { width: '50%' } },
              ],
            },
          ],
        },
      ],
    },
  ],
}
