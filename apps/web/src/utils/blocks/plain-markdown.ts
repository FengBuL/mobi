import type { BlockState } from './types'

function text(state: BlockState, key: string) {
  return String(state[key] ?? ``).trim()
}

function headingMarkdown(state: BlockState) {
  const title = text(state, `title`) || `未命名`
  const number = text(state, `number`)
  const subtitle = text(state, `subtitle`)
  const heading = number ? `## ${number} ${title}` : `## ${title}`
  return subtitle ? `${heading}\n\n${subtitle}` : heading
}

function quoteMarkdown(state: BlockState) {
  const quote = text(state, `quote`) || text(state, `answer`) || text(state, `note`)
  const lines = (quote || ` `).split(`\n`).map(line => `> ${line}`)
  const credit = [text(state, `author`), text(state, `source`)].filter(Boolean).join(`，`)
  if (credit) {
    lines.push(`>`, `> — ${credit}`)
  }
  return lines.join(`\n`)
}

function listMarkdown(state: BlockState) {
  const items = Array.from({ length: 6 }, (_, index) => {
    const number = index + 1
    const item = text(state, `item${number}`)
    if (!item) {
      return ``
    }
    const desc = text(state, `item${number}Desc`)
    return desc ? `${number}. ${item}：${desc}` : `${number}. ${item}`
  }).filter(Boolean)

  return items.join(`\n`) || `1. `
}

export function blockStateToPlainMarkdown(category: string, state: BlockState) {
  if (category === `heading`) {
    return headingMarkdown(state)
  }
  if (category === `quote`) {
    return quoteMarkdown(state)
  }
  if (category === `list`) {
    return listMarkdown(state)
  }
  if (category === `divider`) {
    return `---`
  }

  const title = text(state, `title`) || text(state, `name`)
  const body = text(state, `body`) || text(state, `text`) || text(state, `subtitle`) || text(state, `description`)
  return [title && `## ${title}`, body].filter(Boolean).join(`\n\n`)
}
