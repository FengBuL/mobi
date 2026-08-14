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
  const selected = content.slice(selection.from, selection.to) || config.placeholder
  return {
    from: selection.from,
    to: selection.to,
    insert: `${config.prefix}${selected}${config.suffix}`,
    selection: {
      anchor: selection.from + config.prefix.length,
      head: selection.from + config.prefix.length + selected.length,
    },
  }
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

  const insert = lines.map((line, index) => {
    if (command.startsWith(`heading-`)) {
      const level = Number(command.slice(-1))
      return `${`#`.repeat(level)} ${line.replace(/^#{1,6}\s+/u, ``)}`
    }
    if (command === `quote`) {
      return `> ${line.replace(/^>\s?/u, ``)}`
    }
    if (command === `unordered-list`) {
      return `- ${line.replace(/^[-+*]\s+/u, ``)}`
    }
    return `${index + 1}. ${line.replace(/^\d+[.)]\s+/u, ``)}`
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
