import type { IConfigOption } from '../types'
import type { ThemeName } from './theme'
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
  { label: `10px`, value: `10px`, desc: `极限小` },
  { label: `11px`, value: `11px`, desc: `超小` },
  { label: `12px`, value: `12px`, desc: `极小` },
  { label: `13px`, value: `13px`, desc: `很小` },
  { label: `14px`, value: `14px`, desc: `较小` },
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

const codeBlockUrlPrefix = `https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/`
const codeBlockThemeList = [
  `1c-light`,
  `a11y-dark`,
  `a11y-light`,
  `agate`,
  `an-old-hope`,
  `androidstudio`,
  `arduino-light`,
  `arta`,
  `ascetic`,
  `atom-one-dark-reasonable`,
  `atom-one-dark`,
  `atom-one-light`,
  `brown-paper`,
  `codepen-embed`,
  `color-brewer`,
  `dark`,
  `default`,
  `devibeans`,
  `docco`,
  `far`,
  `felipec`,
  `foundation`,
  `github-dark-dimmed`,
  `github-dark`,
  `github`,
  `gml`,
  `googlecode`,
  `gradient-dark`,
  `gradient-light`,
  `grayscale`,
  `hybrid`,
  `idea`,
  `intellij-light`,
  `ir-black`,
  `isbl-editor-dark`,
  `isbl-editor-light`,
  `kimbie-dark`,
  `kimbie-light`,
  `lightfair`,
  `lioshi`,
  `magula`,
  `mono-blue`,
  `monokai-sublime`,
  `monokai`,
  `night-owl`,
  `nnfx-dark`,
  `nnfx-light`,
  `nord`,
  `obsidian`,
  `panda-syntax-dark`,
  `panda-syntax-light`,
  `paraiso-dark`,
  `paraiso-light`,
  `pojoaque`,
  `purebasic`,
  `qtcreator-dark`,
  `qtcreator-light`,
  `rainbow`,
  `routeros`,
  `school-book`,
  `shades-of-purple`,
  `srcery`,
  `stackoverflow-dark`,
  `stackoverflow-light`,
  `sunburst`,
  `tokyo-night-dark`,
  `tokyo-night-light`,
  `tomorrow-night-blue`,
  `tomorrow-night-bright`,
  `vs`,
  `vs2015`,
  `xcode`,
  `xt256`,
]

export const codeBlockThemeOptions: IConfigOption[] = codeBlockThemeList.map(codeBlockTheme => ({
  label: codeBlockTheme,
  value: `${codeBlockUrlPrefix}${codeBlockTheme}.min.css`,
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
  isMacCodeBlock: true,
  isShowLineNumber: false,
  isCountStatus: false,
  theme: themeOptions[0].value,
  fontFamily: fontFamilyOptions[0].value,
  fontSize: `14px`,
  primaryColor: colorOptions[0].value,
  codeBlockTheme: codeBlockThemeOptions[23].value,
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
  isMacCodeBlock: boolean
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
    isMacCodeBlock: true,
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
    isMacCodeBlock: true,
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
    codeBlockTheme: getCodeBlockThemeValue(`gradient-light`),
    legend: getLegendValue(`只显示 title`),
    headingStyles: {
      h2: `soft-banner`,
      h3: `eyebrow-line`,
    },
    isMacCodeBlock: true,
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
    isMacCodeBlock: false,
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
    isMacCodeBlock: false,
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
    isMacCodeBlock: true,
    isShowLineNumber: false,
    isCiteStatus: false,
    isUseIndent: false,
    isUseJustify: false,
    previewSurface: `#fbf7ff`,
    previewInk: `#31234a`,
  },
]
