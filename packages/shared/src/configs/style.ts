import type { IConfigOption } from '../types'
import type { ThemeName } from './theme'
import { HLJS_ASSET_BASE, localAssetUrl } from '../utils/localAsset'
import { codeBlockThemeIds, FALLBACK_CODE_BLOCK_THEME } from './code-block-themes'
import { themeOptions } from './theme'

/**
 * 字体分类
 */
export interface IFontCategory {
  category: string
  fonts: IConfigOption[]
}

/**
 * 公众号常用字体
 * 优先使用在中文内容里变化明显、且在常见桌面环境更容易命中的字体栈。
 */
export const wechatFontOptions: IConfigOption[] = [
  {
    label: `苹方`,
    value: `'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`,
    desc: `最常用，清爽稳定`,
  },
  {
    label: `冬青黑体`,
    value: `'Hiragino Sans GB', 'PingFang SC', 'Microsoft YaHei', sans-serif`,
    desc: `更有人文感`,
  },
  {
    label: `黑体`,
    value: `'Heiti SC', 'STHeiti', 'PingFang SC', sans-serif`,
    desc: `标题更有力`,
  },
  {
    label: `宋体`,
    value: `'Songti SC', 'STSong', 'SimSun', serif`,
    desc: `传统正文感`,
  },
  {
    label: `华文中宋`,
    value: `'STZhongsong', 'Songti SC', serif`,
    desc: `公众号常见刊物风`,
  },
]

/**
 * 设计感更强的字体
 * 尽量保证中文内容本身也会明显变化，而不是只有英文才有区别。
 */
export const displayFontOptions: IConfigOption[] = [
  {
    label: `华文楷体`,
    value: `'STKaiti', 'KaiTi', 'Kaiti SC', serif`,
    desc: `文气明显`,
  },
  {
    label: `华文仿宋`,
    value: `'STFangsong', 'FangSong', 'Songti SC', serif`,
    desc: `雅正文案`,
  },
  {
    label: `圆体`,
    value: `'Yuanti SC', 'PingFang SC', sans-serif`,
    desc: `轻松亲和`,
  },
  {
    label: `杂志衬线`,
    value: `'Baskerville', 'Songti SC', 'Noto Serif SC', serif`,
    desc: `封面感强`,
  },
  {
    label: `科技等宽`,
    value: `'JetBrains Mono', 'SFMono-Regular', 'SF Mono', Menlo, 'PingFang SC', monospace`,
    desc: `实验感强`,
  },
]

export const fontFamilyOptions: IConfigOption[] = [
  ...wechatFontOptions,
  ...displayFontOptions,
]

/**
 * 按分类的字体列表（用于右面板筛选器）
 */
export const fontCategoryOptions: IFontCategory[] = [
  {
    category: `公众号常用`,
    fonts: wechatFontOptions,
  },
  {
    category: `设计感强`,
    fonts: displayFontOptions,
  },
]

export const fontSizeOptions: IConfigOption[] = [
  { label: `8px`, value: `8px`, desc: `极小` },
  { label: `9px`, value: `9px`, desc: `极小` },
  { label: `10px`, value: `10px`, desc: `很小` },
  { label: `11px`, value: `11px`, desc: `很小` },
  { label: `12px`, value: `12px`, desc: `偏小` },
  { label: `13px`, value: `13px`, desc: `偏小` },
  { label: `14px`, value: `14px`, desc: `常用` },
  { label: `15px`, value: `15px`, desc: `常用` },
  { label: `16px`, value: `16px`, desc: `偏大` },
  { label: `17px`, value: `17px`, desc: `偏大` },
  { label: `18px`, value: `18px`, desc: `很大` },
  { label: `19px`, value: `19px`, desc: `很大` },
  { label: `20px`, value: `20px`, desc: `最大` },
]

/**
 * 颜色分类
 */
export interface IColorCategory {
  category: string
  colors: IConfigOption[]
}

/**
 * 现代简约色系
 */
export const modernColorOptions: IConfigOption[] = [
  { label: `钴蓝`, value: `#2851E3`, desc: `锐利专业` },
  { label: `石墨黑`, value: `#2C2F36`, desc: `克制高级` },
  { label: `珊瑚橘`, value: `#E9684A`, desc: `醒目热烈` },
  { label: `翡翠绿`, value: `#14866D`, desc: `平衡清爽` },
]

