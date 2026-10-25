import React from 'react'
import { Icon } from '../ui/Icon'
import { DemoBadge } from '../ui/bits'
import { formatDate } from '@/lib/format'
import type { Document } from '@/payload-types'

export const DOC_CATEGORY: Record<string, string> = { umum: 'Umum', bos: 'Dana BOS', kalender: 'Kalender akademik', panduan: 'Panduan', buletin: 'E-Buletin' }

const ext = (d: Document) => (d.filename?.split('.').pop() ?? d.mimeType?.split('/').pop() ?? '').toUpperCase().slice(0, 4)
const size = (b?: number | null) => (!b ? '' : b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/** Public document rows: title, category, period, version, approval date, file type and size. */
export const DocumentList = ({ docs }: { docs: Document[] }) => (
  <ul className="list-rows">
    {docs.map((d) => (
      <li key={d.id}>
        <a className="row-link doc-row" href={d.url ?? '#'} download={d.originalFilename ?? undefined}>
          <span className="doc-row__type" aria-hidden="true">{ext(d) || 'FILE'}</span>
          <span className="doc-row__body">
            <span className="row-meta">
              {DOC_CATEGORY[d.category]}
              {d.period ? <span className="badge">{d.period}</span> : null}
              {d.version ? <span className="badge">Versi {d.version}</span> : null}
              <DemoBadge show={d.isDemo} />
            </span>
            <strong>{d.title}</strong>
            {d.description ? <span>{d.description}</span> : null}
            <span className="doc-row__foot">
              {[d.approvedAt && `Disetujui ${formatDate(d.approvedAt)}`, ext(d), size(d.filesize)].filter(Boolean).join(' · ')}
            </span>
          </span>
          <Icon name="download" />
        </a>
      </li>
    ))}
  </ul>
)
