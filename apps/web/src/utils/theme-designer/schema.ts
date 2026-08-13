/**
 * 主题可视化编辑器的属性表
 * 这张表同时驱动两件事：面板上渲染出什么控件，以及每个控件生成什么 CSS
 *
 * 生成的 CSS 遵循项目主题约定：
 * - 字号一律走 calc(var(--md-font-size) * N)
 * - 颜色可以选「跟随主题色」，输出 var(--md-primary-color)
 * - 选择器不带 #output 前缀，由 applyTheme 统一加作用域
 * - 不使用 grid / gap / aspect-ratio / margin-block，避免被微信剥离
 */

import type {
  ThemeCssRule,
  ThemeField,
  ThemeFieldContext,
  ThemeFieldOption,
  ThemeGroup,
  ThemeGroupCategory,
  ThemeTokenGroupValues,
  ThemeTokenValue,
} from './types'

export const PRIMARY_COLOR_TOKEN = `primary`

export const HEADING_LEVELS = [`h1`, `h2`, `h3`, `h4`, `h5`, `h6`] as const

export type HeadingLevelId = typeof HEADING_LEVELS[number]

export const PSEUDO_WECHAT_HINT = `依赖伪元素，粘贴到公众号后可能丢失`

function decl(prop: string, value: string) {
  return `${prop}: ${value};`
}

function rule(selector: string, ...declarations: (string | false | null | undefined)[]): ThemeCssRule {
  return {
    selector,
    declarations: declarations.filter(Boolean) as string[],
  }
}

export function cssColor(value: ThemeTokenValue): string {
  const raw = String(value).trim()
  if (!raw || raw === PRIMARY_COLOR_TOKEN)
    return `var(--md-primary-color)`

  return raw
}

function fontSizeValue(scale: ThemeTokenValue) {
  return `calc(var(--md-font-size) * ${Number(scale)})`
}

interface FieldExtras {
  hint?: string
  wechatHint?: string
  showIf?: (values: ThemeTokenGroupValues) => boolean
  /** 覆盖分组的默认选择器 */
  target?: string
}

function colorField(key: string, label: string, prop: string, defaultValue: string, extras: FieldExtras = {}): ThemeField {
  const { target, ...rest } = extras
  return {
    key,
    label,
    type: `color`,
    defaultValue,
    ...rest,
    emit: (value, ctx) => [rule(target || ctx.selector, decl(prop, ctx.color(value)))],
  }
}

interface NumberFieldInit extends FieldExtras {
  min: number
  max: number
  step: number
  suffix?: string
  unit?: string
}

const CSS_UNIT_SUFFIXES = new Set([`px`, `em`, `rem`, `%`, `vw`, `vh`])

function numberField(key: string, label: string, prop: string, defaultValue: number, init: NumberFieldInit): ThemeField {
  const { target, unit: explicitUnit, min, max, step, suffix, ...rest } = init
  // suffix 既是展示单位也是 CSS 单位，纯展示用的记号（比如倍数的 ×）不会被当成单位输出
  const unit = explicitUnit ?? (CSS_UNIT_SUFFIXES.has(suffix ?? ``) ? suffix as string : ``)
  return {
    key,
    label,
    type: `number`,
    defaultValue,
    min,
    max,
    step,
    suffix: suffix ?? unit,
    ...rest,
    emit: (value, ctx) => [rule(target || ctx.selector, decl(prop, `${Number(value)}${unit}`))],
  }
}

function selectField(key: string, label: string, prop: string, defaultValue: string, options: ThemeFieldOption[], extras: FieldExtras = {}): ThemeField {
  const { target, ...rest } = extras
  return {
    key,
    label,
    type: `select`,
    defaultValue,
    options,
    ...rest,
    emit: (value, ctx) => [rule(target || ctx.selector, decl(prop, String(value)))],
  }
}

const ALIGN_OPTIONS: ThemeFieldOption[] = [
  { label: `左对齐`, value: `left` },
  { label: `居中`, value: `center` },
  { label: `右对齐`, value: `right` },
  { label: `两端对齐`, value: `justify` },
]

