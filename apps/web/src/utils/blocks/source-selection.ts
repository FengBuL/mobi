import type { Token } from 'marked'
import { marked } from 'marked'

export type MarkdownSourceKind
  = | `heading-${1 | 2 | 3 | 4 | 5 | 6}`
    | 'paragraph'
    | 'code'
    | 'table'
    | 'quote'
    | 'list-ul'
    | 'list-ol'
    | 'divider'

export interface MarkdownSourceRange {
  from: number
  to: number
  raw: string
}

export interface LocatedMarkdownSource extends MarkdownSourceRange {
  kind: MarkdownSourceKind
  ordinal: number
}

function getMarkdownBody(content: string) {
  const frontMatter = content.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/u)
  const offset = frontMatter?.[0].length ?? 0
  return {
    body: content.slice(offset),
    offset,
  }
}

function getTokenSourceKind(token: Token): MarkdownSourceKind | null {
  if (token.type === `heading`) {
    return `heading-${token.depth}` as MarkdownSourceKind
  }
  if (token.type === `paragraph`) {
    return `paragraph`
  }
  if (token.type === `code`) {
    return `code`
  }
  if (token.type === `table`) {
    return `table`
  }
  if (token.type === `blockquote`) {
    return `quote`
  }
  if (token.type === `list`) {
    return token.ordered ? `list-ol` : `list-ul`
  }
  if (token.type === `hr`) {
    return `divider`
  }
  return null
}

function listMarkdownSourceRanges(content: string): LocatedMarkdownSource[] {
  const { body, offset: bodyOffset } = getMarkdownBody(content)
  const counts = new Map<MarkdownSourceKind, number>()
  const ranges: LocatedMarkdownSource[] = []
  let offset = bodyOffset

  for (const token of marked.lexer(body)) {
    const kind = getTokenSourceKind(token)
    if (kind) {
      const ordinal = (counts.get(kind) ?? 0) + 1
      counts.set(kind, ordinal)
      const raw = token.raw.trimEnd()
      ranges.push({
        kind,
        ordinal,
        from: offset,
        to: offset + raw.length,
        raw,
      })
    }
    offset += token.raw.length
  }
  return ranges
}

export function resolveMarkdownSourceRange(
  content: string,
  kind: string,
  ordinal: number,
): MarkdownSourceRange | null {
  if (!Number.isInteger(ordinal) || ordinal < 1) {
    return null
  }

  return listMarkdownSourceRanges(content).find(range => (
    range.kind === kind && range.ordinal === ordinal
  )) ?? null
}

export function resolveMarkdownSourceAtPosition(
  content: string,
  position: number,
): LocatedMarkdownSource | null {
  if (!Number.isInteger(position) || position < 0 || position > content.length) {
    return null
  }

  return listMarkdownSourceRanges(content).find(range => (
    position >= range.from && position <= range.to
  )) ?? null
}
