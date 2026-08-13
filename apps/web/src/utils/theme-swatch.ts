import type { ThemeName } from '@md/shared/configs'
import { getThemeDefaultPrimaryColor, themeMap } from '@md/shared/configs'

/**
 * 一套主题的缩略配色。
 *
 * 每套主题 CSS 开头都会在 `section, container` 上声明同一组调色板 token，
 * 直接从原始 CSS 里读出来，缩略图就不用另抄一份色值、也不会跟主题走散。
 */
export interface ThemeSwatch {
  paper: string
  ink: string
  body: string
  line: string
  surface: string
  accent: string
  radius: string
}

const fallback = {
  paper: `#ffffff`,
  ink: `#151515`,
  body: `#3d3d3d`,
  line: `#dcdcdc`,
  surface: `#f4f4f4`,
  radius: `2px`,
}

const cache = new Map<ThemeName, ThemeSwatch>()

function readToken(css: string, token: string, defaultValue: string) {
  const matched = css.match(new RegExp(`--${token}\\s*:\\s*([^;]+);`))
  const value = matched?.[1]?.trim()

  // 强调色一类的 token 会指回 --md-primary-color，缩略图外面没有这层变量可解
  if (!value || value.includes(`var(`)) {
    return defaultValue
  }

  return value
}

export function getThemeSwatch(name: ThemeName): ThemeSwatch {
  const cached = cache.get(name)
  if (cached) {
    return cached
  }

  const css = themeMap[name] ?? ``
  const swatch: ThemeSwatch = {
    paper: readToken(css, `theme-paper`, fallback.paper),
    ink: readToken(css, `theme-ink`, fallback.ink),
    body: readToken(css, `theme-body`, fallback.body),
    line: readToken(css, `theme-line`, fallback.line),
    surface: readToken(css, `theme-surface`, fallback.surface),
    accent: getThemeDefaultPrimaryColor(name),
    radius: readToken(css, `sk-radius`, fallback.radius),
  }

  cache.set(name, swatch)
  return swatch
}
