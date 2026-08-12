/**
 * 主色联动换肤
 * 所有派生色都在 JS 里算成实色，不用 color-mix，粘贴到公众号后仍然有效
 */

import type { ThemeTokens } from './types'
import { cloneThemeTokens } from './tokens'

interface Rgb {
  r: number
  g: number
  b: number
}

function parseColor(input: string): Rgb | null {
  const raw = input.trim()

  const hexMatch = raw.match(/^#([0-9a-f]{3,8})$/i)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split(``).map(char => char + char).join(``)
    }
    if (hex.length !== 6 && hex.length !== 8)
      return null

    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    }
  }

  const rgbMatch = raw.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    if (parts.length < 3 || parts.slice(0, 3).some(item => !Number.isFinite(item)))
      return null

    return { r: parts[0], g: parts[1], b: parts[2] }
  }

  return null
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) => Math.round(Math.min(Math.max(value, 0), 255)).toString(16).padStart(2, `0`)
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/**
 * 把颜色和目标色按比例混合，ratio 为目标色占比
 */
export function mixColor(source: string, target: string, ratio: number): string {
  const from = parseColor(source)
  const to = parseColor(target)
  if (!from || !to)
    return source

  const weight = Math.min(Math.max(ratio, 0), 1)
  return toHex({
    r: from.r + (to.r - from.r) * weight,
    g: from.g + (to.g - from.g) * weight,
    b: from.b + (to.b - from.b) * weight,
  })
}

export function lighten(color: string, ratio: number): string {
  return mixColor(color, `#ffffff`, ratio)
}

export function darken(color: string, ratio: number): string {
  return mixColor(color, `#111111`, ratio)
}

/**
 * 根据背景色挑一个可读的前景色
 */
export function readableInk(background: string): string {
  const rgb = parseColor(background)
  if (!rgb)
    return `#ffffff`

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.62 ? `#1f2430` : `#ffffff`
}

export interface PaletteScope {
  heading: boolean
  blockquote: boolean
  table: boolean
  link: boolean
  code: boolean
  divider: boolean
}

export const defaultPaletteScope: PaletteScope = {
  heading: true,
  blockquote: true,
  table: true,
  link: true,
  code: true,
  divider: true,
}

/**
 * 用一个主色推导出成套的配色 token
 */
export function derivePaletteTokens(tokens: ThemeTokens, color: string, scope: PaletteScope = defaultPaletteScope): ThemeTokens {
  const next = cloneThemeTokens(tokens)
  const set = (groupId: string, key: string, value: string) => {
    next[groupId] = { ...next[groupId], [key]: value }
  }

  if (scope.heading) {
    for (const level of [`h1`, `h2`, `h3`]) {
      set(level, `decorationColor`, color)
    }
    set(`h2`, `color`, darken(color, 0.32))
    set(`h3`, `color`, darken(color, 0.24))
  }

  if (scope.blockquote) {
    set(`blockquote`, `background`, lighten(color, 0.93))
    set(`blockquote`, `borderLeftColor`, color)
    set(`blockquote`, `textColor`, darken(color, 0.55))
  }

  if (scope.table) {
    set(`table`, `headerBackground`, color)
    set(`table`, `headerColor`, readableInk(color))
    set(`table`, `borderColor`, lighten(color, 0.78))
    set(`table`, `zebraColor`, lighten(color, 0.95))
  }

  if (scope.link) {
    set(`link`, `color`, darken(color, 0.1))
    set(`link`, `underlineColor`, lighten(color, 0.45))
  }

  if (scope.code) {
    set(`inlineCode`, `background`, lighten(color, 0.9))
    set(`inlineCode`, `textColor`, darken(color, 0.5))
  }

  if (scope.divider) {
    set(`divider`, `color`, lighten(color, 0.25))
  }

  return next
}
