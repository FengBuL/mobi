import type { BlockCategoryDefinition, BlockPalette, BlockPreset, BlockState } from '../types'
import {
  compactBlockMarkup,
  createStateFromFields,
  formatBlockText,
  getBlockFieldAttrs,
  getBlockRootAttrs,
  parseBlockFieldState,
} from '../helpers'

type DividerVariant =
  | `hairline` | `bold` | `dashed` | `dotted` | `double`
  | `fade` | `flourish` | `triple-dot` | `diamond` | `asterisk`
  | `wave` | `zigzag` | `chapter` | `compass` | `caption`
  | `gradient-band` | `ornament-band` | `down-arrow` | `asymmetric` | `stitch`

interface DividerPresetSeed {
  id: string
  name: string
  description: string
  cue: string
  variant: DividerVariant
  fields: BlockPreset[`fields`]
  palette: BlockPalette
}

const noFields = [] satisfies BlockPreset[`fields`]

const chapterFields = [
  { key: `number`, label: `章节序号`, type: `text`, required: true, placeholder: `如 03`, defaultValue: `03` },
  { key: `subtitle`, label: `章节提示`, type: `text`, placeholder: `可选的章节提示`, defaultValue: `下一章节` },
] satisfies BlockPreset[`fields`]

const captionFields = [
  { key: `title`, label: `分隔文字`, type: `text`, required: true, placeholder: `输入分隔文字`, defaultValue: `以下正文` },
  { key: `subtitle`, label: `副文案`, type: `text`, placeholder: `可选的补充说明`, defaultValue: `继续向下阅读` },
] satisfies BlockPreset[`fields`]

const palettes = {
  graphite: { primary: `#202124`, secondary: `#d9dce1`, ink: `#202124`, muted: `#74777d`, surface: `#ffffff`, border: `#c9ccd1` },
  signal: { primary: `#e00019`, secondary: `#ffd8dd`, ink: `#171717`, muted: `#787878`, surface: `#ffffff`, border: `#e5aab1` },
  blue: { primary: `#1e6bb8`, secondary: `#dcecff`, ink: `#10233e`, muted: `#55708f`, surface: `#f5f9ff`, border: `#a9c7e8` },
  vermilion: { primary: `#c2352b`, secondary: `#ead6bd`, ink: `#3a3630`, muted: `#8a7f6a`, surface: `#f7f4ec`, border: `#d8cbb8` },
  teal: { primary: `#168f80`, secondary: `#c8eee8`, ink: `#173d38`, muted: `#62827d`, surface: `#f3fbf9`, border: `#9fd2ca` },
  navyGold: { primary: `#1b2a4a`, secondary: `#d7b56d`, ink: `#121827`, muted: `#746b5b`, surface: `#fffdf8`, border: `#d8c89f` },
  coral: { primary: `#ef7060`, secondary: `#ffe0d8`, ink: `#3b201d`, muted: `#8f5e58`, surface: `#fff8f6`, border: `#f1b4aa` },
  purple: { primary: `#6d4bc3`, secondary: `#e5dcff`, ink: `#2f2550`, muted: `#74698e`, surface: `#faf8ff`, border: `#c8b9ed` },
  green: { primary: `#5f8d72`, secondary: `#e0eadf`, ink: `#2f332e`, muted: `#788278`, surface: `#f7faf6`, border: `#bdcebb` },
} satisfies Record<string, BlockPalette>

