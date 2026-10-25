import React from 'react'
import type { Page, Media } from '@/payload-types'
import { RichText } from '../ui/RichText'
import { Img } from '../ui/Img'
import { SmartLink } from '../ui/bits'

export const PageBlocks = ({ blocks }: { blocks?: Page['layout'] }) => (
  <>
    {(blocks ?? []).map((b, i) => {
      switch (b.blockType) {
        case 'richText':
          return (
            <div className="block" key={i}>
              <RichText data={b.content} />
            </div>
          )
        case 'imageText':
          return (
            <div className={`block image-text ${b.imageSide === 'left' ? 'image-text--left' : ''}`} key={i}>
              <div>
                {b.heading ? <h2>{b.heading}</h2> : null}
                <RichText data={b.content} />
              </div>
              <div className="image-text__media">
                <Img media={b.image as Media} sizes="(min-width: 1024px) 560px, 100vw" />
              </div>
            </div>
          )
        case 'values':
          return (
            <div className="block" key={i}>
              {b.heading ? <h2>{b.heading}</h2> : null}
              <ul className="values-grid">
                {(b.items ?? []).map((it) => (
                  <li key={it.id ?? it.title}>
                    <h3>{it.title}</h3>
                    {it.text ? <p>{it.text}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
        case 'cta':
          return (
            <div className="block cta-block" key={i}>
              <h2>{b.heading}</h2>
              {b.text ? <p>{b.text}</p> : null}
              {b.href && b.label ? (
                <SmartLink href={b.href} className="btn btn--gold">
                  {b.label}
                </SmartLink>
              ) : null}
            </div>
          )
        default:
          return null
      }
    })}
  </>
)
