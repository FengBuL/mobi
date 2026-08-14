import type { DecorationSet } from '@codemirror/view'
import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'

export interface EditorHiddenRange {
  from: number
  to: number
  replacement?: string
  preserveParagraphGap?: boolean
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

function readBlockField(root: HTMLElement, field: string) {
  const element = root.querySelector<HTMLElement>(`[data-block-field="${field}"]`)
  return (element?.dataset.blockValue ?? element?.textContent ?? ``).trim()
}

function createBlockTextProjection(raw: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(raw, `text/html`)
  const root = document.body.querySelector<HTMLElement>(`section.md-block`)
  if (root?.dataset.blockCategory !== `heading`) {
    return ``
  }

  const title = readBlockField(root, `title`)
  const subtitle = readBlockField(root, `subtitle`)
  return [title ? `# ${title}` : ``, subtitle].filter(Boolean).join(`\n`)
}

function rootSectionHasClass(raw: string, className: string) {
  const openingTag = raw.slice(0, raw.indexOf(`>`) + 1)
  const classValue = openingTag.match(/\bclass\s*=\s*"([^"]*)"/u)?.[1] ?? ``
  return classValue.split(/\s+/u).includes(className)
}

function expandStandaloneLine(content: string, range: EditorHiddenRange): EditorHiddenRange {
  const lineStart = content.lastIndexOf(`\n`, Math.max(0, range.from - 1)) + 1
  const lineBreak = content.indexOf(`\n`, range.to)
  const lineEnd = lineBreak === -1 ? content.length : lineBreak

  if (content.slice(lineStart, range.from).trim() || content.slice(range.to, lineEnd).trim()) {
    return { ...range }
  }

  // 组件源码可能经历多次插入、移动和删除，边界处会积累空行。装饰范围把这些
  // 空行一起收起，底层 Markdown 仍保持原样，编辑视图不会出现大片空白。
  let from = lineStart
  while (from > 0) {
    const previousLineBreak = from >= 2 ? content.lastIndexOf(`\n`, from - 2) : -1
    const previousLineStart = previousLineBreak + 1
    if (content.slice(previousLineStart, from - 1).trim()) {
      break
    }
    from = previousLineStart
  }

  let to = lineBreak === -1 ? content.length : lineBreak + 1
  while (to < content.length) {
    const nextLineBreak = content.indexOf(`\n`, to)
    const nextLineEnd = nextLineBreak === -1 ? content.length : nextLineBreak
    if (content.slice(to, nextLineEnd).trim()) {
      break
    }
    to = nextLineBreak === -1 ? content.length : nextLineBreak + 1
  }

  return {
    ...range,
    from,
    to,
    preserveParagraphGap: lineStart >= 2
      && content[lineStart - 1] === `\n`
      && content[lineStart - 2] === `\n`,
  }
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
    previous.replacement ||= range.replacement
    previous.preserveParagraphGap ||= range.preserveParagraphGap
  }

  return merged
}

export function findEmbeddedContentRanges(content: string): EditorHiddenRange[] {
  const sectionPattern = /<section(?:\s[^>]*)?>[\s\S]*?<\/section>/gu
  const markdownImagePattern = /!\[[^\]\n]*\]\([^\n)]*\)/gu
  const htmlImagePattern = /<img\b[^>]*>/giu
  const codeRanges = findMarkdownCodeRanges(content)

  const blockRanges = collectMatches(content, sectionPattern)
    .filter((range) => {
      const raw = content.slice(range.from, range.to)
      return rootSectionHasClass(raw, `md-block`) || rootSectionHasClass(raw, `md-media-block`)
    })
    .map(range => ({
      ...range,
      replacement: createBlockTextProjection(content.slice(range.from, range.to)) || undefined,
    }))
  const rawRanges = [
    ...blockRanges,
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
    const before = visible.slice(0, range.from)
    const after = visible.slice(range.to)
    const separator = range.replacement
      ? (after ? `\n\n` : ``)
      : (range.preserveParagraphGap && before && after ? `\n` : ``)
    visible = `${before}${range.replacement ?? ``}${separator}${after}`
  }
  return visible
}

class EmbeddedContentProjectionWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly sourceFrom: number,
    private readonly sourceTo: number,
    private readonly flashing: boolean,
  ) {
    super()
  }

  eq(other: EmbeddedContentProjectionWidget) {
    return other.text === this.text
      && other.sourceFrom === this.sourceFrom
      && other.sourceTo === this.sourceTo
      && other.flashing === this.flashing
  }

  ignoreEvent() {
    return false
  }

  toDOM() {
    const wrapper = document.createElement(`div`)
    wrapper.className = this.flashing
      ? `cm-embedded-content-projection cm-projection-source-sync-flash`
      : `cm-embedded-content-projection`
    wrapper.setAttribute(`aria-label`, `组件正文：${this.text.replace(/\n/g, `，`)}`)
    wrapper.dataset.sourceFrom = String(this.sourceFrom)
    wrapper.dataset.sourceTo = String(this.sourceTo)

    const [title, ...details] = this.text.split(`\n`)
    const heading = document.createElement(`div`)
    heading.className = `cm-embedded-content-projection__heading`
    heading.textContent = title
    wrapper.appendChild(heading)

    if (details.length) {
      const description = document.createElement(`div`)
      description.className = `cm-embedded-content-projection__description`
      description.textContent = details.join(`\n`)
      wrapper.appendChild(description)
    }
    return wrapper
  }
}

function buildDecorations(
  content: string,
  flashRange: { from: number, to: number } | null = null,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const range of findEmbeddedContentRanges(content)) {
    const widget = range.replacement
      ? new EmbeddedContentProjectionWidget(
          range.replacement,
          range.from,
          range.to,
          Boolean(flashRange && range.from <= flashRange.to && range.to >= flashRange.from),
        )
      : undefined
    builder.add(
      range.from,
      range.to,
      Decoration.replace({
        block: content.slice(range.from, range.to).includes(`\n`),
        widget,
      }),
    )
  }
  return builder.finish()
}

export const embeddedProjectionFlashEffect = StateEffect.define<{ from: number, to: number } | null>()

interface EmbeddedContentVisibilityState {
  decorations: DecorationSet
  flashRange: { from: number, to: number } | null
}

export const embeddedContentVisibility = StateField.define<EmbeddedContentVisibilityState>({
  create(state) {
    return {
      decorations: buildDecorations(state.doc.toString()),
      flashRange: null,
    }
  },
  update(value, transaction) {
    let flashRange = transaction.docChanged ? null : value.flashRange
    let flashChanged = transaction.docChanged
    for (const effect of transaction.effects) {
      if (effect.is(embeddedProjectionFlashEffect)) {
        flashRange = effect.value
        flashChanged = true
      }
    }
    return flashChanged
      ? {
          decorations: buildDecorations(transaction.newDoc.toString(), flashRange),
          flashRange,
        }
      : value
  },
  provide: field => EditorView.decorations.from(field, value => value.decorations),
})

export const embeddedContentProjectionTheme = EditorView.baseTheme({
  '.cm-embedded-content-projection': {
    padding: '0.2rem 1.25rem 0.85rem 0.85rem',
    whiteSpace: 'pre-wrap',
  },
  '.cm-embedded-content-projection__heading': {
    color: 'hsl(var(--primary))',
    fontSize: '1.05rem',
    fontWeight: '700',
    lineHeight: '1.7',
  },
  '.cm-embedded-content-projection__description': {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.9rem',
    lineHeight: '1.7',
  },
})
