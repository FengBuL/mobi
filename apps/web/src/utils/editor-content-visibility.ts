import type { DecorationSet } from '@codemirror/view'
import { RangeSetBuilder, StateField } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'

export interface EditorHiddenRange {
  from: number
  to: number
}

function collectMatches(content: string, pattern: RegExp): EditorHiddenRange[] {
  return Array.from(content.matchAll(pattern), (match) => {
    const from = match.index ?? 0
    return { from, to: from + match[0].length }
  })
}

function findFencedCodeRanges(content: string): EditorHiddenRange[] {
  const ranges: EditorHiddenRange[] = []
  const lines = content.matchAll(/[^\n]*(?:\n|$)/gu)
  let openFence: { from: number, marker: string } | null = null

  for (const match of lines) {
    if (!match[0]) {
      continue
    }
    const line = match[0].replace(/\n$/u, ``)
    const offset = match.index ?? 0

    if (!openFence) {
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})/u)?.[1]
      if (opening) {
        openFence = { from: offset, marker: opening }
      }
      continue
    }

    const markerCharacter = openFence.marker[0]
    const closingPattern = new RegExp(`^ {0,3}${markerCharacter}{${openFence.marker.length},}[ \\t]*$`, `u`)
    if (closingPattern.test(line)) {
      ranges.push({ from: openFence.from, to: offset + match[0].length })
      openFence = null
    }
  }

  if (openFence) {
    ranges.push({ from: openFence.from, to: content.length })
  }
  return ranges
}

function findMarkdownCodeRanges(content: string): EditorHiddenRange[] {
  return mergeRanges([
    ...findFencedCodeRanges(content),
    ...collectMatches(content, /(`+)[^\n]*?\1/gu),
  ])
}

function isInsideRange(candidate: EditorHiddenRange, ranges: EditorHiddenRange[]) {
  return ranges.some(range => candidate.from >= range.from && candidate.to <= range.to)
}

function isEscaped(content: string, index: number) {
  let backslashCount = 0
  for (let cursor = index - 1; cursor >= 0 && content[cursor] === `\\`; cursor -= 1) {
    backslashCount += 1
  }
  return backslashCount % 2 === 1
}

function expandStandaloneLine(content: string, range: EditorHiddenRange): EditorHiddenRange {
  const lineStart = content.lastIndexOf(`\n`, Math.max(0, range.from - 1)) + 1
  const lineBreak = content.indexOf(`\n`, range.to)
  const lineEnd = lineBreak === -1 ? content.length : lineBreak

  if (content.slice(lineStart, range.from).trim() || content.slice(range.to, lineEnd).trim()) {
    return range
  }

  let to = lineBreak === -1 ? content.length : lineBreak + 1
  const nextLineBreak = content.indexOf(`\n`, to)
  const nextLineEnd = nextLineBreak === -1 ? content.length : nextLineBreak
  if (!content.slice(to, nextLineEnd).trim()) {
    to = nextLineBreak === -1 ? content.length : nextLineBreak + 1
  }

  return { from: lineStart, to }
}

function mergeRanges(ranges: EditorHiddenRange[]): EditorHiddenRange[] {
  const sorted = [...ranges].sort((left, right) => left.from - right.from || right.to - left.to)
  const merged: EditorHiddenRange[] = []

  for (const range of sorted) {
    const previous = merged[merged.length - 1]
    if (!previous || range.from >= previous.to) {
      merged.push({ ...range })
      continue
    }
    previous.to = Math.max(previous.to, range.to)
  }

  return merged
}

export function findEmbeddedContentRanges(content: string): EditorHiddenRange[] {
  const blockPattern = /<section\s+class="[^"]*\bmd-(?:block|media-block)\b[^"]*"[^>]*>[\s\S]*?<\/section>/gu
  const markdownImagePattern = /!\[[^\]\n]*\]\([^\n)]*\)/gu
  const htmlImagePattern = /<img\b[^>]*>/giu
  const codeRanges = findMarkdownCodeRanges(content)

  const rawRanges = [
    ...collectMatches(content, blockPattern),
    ...collectMatches(content, markdownImagePattern).filter(range => !isEscaped(content, range.from)),
    ...collectMatches(content, htmlImagePattern),
  ].filter(range => !isInsideRange(range, codeRanges))

  return mergeRanges(rawRanges.map(range => expandStandaloneLine(content, range)))
}

export function stripEmbeddedContent(content: string): string {
  const ranges = findEmbeddedContentRanges(content)
  let visible = content
  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const range = ranges[index]
    visible = `${visible.slice(0, range.from)}${visible.slice(range.to)}`
  }
  return visible
}

function buildDecorations(content: string): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const range of findEmbeddedContentRanges(content)) {
    builder.add(
      range.from,
      range.to,
      Decoration.replace({ block: content.slice(range.from, range.to).includes(`\n`) }),
    )
  }
  return builder.finish()
}

export const embeddedContentVisibility = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state.doc.toString())
  },
  update(decorations, transaction) {
    return transaction.docChanged
      ? buildDecorations(transaction.newDoc.toString())
      : decorations
  },
  provide: field => EditorView.decorations.from(field),
})