const FONT_WEIGHT_OPTIONS: ThemeFieldOption[] = [
  { label: `细体 300`, value: `300` },
  { label: `常规 400`, value: `400` },
  { label: `中黑 500`, value: `500` },
  { label: `半粗 600`, value: `600` },
  { label: `加粗 700`, value: `700` },
  { label: `特粗 800`, value: `800` },
  { label: `超粗 900`, value: `900` },
]

const FONT_STYLE_OPTIONS: ThemeFieldOption[] = [
  { label: `正常`, value: `normal` },
  { label: `斜体`, value: `italic` },
]

const SHADOW_OPTIONS: ThemeFieldOption[] = [
  { label: `无阴影`, value: `none` },
  { label: `轻微`, value: `0 8px 20px rgba(15, 23, 42, 0.06)` },
  { label: `中等`, value: `0 14px 30px rgba(15, 23, 42, 0.1)` },
  { label: `强烈`, value: `0 20px 44px rgba(15, 23, 42, 0.16)` },
]

const MONO_FONT_OPTIONS: ThemeFieldOption[] = [
  { label: `跟随正文`, value: `var(--md-font-family)` },
  { label: `JetBrains Mono`, value: `'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace` },
  { label: `SF Mono`, value: `'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace` },
  { label: `Consolas`, value: `Consolas, 'Courier New', Menlo, monospace` },
  { label: `Courier`, value: `'Courier New', Courier, monospace` },
]

const HEADING_DECORATION_OPTIONS: ThemeFieldOption[] = [
  { label: `清除装饰`, value: `none`, desc: `去掉主题自带的边框和底纹` },
  { label: `下划线`, value: `underline`, desc: `稳重分隔` },
  { label: `左边框`, value: `border-left`, desc: `信息模块` },
  { label: `背景块`, value: `block`, desc: `建议同时设置文字颜色` },
  { label: `上方短线`, value: `eyebrow`, desc: `杂志导语感`, wechatHint: PSEUDO_WECHAT_HINT },
  { label: `胶囊描边`, value: `capsule`, desc: `轻盈标签` },
  { label: `自动序号`, value: `number`, desc: `按级别自动编号`, wechatHint: `序号依赖 CSS 计数器，复制到公众号后会失效，只用于预览` },
]

function buildHeadingDecoration(value: string, ctx: ThemeFieldContext, level: HeadingLevelId): ThemeCssRule[] {
  const sel = ctx.selector
  const accent = ctx.color(ctx.get(`decorationColor`))
  const reset: ThemeCssRule[] = [
    rule(
      sel,
      decl(`display`, `block`),
      decl(`padding`, `0`),
      decl(`border`, `0`),
      decl(`border-radius`, `0`),
      decl(`background`, `transparent`),
      decl(`box-shadow`, `none`),
      decl(`counter-increment`, `none`),
    ),
    rule(`${sel}::before`, decl(`content`, `none`)),
    rule(`${sel}::after`, decl(`content`, `none`)),
  ]

  switch (value) {
    case `underline`:
      return [...reset, rule(
        sel,
        decl(`padding-bottom`, `0.36em`),
        decl(`border-bottom`, `2px solid ${accent}`),
      )]

    case `border-left`:
      return [...reset, rule(
        sel,
        decl(`padding`, `0.2em 0 0.2em 0.8em`),
        decl(`border-left`, `4px solid ${accent}`),
      )]

    case `block`:
      return [...reset, rule(
        sel,
        decl(`padding`, `0.5em 0.9em`),
        decl(`border-radius`, `8px`),
        decl(`background`, accent),
      )]

    case `eyebrow`:
      return [...reset, rule(
        `${sel}::before`,
        decl(`content`, `""`),
        decl(`display`, `block`),
        decl(`width`, `2.4em`),
        decl(`height`, `3px`),
        decl(`margin-bottom`, `0.5em`),
        decl(`border-radius`, `999px`),
        decl(`background`, accent),
      )]

    case `capsule`:
      return [...reset, rule(
        sel,
        decl(`display`, `inline-block`),
        decl(`max-width`, `100%`),
        decl(`padding`, `0.3em 0.95em`),
        decl(`border`, `1.5px solid ${accent}`),
        decl(`border-radius`, `999px`),
      )]

    case `number`:
      return [
        ...reset,
        rule(sel, decl(`counter-increment`, `md-${level}`)),
        rule(
          `${sel}::before`,
          decl(`content`, `counter(md-${level}) ". "`),
          decl(`color`, accent),
          decl(`font-weight`, `inherit`),
        ),
      ]

    default:
      return reset
  }
}

