import type { TransactionSpec } from '@codemirror/state'

export interface AutoFormatStats {
  headings: number
  listItems: number
  paragraphs: number
}

export interface AutoFormatResult {
  content: string
  changed: boolean
  stats: AutoFormatStats
  source: string
}

interface LineState {
  original: string
  text: string
  protected: boolean
  type: LineType
}

type LineType = `blank` | `heading` | `list` | `quote` | `markdown` | `paragraph` | `protected`

const markdownBlockPattern = /^\s{0,3}(?:#{1,6}\s|>\s?|[-+*]\s+|\d+[.)]\s+|`{3,}|~{3,}|(?:-{3,}|\*{3,}|_{3,})\s*$|<)/
const chineseSectionPattern = /^(?:[一二三四五六七八九十百零〇\d]{1,8}\s*[\u3001\u3002](?=\S)|第[一二三四五六七八九十百零〇\d]{1,8}(?:[章节篇]|部分)(?:\s+|(?=\S)))/
const decimalSectionPattern = /^\d+\.\d+(?:\.\d+)*\s+\S/
const plainOrderedItemPattern = /^(\s*)(\d+)[、。．)]\s*(\S.*)$/
const plainBulletPattern = /^(\s*)[•●·]\s*(\S.*)$/
const fullWidthQuotePattern = /^(\s*)＞\s*(\S.*)$/

function markProtectedLines(lines: LineState[]) {
  let inFrontmatter = lines[0]?.text.trim() === `---`
  let inFence = false
  let fenceMarker = ``
  let htmlTag = ``

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line)
      continue

    const trimmed = line.text.trim()
    if (inFrontmatter) {
      line.protected = true
      if (index > 0 && (trimmed === `---` || trimmed === `...`))
        inFrontmatter = false
      continue
    }

    const fence = trimmed.match(/^(`{3,}|~{3,})/)
    if (fence) {
      line.protected = true
      if (!inFence) {
        inFence = true
        fenceMarker = fence[1]?.[0] ?? ``
      }
      else if (fence[1]?.[0] === fenceMarker) {
        inFence = false
        fenceMarker = ``
      }
      continue
    }
    if (inFence) {
      line.protected = true
      continue
    }

    if (htmlTag) {
      line.protected = true
      if (new RegExp(`</${htmlTag}\\s*>`, `i`).test(trimmed))
        htmlTag = ``
      continue
    }

    const htmlStart = trimmed.match(/^<([a-z][\w-]*)(?:\s[^>]*)?>/i)
    if (htmlStart && !trimmed.startsWith(`<http`)) {
      line.protected = true
      const tag = htmlStart[1] ?? ``
      if (tag && !new RegExp(`</${tag}\\s*>`, `i`).test(trimmed) && !trimmed.endsWith(`/>`))
        htmlTag = tag
      continue
    }

    if (/^\s*\|.*\|\s*$/.test(line.text))
      line.protected = true
  }
}

function isPlainTitle(text: string) {
  const trimmed = text.trim()
  return trimmed.length > 0
    && trimmed.length <= 50
    && !markdownBlockPattern.test(trimmed)
    && !/[|。！？；.!?;]$/.test(trimmed)
    && !plainBulletPattern.test(text)
    && !plainOrderedItemPattern.test(text)
}

function classifyLine(line: LineState): LineType {
  if (!line.text.trim())
    return `blank`
  if (line.protected)
    return `protected`
  if (/^\s{0,3}#{1,6}\s+/.test(line.text))
    return `heading`
  if (/^\s*(?:[-+*]\s+|\d+[.)]\s+)/.test(line.text))
    return `list`
  if (/^\s*>\s?/.test(line.text))
    return `quote`
  if (markdownBlockPattern.test(line.text) || /^\s*!?\[[^\]]*\]\([^)]*\)\s*$/.test(line.text))
    return `markdown`
  return `paragraph`
}

function findFirstContentLine(lines: LineState[]) {
  return lines.findIndex(line => !line.protected && line.text.trim().length > 0)
}

function normalizeLines(lines: LineState[], stats: AutoFormatStats) {
  const firstContentIndex = findFirstContentLine(lines)
  if (firstContentIndex >= 0) {
    const first = lines[firstContentIndex]
    const next = lines[firstContentIndex + 1]
    if (first && isPlainTitle(first.text) && (!next || !next.text.trim())) {
      first.text = `# ${first.text.trim()}`
      stats.headings += 1
    }
  }

  const orderedListIndexes = new Set<number>()
  for (let index = 0; index < lines.length;) {
    if (lines[index]?.protected || !plainOrderedItemPattern.test(lines[index]?.text ?? ``)) {
      index += 1
      continue
    }
    let end = index
    while (end < lines.length && !lines[end]?.protected && plainOrderedItemPattern.test(lines[end]?.text ?? ``))
      end += 1
    if (end - index >= 2) {
      for (let cursor = index; cursor < end; cursor += 1)
        orderedListIndexes.add(cursor)
    }
    index = end
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || line.protected || !line.text.trim())
      continue

    if (index !== firstContentIndex && !orderedListIndexes.has(index) && !markdownBlockPattern.test(line.text)) {
      if (chineseSectionPattern.test(line.text.trim())) {
        line.text = `## ${line.text.trim()}`
        stats.headings += 1
      }
      else if (decimalSectionPattern.test(line.text.trim())) {
        line.text = `### ${line.text.trim()}`
        stats.headings += 1
      }
    }

    const bullet = line.text.match(plainBulletPattern)
    if (bullet) {
      line.text = `${bullet[1]}- ${bullet[2]}`
      stats.listItems += 1
      continue
    }

    if (orderedListIndexes.has(index)) {
      const ordered = line.text.match(plainOrderedItemPattern)
      if (ordered) {
        line.text = `${ordered[1]}${ordered[2]}. ${ordered[3]}`
        stats.listItems += 1
        continue
      }
    }

    const quote = line.text.match(fullWidthQuotePattern)
    if (quote) {
      line.text = `${quote[1]}> ${quote[2]}`
      continue
    }

    if (!markdownBlockPattern.test(line.text))
      line.text = line.text.replace(/[\t ]+$/g, ``)
  }
}

