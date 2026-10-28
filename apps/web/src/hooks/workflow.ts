import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { roleOf } from '../access/roles'

type Opts = {
  /** Allow admissions officers with explicit permission (`canPublishAdmissions`) to publish. */
  admissions?: boolean
}

/**
 * Server-side editorial workflow:
 * draft → in_review → (scheduled/)published → archived; in_review → draft by a reviewer requires a reviewNote
 * - Contributors (and admissions officers without explicit right) can never publish, even via API.
 * - createdBy / updatedBy are stamped from the session, never from client input.
 */
export const enforceWorkflow =
  (opts: Opts = {}): CollectionBeforeChangeHook =>
  ({ data, req, operation, originalDoc, collection }) => {
    const hasPublishedAt = collection.fields.some((f) => 'name' in f && f.name === 'publishedAt')
    const user = req.user
    if (user && user.collection === 'users') {
      const role = roleOf(user)
      let canPublish = role === 'superadmin' || role === 'admin' || role === 'editor'
      if (opts.admissions && role === 'admissions' && (user as { canPublishAdmissions?: boolean }).canPublishAdmissions) {
        canPublish = true
      }

      if (data._status === 'published' && !canPublish) {
        throw new APIError(
          'Peran Anda tidak dapat menerbitkan konten. Pilih "Ajukan Review" lalu Simpan Draf.',
          403,
          null,
          true,
        )
      }
      if (!canPublish && data.workflowStatus && !['draft', 'in_review'].includes(data.workflowStatus)) {
        data.workflowStatus = 'in_review'
      }
      // A reviewer sending work back (in review → draft) must say why; the author reads it in "Catatan reviewer".
      if (canPublish && operation === 'update' && originalDoc?.workflowStatus === 'in_review' && data.workflowStatus === 'draft' && data._status !== 'published') {
        const note = data.reviewNote !== undefined ? data.reviewNote : originalDoc?.reviewNote
        if (typeof note !== 'string' || !note.trim()) {
          throw new APIError('Isi "Catatan reviewer" dengan alasan sebelum mengembalikan konten ke Draf.', 400, null, true)
        }
      }

      if (operation === 'create') data.createdBy = user.id
      else if (originalDoc?.createdBy) data.createdBy = typeof originalDoc.createdBy === 'object' ? originalDoc.createdBy.id : originalDoc.createdBy
      data.updatedBy = user.id
    }

    if (data._status === 'published') {
      if (data.workflowStatus === 'archived') {
        data.archivedAt = data.archivedAt ?? new Date().toISOString()
      } else {
        data.workflowStatus = 'published'
        data.archivedAt = null
      }
      if (hasPublishedAt) {
        data.publishedAt = data.publishedAt ?? new Date().toISOString()
      }
    }
    return data
  }
