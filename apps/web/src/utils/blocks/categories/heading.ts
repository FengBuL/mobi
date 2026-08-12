import type { BlockCategoryDefinition, BlockPalette, BlockPreset, BlockState } from '../types'
import {
  compactBlockMarkup,
  createStateFromFields,
  formatBlockText,
  getBlockFieldAttrs,
  getBlockRootAttrs,
  parseBlockFieldState,
} from '../helpers'

type HeadingVariant =
  | `banner` | `rail` | `double-rule` | `center-rule` | `badge`
  | `index` | `kicker` | `bracket` | `cut` | `pill`
  | `underline` | `highlight` | `quote` | `geometry` | `gradient`
  | `outline` | `split` | `vertical` | `minimal` | `icon`

interface HeadingPresetSeed {
  id: string
  name: string
  description: string
  cue: string
  variant: HeadingVariant
  palette: BlockPalette
}

const fields = [
  { key: `title`, label: `主标题`, type: `text`, required: true, placeholder: `输入章节标题`, defaultValue: `这里是章节标题` },
  { key: `subtitle`, label: `副标题`, type: `text`, placeholder: `可选的补充说明`, defaultValue: `用一句短句交代这一节的重点` },
  { key: `number`, label: `序号`, type: `text`, placeholder: `如 01`, defaultValue: `01` },
] satisfies BlockPreset[`fields`]

const palettes = {
  inkRed: { primary: `#e00019`, secondary: `#ffd8dd`, ink: `#111111`, muted: `#666666`, surface: `#ffffff`, border: `#111111` },
  blue: { primary: `#1e6bb8`, secondary: `#dcecff`, ink: `#10233e`, muted: `#55708f`, surface: `#f5f9ff`, border: `#a9c7e8` },
  vermilion: { primary: `#c2352b`, secondary: `#ead6bd`, ink: `#3a3630`, muted: `#8a7f6a`, surface: `#f7f4ec`, border: `#d8cbb8` },
  teal: { primary: `#168f80`, secondary: `#c8eee8`, ink: `#173d38`, muted: `#62827d`, surface: `#f3fbf9`, border: `#9fd2ca` },
  navyGold: { primary: `#1b2a4a`, secondary: `#d7b56d`, ink: `#121827`, muted: `#746b5b`, surface: `#fffdf8`, border: `#d8c89f` },
  coral: { primary: `#ef7060`, secondary: `#ffe0d8`, ink: `#3b201d`, muted: `#8f5e58`, surface: `#fff8f6`, border: `#f1b4aa` },
  purple: { primary: `#6d4bc3`, secondary: `#e5dcff`, ink: `#2f2550`, muted: `#74698e`, surface: `#faf8ff`, border: `#c8b9ed` },
  green: { primary: `#5f8d72`, secondary: `#e0eadf`, ink: `#2f332e`, muted: `#788278`, surface: `#f7faf6`, border: `#bdcebb` },
} satisfies Record<string, BlockPalette>

