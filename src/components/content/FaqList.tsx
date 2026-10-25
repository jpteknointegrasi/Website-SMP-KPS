import React from 'react'
import { RichText } from '../ui/RichText'
import type { Faq } from '@/payload-types'

/** Accessible accordion (native <details>/<summary>: keyboard & screen reader friendly, works without JS). */
export const FaqList = ({ items, open }: { items: Faq[]; open?: string }) =>
  items.length ? (
    <div className="faq-list">
      {items.map((f) => (
        <details key={f.id} id={f.slug} open={open === f.slug}>
          <summary>{f.title}</summary>
          <div className="faq-list__a">
            <RichText data={f.answer} />
            {f.relatedPage ? (
              <p>
                <a href={f.relatedPage}>Informasi terkait</a>
              </p>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  ) : null