/**
 * 莫兰迪色系
 */
export const morandiColorOptions: IConfigOption[] = [
  { label: `燕麦米`, value: `#C8AE8B`, desc: `温暖柔和` },
  { label: `雾霾蓝`, value: `#7B9DAF`, desc: `安静理性` },
  { label: `藕紫灰`, value: `#9A86A4`, desc: `优雅克制` },
  { label: `鼠尾草`, value: `#8DA67B`, desc: `自然松弛` },
]

/**
 * 中国传统色
 */
export const traditionalColorOptions: IConfigOption[] = [
  { label: `青花蓝`, value: `#2E59A7`, desc: `东方理性` },
  { label: `朱砂红`, value: `#C03F3C`, desc: `戏剧张力` },
  { label: `琥珀金`, value: `#C38B2A`, desc: `贵气叙事` },
  { label: `竹青`, value: `#3F7D57`, desc: `清朗东方` },
]

export const futuristicColorOptions: IConfigOption[] = [
  { label: `电光青`, value: `#08B2E3`, desc: `数字未来` },
  { label: `脉冲紫`, value: `#6D3BFF`, desc: `霓虹锋利` },
  { label: `洋红粉`, value: `#D946EF`, desc: `高能创意` },
  { label: `酸橙绿`, value: `#73B816`, desc: `极客实验` },
]

export const colorOptions: IConfigOption[] = [
  ...modernColorOptions,
  ...morandiColorOptions,
  ...traditionalColorOptions,
  ...futuristicColorOptions,
]

/**
 * 按分类的颜色列表（用于右面板筛选器）
 */
export const colorCategoryOptions: IColorCategory[] = [
  { category: `品牌`, colors: modernColorOptions },
  { category: `莫兰迪`, colors: morandiColorOptions },
  { category: `东方`, colors: traditionalColorOptions },
  { category: `未来`, colors: futuristicColorOptions },
]

export const widthOptions: IConfigOption[] = [
  {
    label: `移动端`,
    value: `w-[375px]`,
    desc: `固定`,
  },
  {
    label: `电脑端`,
    value: `w-full`,
    desc: `适应`,
  },
]

const codeBlockUrlPrefix = localAssetUrl(`${HLJS_ASSET_BASE}/styles/`)

function codeBlockThemeUrl(themeId: string) {
  return `${codeBlockUrlPrefix}${themeId}.min.css`
}

/**
 * localStorage 里存的是完整地址，而地址前缀和可选主题都变过：
 * 早期指向 CDN，后来改成本地打包，再后来主题从 73 套砍到 10 套。
 * 这里把存量的值统一校准到当前这套，读到不认识的主题就回落，不要留一个 404 的样式表。
 */
export function resolveCodeBlockThemeUrl(stored: string): string {
  if (!stored) {
    return codeBlockThemeUrl(FALLBACK_CODE_BLOCK_THEME)
  }

  const themeId = stored.split(`/`).pop()?.replace(/\.min\.css$/, ``) || ``
  const kept = (codeBlockThemeIds as readonly string[]).includes(themeId)

  return codeBlockThemeUrl(kept ? themeId : FALLBACK_CODE_BLOCK_THEME)
}

export const codeBlockThemeOptions: IConfigOption[] = codeBlockThemeIds.map(themeId => ({
  label: themeId,
  value: codeBlockThemeUrl(themeId),
  desc: ``,
}))

export const headingLevelOptions: IConfigOption[] = [
  { label: `一级标题`, value: `h1`, desc: `` },
  { label: `二级标题`, value: `h2`, desc: `` },
  { label: `三级标题`, value: `h3`, desc: `` },
  { label: `四级标题`, value: `h4`, desc: `` },
  { label: `五级标题`, value: `h5`, desc: `` },
  { label: `六级标题`, value: `h6`, desc: `` },
]

