/**
 * 自定义主题的导入导出
 */

import type { CustomTheme, CustomThemeFilePayload, ThemeTokens } from './types'
import { downloadFile } from '@mobi/shared/utils'
import { generateThemeOverrideCSSWithComments } from './cssGenerator'
import { sanitizeThemeTokens } from './tokens'

export const CUSTOM_THEME_FILE_FORMAT = `md-visual-theme`

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, `_`).trim() || `custom-theme`
}

export function buildCustomThemePayload(theme: CustomTheme): CustomThemeFilePayload {
  return {
    format: CUSTOM_THEME_FILE_FORMAT,
    version: 1,
    name: theme.name,
    baseTheme: theme.baseTheme,
    tokens: theme.tokens,
    exportedAt: new Date().toISOString(),
  }
}

export function exportCustomThemeAsJSON(theme: CustomTheme) {
  const payload = buildCustomThemePayload(theme)
  downloadFile(JSON.stringify(payload, null, 2), `${safeFileName(theme.name)}.json`, `application/json`)
}

/**
 * 导出成可直接使用的 CSS：基础主题在前，可视化覆盖层在后
 */
export function buildCustomThemeCSS(theme: CustomTheme, baseThemeCSS: string, baseThemeLabel: string): string {
  const overrides = generateThemeOverrideCSSWithComments(theme.tokens)

  return [
    `/**`,
    ` * ${theme.name}`,
    ` * 基于内置主题：${baseThemeLabel}`,
    ` * 由主题可视化编辑器导出于 ${new Date().toLocaleString()}`,
    ` */`,
    ``,
    `/* ===== 基础主题 ===== */`,
    baseThemeCSS.trim(),
    ``,
    `/* ===== 可视化调整 ===== */`,
    overrides || `/* 没有做任何可视化调整 */`,
    ``,
  ].join(`\n`)
}

export function exportCustomThemeAsCSS(theme: CustomTheme, baseThemeCSS: string, baseThemeLabel: string) {
  const css = buildCustomThemeCSS(theme, baseThemeCSS, baseThemeLabel)
  downloadFile(css, `${safeFileName(theme.name)}.css`, `text/css`)
  return css
}

export interface ParsedThemeFile {
  name: string
  baseTheme: string
  tokens: ThemeTokens
}

export function parseCustomThemeFile(text: string): ParsedThemeFile | null {
  let raw: unknown

  try {
    raw = JSON.parse(text)
  }
  catch {
    return null
  }

  if (!raw || typeof raw !== `object`)
    return null

  const payload = raw as Partial<CustomThemeFilePayload>
  const tokens = sanitizeThemeTokens(payload.tokens)

  if (!Object.keys(tokens).length && payload.format !== CUSTOM_THEME_FILE_FORMAT)
    return null

  return {
    name: typeof payload.name === `string` && payload.name.trim() ? payload.name.trim() : `导入的主题`,
    baseTheme: typeof payload.baseTheme === `string` ? payload.baseTheme : ``,
    tokens,
  }
}
