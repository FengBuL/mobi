import type {
  BlockCategoryDefinition,
  BlockPreset,
  BlockState,
  ParsedBlock,
} from './types'

const categoryModules = import.meta.glob<{ default: BlockCategoryDefinition }>(
  `./categories/*.ts`,
  { eager: true },
)

export const blockCategories = Object.values(categoryModules)
  .map(module => module.default)
  .sort((left, right) => left.id.localeCompare(right.id))

const categoryMap = new Map<string, BlockCategoryDefinition>(blockCategories.map(category => [category.id, category]))
const presetMap = new Map<string, BlockPreset>(
  blockCategories.flatMap(category => category.presets.map(preset => [preset.id, preset] as const)),
)

export function getBlockCategory(categoryId: string) {
  return categoryMap.get(categoryId)
}

export function getBlockPreset(presetId: string) {
  return presetMap.get(presetId)
}

export function buildBlockMarkup(preset: BlockPreset, state: BlockState, preview = false) {
  const category = getBlockCategory(preset.category)
  return category?.build(preset, state, { mode: preview ? `preview` : `editor` }) ?? ``
}

export function parseBlockMarkup(raw: string) {
  const categoryId = raw.match(/\bdata-block-category="([^"]+)"/u)?.[1] ?? ``
  return getBlockCategory(categoryId)?.parse(raw) ?? null
}

export function parseBlockEntries(content: string): ParsedBlock[] {
  const entries: ParsedBlock[] = []
  const pattern = /<section class="md-block\b[\s\S]*?<\/section>/gu
  for (const match of content.matchAll(pattern)) {
    const parsed = parseBlockMarkup(match[0])
    if (!parsed) {
      continue
    }
    const from = match.index ?? 0
    entries.push({
      ...parsed,
      raw: match[0],
      from,
      to: from + match[0].length,
    })
  }
  return entries
}

export function convertBlocksForWeChat(root: HTMLElement) {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(`section.md-block`))
  blocks.forEach((element) => {
    const parsed = parseBlockMarkup(element.outerHTML)
    if (!parsed) {
      return
    }
    const category = getBlockCategory(parsed.category)
    const preset = getBlockPreset(parsed.presetId)
    if (!category || !preset) {
      return
    }
    const markup = category.toWeChat(preset, parsed.state)
    if (!markup) {
      return
    }
    const holder = document.createElement(`div`)
    holder.innerHTML = markup
    element.replaceWith(...Array.from(holder.childNodes))
  })
}