function createHeadingGroup(level: HeadingLevelId, index: number): ThemeGroup {
  const scaleDefaults = [1.8, 1.32, 1.15, 1.05, 1, 0.95]

  return {
    id: level,
    label: `${index + 1} 级标题`,
    desc: `控制 ${level.toUpperCase()} 的字号、颜色、间距和装饰`,
    selector: level,
    fields: [
      {
        key: `decoration`,
        label: `装饰样式`,
        type: `select`,
        defaultValue: `none`,
        options: HEADING_DECORATION_OPTIONS,
        hint: `会清掉主题自带的标题装饰再重新绘制`,
        emit: (value, ctx) => buildHeadingDecoration(String(value), ctx, level),
      },
      colorField(`decorationColor`, `装饰颜色`, `color`, PRIMARY_COLOR_TOKEN, {
        showIf: values => `decoration` in values && values.decoration !== `none`,
      }),
      {
        key: `fontScale`,
        label: `字号倍数`,
        type: `number`,
        defaultValue: scaleDefaults[index],
        min: 0.8,
        max: 3,
        step: 0.02,
        suffix: `×`,
        hint: `相对正文字号的倍数`,
        emit: (value, ctx) => [rule(ctx.selector, decl(`font-size`, fontSizeValue(value)))],
      },
      selectField(`fontWeight`, `字重`, `font-weight`, `700`, FONT_WEIGHT_OPTIONS),
      colorField(`color`, `文字颜色`, `color`, `#151515`),
      selectField(`align`, `对齐方式`, `text-align`, `left`, ALIGN_OPTIONS),
      numberField(`lineHeight`, `行高`, `line-height`, 1.4, { min: 1, max: 2.4, step: 0.05 }),
      numberField(`letterSpacing`, `字间距`, `letter-spacing`, 0, { min: -0.05, max: 0.5, step: 0.01, unit: `em`, suffix: `em` }),
      numberField(`marginTop`, `上间距`, `margin-top`, 2, { min: 0, max: 5, step: 0.1, unit: `em`, suffix: `em` }),
      numberField(`marginBottom`, `下间距`, `margin-bottom`, 1, { min: 0, max: 5, step: 0.1, unit: `em`, suffix: `em` }),
    ],
  }
}

const baseGroup: ThemeGroup = {
  id: `base`,
  label: `全局基础`,
  desc: `整篇文章的底色、默认文字色和基础行高`,
  selector: `section`,
  fields: [
    colorField(`background`, `内容底色`, `background`, `#ffffff`),
    colorField(`color`, `默认文字色`, `color`, `#333333`),
    numberField(`lineHeight`, `基础行高`, `line-height`, 1.8, { min: 1.2, max: 2.6, step: 0.05 }),
    numberField(`letterSpacing`, `基础字间距`, `letter-spacing`, 0, { min: -0.05, max: 0.4, step: 0.01, unit: `em`, suffix: `em` }),
  ],
}

const paragraphGroup: ThemeGroup = {
  id: `paragraph`,
  label: `正文段落`,
  desc: `正文的字号、行高、颜色和段落间距`,
  selector: `p`,
  fields: [
    {
      key: `fontScale`,
      label: `字号倍数`,
      type: `number`,
      defaultValue: 1,
      min: 0.8,
      max: 1.6,
      step: 0.01,
      suffix: `×`,
      hint: `相对正文字号的倍数`,
      emit: (value, ctx) => [rule(ctx.selector, decl(`font-size`, fontSizeValue(value)))],
    },
    numberField(`lineHeight`, `行高`, `line-height`, 1.8, { min: 1.2, max: 2.6, step: 0.05 }),
    colorField(`color`, `文字颜色`, `color`, `#3f3f3f`),
    numberField(`marginTop`, `段前距`, `margin-top`, 1.25, { min: 0, max: 4, step: 0.05, unit: `em`, suffix: `em` }),
    numberField(`marginBottom`, `段后距`, `margin-bottom`, 1.25, { min: 0, max: 4, step: 0.05, unit: `em`, suffix: `em` }),
    numberField(`letterSpacing`, `字间距`, `letter-spacing`, 0, { min: -0.05, max: 0.4, step: 0.01, unit: `em`, suffix: `em` }),
  ],
}

