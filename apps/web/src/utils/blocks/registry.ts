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

/**
 * 公众号编辑器会把 `div` 拆掉，挂在上面的底色、边框、内边距跟着一起没，
 * 粘过去就只剩纯文字。150 篇真实文章正文里带样式的 `div` 只有 1 处（还是微信自己的
 * 外层容器），而 `section` 有 8791 处，`p` 和 `span` 也几乎篇篇都在。
 *
 * 编辑态仍然用 `div`：正文扫描器以根 `</section>` 为边界，嵌套 section 会让板块提前截断。
 * 所以只在导出这一步换标签，换完的产物不会再回到扫描器。
 */
function promoteDivsToSections(root: HTMLElement) {
  Array.from(root.querySelectorAll(`div`)).forEach((element) => {
    const section = document.createElement(`section`)
    Array.from(element.attributes).forEach((attribute) => {
      section.setAttribute(attribute.name, attribute.value)
    })
    while (element.firstChild) {
      section.appendChild(element.firstChild)
    }
    element.replaceWith(section)
  })
}

/** 读者在手机上的正文宽度，固定宽换算成百分比时的基准 */
const READER_WIDTH = 375

function readStylePx(style: string, property: string) {
  const matched = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([\\d.]+)px`))
  return matched ? Number(matched[1]) : 0
}

/**
 * 给 `flex:1` 的那一列补上宽度兜底。
 *
 * 编辑态用「固定宽标记 + flex:1 文字列」排一行，公众号一旦剥掉 flex，没有宽度的
 * 那一列就会掉到下一行——序号圆点跑到文字上方就是这么来的。这里保持父级的
 * `display:flex`，同时给弹性列写死百分比宽和秀米那条 `max-width !important`：
 * 留着 flex 走弹性盒，剥掉 flex 退回 inline-block 百分比，两条路都在一行。
 *
 * 固定宽的标记本身不动——它的 `width` 往往和 `height`、`border-radius:999px` 绑在
 * 一起，改成百分比圆点会被拉成椭圆。
 */
function hardenFlexRows(root: HTMLElement) {
  Array.from(root.querySelectorAll<HTMLElement>(`[style*="display:flex"]`)).forEach((row) => {
    const children = Array.from(row.children) as HTMLElement[]
    if (children.length < 2) {
      return
    }

    const styles = children.map(child => child.getAttribute(`style`) || ``)
    const isFlexible = styles.map(style => /flex\s*:\s*1\b/.test(style))
    const flexibleCount = isFlexible.filter(Boolean).length
    if (!flexibleCount) {
      return
    }

    const occupied = styles.reduce((total, style, index) => {
      const gutter = readStylePx(style, `margin-left`) + readStylePx(style, `margin-right`)
      return total + gutter + (isFlexible[index] ? 0 : readStylePx(style, `width`))
    }, 0)

    // 留 4% 余量，吸收边框、box-sizing 被剥掉后的外扩和行内空白
    const available = Math.max(20, 100 - (occupied / READER_WIDTH) * 100 - 4)
    const percent = Number((available / flexibleCount).toFixed(4))

    children.forEach((child, index) => {
      if (!isFlexible[index]) {
        child.setAttribute(`style`, `${styles[index].replace(/;?\s*$/, `;`)}vertical-align:top;`)
        return
      }

      const base = styles[index].replace(/(?:^|;)\s*(?:display|flex)\s*:[^;]*/g, ``).replace(/^;+|;?\s*$/g, ``)
      child.setAttribute(
        `style`,
        `${base ? `${base};` : ``}display:inline-block;vertical-align:top;width:${percent}%;max-width:${percent}% !important;flex:0 0 ${percent}%;`,
      )
    })
  })
}

/** 回填用的字段标记只服务编辑器，没必要跟着文章发出去 */
function stripEditorMetadata(root: HTMLElement) {
  Array.from(root.querySelectorAll(`[data-block-field]`)).forEach((element) => {
    element.removeAttribute(`data-block-field`)
    element.removeAttribute(`data-block-value`)
  })
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
    // 顺序要紧：先按原始结构算列宽，再把 div 换成 section
    hardenFlexRows(holder)
    promoteDivsToSections(holder)
    stripEditorMetadata(holder)
    element.replaceWith(...Array.from(holder.childNodes))
  })
}
