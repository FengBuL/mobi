import type { BlockCategoryDefinition, BlockFieldSchema, BlockPalette, BlockPreset, BlockState } from '../types'
import {
  compactBlockMarkup,
  createStateFromFields,
  escapeBlockHtml,
  formatBlockText,
  getBlockRootAttrs,
  parseBlockFieldState,
} from '../helpers'

type ListVariant =
  | `number-circle` | `number-square` | `timeline` | `step-line` | `check`
  | `icon` | `cards` | `two-column` | `description` | `roman`
  | `alpha` | `progress` | `compare` | `nested` | `arrow`
  | `dot` | `dash` | `todo` | `star` | `number-rule`

interface ListPresetSeed {
  id: string
  name: string
  description: string
  cue: string
  variant: ListVariant
  palette: BlockPalette
}

interface ListItem {
  index: number
  text: string
  description: string
}

const fields = Array.from({ length: 6 }, (_, index): BlockFieldSchema[] => {
  const number = index + 1
  const samples = [
    [`先明确目标`, `把本次行动要解决的问题写清楚`],
    [`整理必要信息`, `保留会影响判断的事实和约束`],
    [`拆分执行步骤`, `让每一步都有明确的完成标准`],
    [`开始小步验证`, `先用最低成本确认方向是否正确`],
    [`根据反馈调整`, `及时修正偏差，不把问题留到最后`],
    [`完成复盘沉淀`, `记录有效方法，方便下一次直接复用`],
  ]
  return [
    {
      key: `item${number}`,
      label: `条目 ${number}`,
      type: `text` as const,
      required: number === 1,
      placeholder: `输入第 ${number} 条内容`,
      defaultValue: samples[index][0],
    },
    {
      key: `item${number}Desc`,
      label: `条目 ${number} 说明`,
      type: `textarea` as const,
      placeholder: `可选的补充说明`,
      defaultValue: samples[index][1],
    },
  ]
}).flat() satisfies BlockPreset[`fields`]

const palettes = {
  signal: { primary: `#e00019`, secondary: `#ffe2e6`, ink: `#171717`, muted: `#6b6263`, surface: `#fffafa`, border: `#efb9c0` },
  blue: { primary: `#1e6bb8`, secondary: `#dcecff`, ink: `#10233e`, muted: `#55708f`, surface: `#f6faff`, border: `#abc8e7` },
  vermilion: { primary: `#c2352b`, secondary: `#ead6bd`, ink: `#3a3630`, muted: `#817664`, surface: `#faf7f0`, border: `#d8c8b3` },
  teal: { primary: `#168f80`, secondary: `#d5f1ed`, ink: `#173d38`, muted: `#62827d`, surface: `#f4fbfa`, border: `#9fd2ca` },
  navyGold: { primary: `#1b2a4a`, secondary: `#e5d4aa`, ink: `#161c2a`, muted: `#746b5b`, surface: `#fffdf8`, border: `#d8c89f` },
  coral: { primary: `#ef7060`, secondary: `#ffe0d8`, ink: `#3b201d`, muted: `#8f5e58`, surface: `#fff8f6`, border: `#f1b4aa` },
  purple: { primary: `#6d4bc3`, secondary: `#e8e0ff`, ink: `#2f2550`, muted: `#74698e`, surface: `#faf8ff`, border: `#c8b9ed` },
  green: { primary: `#5f8d72`, secondary: `#e0eadf`, ink: `#2f332e`, muted: `#788278`, surface: `#f7faf6`, border: `#bdcebb` },
  amber: { primary: `#b87816`, secondary: `#fff0cb`, ink: `#3f321e`, muted: `#806e51`, surface: `#fffbf1`, border: `#e2c887` },
  graphite: { primary: `#343a40`, secondary: `#eceff1`, ink: `#15181a`, muted: `#687076`, surface: `#fafbfb`, border: `#cdd2d5` },
} satisfies Record<string, BlockPalette>

