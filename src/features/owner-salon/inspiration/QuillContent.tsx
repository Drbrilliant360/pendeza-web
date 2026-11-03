// Read-only renderer for Quill Delta JSON (stands in for flutter_quill's QuillEditor in readOnly mode).
import type { CSSProperties, ReactNode } from 'react'

interface Op {
  insert?: string | Record<string, unknown>
  attributes?: Record<string, unknown>
}
interface Seg {
  text?: string
  embed?: Record<string, unknown>
  attrs: Record<string, unknown>
}
interface Line {
  segs: Seg[]
  attrs: Record<string, unknown>
}

function parseOps(json: string): Op[] | null {
  try {
    const v = JSON.parse(json) as unknown
    if (Array.isArray(v)) return v as Op[]
    if (v && typeof v === 'object' && Array.isArray((v as { ops?: unknown }).ops)) return (v as { ops: Op[] }).ops
    return null
  } catch {
    return null
  }
}

function toLines(ops: Op[]): Line[] {
  const lines: Line[] = []
  let cur: Seg[] = []
  for (const op of ops) {
    const attrs = op.attributes ?? {}
    if (typeof op.insert === 'string') {
      const parts = op.insert.split('\n')
      parts.forEach((part, i) => {
        if (part) cur.push({ text: part, attrs })
        if (i < parts.length - 1) {
          lines.push({ segs: cur, attrs })
          cur = []
        }
      })
    } else if (op.insert && typeof op.insert === 'object') {
      cur.push({ embed: op.insert, attrs })
    }
  }
  if (cur.length) lines.push({ segs: cur, attrs: {} })
  return lines
}

const safeUrl = (u: unknown) => (typeof u === 'string' && /^(https?:|mailto:|tel:)/i.test(u) ? u : undefined)

function renderSeg(seg: Seg, key: number): ReactNode {
  if (seg.embed) {
    const img = safeUrl(seg.embed.image)
    if (img) return <img key={key} src={img} alt="" className="my-3 max-w-full rounded-xl" />
    const video = safeUrl(seg.embed.video)
    if (video) return <video key={key} src={video} controls className="my-3 w-full rounded-xl" />
    return null
  }
  const a = seg.attrs
  const style: CSSProperties = {}
  if (typeof a.color === 'string') style.color = a.color
  if (typeof a.background === 'string') style.background = a.background
  let node: ReactNode = seg.text
  if (a.code) node = <code className="rounded bg-inset px-1 font-mono text-[0.9em]">{node}</code>
  if (a.bold) node = <strong>{node}</strong>
  if (a.italic) node = <em>{node}</em>
  if (a.underline) node = <u>{node}</u>
  if (a.strike) node = <s>{node}</s>
  const href = safeUrl(a.link)
  if (href)
    node = (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {node}
      </a>
    )
  return (
    <span key={key} style={style}>
      {node}
    </span>
  )
}

export default function QuillContent({ json, fallback }: { json: string; fallback: string }) {
  const ops = parseOps(json)
  if (!ops) return <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{fallback}</p>
  const lines = toLines(ops)

  const out: ReactNode[] = []
  let list: { type: string; items: ReactNode[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.type === 'ordered' ? 'ol' : 'ul'
    out.push(
      <Tag key={`l${out.length}`} className={list.type === 'ordered' ? 'my-2 list-decimal pl-6' : 'my-2 list-disc pl-6'}>
        {list.items}
      </Tag>,
    )
    list = null
  }

  lines.forEach((line, i) => {
    const content = line.segs.length ? line.segs.map(renderSeg) : <br />
    const align = typeof line.attrs.align === 'string' ? (line.attrs.align as CSSProperties['textAlign']) : undefined
    const listType = typeof line.attrs.list === 'string' ? line.attrs.list : null
    if (listType) {
      if (!list || list.type !== listType) {
        flush()
        list = { type: listType, items: [] }
      }
      list.items.push(
        <li key={i} style={{ textAlign: align }} className={listType === 'checked' ? 'line-through opacity-70' : undefined}>
          {content}
        </li>,
      )
      return
    }
    flush()
    const h = line.attrs.header
    if (h === 1) out.push(<h1 key={i} style={{ textAlign: align }} className="mb-2 mt-4 text-[24px] font-bold text-ink">{content}</h1>)
    else if (h === 2) out.push(<h2 key={i} style={{ textAlign: align }} className="mb-2 mt-4 text-[20px] font-bold text-ink">{content}</h2>)
    else if (h === 3) out.push(<h3 key={i} style={{ textAlign: align }} className="mb-1 mt-3 text-[17px] font-bold text-ink">{content}</h3>)
    else if (line.attrs.blockquote)
      out.push(
        <blockquote key={i} className="my-2 border-l-4 border-primary/40 pl-3 italic text-ink/80">
          {content}
        </blockquote>,
      )
    else if (line.attrs['code-block'])
      out.push(
        <pre key={i} className="my-1 overflow-x-auto rounded-lg bg-inset p-2 font-mono text-[13px]">
          {content}
        </pre>,
      )
    else
      out.push(
        <p key={i} style={{ textAlign: align }} className="min-h-[1.5em] text-[15px] leading-relaxed text-ink">
          {content}
        </p>,
      )
  })
  flush()
  return <div>{out}</div>
}