export const headingStyleOptions: IConfigOption[] = [
  { label: `默认`, value: `default`, desc: `跟随主题原生标题` },
  { label: `主题色文字`, value: `color-only`, desc: `轻量强调` },
  { label: `下边框`, value: `border-bottom`, desc: `稳重分隔` },
  { label: `左边框`, value: `border-left`, desc: `信息模块` },
  { label: `实色横幅`, value: `solid-banner`, desc: `高对比封面` },
  { label: `柔色横幅`, value: `soft-banner`, desc: `柔和卡片` },
  { label: `胶囊描边`, value: `capsule-outline`, desc: `轻盈标签` },
  { label: `荧光底纹`, value: `marker`, desc: `划重点感` },
  { label: `眉线导语`, value: `eyebrow-line`, desc: `上方短线` },
  { label: `双线框题`, value: `double-line`, desc: `刊物分节` },
  { label: `发光下划线`, value: `underline-glow`, desc: `未来科技` },
  { label: `角标标签`, value: `corner-tag`, desc: `杂志栏目` },
]

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
export type HeadingStyleType
  = | 'default'
    | 'color-only'
    | 'border-bottom'
    | 'border-left'
    | 'solid-banner'
    | 'soft-banner'
    | 'capsule-outline'
    | 'marker'
    | 'eyebrow-line'
    | 'double-line'
    | 'underline-glow'
    | 'corner-tag'
    | 'custom'

export type HeadingStyles = {
  [K in HeadingLevel]?: HeadingStyleType
}

export const defaultHeadingStyles: HeadingStyles = {}

export const legendOptions: IConfigOption[] = [
  {
    label: `title 优先`,
    value: `title-alt`,
    desc: ``,
  },
  {
    label: `alt 优先`,
    value: `alt-title`,
    desc: ``,
  },
  {
    label: `只显示 title`,
    value: `title`,
    desc: ``,
  },
  {
    label: `只显示 alt`,
    value: `alt`,
    desc: ``,
  },
  {
    label: `文件名`,
    value: `filename`,
    desc: ``,
  },
  {
    label: `不显示`,
    value: `none`,
    desc: ``,
  },
]

export const defaultStyleConfig = {
  isCiteStatus: false,
  isShowCodeLanguage: true,
  isShowLineNumber: false,
  isCountStatus: false,
  theme: themeOptions[0].value,
  fontFamily: fontFamilyOptions[0].value,
  fontSize: `14px`,
  primaryColor: colorOptions[0].value,
  codeBlockTheme: codeBlockThemeUrl(`github-dark`),
  legend: legendOptions[3].value,
  headingStyles: defaultHeadingStyles as HeadingStyles,
}

export interface IStylePreset {
  label: string
  value: string
  scene: string
  desc: string
  theme: ThemeName
  fontFamily: string
  fontSize: string
  primaryColor: string
  codeBlockTheme: string
  legend: string
  headingStyles: HeadingStyles
  isShowCodeLanguage: boolean
  isShowLineNumber: boolean
  isCiteStatus: boolean
  isUseIndent: boolean
  isUseJustify: boolean
  previewSurface: string
  previewInk: string
}

function getFontValue(label: string, fallback = fontFamilyOptions[0].value) {
  return fontFamilyOptions.find(option => option.label === label)?.value || fallback
}

function getColorValue(label: string, fallback = colorOptions[0].value) {
  return colorOptions.find(option => option.label === label)?.value || fallback
}

function getCodeBlockThemeValue(label: string, fallback = defaultStyleConfig.codeBlockTheme) {
  return codeBlockThemeOptions.find(option => option.label === label)?.value || fallback
}

function getLegendValue(label: string, fallback = defaultStyleConfig.legend) {
  return legendOptions.find(option => option.label === label)?.value || fallback
}