const seeds: HeadingPresetSeed[] = [
  { id: `heading-signal-banner`, name: `信号通栏`, description: `高对比通栏色块，适合关键章节开场`, cue: `强层级`, variant: `banner`, palette: palettes.inkRed },
  { id: `heading-editorial-rail`, name: `编辑引线`, description: `左侧粗线配短副标，稳健但不呆板`, cue: `编辑部`, variant: `rail`, palette: palettes.blue },
  { id: `heading-ceremony-rules`, name: `典礼双线`, description: `上下细线夹住标题，克制而庄重`, cue: `仪式感`, variant: `double-rule`, palette: palettes.navyGold },
  { id: `heading-center-horizon`, name: `中央地平线`, description: `标题居中，短线向两侧舒展`, cue: `留白`, variant: `center-rule`, palette: palettes.green },
  { id: `heading-number-seal`, name: `序章印记`, description: `圆形序号徽章引导阅读顺序`, cue: `步骤`, variant: `badge`, palette: palettes.vermilion },
  { id: `heading-swiss-index`, name: `瑞士索引`, description: `大号数字和紧凑标题形成清晰索引`, cue: `结构化`, variant: `index`, palette: palettes.inkRed },
  { id: `heading-magazine-kicker`, name: `刊首眉标`, description: `小号眉标叠主标题，适合专栏和专题`, cue: `杂志`, variant: `kicker`, palette: palettes.navyGold },
  { id: `heading-literary-bracket`, name: `文稿括注`, description: `中文括号包围标题，含蓄而有书卷气`, cue: `人文`, variant: `bracket`, palette: palettes.vermilion },
  { id: `heading-cut-corner`, name: `切角号令`, description: `错位斜角与硬边框营造行动感`, cue: `锋利`, variant: `cut`, palette: palettes.blue },
  { id: `heading-soft-capsule`, name: `柔光胶囊`, description: `圆角标签承载短标题，轻松亲和`, cue: `轻盈`, variant: `pill`, palette: palettes.coral },
  { id: `heading-ink-underline`, name: `墨迹下划`, description: `粗细错落的手写感下划线`, cue: `随笔`, variant: `underline`, palette: palettes.vermilion },
  { id: `heading-marker-stroke`, name: `荧光批注`, description: `半高渐变色带像编辑手中的马克笔`, cue: `重点`, variant: `highlight`, palette: palettes.teal },
  { id: `heading-quoted-statement`, name: `开篇引号`, description: `大引号与标题形成观点式表达`, cue: `观点`, variant: `quote`, palette: palettes.purple },
  { id: `heading-geometry-dots`, name: `几何坐标`, description: `方块与圆点组成理性几何节奏`, cue: `现代`, variant: `geometry`, palette: palettes.blue },
  { id: `heading-dawn-gradient`, name: `晨昏渐层`, description: `自带兜底底色的双色渐变标题`, cue: `视觉焦点`, variant: `gradient`, palette: palettes.purple },
  { id: `heading-hollow-frame`, name: `空心画框`, description: `双层描边和实心投影呈现印刷感`, cue: `复古`, variant: `outline`, palette: palettes.inkRed },
  { id: `heading-duotone-split`, name: `双色分镜`, description: `序号与标题采用两段独立色块`, cue: `分镜`, variant: `split`, palette: palettes.coral },
  { id: `heading-vertical-mark`, name: `纵向题签`, description: `竖向字签作为装饰，正文仍横排易读`, cue: `东方`, variant: `vertical`, palette: palettes.vermilion },
  { id: `heading-pure-type`, name: `素字留白`, description: `只依靠字重、字距和留白建立层级`, cue: `极简`, variant: `minimal`, palette: palettes.green },
  { id: `heading-compass-prefix`, name: `罗盘前缀`, description: `抽象图标前缀配细边底座，适合导览`, cue: `导航`, variant: `icon`, palette: palettes.teal },
]

const variants = new Map(seeds.map(seed => [seed.id, seed.variant]))

const presets: BlockPreset[] = seeds.map(seed => ({
  id: seed.id,
  category: `heading`,
  name: seed.name,
  description: seed.description,
  cue: seed.cue,
  fields,
  palette: seed.palette,
  thumbnail: {
    background: seed.palette.surface,
    foreground: seed.palette.ink,
    accent: seed.palette.primary,
  },
}))

function field(key: string, value: unknown, style: string, tag = `span`) {
  return `<${tag} ${getBlockFieldAttrs(key, value)} style="${style}">${formatBlockText(value)}</${tag}>`
}