const seeds: ListPresetSeed[] = [
  { id: `list-orbit-number`, name: `轨道序列`, description: `圆形数字徽章稳定引导连续步骤`, cue: `有序步骤`, variant: `number-circle`, palette: palettes.blue },
  { id: `list-block-index`, name: `方格索引`, description: `硬朗方块序号形成清晰的信息刻度`, cue: `理性`, variant: `number-square`, palette: palettes.signal },
  { id: `list-time-spine`, name: `时间脊线`, description: `左侧竖线串联节点，适合事件与历程`, cue: `时间线`, variant: `timeline`, palette: palettes.vermilion },
  { id: `list-flow-stations`, name: `流程驿站`, description: `连续节点配连接线，强调推进关系`, cue: `流程`, variant: `step-line`, palette: palettes.teal },
  { id: `list-clear-check`, name: `清醒勾选`, description: `实心勾选标记让行动项一眼可扫`, cue: `已确认`, variant: `check`, palette: palettes.green },
  { id: `list-spark-points`, name: `星芒要点`, description: `小型星芒图标点亮并列观点`, cue: `灵感`, variant: `icon`, palette: palettes.purple },
  { id: `list-paper-cards`, name: `纸页卡列`, description: `每条独立成卡，适合信息密度较高的清单`, cue: `卡片`, variant: `cards`, palette: palettes.coral },
  { id: `list-twin-columns`, name: `双列速览`, description: `两栏紧凑排布，缩短短要点的滚动距离`, cue: `速览`, variant: `two-column`, palette: palettes.blue },
  { id: `list-editorial-notes`, name: `编辑注脚`, description: `标题与说明分层呈现，适合解释型要点`, cue: `详解`, variant: `description`, palette: palettes.navyGold },
  { id: `list-roman-ledger`, name: `罗马册页`, description: `罗马数字带来古典而克制的章节感`, cue: `典雅`, variant: `roman`, palette: palettes.vermilion },
  { id: `list-alpha-file`, name: `字母档案`, description: `字母序号与细边底座形成资料卡气质`, cue: `归档`, variant: `alpha`, palette: palettes.graphite },
  { id: `list-progress-route`, name: `进度航线`, description: `完成、进行和待办三种状态逐级显现`, cue: `进度`, variant: `progress`, palette: palettes.teal },
  { id: `list-balance-sheet`, name: `两面清单`, description: `左右分区呈现优势与注意事项`, cue: `对照`, variant: `compare`, palette: palettes.coral },
  { id: `list-branch-notes`, name: `枝叶提要`, description: `主条目下收纳补充说明，形成两级结构`, cue: `层级`, variant: `nested`, palette: palettes.green },
  { id: `list-forward-arrows`, name: `前向路标`, description: `实体箭头持续推动阅读视线`, cue: `行动`, variant: `arrow`, palette: palettes.signal },
  { id: `list-quiet-dots`, name: `静默圆点`, description: `小圆点与充分留白构成耐读的基础清单`, cue: `极简`, variant: `dot`, palette: palettes.graphite },
  { id: `list-manuscript-dash`, name: `文稿短杠`, description: `短横线保留手稿式的自然节奏`, cue: `随笔`, variant: `dash`, palette: palettes.navyGold },
  { id: `list-open-tasks`, name: `留白待办`, description: `空心方框承载尚未完成的行动项`, cue: `待办`, variant: `todo`, palette: palettes.blue },
  { id: `list-priority-stars`, name: `重点星标`, description: `暖色星标突出值得优先关注的事项`, cue: `重点`, variant: `star`, palette: palettes.amber },
  { id: `list-ruled-numbers`, name: `编号分镜`, description: `大号编号与横向分隔线建立编辑秩序`, cue: `分镜`, variant: `number-rule`, palette: palettes.signal },
]

const variants = new Map(seeds.map(seed => [seed.id, seed.variant]))