export const stylePresetOptions: IStylePreset[] = [
  {
    label: `教程拆解`,
    value: `tutorial-breakdown`,
    scene: `产品拆解 / 工具教程`,
    desc: `结构清楚，适合分步骤教学和 AI 工具分析。`,
    theme: `sequence`,
    fontFamily: getFontValue(`苹方`),
    fontSize: `14px`,
    primaryColor: getColorValue(`钴蓝`),
    codeBlockTheme: getCodeBlockThemeValue(`github`),
    legend: getLegendValue(`title 优先`),
    headingStyles: {
      h2: `border-left`,
      h3: `color-only`,
    },
    isShowCodeLanguage: true,
    isShowLineNumber: true,
    isCiteStatus: false,
    isUseIndent: false,
    isUseJustify: false,
    previewSurface: `#f4f8ff`,
    previewInk: `#172132`,
  },
  {
    label: `观点专栏`,
    value: `editorial-column`,
    scene: `评论 / 观点 / 长文`,
    desc: `更像成熟公众号专栏，阅读节奏稳，适合连续表达。`,
    theme: `default`,
    fontFamily: getFontValue(`宋体`),
    fontSize: `14px`,
    primaryColor: getColorValue(`石墨黑`),
    codeBlockTheme: getCodeBlockThemeValue(`xcode`),
    legend: getLegendValue(`只显示 alt`),
    headingStyles: {
      h2: `border-bottom`,
      h3: `color-only`,
    },
    isShowCodeLanguage: true,
    isShowLineNumber: false,
    isCiteStatus: false,
    isUseIndent: true,
    isUseJustify: true,
    previewSurface: `#f7f1ea`,
    previewInk: `#1f1a16`,
  },
  {
    label: `品牌特写`,
    value: `brand-feature`,
    scene: `人物稿 / 品牌故事`,
    desc: `更有封面感和杂志感，适合品牌叙事和人物采访。`,
    theme: `magazine`,
    fontFamily: getFontValue(`华文中宋`),
    fontSize: `14px`,
    primaryColor: getColorValue(`琥珀金`),
    codeBlockTheme: getCodeBlockThemeValue(`atom-one-light`),
    legend: getLegendValue(`只显示 title`),
    headingStyles: {
      h2: `soft-banner`,
      h3: `eyebrow-line`,
    },
    isShowCodeLanguage: true,
    isShowLineNumber: false,
    isCiteStatus: false,
    isUseIndent: false,
    isUseJustify: true,
    previewSurface: `#fff8ef`,
    previewInk: `#241a0e`,
  },
  {
    label: `数据快报`,
    value: `data-brief`,
    scene: `报告 / 周报 / 盘点`,
    desc: `信息层级鲜明，适合图表、结论和关键数字密集的内容。`,
    theme: `insight`,
    fontFamily: getFontValue(`冬青黑体`),
    fontSize: `14px`,
    primaryColor: getColorValue(`翡翠绿`),
    codeBlockTheme: getCodeBlockThemeValue(`atom-one-light`),
    legend: getLegendValue(`文件名`),
    headingStyles: {
      h2: `solid-banner`,
      h3: `capsule-outline`,
    },
    isShowCodeLanguage: false,
    isShowLineNumber: true,
    isCiteStatus: true,
    isUseIndent: false,
    isUseJustify: false,
    previewSurface: `#f3fbf8`,
    previewInk: `#163127`,
  },
  {
    label: `深度方法论`,
    value: `methodology-longform`,
    scene: `方法论 / 深度研究`,
    desc: `更适合长篇论述、框架拆分和严肃型知识内容。`,
    theme: `academic`,
    fontFamily: getFontValue(`华文仿宋`),
    fontSize: `14px`,
    primaryColor: getColorValue(`青花蓝`),
    codeBlockTheme: getCodeBlockThemeValue(`github`),
    legend: getLegendValue(`只显示 alt`),
    headingStyles: {
      h2: `double-line`,
      h3: `color-only`,
    },
    isShowCodeLanguage: false,
    isShowLineNumber: false,
    isCiteStatus: true,
    isUseIndent: true,
    isUseJustify: true,
    previewSurface: `#f6f8fb`,
    previewInk: `#1d2940`,
  },
  {
    label: `灵感快评`,
    value: `creative-signal`,
    scene: `趋势 / 创意 / AI 快评`,
    desc: `更有新鲜感和视觉记忆点，适合表达型内容。`,
    theme: `bloom`,
    fontFamily: getFontValue(`圆体`),
    fontSize: `14px`,
    primaryColor: getColorValue(`洋红粉`),
    codeBlockTheme: getCodeBlockThemeValue(`night-owl`),
    legend: getLegendValue(`title 优先`),
    headingStyles: {
      h2: `eyebrow-line`,
      h3: `marker`,
    },
    isShowCodeLanguage: true,
    isShowLineNumber: false,
    isCiteStatus: false,
    isUseIndent: false,
    isUseJustify: false,
    previewSurface: `#fbf7ff`,
    previewInk: `#31234a`,
  },
]