function renderHeadingBody(preset: BlockPreset, state: BlockState) {
  const p = preset.palette
  const title = field(`title`, state.title, `display:block;margin:0;color:inherit;font-size:22px;font-weight:800;line-height:1.38;letter-spacing:0.04em;`, `p`)
  const subtitle = state.subtitle
    ? field(`subtitle`, state.subtitle, `display:block;margin:6px 0 0;color:${p.muted};font-size:13px;font-weight:400;line-height:1.65;letter-spacing:0.04em;`, `p`)
    : ``
  const number = field(`number`, state.number, `display:inline-block;color:inherit;font-size:14px;font-weight:800;line-height:1;letter-spacing:0.08em;`)

  switch (variants.get(preset.id)) {
    case `banner`:
      return `<div style="padding:15px 18px;border-radius:4px;background-color:${p.primary};color:#ffffff;box-shadow:6px 6px 0 ${p.secondary};">${title}${subtitle.replace(`color:${p.muted}`, `color:#ffe8eb`)}</div>`
    case `rail`:
      return `<div style="padding:5px 0 5px 15px;border-left:6px solid ${p.primary};color:${p.ink};">${title}${subtitle}</div>`
    case `double-rule`:
      return `<div style="margin-left:8%;margin-right:8%;padding:13px 8px;border-top:1px solid ${p.border};border-bottom:1px solid ${p.border};color:${p.ink};text-align:center;">${title}${subtitle}</div>`
    case `center-rule`:
      return `<div style="text-align:center;color:${p.ink};"><span style="display:inline-block;width:36px;height:2px;margin-right:12px;background-color:${p.primary};vertical-align:0.4em;"></span><span style="display:inline-block;max-width:68%;vertical-align:middle;">${title}</span><span style="display:inline-block;width:36px;height:2px;margin-left:12px;background-color:${p.primary};vertical-align:0.4em;"></span>${subtitle}</div>`
    case `badge`:
      return `<div style="display:flex;align-items:center;color:${p.ink};"><span style="display:inline-block;width:42px;height:42px;margin-right:13px;border-radius:999px;background-color:${p.primary};color:#ffffff;line-height:42px;text-align:center;">${number}</span><span style="display:block;flex:1;">${title}${subtitle}</span></div>`
    case `index`:
      return `<div style="padding-top:10px;border-top:1px solid ${p.border};color:${p.ink};"><span style="display:block;margin-bottom:2px;color:${p.primary};font-size:44px;font-weight:900;line-height:1;letter-spacing:-0.06em;">${number}</span>${title}${subtitle}</div>`
    case `kicker`:
      return `<div style="color:${p.ink};">${field(`number`, state.number, `display:block;margin-bottom:8px;color:${p.primary};font-size:11px;font-weight:800;line-height:1.2;letter-spacing:0.28em;`)}${title}${subtitle}</div>`
    case `bracket`:
      return `<div style="color:${p.ink};text-align:center;"><span style="display:inline-block;margin-right:8px;color:${p.primary};font-size:30px;vertical-align:middle;">〔</span><span style="display:inline-block;max-width:76%;vertical-align:middle;">${title}</span><span style="display:inline-block;margin-left:8px;color:${p.primary};font-size:30px;vertical-align:middle;">〕</span>${subtitle}</div>`
    case `cut`:
      return `<div style="padding:13px 17px;border:2px solid ${p.ink};background-color:${p.surface};color:${p.ink};box-shadow:7px 7px 0 ${p.primary};transform:skew(-3deg);">${title}${subtitle}</div>`
    case `pill`:
      return `<div style="text-align:center;color:${p.ink};"><span style="display:inline-block;padding:10px 22px;border:1px solid ${p.border};border-radius:999px;background-color:${p.secondary};">${title}</span>${subtitle}</div>`
    case `underline`:
      return `<div style="color:${p.ink};">${title}<span style="display:block;width:92px;height:5px;margin-top:8px;border-radius:999px;background-color:${p.primary};transform:rotate(-1deg);"></span><span style="display:block;width:54px;height:2px;margin-top:3px;margin-left:20px;background-color:${p.secondary};transform:rotate(1deg);"></span>${subtitle}</div>`
    case `highlight`:
      return `<div style="color:${p.ink};"><span style="display:inline-block;padding:0 5px;background-color:${p.secondary};background-image:linear-gradient(180deg,transparent 58%,${p.secondary} 58%);">${title}</span>${subtitle}</div>`
    case `quote`:
      return `<div style="padding-left:12px;color:${p.ink};"><span style="display:block;margin-bottom:-18px;color:${p.secondary};font-size:58px;font-weight:900;line-height:1;">“</span>${title}${subtitle}</div>`
    case `geometry`:
      return `<div style="display:flex;align-items:center;color:${p.ink};"><span style="display:inline-block;width:15px;height:15px;margin-right:5px;background-color:${p.primary};transform:rotate(45deg);"></span><span style="display:inline-block;width:7px;height:7px;margin-right:14px;border-radius:999px;background-color:${p.secondary};"></span><span style="display:block;flex:1;">${title}${subtitle}</span></div>`
    case `gradient`:
      return `<div style="padding:16px 18px;border-radius:13px;background-color:${p.primary};background-image:linear-gradient(135deg,${p.primary},${p.secondary});color:#ffffff;box-shadow:0 10px 24px rgba(52,42,90,0.18);">${title}${subtitle.replace(`color:${p.muted}`, `color:#ffffff`)}</div>`
    case `outline`:
      return `<div style="padding:13px 16px;border:2px solid ${p.ink};background-color:${p.surface};color:${p.ink};box-shadow:6px 6px 0 ${p.primary};">${title}${subtitle}</div>`
    case `split`:
      return `<div style="display:flex;align-items:stretch;"><span style="display:inline-block;padding:15px 14px;background-color:${p.primary};color:#ffffff;">${number}</span><span style="display:block;flex:1;padding:11px 15px;background-color:${p.secondary};color:${p.ink};">${title}${subtitle}</span></div>`
    case `vertical`:
      return `<div style="display:flex;align-items:center;color:${p.ink};"><span style="display:inline-block;width:24px;margin-right:14px;padding:8px 3px;border-radius:3px;background-color:${p.primary};color:#ffffff;font-size:12px;line-height:1.15;text-align:center;">章<br/>节</span><span style="display:block;flex:1;">${title}${subtitle}</span></div>`
    case `minimal`:
      return `<div style="padding:5px 0;color:${p.ink};">${title}<span style="display:block;margin-top:7px;color:${p.primary};font-size:11px;line-height:1;letter-spacing:0.34em;">${number}</span>${subtitle}</div>`
    case `icon`:
      return `<div style="padding-bottom:12px;border-bottom:1px solid ${p.border};color:${p.ink};"><span style="display:inline-block;width:30px;height:30px;margin-right:12px;border:2px solid ${p.primary};border-radius:999px;color:${p.primary};font-size:17px;font-weight:800;line-height:26px;text-align:center;vertical-align:middle;">✦</span><span style="display:inline-block;max-width:78%;vertical-align:middle;">${title}</span>${subtitle}</div>`
    default:
      return title
  }
}

function render(preset: BlockPreset, state: BlockState, withMetadata: boolean) {
  const attrs = withMetadata ? getBlockRootAttrs(preset) : `data-block-export="heading"`
  return compactBlockMarkup(`
    <section ${attrs} style="margin:24px 0;padding:0;box-sizing:border-box;">
      <div style="box-sizing:border-box;">${renderHeadingBody(preset, state)}</div>
    </section>
  `)
}

const headingCategory: BlockCategoryDefinition = {
  id: `heading`,
  name: `标题`,
  description: `章节标题、栏目题签与内容转场`,
  presets,
  createDefaultState: preset => createStateFromFields(preset.fields),
  build: (preset, state) => render(preset, state, true),
  parse(raw) {
    const presetId = raw.match(/\bdata-block-preset="([^"]+)"/u)?.[1] ?? ``
    const preset = presets.find(item => item.id === presetId)
    if (!preset) {
      return null
    }
    const state = parseBlockFieldState(raw, preset)
    if (!state) {
      return null
    }
    return {
      category: `heading`,
      presetId,
      state,
      title: String(state.title || preset.name),
    }
  },
  toWeChat: (preset, state) => render(preset, state, false),
}

export default headingCategory