const seeds: DividerPresetSeed[] = [
  { id: `divider-retina-hairline`, name: `纸上发丝`, description: `半像素浅线轻轻停顿，不打断阅读呼吸`, cue: `极轻`, variant: `hairline`, fields: noFields, palette: palettes.graphite },
  { id: `divider-editorial-bar`, name: `编辑重杠`, description: `通栏粗黑实线建立强硬章节边界`, cue: `重音`, variant: `bold`, fields: noFields, palette: palettes.graphite },
  { id: `divider-field-notes`, name: `田野虚轨`, description: `宽松虚线带来手册与观察笔记气质`, cue: `手记`, variant: `dashed`, fields: noFields, palette: palettes.green },
  { id: `divider-rain-dots`, name: `细雨点迹`, description: `密集点线形成轻快而连续的节拍`, cue: `轻快`, variant: `dotted`, fields: noFields, palette: palettes.blue },
  { id: `divider-ceremony-double`, name: `典礼双弦`, description: `上下双线拉出克制庄重的仪式感`, cue: `庄重`, variant: `double`, fields: noFields, palette: palettes.navyGold },
  { id: `divider-fading-horizon`, name: `雾隐地平线`, description: `由中央向两端渐隐，并以细线保证降级可见`, cue: `渐隐`, variant: `fade`, fields: noFields, palette: palettes.blue },
  { id: `divider-oriental-flourish`, name: `卷叶停云`, description: `古典卷叶符号停在短线中央，含蓄东方`, cue: `人文`, variant: `flourish`, fields: noFields, palette: palettes.vermilion },
  { id: `divider-three-breaths`, name: `三息之间`, description: `三个大小递进的圆点形成短促呼吸`, cue: `停顿`, variant: `triple-dot`, fields: noFields, palette: palettes.teal },
  { id: `divider-diamond-axis`, name: `菱镜中轴`, description: `几何菱形嵌入水平轴线，理性而精确`, cue: `几何`, variant: `diamond`, fields: noFields, palette: palettes.purple },
  { id: `divider-manuscript-stars`, name: `稿纸星芒`, description: `三枚星号模拟书稿转场，朴素有文学感`, cue: `书卷`, variant: `asterisk`, fields: noFields, palette: palettes.graphite },
  { id: `divider-tidal-wave`, name: `潮汐曲线`, description: `自适应波浪 SVG 覆盖实线兜底，柔和流动`, cue: `流动`, variant: `wave`, fields: noFields, palette: palettes.teal },
  { id: `divider-cut-zigzag`, name: `折纸锯齿`, description: `连续折线制造锐利节奏，并保留底部细线`, cue: `锋利`, variant: `zigzag`, fields: noFields, palette: palettes.signal },
  { id: `divider-chapter-index`, name: `章节坐标`, description: `大号章节数字压在线轴中央，突出结构推进`, cue: `索引`, variant: `chapter`, fields: chapterFields, palette: palettes.signal },
  { id: `divider-compass-mark`, name: `罗盘刻度`, description: `小型 SVG 罗盘配两侧短线，引导阅读方向`, cue: `导航`, variant: `compass`, fields: noFields, palette: palettes.blue },
  { id: `divider-caption-bridge`, name: `转场题签`, description: `文字题签叠在线上，可承载提示与副文案`, cue: `叙事`, variant: `caption`, fields: captionFields, palette: palettes.vermilion },
  { id: `divider-spectrum-band`, name: `晨昏彩带`, description: `渐变细彩条提供醒目转场，纯色底保证降级`, cue: `明快`, variant: `gradient-band`, fields: noFields, palette: palettes.purple },
  { id: `divider-ornament-ribbon`, name: `金箔纹带`, description: `重复实体菱纹组成装饰带，呈现复古精致感`, cue: `华饰`, variant: `ornament-band`, fields: noFields, palette: palettes.navyGold },
  { id: `divider-downward-guide`, name: `向下引航`, description: `双层下箭头明确提示内容仍在继续`, cue: `引导`, variant: `down-arrow`, fields: noFields, palette: palettes.teal },
  { id: `divider-offset-balance`, name: `偏置平衡`, description: `左侧长粗线与右侧短细线形成不对称张力`, cue: `现代`, variant: `asymmetric`, fields: noFields, palette: palettes.coral },
  { id: `divider-tailor-stitch`, name: `裁缝针脚`, description: `短实线与点状针脚交替，带手作温度`, cue: `手作`, variant: `stitch`, fields: noFields, palette: palettes.green },
]

const variants = new Map(seeds.map(seed => [seed.id, seed.variant]))

