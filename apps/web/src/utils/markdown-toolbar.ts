export type MarkdownToolbarCommand
  = | `bold`
    | `italic`
    | `strike`
    | `code`
    | `link`
    | `heading-1`
    | `heading-2`
    | `heading-3`
    | `quote`
    | `unordered-list`
    | `ordered-list`

export interface MarkdownSelection {
  from: number
  to: number
}

export interface MarkdownCommandResult extends MarkdownSelection {
  insert: string
  selection: { anchor: number, head: number }
}

const inlineCommands = {
  bold: { prefix: `**`, suffix: `**`, placeholder: `加粗文字` },
  italic: { prefix: `*`, suffix: `*`, placeholder: `斜体文字` },
  strike: { prefix: `~~`, suffix: `~~`, placeholder: `删除文字` },
  code: { prefix: `\``, suffix: `\``, placeholder: `代码` },
} as const

function applyInlineCommand(
  content: string,
  selection: MarkdownSelection,
  command: keyof typeof inlineCommands,
): MarkdownCommandResult {
  const config = inlineCommands[command]
  const selected = content.slice(selection.from, selection.to)
  const wrappedSelection = selected.startsWith(config.prefix)
    && selected.endsWith(config.suffix)
    && selected.length >= config.prefix.length + config.suffix.length

  if (wrappedSelection) {
    const inner = selected.slice(config.prefix.length, -config.suffix.length)
    return {
      from: selection.from,
      to: selection.to,
      insert: inner,
      selection: { anchor: selection.from, head: selection.from + inner.length },
    }
  }

  const outerFrom = selection.from - config.prefix.length
  const outerTo = selection.to + config.suffix.length
  const hasSurroundingMarkers = outerFrom >= 0
    && content.slice(outerFrom, selection.from) === config.prefix
    && content.slice(selection.to, outerTo) === config.suffix
    && (command !== `italic` || (content[outerFrom - 1] !== `*` && content[outerTo] !== `*`))

  if (hasSurroundingMarkers) {
    return {
      from: outerFrom,
      to: outerTo,
      insert: selected,
      selection: { anchor: outerFrom, head: outerFrom + selected.length },
    }
  }

  const value = selected || config.placeholder
  return {
    from: selection.from,
    to: selection.to,
    insert: `${config.prefix}${value}${config.suffix}`,
    selection: {
      anchor: selection.from + config.prefix.length,
      head: selection.from + config.prefix.length + value.length,
    },
  }
}

function lineCommandPattern(command: Exclude<MarkdownToolbarCommand, keyof typeof inlineCommands | `link`>) {
  if (command.startsWith(`heading-`)) {
    const level = Number(command.slice(-1))
    return new RegExp(`^#{${level}}\\s+`, `u`)
  }
  if (command === `quote`) {
    return /^>\s?/u
  }
  if (command === `unordered-list`) {
    return /^[-+*]\s+/u
  }
  return /^\d+[.)]\s+/u
}

function stripLineCommand(
  line: string,
  command: Exclude<MarkdownToolbarCommand, keyof typeof inlineCommands | `link`>,
) {
  if (command.startsWith(`heading-`)) {
    return line.replace(/^#{1,6}\s+/u, ``)
  }
  if (command === `quote`) {
    return line.replace(/^>\s?/u, ``)
  }
  if (command === `unordered-list` || command === `ordered-list`) {
    return line.replace(/^(?:[-+*]|\d+[.)])\s+/u, ``)
  }
  return line
}

function applyLineCommand(
  content: string,
  selection: MarkdownSelection,
  command: Exclude<MarkdownToolbarCommand, keyof typeof inlineCommands | `link`>,
): MarkdownCommandResult {
  const lineStart = content.lastIndexOf(`\n`, Math.max(0, selection.from - 1)) + 1
  const nextBreak = content.indexOf(`\n`, selection.to)
  const lineEnd = nextBreak === -1 ? content.length : nextBreak
  const lines = content.slice(lineStart, lineEnd).split(`\n`)
  const activePattern = lineCommandPattern(command)
  const shouldRemove = lines.every(line => activePattern.test(line))

  const insert = lines.map((line, index) => {
    const plainLine = stripLineCommand(line, command)
    if (shouldRemove) {
      return plainLine
    }
    if (command.startsWith(`heading-`)) {
      const level = Number(command.slice(-1))
      return `${`#`.repeat(level)} ${plainLine}`
    }
    if (command === `quote`) {
      return `> ${plainLine}`
    }
    if (command === `unordered-list`) {
      return `- ${plainLine}`
    }
    return `${index + 1}. ${plainLine}`
  }).join(`\n`)

  return {
    from: lineStart,
    to: lineEnd,
    insert,
    selection: { anchor: lineStart, head: lineStart + insert.length },
  }
}

export function applyMarkdownCommand(
  content: string,
  selection: MarkdownSelection,
  command: MarkdownToolbarCommand,
): MarkdownCommandResult {
  if (command === `bold` || command === `italic` || command === `strike` || command === `code`) {
    return applyInlineCommand(content, selection, command)
  }

  if (command === `link`) {
    for (const match of content.matchAll(/\[([^\]\n]+)\]\(([^)\n]*)\)/gu)) {
      const from = match.index ?? 0
      const to = from + match[0].length
      if (selection.from >= from && selection.to <= to) {
        const label = match[1]
        return {
          from,
          to,
          insert: label,
          selection: { anchor: from, head: from + label.length },
        }
      }
    }

    const selected = content.slice(selection.from, selection.to) || `链接文字`
    const prefix = `[${selected}](`
    const url = `https://`
    return {
      from: selection.from,
      to: selection.to,
      insert: `${prefix}${url})`,
      selection: content.slice(selection.from, selection.to)
        ? { anchor: selection.from + prefix.length, head: selection.from + prefix.length + url.length }
        : { anchor: selection.from + 1, head: selection.from + 1 + selected.length },
    }
  }

  return applyLineCommand(content, selection, command)
}