const linkGroup: ThemeGroup = {
  id: `link`,
  label: `链接`,
  desc: `正文里的超链接表现`,
  selector: `a`,
  fields: [
    colorField(`color`, `链接颜色`, `color`, PRIMARY_COLOR_TOKEN),
    {
      key: `underline`,
      label: `下划线样式`,
      type: `select`,
      defaultValue: `underline`,
      options: [
        { label: `无下划线`, value: `none` },
        { label: `实线`, value: `underline` },
        { label: `虚点线`, value: `dotted`, wechatHint: `text-decoration-style 在公众号里支持不稳定` },
        { label: `波浪线`, value: `wavy`, wechatHint: `text-decoration-style 在公众号里支持不稳定` },
        { label: `下边框`, value: `border` },
      ],
      emit: (value, ctx) => {
        const accent = ctx.color(ctx.get(`underlineColor`))
        const reset = rule(
          ctx.selector,
          decl(`text-decoration`, `none`),
          decl(`border-bottom`, `0`),
          decl(`box-shadow`, `none`),
        )

        switch (String(value)) {
          case `underline`:
            return [reset, rule(
              ctx.selector,
              decl(`text-decoration`, `underline`),
              decl(`text-decoration-color`, accent),
              decl(`text-underline-offset`, `2px`),
            )]
          case `dotted`:
            return [reset, rule(
              ctx.selector,
              decl(`text-decoration`, `underline`),
              decl(`text-decoration-style`, `dotted`),
              decl(`text-decoration-color`, accent),
              decl(`text-underline-offset`, `2px`),
            )]
          case `wavy`:
            return [reset, rule(
              ctx.selector,
              decl(`text-decoration`, `underline`),
              decl(`text-decoration-style`, `wavy`),
              decl(`text-decoration-color`, accent),
              decl(`text-underline-offset`, `2px`),
            )]
          case `border`:
            return [reset, rule(ctx.selector, decl(`border-bottom`, `1px solid ${accent}`))]
          default:
            return [reset]
        }
      },
    },
    colorField(`underlineColor`, `下划线颜色`, `text-decoration-color`, PRIMARY_COLOR_TOKEN, {
      showIf: values => `underline` in values && values.underline !== `none`,
    }),
    selectField(`fontWeight`, `字重`, `font-weight`, `400`, FONT_WEIGHT_OPTIONS),
  ],
}

