import React from 'react'
import { RichText as LexicalRichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { Img } from './Img'
import type { Media } from '@/payload-types'

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }) => {
    const value = (node as unknown as { value?: Media }).value
    if (!value || typeof value !== 'object') return null
    return (
      <figure className="rt-figure">
        <Img media={value} sizes="(min-width: 900px) 760px, 100vw" />
        {value.caption ? <figcaption>{value.caption}</figcaption> : null}
      </figure>
    )
  },
})

export const RichText = ({ data, className }: { data?: unknown; className?: string }) => {
  if (!data || typeof data !== 'object' || !(data as { root?: unknown }).root) return null
  return <LexicalRichText data={data as SerializedEditorState} converters={converters} className={['prose', className].filter(Boolean).join(' ')} disableContainer={false} />
}
