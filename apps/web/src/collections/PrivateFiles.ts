import type { CollectionConfig } from 'payload'
import { adminOnly, isStaff, isEditorial } from '../access/roles'
import { secureUpload } from '../hooks/uploadSecurity'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/** Internal evidence (e.g. achievement proof). Never public: files are served only with a staff session. */
export const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  labels: { singular: 'Berkas Privat', plural: 'Berkas Privat' },
  admin: { group: 'Media', useAsTitle: 'title', description: 'Bukti internal. Tidak pernah tampil di website publik.' },
  access: {
    read: ({ req: { user } }) => isStaff(user),
    create: ({ req: { user } }) => isStaff(user),
    update: ({ req: { user } }) => isEditorial(user),
    delete: adminOnly,
  },
  hooks: { beforeOperation: [secureUpload(MIMES, 20_000_000)] },
  upload: {
    staticDir: path.resolve(dirname, '../../private-media'),
    mimeTypes: MIMES,
    disableLocalStorage: false,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Judul', required: true },
    { name: 'originalFilename', type: 'text', label: 'Nama berkas asli', admin: { readOnly: true } },
    { name: 'note', type: 'textarea', label: 'Catatan' },
  ],
}