const blockquoteGroup: ThemeGroup = {
  id: `blockquote`,
  label: `引用块`,
  desc: `引用与提示块的底色、边框和内边距`,
  selector: `blockquote, .md-blockquote`,
  fields: [
    colorField(`background`, `背景色`, `background`, `#f7f7f7`),
    colorField(`textColor`, `文字颜色`, `color`, `#5f5a55`, {
      target: `blockquote, blockquote p, .md-blockquote, .md-blockquote-p`,
    }),
    {
      key: `borderLeftWidth`,
      label: `左边框粗细`,
      type: `number`,
      defaultValue: 4,
      min: 0,
      max: 16,
      step: 1,
      suffix: `px`,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border-left`, `${Number(value)}px solid ${ctx.color(ctx.get(`borderLeftColor`))}`),
      )],
    },
    {
      key: `borderLeftColor`,
      label: `左边框颜色`,
      type: `color`,
      defaultValue: PRIMARY_COLOR_TOKEN,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border-left`, `${Number(ctx.get(`borderLeftWidth`))}px solid ${ctx.color(value)}`),
      )],
    },
    {
      key: `borderWidth`,
      label: `外框粗细`,
      type: `number`,
      defaultValue: 0,
      min: 0,
      max: 6,
      step: 1,
      suffix: `px`,
      hint: `外框不会覆盖左边框设置`,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border-top`, `${Number(value)}px solid ${ctx.color(ctx.get(`borderColor`))}`),
        decl(`border-right`, `${Number(value)}px solid ${ctx.color(ctx.get(`borderColor`))}`),
        decl(`border-bottom`, `${Number(value)}px solid ${ctx.color(ctx.get(`borderColor`))}`),
      )],
    },
    {
      key: `borderColor`,
      label: `外框颜色`,
      type: `color`,
      defaultValue: `#e5e5e5`,
      showIf: values => Number(values.borderWidth ?? 0) > 0,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border-top-color`, ctx.color(value)),
        decl(`border-right-color`, ctx.color(value)),
        decl(`border-bottom-color`, ctx.color(value)),
      )],
    },
    numberField(`padding`, `内边距`, `padding`, 1.1, { min: 0, max: 3, step: 0.05, unit: `em`, suffix: `em` }),
    numberField(`borderRadius`, `圆角`, `border-radius`, 12, { min: 0, max: 40, step: 1, suffix: `px` }),
    selectField(`fontStyle`, `字形`, `font-style`, `normal`, FONT_STYLE_OPTIONS),
  ],
}

const listGroup: ThemeGroup = {
  id: `list`,
  label: `列表`,
  desc: `有序/无序列表的符号、缩进和项间距`,
  selector: `ul, ol`,
  fields: [
    selectField(`ulMarker`, `无序列表符号`, `list-style-type`, `disc`, [
      { label: `实心圆点`, value: `disc` },
      { label: `空心圆点`, value: `circle` },
      { label: `实心方块`, value: `square` },
      { label: `无符号`, value: `none` },
    ], { target: `ul` }),
    selectField(`olMarker`, `有序列表符号`, `list-style-type`, `decimal`, [
      { label: `阿拉伯数字`, value: `decimal` },
      { label: `补零数字`, value: `decimal-leading-zero` },
      { label: `小写字母`, value: `lower-alpha` },
      { label: `大写字母`, value: `upper-alpha` },
      { label: `小写罗马`, value: `lower-roman` },
      { label: `无符号`, value: `none` },
    ], { target: `ol` }),
    numberField(`paddingLeft`, `列表缩进`, `padding-left`, 1.5, { min: 0, max: 4, step: 0.1, unit: `em`, suffix: `em` }),
    numberField(`itemSpacing`, `项间距`, `margin-bottom`, 0.5, { min: 0, max: 2, step: 0.05, unit: `em`, suffix: `em`, target: `li` }),
    colorField(`textColor`, `文字颜色`, `color`, `#3f3f3f`, { target: `li` }),
    numberField(`lineHeight`, `行高`, `line-height`, 1.8, { min: 1.2, max: 2.6, step: 0.05, target: `li` }),
    colorField(`markerColor`, `符号颜色`, `color`, PRIMARY_COLOR_TOKEN, {
      target: `li::marker`,
      wechatHint: `::marker 在公众号里会失效，只影响预览`,
    }),
  ],
}

const tableGroup: ThemeGroup = {
  id: `table`,
  label: `表格`,
  desc: `表头、边框、斑马纹和单元格排版`,
  selector: `table`,
  fields: [
    colorField(`headerBackground`, `表头背景`, `background`, `#151515`, { target: `th` }),
    colorField(`headerColor`, `表头文字`, `color`, `#ffffff`, { target: `th` }),
    selectField(`headerFontWeight`, `表头字重`, `font-weight`, `700`, FONT_WEIGHT_OPTIONS, { target: `th` }),
    colorField(`cellColor`, `单元格文字`, `color`, `#3f3f3f`, { target: `td` }),
    {
      key: `borderWidth`,
      label: `边框粗细`,
      type: `number`,
      defaultValue: 1,
      min: 0,
      max: 4,
      step: 1,
      suffix: `px`,
      emit: (value, ctx) => {
        const border = `${Number(value)}px solid ${ctx.color(ctx.get(`borderColor`))}`
        return [
          rule(`table`, decl(`border`, border)),
          rule(`th, td`, decl(`border`, border)),
        ]
      },
    },
    {
      key: `borderColor`,
      label: `边框颜色`,
      type: `color`,
      defaultValue: `#e0dcd4`,
      emit: (value, ctx) => {
        const border = `${Number(ctx.get(`borderWidth`))}px solid ${ctx.color(value)}`
        return [
          rule(`table`, decl(`border`, border)),
          rule(`th, td`, decl(`border`, border)),
        ]
      },
    },
    numberField(`cellPadding`, `单元格内边距`, `padding`, 0.8, { min: 0, max: 2, step: 0.05, unit: `em`, suffix: `em`, target: `th, td` }),
    selectField(`align`, `单元格对齐`, `text-align`, `left`, ALIGN_OPTIONS.slice(0, 3), { target: `th, td` }),
    {
      key: `borderRadius`,
      label: `表格圆角`,
      type: `number`,
      defaultValue: 0,
      min: 0,
      max: 32,
      step: 1,
      suffix: `px`,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border-collapse`, `separate`),
        decl(`border-spacing`, `0`),
        decl(`overflow`, `hidden`),
        decl(`border-radius`, `${Number(value)}px`),
      )],
    },
    {
      key: `zebra`,
      label: `斑马纹`,
      type: `switch`,
      defaultValue: true,
      emit: (value, ctx) => [rule(
        `tbody tr:nth-child(even) td`,
        decl(`background`, value ? ctx.color(ctx.get(`zebraColor`)) : `transparent`),
      )],
    },
    colorField(`zebraColor`, `斑马纹颜色`, `background`, `#f7f7f7`, {
      target: `tbody tr:nth-child(even) td`,
      showIf: values => values.zebra === true,
    }),
  ],
}