const presets: BlockPreset[] = seeds.map(seed => ({
  id: seed.id,
  category: `list`,
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

function getItems(state: BlockState) {
  return Array.from({ length: 6 }, (_, index) => {
    const number = index + 1
    return {
      index: number,
      text: String(state[`item${number}`] ?? ``).trim(),
      description: String(state[`item${number}Desc`] ?? ``).trim(),
    }
  }).filter(item => item.text) as ListItem[]
}

function itemText(item: ListItem, palette: BlockPalette, options: { compact?: boolean, nested?: boolean } = {}) {
  const text = `<span style="display:block;margin:0;color:${palette.ink};font-size:${options.compact ? `14px` : `15px`};font-weight:700;line-height:1.6;letter-spacing:0.02em;">${formatBlockText(item.text)}</span>`
  if (!item.description) {
    return text
  }
  const description = options.nested
    ? `<span style="display:block;margin-top:5px;padding-left:14px;color:${palette.muted};font-size:13px;line-height:1.7;letter-spacing:0.02em;"><span style="display:inline-block;width:5px;height:5px;margin-right:8px;border-radius:999px;background-color:${palette.primary};vertical-align:0.15em;"></span>${formatBlockText(item.description)}</span>`
    : `<span style="display:block;margin-top:3px;color:${palette.muted};font-size:12px;line-height:1.65;letter-spacing:0.02em;">${formatBlockText(item.description)}</span>`
  return `${text}${description}`
}

function numberedMarker(label: string, style: string) {
  return `<span style="${style}">${label}</span>`
}

function renderListBody(preset: BlockPreset, state: BlockState) {
  const p = preset.palette
  const items = getItems(state)
  const roman = [`I`, `II`, `III`, `IV`, `V`, `VI`]
  const alpha = [`A`, `B`, `C`, `D`, `E`, `F`]

  switch (variants.get(preset.id)) {
    case `number-circle`:
      return items.map(item => `<div style="display:flex;margin-bottom:14px;align-items:flex-start;"><span style="display:inline-block;width:32px;height:32px;margin-right:12px;border-radius:999px;background-color:${p.primary};color:#ffffff;font-size:13px;font-weight:800;line-height:32px;text-align:center;">${item.index}</span><span style="display:block;flex:1;padding-top:3px;">${itemText(item, p)}</span></div>`).join(``)
    case `number-square`:
      return items.map(item => `<div style="display:flex;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid ${p.border};align-items:flex-start;"><span style="display:inline-block;width:30px;height:30px;margin-right:12px;border-radius:3px;background-color:${p.ink};color:#ffffff;font-size:12px;font-weight:800;line-height:30px;text-align:center;">${String(item.index).padStart(2, `0`)}</span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `timeline`:
      return items.map(item => `<div style="margin-left:9px;padding:0 0 18px 20px;border-left:2px solid ${p.border};"><span style="display:inline-block;width:14px;height:14px;margin-left:-28px;margin-right:13px;border:3px solid ${p.surface};border-radius:999px;background-color:${p.primary};vertical-align:top;box-shadow:0 0 0 1px ${p.primary};"></span><span style="display:inline-block;width:84%;vertical-align:top;">${itemText(item, p)}</span></div>`).join(``)
    case `step-line`:
      return items.map((item, index) => `<div style="display:flex;align-items:stretch;"><span style="display:block;width:36px;margin-right:13px;text-align:center;"><span style="display:inline-block;width:28px;height:28px;border:2px solid ${p.primary};border-radius:999px;background-color:${index === 0 ? p.primary : p.surface};color:${index === 0 ? `#ffffff` : p.primary};font-size:12px;font-weight:800;line-height:24px;text-align:center;">${item.index}</span>${index < items.length - 1 ? `<span style="display:block;width:2px;height:34px;margin-left:17px;background-color:${p.border};"></span>` : ``}</span><span style="display:block;flex:1;padding:2px 0 16px;">${itemText(item, p)}</span></div>`).join(``)
    case `check`:
      return items.map(item => `<div style="display:flex;margin-bottom:11px;padding:11px 13px;border-radius:8px;background-color:${p.surface};align-items:flex-start;"><span style="display:inline-block;width:24px;height:24px;margin-right:11px;border-radius:999px;background-color:${p.primary};color:#ffffff;font-size:14px;font-weight:800;line-height:24px;text-align:center;">✓</span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `icon`:
      return items.map((item, index) => `<div style="display:flex;margin-bottom:13px;align-items:flex-start;"><span style="display:inline-block;width:29px;margin-right:10px;color:${index % 2 ? p.secondary : p.primary};font-size:22px;line-height:1.35;text-align:center;">✦</span><span style="display:block;flex:1;padding-top:1px;">${itemText(item, p)}</span></div>`).join(``)
    case `cards`:
      return items.map(item => `<div style="margin-bottom:12px;padding:14px 15px;border:1px solid ${p.border};border-radius:10px;background-color:${p.surface};box-shadow:4px 4px 0 ${p.secondary};"><span style="display:block;margin-bottom:6px;color:${p.primary};font-size:11px;font-weight:800;line-height:1;letter-spacing:0.16em;">CARD ${String(item.index).padStart(2, `0`)}</span>${itemText(item, p)}</div>`).join(``)
    case `two-column`:
      return items.map((item, index) => `<div style="display:inline-block;width:48%;margin-right:${index % 2 === 0 ? `4%` : `0`};margin-bottom:12px;padding:12px;border:1px solid ${p.border};border-radius:7px;background-color:${p.surface};box-sizing:border-box;vertical-align:top;"><span style="display:inline-block;width:8px;height:8px;margin-right:7px;border-radius:999px;background-color:${p.primary};vertical-align:0.1em;"></span><span style="display:inline-block;width:82%;vertical-align:top;">${itemText(item, p, { compact: true })}</span></div>`).join(``)
    case `description`:
      return items.map(item => `<div style="margin-bottom:15px;padding-left:15px;border-left:4px solid ${p.primary};"><span style="display:block;margin-bottom:4px;color:${p.primary};font-size:11px;font-weight:800;line-height:1;letter-spacing:0.18em;">NOTE ${String(item.index).padStart(2, `0`)}</span>${itemText(item, p)}</div>`).join(``)
    case `roman`:
      return items.map((item, index) => `<div style="display:flex;margin-bottom:16px;align-items:flex-start;"><span style="display:inline-block;width:42px;margin-right:12px;color:${p.primary};font-size:20px;font-weight:500;line-height:1.35;text-align:right;">${roman[index]}</span><span style="display:block;flex:1;padding-left:12px;border-left:1px solid ${p.border};">${itemText(item, p)}</span></div>`).join(``)
    case `alpha`:
      return items.map((item, index) => `<div style="display:flex;margin-bottom:10px;padding:11px 12px;border:1px solid ${p.border};background-color:${p.surface};align-items:flex-start;"><span style="display:inline-block;width:27px;height:27px;margin-right:11px;border-radius:3px;background-color:${p.secondary};color:${p.primary};font-size:12px;font-weight:900;line-height:27px;text-align:center;">${alpha[index]}</span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `progress`:
      return items.map((item, index) => {
        const done = index < 2
        const active = index === 2
        const color = done || active ? p.primary : p.border
        const symbol = done ? `✓` : active ? `●` : `${item.index}`
        return `<div style="display:flex;margin-bottom:12px;align-items:flex-start;"><span style="display:inline-block;width:28px;height:28px;margin-right:11px;border:2px solid ${color};border-radius:999px;background-color:${done ? p.primary : p.surface};color:${done ? `#ffffff` : color};font-size:11px;font-weight:800;line-height:24px;text-align:center;">${symbol}</span><span style="display:block;flex:1;padding-top:2px;opacity:${done ? `0.72` : `1`};">${itemText(item, p)}</span></div>`
      }).join(``)
    case `compare`: {
      const left = items.slice(0, 3)
      const right = items.slice(3)
      const column = (label: string, list: ListItem[], color: string) => `<div style="display:inline-block;width:48%;padding:13px;border:1px solid ${p.border};border-top:4px solid ${color};border-radius:7px;background-color:${p.surface};box-sizing:border-box;vertical-align:top;"><span style="display:block;margin-bottom:11px;color:${color};font-size:12px;font-weight:800;letter-spacing:0.12em;">${label}</span>${list.map(item => `<div style="margin-bottom:10px;"><span style="display:inline-block;width:6px;height:6px;margin-right:7px;border-radius:999px;background-color:${color};vertical-align:0.15em;"></span><span style="display:inline-block;width:84%;vertical-align:top;">${itemText(item, p, { compact: true })}</span></div>`).join(``)}</div>`
      return `${column(`可取之处`, left, p.primary)}<div style="display:inline-block;width:4%;"></div>${column(`留意之处`, right, p.muted)}`
    }
    case `nested`:
      return items.map(item => `<div style="margin-bottom:14px;padding:13px 15px;border-left:3px solid ${p.primary};background-color:${p.surface};">${itemText(item, p, { nested: true })}</div>`).join(``)
    case `arrow`:
      return items.map(item => `<div style="display:flex;margin-bottom:12px;align-items:flex-start;"><span style="display:inline-block;width:30px;margin-right:9px;color:${p.primary};font-size:22px;font-weight:900;line-height:1.25;">➜</span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `dot`:
      return items.map(item => `<div style="display:flex;margin-bottom:13px;align-items:flex-start;"><span style="display:inline-block;width:7px;height:7px;margin:9px 13px 0 3px;border-radius:999px;background-color:${p.primary};"></span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `dash`:
      return items.map(item => `<div style="display:flex;margin-bottom:13px;align-items:flex-start;"><span style="display:inline-block;width:21px;height:2px;margin:11px 12px 0 0;background-color:${p.primary};"></span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `todo`:
      return items.map(item => `<div style="display:flex;margin-bottom:12px;align-items:flex-start;"><span style="display:inline-block;width:20px;height:20px;margin:3px 12px 0 0;border:2px solid ${p.primary};border-radius:3px;background-color:${p.surface};box-sizing:border-box;"></span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `star`:
      return items.map(item => `<div style="display:flex;margin-bottom:12px;padding-bottom:11px;border-bottom:1px dashed ${p.border};align-items:flex-start;"><span style="display:inline-block;width:28px;margin-right:9px;color:${p.primary};font-size:20px;line-height:1.35;text-align:center;">★</span><span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    case `number-rule`:
      return items.map(item => `<div style="display:flex;margin-bottom:15px;padding-bottom:14px;border-bottom:1px solid ${p.border};align-items:flex-start;">${numberedMarker(String(item.index).padStart(2, `0`), `display:inline-block;width:42px;margin-right:13px;color:${p.primary};font-size:25px;font-weight:900;line-height:1;letter-spacing:-0.04em;`)}<span style="display:block;flex:1;">${itemText(item, p)}</span></div>`).join(``)
    default:
      return items.map(item => itemText(item, p)).join(``)
  }
}

function renderMetadata(preset: BlockPreset, state: BlockState) {
  return preset.fields.map((field) => {
    const value = escapeBlockHtml(state[field.key]).replace(/\r/g, `&#13;`).replace(/\n/g, `&#10;`)
    return `<span data-block-field="${field.key}" data-block-value="${value}" style="display:none;">${formatBlockText(state[field.key])}</span>`
  }).join(``)
}

function render(preset: BlockPreset, state: BlockState, withMetadata: boolean) {
  const attrs = withMetadata ? getBlockRootAttrs(preset) : `data-block-export="list"`
  const metadata = withMetadata ? renderMetadata(preset, state) : ``
  return compactBlockMarkup(`
    <section ${attrs} style="margin:24px 0;padding:0;box-sizing:border-box;">
      ${metadata}
      <div style="padding:0;box-sizing:border-box;">${renderListBody(preset, state)}</div>
    </section>
  `)
}

const listCategory: BlockCategoryDefinition = {
  id: `list`,
  name: `列表`,
  description: `步骤、要点、清单与时间线`,
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
      category: `list`,
      presetId,
      state,
      title: String(state.item1 || preset.name),
    }
  },
  toWeChat: (preset, state) => render(preset, state, false),
}

export default listCategory