const presets: BlockPreset[] = seeds.map(seed => ({
  id: seed.id,
  category: `divider`,
  name: seed.name,
  description: seed.description,
  cue: seed.cue,
  fields: seed.fields,
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

function renderDividerBody(preset: BlockPreset, state: BlockState) {
  const p = preset.palette

  switch (variants.get(preset.id)) {
    case `hairline`:
      return `<section style="height:1px;border-top:1px solid ${p.border};transform:scale(1,0.5);transform-origin:0 0;"></section>`
    case `bold`:
      return `<section style="height:6px;background-color:${p.primary};"></section>`
    case `dashed`:
      return `<section style="margin-left:5%;margin-right:5%;border-top:2px dashed ${p.primary};"></section>`
    case `dotted`:
      return `<section style="margin-left:12%;margin-right:12%;border-top:3px dotted ${p.primary};"></section>`
    case `double`:
      return `<section style="margin-left:7%;margin-right:7%;padding-top:5px;border-top:1px solid ${p.primary};border-bottom:3px solid ${p.secondary};"></section>`
    case `fade`:
      return `<section style="height:2px;border-top:1px solid ${p.border};background-color:${p.border};background-image:linear-gradient(90deg,${p.surface},${p.primary},${p.surface});"></section>`
    case `flourish`:
      return `<section style="text-align:center;"><span style="display:inline-block;width:28%;border-top:1px solid ${p.border};vertical-align:0.35em;"></span><span style="display:inline-block;margin-left:12px;margin-right:12px;color:${p.primary};font-size:23px;line-height:1;">❧</span><span style="display:inline-block;width:28%;border-top:1px solid ${p.border};vertical-align:0.35em;"></span></section>`
    case `triple-dot`:
      return `<section style="text-align:center;"><span style="display:inline-block;width:5px;height:5px;border-radius:999px;background-color:${p.secondary};vertical-align:middle;"></span><span style="display:inline-block;width:8px;height:8px;margin-left:11px;margin-right:11px;border-radius:999px;background-color:${p.primary};vertical-align:middle;"></span><span style="display:inline-block;width:5px;height:5px;border-radius:999px;background-color:${p.secondary};vertical-align:middle;"></span></section>`
    case `diamond`:
      return `<section style="text-align:center;"><span style="display:inline-block;width:31%;border-top:1px solid ${p.border};vertical-align:middle;"></span><span style="display:inline-block;width:12px;height:12px;margin-left:13px;margin-right:13px;border:2px solid ${p.primary};background-color:${p.surface};transform:rotate(45deg);vertical-align:middle;"></span><span style="display:inline-block;width:31%;border-top:1px solid ${p.border};vertical-align:middle;"></span></section>`
    case `asterisk`:
      return `<section style="color:${p.primary};font-size:18px;line-height:1;text-align:center;letter-spacing:0.7em;text-indent:0.7em;">＊ ＊ ＊</section>`
    case `wave`:
      return `<section style="margin-left:8%;margin-right:8%;border-bottom:1px solid ${p.border};"><svg viewBox="0 0 320 14" preserveAspectRatio="none" style="display:block;width:100%;height:14px;margin-bottom:-1px;"><path d="M0 7 C20 0 40 14 60 7 S100 0 120 7 S160 14 180 7 S220 0 240 7 S280 14 320 7" style="fill:none;stroke:${p.primary};stroke-width:2;"></path></svg></section>`
    case `zigzag`:
      return `<section style="margin-left:6%;margin-right:6%;border-bottom:1px solid ${p.border};"><svg viewBox="0 0 320 14" preserveAspectRatio="none" style="display:block;width:100%;height:14px;margin-bottom:-1px;"><path d="M0 12 L16 2 L32 12 L48 2 L64 12 L80 2 L96 12 L112 2 L128 12 L144 2 L160 12 L176 2 L192 12 L208 2 L224 12 L240 2 L256 12 L272 2 L288 12 L304 2 L320 12" style="fill:none;stroke:${p.primary};stroke-width:2;"></path></svg></section>`
    case `chapter`: {
      const number = field(`number`, state.number, `display:inline-block;padding-left:12px;padding-right:12px;background-color:${p.surface};color:${p.primary};font-size:38px;font-weight:900;line-height:1;letter-spacing:-0.05em;vertical-align:middle;`)
      const subtitle = state.subtitle
        ? field(`subtitle`, state.subtitle, `display:block;margin-top:7px;color:${p.muted};font-size:11px;line-height:1.3;letter-spacing:0.22em;text-align:center;`)
        : field(`subtitle`, state.subtitle, `display:none;`)
      return `<section style="text-align:center;"><span style="display:inline-block;width:28%;border-top:2px solid ${p.ink};vertical-align:middle;"></span>${number}<span style="display:inline-block;width:28%;border-top:2px solid ${p.ink};vertical-align:middle;"></span>${subtitle}</section>`
    }
    case `compass`:
      return `<section style="text-align:center;"><span style="display:inline-block;width:27%;border-top:1px solid ${p.border};vertical-align:middle;"></span><svg viewBox="0 0 36 36" style="display:inline-block;width:36px;height:36px;margin-left:13px;margin-right:13px;vertical-align:middle;"><circle cx="18" cy="18" r="15" style="fill:${p.surface};stroke:${p.primary};stroke-width:1.5;"></circle><path d="M22.5 13.5 L20 20 L13.5 22.5 L16 16 Z" style="fill:${p.primary};"></path><circle cx="18" cy="18" r="2" style="fill:${p.secondary};"></circle></svg><span style="display:inline-block;width:27%;border-top:1px solid ${p.border};vertical-align:middle;"></span></section>`
    case `caption`: {
      const title = field(`title`, state.title, `display:inline-block;padding:5px 14px;border:1px solid ${p.primary};border-radius:999px;background-color:${p.surface};color:${p.primary};font-size:13px;font-weight:700;line-height:1.4;letter-spacing:0.12em;`)
      const subtitle = state.subtitle
        ? field(`subtitle`, state.subtitle, `display:block;margin-top:7px;color:${p.muted};font-size:11px;line-height:1.4;letter-spacing:0.08em;`)
        : field(`subtitle`, state.subtitle, `display:none;`)
      return `<section style="border-top:1px dashed ${p.border};text-align:center;"><span style="display:inline-block;margin-top:-16px;background-color:${p.surface};">${title}</span>${subtitle}</section>`
    }
    case `gradient-band`:
      return `<section style="height:5px;margin-left:9%;margin-right:9%;border-radius:999px;background-color:${p.primary};background-image:linear-gradient(90deg,${p.primary},${p.secondary},${p.primary});box-shadow:0 3px 10px ${p.secondary};"></section>`
    case `ornament-band`:
      return `<section style="text-align:center;"><span style="display:inline-block;width:19%;border-top:1px solid ${p.border};vertical-align:middle;"></span><span style="display:inline-block;margin-left:12px;margin-right:12px;padding:5px 12px;border-top:1px solid ${p.secondary};border-bottom:1px solid ${p.secondary};color:${p.primary};font-size:13px;line-height:1;letter-spacing:0.48em;text-indent:0.48em;vertical-align:middle;">◆◇◆◇◆</span><span style="display:inline-block;width:19%;border-top:1px solid ${p.border};vertical-align:middle;"></span></section>`
    case `down-arrow`:
      return `<section style="text-align:center;"><span style="display:block;width:46%;margin-left:auto;margin-right:auto;border-top:1px solid ${p.border};"></span><span style="display:inline-block;margin-top:7px;color:${p.secondary};font-size:18px;line-height:0.7;">⌄</span><span style="display:block;margin-top:-7px;color:${p.primary};font-size:22px;line-height:1;">⌄</span></section>`
    case `asymmetric`:
      return `<section style="display:flex;align-items:center;"><span style="display:block;width:68%;height:5px;background-color:${p.primary};"></span><span style="display:block;width:8px;height:8px;margin-left:10px;border-radius:999px;background-color:${p.secondary};"></span><span style="display:block;width:14%;margin-left:10px;border-top:1px solid ${p.ink};"></span></section>`
    case `stitch`:
      return `<section style="text-align:center;"><span style="display:inline-block;width:20%;border-top:3px solid ${p.primary};vertical-align:middle;"></span><span style="display:inline-block;width:34%;margin-left:9px;margin-right:9px;border-top:3px dotted ${p.secondary};vertical-align:middle;"></span><span style="display:inline-block;width:20%;border-top:3px solid ${p.primary};vertical-align:middle;"></span></section>`
    default:
      return `<section style="border-top:1px solid ${p.border};"></section>`
  }
}

function render(preset: BlockPreset, state: BlockState, withMetadata: boolean) {
  const attrs = withMetadata ? getBlockRootAttrs(preset) : `data-block-export="divider"`
  return compactBlockMarkup(`
    <section ${attrs} style="margin:30px 0;padding:0;box-sizing:border-box;">
      <section style="width:100%;box-sizing:border-box;">${renderDividerBody(preset, state)}</section>
    </section>
  `)
}

const dividerCategory: BlockCategoryDefinition = {
  id: `divider`,
  name: `分隔`,
  description: `段落停顿、章节过渡与阅读节奏`,
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
      category: `divider`,
      presetId,
      state,
      title: String(state.title || state.number || preset.name),
    }
  },
  toWeChat: (preset, state) => render(preset, state, false),
}

export default dividerCategory
