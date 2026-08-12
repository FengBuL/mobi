import type { IConfigOption } from '../types'
import { themeMap, type ThemeName } from './theme-css'

// 导出 CSS 主题（新主题系统）
export { baseCSSContent, skeletonCSSContent, themeMap, type ThemeName } from './theme-css'

/**
 * 主题选项。
 * `defaultPrimaryColor` 是这套主题的出厂强调色：切换主题时会带过去，
 * 用户手动调过色之后就不再跟随（由 useThemeStore 判定）。
 */
export interface IThemeOption extends IConfigOption<ThemeName> {
  defaultPrimaryColor: string
}

export interface IThemeCategory {
  category: string
  themes: IThemeOption[]
}

export const themeCategoryOptions: IThemeCategory[] = [
  {
    category: `编辑`,
    themes: [
      { label: `编辑黑白`, value: `default`, desc: `高对比杂志感，适合观点与专栏`, defaultPrimaryColor: `#151515` },
      { label: `奢刊衬线`, value: `magazine`, desc: `高端时尚感，适合人物稿与品牌稿`, defaultPrimaryColor: `#a08652` },
      { label: `复古铅印`, value: `press`, desc: `双线活字味，适合书评与文化随笔`, defaultPrimaryColor: `#9c4a2f` },
    ],
  },
  {
    category: `专业`,
    themes: [
      { label: `行业洞察`, value: `insight`, desc: `靛蓝沉稳，适合研究与趋势报告`, defaultPrimaryColor: `#1d5b8f` },
      { label: `产品发布`, value: `launch`, desc: `卡片利落，适合新品与更新日志`, defaultPrimaryColor: `#2f62f0` },
      { label: `琥珀手册`, value: `legal`, desc: `暖色精致，适合品牌与商业故事`, defaultPrimaryColor: `#a2762f` },
    ],
  },
  {
    category: `科技`,
    themes: [
      { label: `霓虹粗野`, value: `cyber`, desc: `冲突感强，适合趋势与表达型内容`, defaultPrimaryColor: `#ff2e63` },
      { label: `蓝图工程`, value: `blueprint`, desc: `网格制图感，适合架构与技术方案`, defaultPrimaryColor: `#5cc0ff` },
      { label: `绿屏极客`, value: `terminal`, desc: `命令行气质，适合教程与硬核笔记`, defaultPrimaryColor: `#6ee787` },
    ],
  },
  {
    category: `克制`,
    themes: [
      { label: `留白日记`, value: `minimalist`, desc: `呼吸感强，适合散文和品牌内容`, defaultPrimaryColor: `#9a9184` },
      { label: `研究论文`, value: `academic`, desc: `严谨正式，适合方法论与深度稿`, defaultPrimaryColor: `#2b4a7d` },
      { label: `瑞士网格`, value: `swiss`, desc: `直角强对齐，适合设计与复盘`, defaultPrimaryColor: `#e2231a` },
    ],
  },
  {
    category: `中式`,
    themes: [
      { label: `水墨留白`, value: `ink`, desc: `浓淡墨色，适合文化随笔与人物志`, defaultPrimaryColor: `#9d3b30` },
      { label: `朱砂古卷`, value: `vermilion`, desc: `朱红卷面，适合国风与节令内容`, defaultPrimaryColor: `#b8352b` },
      { label: `宣纸信笺`, value: `xuan`, desc: `暖黄尺牍，适合书信体与散文`, defaultPrimaryColor: `#9c7a4a` },
      { label: `青花瓷韵`, value: `porcelain`, desc: `青花描边，适合工艺与美学内容`, defaultPrimaryColor: `#1e4f8a` },
    ],
  },
  {
    category: `活力`,
    themes: [
      { label: `花期柔粉`, value: `bloom`, desc: `花瓣柔粉，适合情感与美妆内容`, defaultPrimaryColor: `#c96684` },
      { label: `糖果手账`, value: `candy`, desc: `虚线贴纸感，适合清单与轻科普`, defaultPrimaryColor: `#e08a5f` },
      { label: `波普撞色`, value: `pop`, desc: `硬边撞色，适合活动与强号召`, defaultPrimaryColor: `#ec3b83` },
      { label: `荧光夜行`, value: `neon`, desc: `暗底霓虹，适合潮流与娱乐内容`, defaultPrimaryColor: `#4ff0e0` },
    ],
  },
  {
    category: `档案`,
    themes: [
      { label: `编号索引`, value: `sequence`, desc: `章节自动编号，适合教程与方法论`, defaultPrimaryColor: `#0f62fe` },
      { label: `展签白盒`, value: `gallery`, desc: `展签留白，适合作品集与设计随笔`, defaultPrimaryColor: `#5a5a5a` },
      { label: `赛报计分`, value: `scoreboard`, desc: `斜体计分行，适合赛事复盘与榜单`, defaultPrimaryColor: `#d40f28` },
    ],
  },
]

export const themeOptions: IThemeOption[] = themeCategoryOptions.flatMap(c => c.themes)

export const themeOptionsMap = Object.fromEntries(
  themeOptions.map(option => [option.value, option]),
) as Record<ThemeName, IThemeOption>

/**
 * 旧主题名到保留主题的映射。
 *
 * 用户的 localStorage 里存着他们上次选的主题名。砍掉一套主题却不留映射，
 * 下次打开就会静默 fallback 到 default，等于替他们改了文章外观。
 * 映射目标一律取视觉上最接近的保留主题（参考审计报告的结构相似度）。
 */
export const legacyThemeAliasMap = {
  // 2024 版旧主题
  'classic-blue': `insight`,
  'classic-dark': `blueprint`,
  'classic-green': `default`,
  'classic-purple': `bloom`,
  'classic-red': `vermilion`,
  'report': `insight`,
  'medical': `porcelain`,
  'grace': `magazine`,
  'simple': `minimalist`,
  'cartoon': `pop`,
  'retro': `xuan`,
  'warm': `bloom`,
  'summer': `candy`,
  'autumn': `legal`,
  // 36 → 23 收敛时砍掉的 13 套
  'nightread': `blueprint`,
  'tech': `blueprint`,
  'filmlog': `blueprint`,
  'mist': `minimalist`,
  'finance': `insight`,
  'business': `insight`,
  'column': `default`,
  'forest': `default`,
  'aurora': `bloom`,
  'sunrise': `bloom`,
  'eyecare': `xuan`,
  'ocean': `porcelain`,
  'harvest': `legal`,
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

/**
 * 取一套主题的出厂强调色。传入旧主题名会先过一遍别名解析。
 */
export function getThemeDefaultPrimaryColor(value?: string | null): string {
  return themeOptionsMap[resolveThemeName(value)].defaultPrimaryColor
}