const codeBlockGroup: ThemeGroup = {
  id: `codeBlock`,
  label: `代码块`,
  desc: `多行代码块的容器表现`,
  selector: `pre.code__pre, .hljs.code__pre`,
  fields: [
    colorField(`background`, `背景色`, `background`, `#1f2127`, {
      hint: `设置后会接管代码块底色，不再跟随代码主题`,
    }),
    colorField(`textColor`, `文字颜色`, `color`, `#e6e6e6`, {
      hint: `只影响没有被语法高亮着色的部分`,
    }),
    numberField(`borderRadius`, `圆角`, `border-radius`, 12, { min: 0, max: 32, step: 1, suffix: `px` }),
    {
      key: `borderWidth`,
      label: `边框粗细`,
      type: `number`,
      defaultValue: 1,
      min: 0,
      max: 6,
      step: 1,
      suffix: `px`,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border`, `${Number(value)}px solid ${ctx.color(ctx.get(`borderColor`))}`),
      )],
    },
    {
      key: `borderColor`,
      label: `边框颜色`,
      type: `color`,
      defaultValue: `#25262b`,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border`, `${Number(ctx.get(`borderWidth`))}px solid ${ctx.color(value)}`),
      )],
    },
    numberField(`padding`, `内边距`, `padding`, 1, { min: 0, max: 3, step: 0.05, unit: `em`, suffix: `em` }),
    selectField(`fontFamily`, `代码字体`, `font-family`, MONO_FONT_OPTIONS[1].value, MONO_FONT_OPTIONS),
    {
      key: `fontScale`,
      label: `字号倍数`,
      type: `number`,
      defaultValue: 0.92,
      min: 0.6,
      max: 1.4,
      step: 0.01,
      suffix: `×`,
      emit: (value, ctx) => [rule(ctx.selector, decl(`font-size`, fontSizeValue(value)))],
    },
    selectField(`shadow`, `阴影`, `box-shadow`, `none`, SHADOW_OPTIONS),
  ],
}

