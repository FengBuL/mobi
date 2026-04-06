import type { IConfigOption } from '../types'
import { themeMap, type ThemeName } from './theme-css'

// 导出 CSS 主题（新主题系统）
export { baseCSSContent, themeMap, type ThemeName } from './theme-css'

export interface IThemeCategory {
  category: string
  themes: IConfigOption<ThemeName>[]
}

export const themeCategoryOptions: IThemeCategory[] = [
  {
    category: `编辑`,
    themes: [
      { label: `编辑黑白`, value: `default`, desc: `高对比杂志感，适合观点与专栏` },
      { label: `奢刊衬线`, value: `magazine`, desc: `高端时尚感，适合人物稿与品牌稿` },
    ],
  },
  {
    category: `专业`,
    themes: [
      { label: `执行简报`, value: `business`, desc: `结构清楚，适合方案和周报` },
      { label: `数据屏报`, value: `finance`, desc: `信息密度高，适合分析与图表` },
    ],
  },
  {
    category: `科技`,
    themes: [
      { label: `深夜终端`, value: `tech`, desc: `冷静暗色，适合产品与开发内容` },
      { label: `霓虹粗野`, value: `cyber`, desc: `冲突感强，适合趋势与表达型内容` },
    ],
  },
  {
    category: `氛围`,
    themes: [
      { label: `极光渐层`, value: `aurora`, desc: `柔和发光，适合 AI 与创意内容` },
      { label: `琥珀手册`, value: `legal`, desc: `暖色精致，适合品牌与商业故事` },
    ],
  },
  {
    category: `克制`,
    themes: [
      { label: `留白日记`, value: `minimalist`, desc: `呼吸感强，适合散文和品牌内容` },
      { label: `研究论文`, value: `academic`, desc: `严谨正式，适合方法论与深度稿` },
    ],
  },
]

export const themeOptions: IConfigOption<ThemeName>[] = themeCategoryOptions.flatMap(c => c.themes)

export const themeOptionsMap = Object.fromEntries(
  themeOptions.map(option => [option.value, option]),
) as Record<ThemeName, IConfigOption<ThemeName>>

export const legacyThemeAliasMap = {
  'classic-blue': `business`,
  'classic-dark': `tech`,
  'classic-green': `minimalist`,
  'classic-purple': `aurora`,
  'classic-red': `magazine`,
  'report': `finance`,
  'medical': `academic`,
  'grace': `magazine`,
  'simple': `minimalist`,
  'cartoon': `aurora`,
  'retro': `legal`,
  'warm': `legal`,
  'summer': `aurora`,
  'autumn': `legal`,
} as const satisfies Record<string, ThemeName>

export function isThemeName(value: string): value is ThemeName {
  return value in themeMap
}

export function resolveThemeName(value?: string | null): ThemeName {
  if (value && isThemeName(value)) {
    return value
  }

  if (value) {
    const alias = legacyThemeAliasMap[value as keyof typeof legacyThemeAliasMap]
    if (alias) {
      return alias
    }
  }

  return `default`
}
