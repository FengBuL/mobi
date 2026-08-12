/**
 * 把可视化 token 编译成主题覆盖层 CSS
 *
 * 输出不含注释和 @ 规则：applyTheme 里的作用域包装器是按 `选择器 { 声明 }` 做正则切分的，
 * 注释和嵌套规则会被当成选择器的一部分。
 */

import type { ThemeCssRule, ThemeFieldContext, ThemeTokens } from './types'
import { cssColor, HEADING_LEVELS, themeDesignerGroups } from './schema'

function mergeRules(rules: ThemeCssRule[]): Map<string, string[]> {
  const merged = new Map<string, string[]>()

  for (const item of rules) {
    if (!item.selector || !item.declarations.length)
      continue

    const list = merged.get(item.selector) || []
    for (const declaration of item.declarations) {
      const existing = list.indexOf(declaration)
      if (existing >= 0) {
        list.splice(existing, 1)
      }
      list.push(declaration)
    }
    merged.set(item.selector, list)
  }

  return merged
}

function renderRules(rules: ThemeCssRule[]): string {
  const merged = mergeRules(rules)
  const blocks: string[] = []

  merged.forEach((declarations, selector) => {
    blocks.push(`${selector} {\n${declarations.map(item => `  ${item}`).join(`\n`)}\n}`)
  })

  return blocks.join(`\n\n`)
}

function buildHeadingCounterRules(tokens: ThemeTokens): ThemeCssRule[] {
  const counters = HEADING_LEVELS
    .filter(level => tokens[level]?.decoration === `number`)
    .map(level => `md-${level}`)

  if (!counters.length)
    return []

  return [{ selector: `section`, declarations: [`counter-reset: ${counters.join(` `)};`] }]
}

function collectGroupRules(tokens: ThemeTokens, groupIds?: string[]): ThemeCssRule[] {
  const rules: ThemeCssRule[] = []
  const targets = groupIds
    ? themeDesignerGroups.filter(group => groupIds.includes(group.id))
    : themeDesignerGroups

  for (const group of targets) {
    const values = tokens[group.id]
    if (!values || !Object.keys(values).length)
      continue

    const ctx: ThemeFieldContext = {
      selector: group.selector,
      color: cssColor,
      get: (key) => {
        if (key in values)
          return values[key]

        return group.fields.find(field => field.key === key)?.defaultValue ?? ``
      },
    }

    for (const field of group.fields) {
      if (!(field.key in values))
        continue

      rules.push(...field.emit(values[field.key], ctx))
    }
  }

  return rules
}

/**
 * 生成注入到预览区的覆盖层 CSS（不带 #output 前缀，由 applyTheme 统一加作用域）
 */
export function generateThemeOverrideCSS(tokens: ThemeTokens): string {
  return renderRules([...collectGroupRules(tokens), ...buildHeadingCounterRules(tokens)])
}

/**
 * 生成带注释的可读版本，用于导出成 CSS 文件
 */
export function generateThemeOverrideCSSWithComments(tokens: ThemeTokens): string {
  const blocks: string[] = []

  for (const group of themeDesignerGroups) {
    const values = tokens[group.id]
    if (!values || !Object.keys(values).length)
      continue

    const css = renderRules(collectGroupRules(tokens, [group.id]))
    if (!css)
      continue

    blocks.push(`/* ${group.label} */\n${css}`)
  }

  const counterCSS = renderRules(buildHeadingCounterRules(tokens))
  if (counterCSS) {
    blocks.push(`/* 标题序号计数器 */\n${counterCSS}`)
  }

  return blocks.join(`\n\n`)
}