const inlineCodeGroup: ThemeGroup = {
  id: `inlineCode`,
  label: `行内代码`,
  desc: `正文中间的短代码片段`,
  selector: `:not(pre) > code`,
  fields: [
    colorField(`background`, `背景色`, `background`, `#f0f2f5`),
    colorField(`textColor`, `文字颜色`, `color`, `#202020`),
    numberField(`padding`, `内边距`, `padding`, 0.2, { min: 0, max: 1, step: 0.02, unit: `em`, suffix: `em` }),
    numberField(`borderRadius`, `圆角`, `border-radius`, 6, { min: 0, max: 20, step: 1, suffix: `px` }),
    {
      key: `borderWidth`,
      label: `边框粗细`,
      type: `number`,
      defaultValue: 0,
      min: 0,
      max: 4,
      step: 1,
      suffix: `px`,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border`, `${Number(value)}px solid ${ctx.color(ctx.get(`borderColor`))}`),
      )],
    },
    {
      key: `borderColor`,
      label: `边框颜色`,
      type: `color`,
      defaultValue: `#e0e0e0`,
      showIf: values => Number(values.borderWidth ?? 0) > 0,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border`, `${Number(ctx.get(`borderWidth`))}px solid ${ctx.color(value)}`),
      )],
    },
    selectField(`fontFamily`, `代码字体`, `font-family`, MONO_FONT_OPTIONS[1].value, MONO_FONT_OPTIONS),
    {
      key: `fontScale`,
      label: `字号倍数`,
      type: `number`,
      defaultValue: 0.92,
      min: 0.6,
      max: 1.3,
      step: 0.01,
      suffix: `×`,
      emit: (value, ctx) => [rule(ctx.selector, decl(`font-size`, fontSizeValue(value)))],
    },
  ],
}

const imageGroup: ThemeGroup = {
  id: `image`,
  label: `图片`,
  desc: `正文配图的圆角、描边、阴影和间距`,
  selector: `img`,
  fields: [
    numberField(`borderRadius`, `圆角`, `border-radius`, 12, { min: 0, max: 40, step: 1, suffix: `px` }),
    selectField(`shadow`, `阴影`, `box-shadow`, `none`, SHADOW_OPTIONS),
    {
      key: `borderWidth`,
      label: `描边粗细`,
      type: `number`,
      defaultValue: 0,
      min: 0,
      max: 8,
      step: 1,
      suffix: `px`,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border`, `${Number(value)}px solid ${ctx.color(ctx.get(`borderColor`))}`),
      )],
    },
    {
      key: `borderColor`,
      label: `描边颜色`,
      type: `color`,
      defaultValue: `#e5e5e5`,
      showIf: values => Number(values.borderWidth ?? 0) > 0,
      emit: (value, ctx) => [rule(
        ctx.selector,
        decl(`border`, `${Number(ctx.get(`borderWidth`))}px solid ${ctx.color(value)}`),
      )],
    },
    numberField(`marginTop`, `上间距`, `margin-top`, 1.25, { min: 0, max: 4, step: 0.05, unit: `em`, suffix: `em`, target: `figure, :not(figure) > img` }),
    numberField(`marginBottom`, `下间距`, `margin-bottom`, 1.25, { min: 0, max: 4, step: 0.05, unit: `em`, suffix: `em`, target: `figure, :not(figure) > img` }),
    numberField(`maxWidth`, `最大宽度`, `max-width`, 100, { min: 40, max: 100, step: 1, unit: `%`, suffix: `%` }),
    {
      key: `align`,
      label: `水平位置`,
      type: `select`,
      defaultValue: `center`,
      options: [
        { label: `居中`, value: `center` },
        { label: `靠左`, value: `left` },
        { label: `靠右`, value: `right` },
      ],
      emit: (value, ctx) => {
        const align = String(value)
        return [rule(
          ctx.selector,
          decl(`margin-left`, align === `left` ? `0` : `auto`),
          decl(`margin-right`, align === `right` ? `0` : `auto`),
        )]
      },
    },
  ],
}

const figcaptionGroup: ThemeGroup = {
  id: `figcaption`,
  label: `图注`,
  desc: `图片下方说明文字的表现`,
  selector: `figcaption, .md-figcaption`,
  fields: [
    {
      key: `fontScale`,
      label: `字号倍数`,
      type: `number`,
      defaultValue: 0.86,
      min: 0.6,
      max: 1.2,
      step: 0.01,
      suffix: `×`,
      emit: (value, ctx) => [rule(ctx.selector, decl(`font-size`, fontSizeValue(value)))],
    },
    colorField(`color`, `文字颜色`, `color`, `#8a8a8a`),
    selectField(`align`, `对齐方式`, `text-align`, `center`, ALIGN_OPTIONS.slice(0, 3)),
    selectField(`fontStyle`, `字形`, `font-style`, `normal`, FONT_STYLE_OPTIONS),
    numberField(`marginTop`, `与图片间距`, `margin-top`, 0.6, { min: 0, max: 2, step: 0.05, unit: `em`, suffix: `em` }),
    numberField(`lineHeight`, `行高`, `line-height`, 1.6, { min: 1.2, max: 2.4, step: 0.05 }),
  ],
}