function shouldSeparate(previous: LineState, current: LineState) {
  if (previous.protected || current.protected)
    return false
  if (previous.type === `paragraph` && current.type === `paragraph`)
    return true
  if (previous.type === `heading` || current.type === `heading`)
    return true
  if (previous.type === `list` || current.type === `list`)
    return previous.type !== `list` || current.type !== `list`
  if (previous.type === `quote` || current.type === `quote`)
    return previous.type !== `quote` || current.type !== `quote`
  return false
}

function renderLines(lines: LineState[], hadFinalNewline: boolean) {
  const rendered: string[] = []
  let previous: LineState | undefined
  let sawBlank = false

  for (const line of lines) {
    if (!line.text.trim()) {
      if (previous)
        sawBlank = true
      continue
    }

    if (previous && (sawBlank || shouldSeparate(previous, line)))
      rendered.push(``)
    rendered.push(line.text)
    previous = line
    sawBlank = false
  }

  const content = rendered.join(`\n`)
  return hadFinalNewline && content ? `${content}\n` : content
}

function semanticLine(text: string) {
  const trimmed = text.trim()
  return trimmed
    .replace(/^#{1,6}\s+/, ``)
    .replace(/^(?:[-+*•●·]\s+|\d+[.、。．)]\s*)/, ``)
    .replace(/^[>＞]\s*/, ``)
}

export function autoFormatMarkdown(source: string): AutoFormatResult {
  const stats: AutoFormatStats = { headings: 0, listItems: 0, paragraphs: 0 }
  if (!source.trim())
    return { content: source, changed: false, stats, source }

  const lines: LineState[] = source.replace(/\r\n?/g, `\n`).split(`\n`).map(text => ({
    original: text,
    text,
    protected: false,
    type: `blank`,
  }))
  markProtectedLines(lines)
  normalizeLines(lines, stats)
  for (const line of lines)
    line.type = classifyLine(line)

  stats.paragraphs = lines.filter(line => line.type === `paragraph`).length
  const content = renderLines(lines, /(?:\r\n?|\n)$/.test(source))
  return { content, changed: content !== source, stats, source }
}

export function mapAutoFormatOffset(result: AutoFormatResult, offset: number) {
  const sourceOffset = Math.max(0, Math.min(offset, result.source.length))
  if (!result.changed)
    return sourceOffset
  if (sourceOffset === result.source.length)
    return result.content.length

  const lineStart = result.source.lastIndexOf(`\n`, Math.max(0, sourceOffset - 1)) + 1
  const lineEndIndex = result.source.indexOf(`\n`, sourceOffset)
  const lineEnd = lineEndIndex < 0 ? result.source.length : lineEndIndex
  const sourceLine = result.source.slice(lineStart, lineEnd)
  const semantic = semanticLine(sourceLine)
  const semanticStart = sourceLine.indexOf(semantic)
  const semanticColumn = Math.max(0, sourceOffset - lineStart - semanticStart)

  if (semantic) {
    const occurrence = result.source
      .slice(0, lineStart)
      .split(/\r?\n/)
      .filter(line => semanticLine(line) === semantic)
      .length
    let seen = 0
    let outputOffset = 0
    for (const outputLine of result.content.split(`\n`)) {
      const outputSemantic = semanticLine(outputLine)
      if (outputSemantic === semantic) {
        if (seen === occurrence) {
          const outputSemanticStart = outputLine.indexOf(outputSemantic)
          return Math.min(
            outputOffset + outputSemanticStart + semanticColumn,
            outputOffset + outputSemanticStart + outputSemantic.length,
          )
        }
        seen += 1
      }
      outputOffset += outputLine.length + 1
    }
  }

  const ratio = result.source.length ? sourceOffset / result.source.length : 0
  return Math.round(result.content.length * ratio)
}

export function createAutoFormatTransaction(
  source: string,
  result: AutoFormatResult,
  selection: { anchor: number, head?: number },
): TransactionSpec {
  return {
    changes: { from: 0, to: source.length, insert: result.content },
    selection: {
      anchor: mapAutoFormatOffset(result, selection.anchor),
      head: mapAutoFormatOffset(result, selection.head ?? selection.anchor),
    },
  }
}
