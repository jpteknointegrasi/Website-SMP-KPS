import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { adminOnly, isAdmin, isEditorial, hasRole, nobody, editorialOnly, anyone, admissionsStaff, isStaff } from '../access/roles'
import { defineContent } from './_factory'
import { safeUrlField } from '../fields/common'
import { contactSubmitEndpoint } from '../endpoints/contact'
import { auditAfterChange } from '../hooks/audit'

export const AdmissionsCycles = defineContent({
  slug: 'admissions-cycles',
  labels: { singular: 'Siklus Pendaftaran', plural: 'Pendaftaran (PPDB/PMB)' },
  group: 'Pendaftaran',
  useAsTitle: 'academicYear',
  defaultSort: '-academicYear',
  defaultColumns: ['academicYear', 'admissionStatus', '_status'],
  admissions: true,
  access: { create: admissionsStaff, update: admissionsStaff },
  fields: [
    {
      name: 'academicYear',
      type: 'text',
      label: 'Tahun ajaran',
      required: true,
      unique: true,
      validate: (v: unknown) => (typeof v === 'string' && /^\d{4}\/\d{4}$/.test(v) ? true : 'Format: 2026/2027'),
    },
    {
      name: 'admissionStatus',
      type: 'select',
      label: 'Status penerimaan',
      required: true,
      defaultValue: 'unconfirmed',
      options: [
        { label: 'Menunggu konfirmasi sekolah', value: 'unconfirmed' },
        { label: 'Belum dibuka', value: 'not_open' },
        { label: 'Dibuka', value: 'open' },
        { label: 'Ditutup', value: 'closed' },
      ],
      admin: { description: 'Tombol "Daftar" hanya muncul jika status Dibuka DAN URL pendaftaran valid.' },
    },
    { name: 'intro', type: 'textarea', label: 'Pengantar' },
    safeUrlField('registrationUrl', 'URL sistem pendaftaran resmi', { description: 'Harus https://. Uji tautan sebelum mengaktifkan status Dibuka.' }),
    {
      name: 'waves',
      type: 'array',
      label: 'Gelombang & jadwal',
      fields: [
        { name: 'name', type: 'text', label: 'Nama gelombang', required: true },
        { type: 'row', fields: [
          { name: 'start', type: 'date', label: 'Mulai' },
          { name: 'end', type: 'date', label: 'Selesai' },
        ] },
        { name: 'note', type: 'text', label: 'Catatan' },
      ],
    },
    { name: 'steps', type: 'array', label: 'Alur pendaftaran', fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'detail', type: 'textarea' },
    ] },
    { name: 'requirements', type: 'array', label: 'Persyaratan', fields: [{ name: 'text', type: 'text', required: true }] },
    { name: 'feesApproved', type: 'checkbox', label: 'Informasi biaya disetujui untuk publik', defaultValue: false },
    { name: 'fees', type: 'richText', label: 'Informasi biaya', admin: { condition: (_, s) => Boolean(s?.feesApproved) } },
    { name: 'faqs', type: 'array', label: 'FAQ', fields: [
      { name: 'question', type: 'text', required: true },
      { name: 'answer', type: 'textarea', required: true },
    ] },
    { name: 'contactNote', type: 'textarea', label: 'Kontak informasi pendaftaran' },
  ],
})

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Pesan Masuk', plural: 'Pesan Masuk' },
  admin: {
    group: 'Pesan Masuk',
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'name', 'category', 'status', 'createdAt'],
    description: 'Privat. Hanya peran berwenang yang dapat membaca.',
  },
  access: {
    // Only through the validated /api/contact-messages/submit endpoint
    create: nobody,
    read: ({ req: { user } }) => {
      if (isEditorial(user)) return true
      if (hasRole(user, 'admissions')) return { category: { equals: 'pendaftaran' } }
      return false
    },
    update: ({ req: { user } }) => {
      if (isEditorial(user)) return true
      if (hasRole(user, 'admissions')) return { category: { equals: 'pendaftaran' } }
      return false
    },
    delete: adminOnly,
  },
  endpoints: [contactSubmitEndpoint],
  hooks: { afterChange: [auditAfterChange] },
  fields: [
    { name: 'reference', type: 'text', label: 'No. referensi', unique: true, index: true, admin: { readOnly: true } },
    { name: 'name', type: 'text', label: 'Nama', required: true, admin: { readOnly: true } },
    { name: 'email', type: 'email', label: 'Email', admin: { readOnly: true } },
    { name: 'phone', type: 'text', label: 'Telepon', admin: { readOnly: true } },
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      required: true,
      index: true,
      options: [
        { label: 'Informasi umum', value: 'umum' },
        { label: 'Pendaftaran', value: 'pendaftaran' },
        { label: 'Akademik', value: 'akademik' },
        { label: 'Kritik & saran', value: 'saran' },
        { label: 'Alumni', value: 'alumni' },
      ],
    },
    { name: 'message', type: 'textarea', label: 'Pesan', required: true, admin: { readOnly: true } },
    { name: 'consent', type: 'checkbox', label: 'Setuju penggunaan data', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Baru', value: 'new' },
        { label: 'Diproses', value: 'in_progress' },
        { label: 'Selesai', value: 'done' },
        { label: 'Spam', value: 'spam' },
      ],
    },
    { name: 'assignedTo', type: 'relationship', relationTo: 'users', label: 'Ditugaskan ke' },
    { name: 'internalNote', type: 'textarea', label: 'Catatan privat' },
    { name: 'emailNotified', type: 'checkbox', label: 'Notifikasi email terkirim', admin: { readOnly: true } },
  ],
}

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Log Audit', plural: 'Log Audit' },
  admin: {
    group: 'Audit',
    useAsTitle: 'docTitle',
    defaultColumns: ['createdAt', 'actorEmail', 'action', 'collectionSlug', 'docTitle'],
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req: { user } }) => {
      if (isAdmin(user)) return true
      if (isStaff(user)) return { actor: { equals: user!.id } }
      return false
    },
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  fields: [
    { name: 'action', type: 'text', index: true },
    { name: 'collectionSlug', type: 'text', label: 'Koleksi', index: true },
    { name: 'docId', type: 'text', index: true },
    { name: 'docTitle', type: 'text', label: 'Objek' },
    { name: 'status', type: 'text' },
    { name: 'workflowStatus', type: 'text' },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorEmail', type: 'text', label: 'Pelaku' },
  ],
}