const dividerGroup: ThemeGroup = {
  id: `divider`,
  label: `分割线`,
  desc: `章节之间的分隔线`,
  selector: `hr`,
  fields: [
    {
      key: `style`,
      label: `线条样式`,
      type: `select`,
      defaultValue: `solid`,
      options: [
        { label: `实线`, value: `solid` },
        { label: `虚线`, value: `dashed` },
        { label: `点线`, value: `dotted` },
        { label: `双线`, value: `double` },
        { label: `渐隐`, value: `gradient` },
      ],
      emit: (_value, ctx) => buildDividerRules(ctx),
    },
    {
      key: `color`,
      label: `线条颜色`,
      type: `color`,
      defaultValue: PRIMARY_COLOR_TOKEN,
      emit: (_value, ctx) => buildDividerRules(ctx),
    },
    {
      key: `thickness`,
      label: `线条粗细`,
      type: `number`,
      defaultValue: 1,
      min: 1,
      max: 12,
      step: 1,
      suffix: `px`,
      emit: (_value, ctx) => buildDividerRules(ctx),
    },
    numberField(`width`, `线条宽度`, `width`, 100, { min: 20, max: 100, step: 1, unit: `%`, suffix: `%` }),
    numberField(`marginTop`, `上间距`, `margin-top`, 1.6, { min: 0, max: 5, step: 0.1, unit: `em`, suffix: `em` }),
    numberField(`marginBottom`, `下间距`, `margin-bottom`, 1.6, { min: 0, max: 5, step: 0.1, unit: `em`, suffix: `em` }),
  ],
}

function buildDividerRules(ctx: ThemeFieldContext): ThemeCssRule[] {
  const style = String(ctx.get(`style`))
  const color = ctx.color(ctx.get(`color`))
  const thickness = Number(ctx.get(`thickness`))
  const centered = [decl(`margin-left`, `auto`), decl(`margin-right`, `auto`)]

  if (style === `gradient`) {
    return [rule(
      ctx.selector,
      decl(`border`, `0`),
      decl(`height`, `${thickness}px`),
      decl(`background`, `linear-gradient(90deg, transparent, ${color}, transparent)`),
      ...centered,
    )]
  }

  if (style === `solid`) {
    return [rule(
      ctx.selector,
      decl(`border`, `0`),
      decl(`height`, `${thickness}px`),
      decl(`background`, color),
      ...centered,
    )]
  }

  return [rule(
    ctx.selector,
    decl(`border`, `0`),
    decl(`height`, `0`),
    decl(`background`, `transparent`),
    decl(`border-top`, `${thickness}px ${style} ${color}`),
    ...centered,
  )]
}

export const themeDesignerGroups: ThemeGroup[] = [
  baseGroup,
  ...HEADING_LEVELS.map((level, index) => createHeadingGroup(level, index)),
  paragraphGroup,
  linkGroup,
  blockquoteGroup,
  listGroup,
  tableGroup,
  dividerGroup,
  codeBlockGroup,
  inlineCodeGroup,
  imageGroup,
  figcaptionGroup,
]

export const themeDesignerGroupMap: Record<string, ThemeGroup> = Object.fromEntries(
  themeDesignerGroups.map(group => [group.id, group]),
)

export const themeDesignerCategories: ThemeGroupCategory[] = [
  { id: `text`, label: `文字`, groupIds: [`base`, `heading`, `paragraph`, `link`] },
  { id: `block`, label: `区块`, groupIds: [`blockquote`, `list`, `table`, `divider`] },
  { id: `code`, label: `代码`, groupIds: [`codeBlock`, `inlineCode`] },
  { id: `media`, label: `媒体`, groupIds: [`image`, `figcaption`] },
]

export function getThemeField(groupId: string, fieldKey: string): ThemeField | undefined {
  return themeDesignerGroupMap[groupId]?.fields.find(field => field.key === fieldKey)
}

export function isHeadingGroupId(groupId: string): groupId is HeadingLevelId {
  return (HEADING_LEVELS as readonly string[]).includes(groupId)
}
