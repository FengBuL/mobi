import type { Token } from 'marked'
import { marked } from 'marked'

export type MarkdownSourceKind =
  | `heading-${1 | 2 | 3 | 4 | 5 | 6}`
  | `quote`
  | `list-ul`
  | `list-ol`
  | `divider`

export interface MarkdownSourceRange {
  from: number
  to: number
  raw: string
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

export function resolveMarkdownSourceRange(
  content: string,
  kind: string,
  ordinal: number,
): MarkdownSourceRange | null {
  if (!Number.isInteger(ordinal) || ordinal < 1) {
    return null
  }

  const { body, offset: bodyOffset } = getMarkdownBody(content)
  const counts = new Map<MarkdownSourceKind, number>()
  let offset = bodyOffset

  for (const token of marked.lexer(body)) {
    const sourceKind = getTokenSourceKind(token)
    if (sourceKind) {
      const nextOrdinal = (counts.get(sourceKind) ?? 0) + 1
      counts.set(sourceKind, nextOrdinal)
      if (sourceKind === kind && nextOrdinal === ordinal) {
        const raw = token.raw.trimEnd()
        return {
          from: offset,
          to: offset + raw.length,
          raw,
        }
      }
    }
    offset += token.raw.length
  }

  return null
}