const normalizePath = (p: string) => {
  let s = p.trim()
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname
  } catch {}
  if (!s.startsWith('/')) s = '/' + s
  s = s.replace(/\/{2,}/g, '/')
  if (s.length > 1) s = s.replace(/\/+$/, '')
  return s.toLowerCase()
}

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Pengalihan', plural: 'Pengalihan URL' },
  admin: { group: 'Pengaturan', useAsTitle: 'oldPath', defaultColumns: ['oldPath', 'newPath', 'active'] },
  access: { read: anyone, create: editorialOnly, update: editorialOnly, delete: adminOnly },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.oldPath) data.oldPath = normalizePath(data.oldPath)
        if (data?.newPath && data.newPath.startsWith('/')) data.newPath = normalizePath(data.newPath)
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        // prevent loops: A→B where B→…→A
        const seen = new Set<string>([data.oldPath])
        let cursor: string | undefined = data.newPath
        for (let i = 0; i < 10 && cursor; i++) {
          if (seen.has(cursor)) throw new APIError('Pengalihan membentuk loop. Periksa tujuan.', 400, null, true)
          seen.add(cursor)
          const next = await req.payload.find({
            collection: 'redirects',
            where: { oldPath: { equals: cursor }, id: { not_equals: originalDoc?.id ?? 0 } },
            limit: 1,
            overrideAccess: true,
            req,
          })
          cursor = next.docs[0]?.newPath
        }
        return data
      },
    ],
    afterChange: [auditAfterChange],
  },
  fields: [
    { name: 'oldPath', type: 'text', label: 'Path lama', required: true, unique: true, index: true },
    {
      name: 'newPath',
      type: 'text',
      label: 'Path baru (internal)',
      required: true,
      // internal only — prevents open redirects
      validate: (v: unknown) => (typeof v === 'string' && /^\/(?!\/)[^\s]*$/.test(v) ? true : 'Tujuan harus path internal yang diawali "/".'),
    },
    { name: 'active', type: 'checkbox', label: 'Aktif', defaultValue: true },
    { name: 'note', type: 'text', label: 'Catatan' },
  ],
}
