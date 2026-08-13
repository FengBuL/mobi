/**
 * token 的校验、统计与差异描述
 * 导入外部文件时必须先过一遍 sanitize，避免把任意字符串拼进注入的 CSS 里
 */

import type { ThemeField, ThemeTokenDiffItem, ThemeTokenGroupValues, ThemeTokens, ThemeTokenValue } from './types'
import { PRIMARY_COLOR_TOKEN, themeDesignerGroupMap, themeDesignerGroups } from './schema'

const SAFE_COLOR_PATTERN = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/a-z]+\)|transparent|inherit|currentcolor)$/i

export function isSafeColorValue(value: unknown): value is string {
  if (typeof value !== `string`)
    return false

  const raw = value.trim()
  if (!raw)
    return false

  if (raw === PRIMARY_COLOR_TOKEN)
    return true

  return SAFE_COLOR_PATTERN.test(raw)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function sanitizeFieldValue(field: ThemeField, value: unknown): ThemeTokenValue | null {
  switch (field.type) {
    case `color`:
      return isSafeColorValue(value) ? value.trim() : null

    case `number`: {
      const parsed = Number(value)
      if (!Number.isFinite(parsed))
        return null

      const min = field.min ?? Number.NEGATIVE_INFINITY
      const max = field.max ?? Number.POSITIVE_INFINITY
      return clamp(parsed, min, max)
    }

    case `select`: {
      const raw = String(value)
      return field.options?.some(option => option.value === raw) ? raw : null
    }

    case `switch`:
      return typeof value === `boolean` ? value : null

    default:
      return null
  }
}

export function sanitizeThemeTokens(raw: unknown): ThemeTokens {
  if (!raw || typeof raw !== `object`)
    return {}

  const source = raw as Record<string, unknown>
  const result: ThemeTokens = {}

  for (const group of themeDesignerGroups) {
    const groupValues = source[group.id]
    if (!groupValues || typeof groupValues !== `object`)
      continue

    const entries = groupValues as Record<string, unknown>
    const next: ThemeTokenGroupValues = {}

    for (const field of group.fields) {
      if (!(field.key in entries))
        continue

      const value = sanitizeFieldValue(field, entries[field.key])
      if (value !== null) {
        next[field.key] = value
      }
    }

    if (Object.keys(next).length) {
      result[group.id] = next
    }
  }

  return result
}

export function countThemeTokens(tokens: ThemeTokens): number {
  return Object.values(tokens).reduce((total, group) => total + Object.keys(group || {}).length, 0)
}

export function countGroupTokens(tokens: ThemeTokens, groupId: string): number {
  return Object.keys(tokens[groupId] || {}).length
}

export function cloneThemeTokens(tokens: ThemeTokens): ThemeTokens {
  const result: ThemeTokens = {}
  for (const [groupId, values] of Object.entries(tokens)) {
    result[groupId] = { ...values }
  }
  return result
}

export function formatTokenValue(field: ThemeField, value: ThemeTokenValue): string {
  switch (field.type) {
    case `color`:
      return value === PRIMARY_COLOR_TOKEN ? `跟随主题色` : String(value)

    case `number`:
      return `${value}${field.suffix || ``}`

    case `select`:
      return field.options?.find(option => option.value === String(value))?.label || String(value)

    case `switch`:
      return value ? `开启` : `关闭`

    default:
      return String(value)
  }
}

export function collectThemeTokenDiff(tokens: ThemeTokens): ThemeTokenDiffItem[] {
  const items: ThemeTokenDiffItem[] = []

  for (const group of themeDesignerGroups) {
    const values = tokens[group.id]
    if (!values)
      continue

    for (const field of group.fields) {
      if (!(field.key in values))
        continue

      items.push({
        groupId: group.id,
        groupLabel: group.label,
        fieldKey: field.key,
        fieldLabel: field.label,
        value: values[field.key],
        display: formatTokenValue(field, values[field.key]),
      })
    }
  }

  return items
}

/**
 * 收集当前配置里所有会被微信剥离或降级的选项
 */
export function collectWechatRisks(tokens: ThemeTokens): string[] {
  const risks = new Set<string>()

  for (const group of themeDesignerGroups) {
    const values = tokens[group.id]
    if (!values)
      continue

    for (const field of group.fields) {
      if (!(field.key in values))
        continue

      if (field.wechatHint) {
        risks.add(`${group.label} · ${field.label}：${field.wechatHint}`)
      }

      const option = field.options?.find(item => item.value === String(values[field.key]))
      if (option?.wechatHint) {
        risks.add(`${group.label} · ${field.label}：${option.wechatHint}`)
      }
    }
  }

  return [...risks]
}

export function getGroupLabel(groupId: string): string {
  return themeDesignerGroupMap[groupId]?.label || groupId
}
