/** Build a minimal Lexical (Payload rich text) document from plain paragraphs / headings. */
type Node = Record<string, unknown>
const text = (t: string, format = 0): Node => ({ type: 'text', text: t, format, detail: 0, mode: 'normal', style: '', version: 1 })
const para = (t: string): Node => ({ type: 'paragraph', children: [text(t)], direction: 'ltr', format: '', indent: 0, version: 1, textFormat: 0, textStyle: '' })
const heading = (t: string, tag: 'h2' | 'h3' = 'h2'): Node => ({ type: 'heading', tag, children: [text(t)], direction: 'ltr', format: '', indent: 0, version: 1 })
const list = (items: string[], ordered = false): Node => ({
  type: 'list',
  listType: ordered ? 'number' : 'bullet',
  tag: ordered ? 'ol' : 'ul',
  start: 1,
  children: items.map((it, i) => ({ type: 'listitem', value: i + 1, children: [text(it)], direction: 'ltr', format: '', indent: 0, version: 1 })),
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})

export type Block = string | { h2: string } | { h3: string } | { ul: string[] } | { ol: string[] }

export const lexical = (blocks: Block[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: blocks.map((b) => {
      if (typeof b === 'string') return para(b)
      if ('h2' in b) return heading(b.h2, 'h2')
      if ('h3' in b) return heading(b.h3, 'h3')
      if ('ul' in b) return list(b.ul)
      return list(b.ol, true)
    }),
  },
})

/** Extract plain text from Lexical JSON (for search snippets / reading time). */
export const lexicalToText = (doc: unknown): string => {
  const out: string[] = []
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object') return
    const node = n as { text?: string; children?: unknown[] }
    if (typeof node.text === 'string') out.push(node.text)
    node.children?.forEach(walk)
  }
  walk((doc as { root?: unknown })?.root)
  return out.join(' ').replace(/\s+/g, ' ').trim()
}
