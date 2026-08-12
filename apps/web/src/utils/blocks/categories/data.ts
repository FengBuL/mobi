import type {
  BlockCategoryDefinition,
  BlockFieldSchema,
  BlockPalette,
  BlockPreset,
  BlockState,
} from '../types'
import {
  compactBlockMarkup,
  createStateFromFields,
  formatBlockText,
  getBlockFieldAttrs,
  getBlockRootAttrs,
  parseBlockFieldState,
} from '../helpers'

type DataVariant =
  | `hero` | `unit` | `percentage` | `progress` | `stars`
  | `compare` | `trend` | `kpi` | `ranking` | `triple`
  | `ring` | `bars` | `data-list` | `milestone` | `countdown`
  | `stacked` | `yoy` | `cards` | `grade` | `timeline`

type FieldSetName =
  | `metric` | `percentage` | `rating` | `compare` | `trend`
  | `ranking` | `triple` | `bars` | `dataList` | `countdown`
  | `stacked` | `timeline` | `grade`

interface DataPresetSeed {
  id: string
  name: string
  description: string
  cue: string
  variant: DataVariant
  fields: FieldSetName
  palette: BlockPalette
}

const metricFields: BlockFieldSchema[] = [
  { key: `value`, label: `数值`, type: `text`, required: true, placeholder: `如 12,860`, defaultValue: `12,860` },
  { key: `unit`, label: `单位`, type: `text`, placeholder: `如 万、亿元`, defaultValue: `人` },
  { key: `label`, label: `指标名称`, type: `text`, required: true, placeholder: `如 累计用户`, defaultValue: `累计用户` },
  { key: `note`, label: `补充说明`, type: `text`, placeholder: `可选说明`, defaultValue: `截至本月统计` },
]

const percentageFields: BlockFieldSchema[] = [
  { key: `percent`, label: `百分比`, type: `number`, required: true, defaultValue: 68, min: 0, max: 100, step: 1 },
  { key: `label`, label: `指标名称`, type: `text`, required: true, defaultValue: `目标完成率` },
  { key: `note`, label: `补充说明`, type: `text`, defaultValue: `年度计划稳步推进` },
]

const compareFields: BlockFieldSchema[] = [
  { key: `value`, label: `左侧数值`, type: `text`, required: true, defaultValue: `72` },
  { key: `label`, label: `左侧标签`, type: `text`, required: true, defaultValue: `方案 A` },
  { key: `compareValue`, label: `右侧数值`, type: `text`, required: true, defaultValue: `48` },
  { key: `compareLabel`, label: `右侧标签`, type: `text`, required: true, defaultValue: `方案 B` },
  { key: `unit`, label: `单位`, type: `text`, defaultValue: `%` },
  { key: `note`, label: `对比说明`, type: `text`, defaultValue: `核心指标横向对照` },
]

const trendFields: BlockFieldSchema[] = [
  { key: `value`, label: `当前数值`, type: `text`, required: true, defaultValue: `24.8` },
  { key: `unit`, label: `单位`, type: `text`, defaultValue: `%` },
  { key: `label`, label: `指标名称`, type: `text`, required: true, defaultValue: `本月增长` },
  { key: `compareValue`, label: `变化幅度`, type: `text`, required: true, defaultValue: `6.2%` },
  { key: `isPositive`, label: `正向增长`, type: `switch`, defaultValue: true },
  { key: `note`, label: `基准说明`, type: `text`, defaultValue: `较上月` },
]

const tripleFields: BlockFieldSchema[] = [
  { key: `item1Label`, label: `指标一名称`, type: `text`, defaultValue: `新增用户` },
  { key: `item1Value`, label: `指标一数值`, type: `text`, defaultValue: `2,480` },
  { key: `item2Label`, label: `指标二名称`, type: `text`, defaultValue: `活跃用户` },
  { key: `item2Value`, label: `指标二数值`, type: `text`, defaultValue: `8,620` },
  { key: `item3Label`, label: `指标三名称`, type: `text`, defaultValue: `转化率` },
  { key: `item3Value`, label: `指标三数值`, type: `text`, defaultValue: `18.6%` },
  { key: `note`, label: `补充说明`, type: `text`, defaultValue: `本期核心数据` },
]

const rankingFields: BlockFieldSchema[] = [
  { key: `item1Label`, label: `第一名`, type: `text`, defaultValue: `华东区域` },
  { key: `item1Value`, label: `第一名数值`, type: `text`, defaultValue: `9,860` },
  { key: `item2Label`, label: `第二名`, type: `text`, defaultValue: `华南区域` },
  { key: `item2Value`, label: `第二名数值`, type: `text`, defaultValue: `8,420` },
  { key: `item3Label`, label: `第三名`, type: `text`, defaultValue: `华北区域` },
  { key: `item3Value`, label: `第三名数值`, type: `text`, defaultValue: `7,350` },
  { key: `label`, label: `榜单名称`, type: `text`, defaultValue: `区域贡献榜` },
]

const barsFields: BlockFieldSchema[] = [
  { key: `item1Label`, label: `项目一`, type: `text`, defaultValue: `内容质量` },
  { key: `item1Value`, label: `项目一占比`, type: `number`, defaultValue: 86, min: 0, max: 100 },
  { key: `item2Label`, label: `项目二`, type: `text`, defaultValue: `用户体验` },
  { key: `item2Value`, label: `项目二占比`, type: `number`, defaultValue: 72, min: 0, max: 100 },
  { key: `item3Label`, label: `项目三`, type: `text`, defaultValue: `传播效率` },
  { key: `item3Value`, label: `项目三占比`, type: `number`, defaultValue: 58, min: 0, max: 100 },
  { key: `label`, label: `图表名称`, type: `text`, defaultValue: `能力维度对比` },
]

const dataListFields: BlockFieldSchema[] = [
  { key: `item1Label`, label: `第一行名称`, type: `text`, defaultValue: `自然流量` },
  { key: `item1Value`, label: `第一行数值`, type: `text`, defaultValue: `58%` },
  { key: `item2Label`, label: `第二行名称`, type: `text`, defaultValue: `推荐流量` },
  { key: `item2Value`, label: `第二行数值`, type: `text`, defaultValue: `27%` },
  { key: `item3Label`, label: `第三行名称`, type: `text`, defaultValue: `搜索流量` },
  { key: `item3Value`, label: `第三行数值`, type: `text`, defaultValue: `15%` },
  { key: `label`, label: `列表名称`, type: `text`, defaultValue: `渠道构成` },
]

const countdownFields: BlockFieldSchema[] = [
  { key: `item1Label`, label: `第一单位`, type: `text`, defaultValue: `天` },
  { key: `item1Value`, label: `第一数值`, type: `text`, defaultValue: `08` },
  { key: `item2Label`, label: `第二单位`, type: `text`, defaultValue: `时` },
  { key: `item2Value`, label: `第二数值`, type: `text`, defaultValue: `16` },
  { key: `item3Label`, label: `第三单位`, type: `text`, defaultValue: `分` },
  { key: `item3Value`, label: `第三数值`, type: `text`, defaultValue: `32` },
  { key: `label`, label: `倒计时说明`, type: `text`, defaultValue: `距离活动开始` },
]

const stackedFields: BlockFieldSchema[] = [
  { key: `item1Label`, label: `分段一名称`, type: `text`, defaultValue: `核心用户` },
  { key: `item1Value`, label: `分段一数值`, type: `number`, defaultValue: 45, min: 0, max: 100 },
  { key: `item2Label`, label: `分段二名称`, type: `text`, defaultValue: `成长用户` },
  { key: `item2Value`, label: `分段二数值`, type: `number`, defaultValue: 35, min: 0, max: 100 },
  { key: `item3Label`, label: `分段三名称`, type: `text`, defaultValue: `新用户` },
  { key: `item3Value`, label: `分段三数值`, type: `number`, defaultValue: 20, min: 0, max: 100 },
  { key: `label`, label: `占比名称`, type: `text`, defaultValue: `用户结构` },
]

const timelineFields: BlockFieldSchema[] = [
  { key: `item1Label`, label: `节点一说明`, type: `text`, defaultValue: `产品立项` },
  { key: `item1Value`, label: `节点一数字`, type: `text`, defaultValue: `01` },
  { key: `item2Label`, label: `节点二说明`, type: `text`, defaultValue: `首版上线` },
  { key: `item2Value`, label: `节点二数字`, type: `text`, defaultValue: `07` },
  { key: `item3Label`, label: `节点三说明`, type: `text`, defaultValue: `用户破万` },
  { key: `item3Value`, label: `节点三数字`, type: `text`, defaultValue: `10K` },
  { key: `label`, label: `时间线名称`, type: `text`, defaultValue: `增长里程` },
]

const gradeFields: BlockFieldSchema[] = [
  { key: `value`, label: `评级`, type: `text`, required: true, defaultValue: `S` },
  { key: `label`, label: `评级名称`, type: `text`, required: true, defaultValue: `综合表现` },
  { key: `note`, label: `评级说明`, type: `text`, defaultValue: `领先同类项目` },
]

const ratingFields: BlockFieldSchema[] = [
  { key: `percent`, label: `评分`, type: `number`, required: true, defaultValue: 92, min: 0, max: 100, step: 1 },
  { key: `label`, label: `评分项目`, type: `text`, required: true, defaultValue: `用户推荐度` },
  { key: `note`, label: `评分说明`, type: `text`, defaultValue: `基于 1,286 份有效反馈` },
]

const fieldSets: Record<FieldSetName, BlockFieldSchema[]> = {
  metric: metricFields,
  percentage: percentageFields,
  rating: ratingFields,
  compare: compareFields,
  trend: trendFields,
  ranking: rankingFields,
  triple: tripleFields,
  bars: barsFields,
  dataList: dataListFields,
  countdown: countdownFields,
  stacked: stackedFields,
  timeline: timelineFields,
  grade: gradeFields,
}

const palettes = {
  signal: { primary: `#e00019`, secondary: `#ffd8dd`, ink: `#111111`, muted: `#6b6465`, surface: `#ffffff`, border: `#e7d9dc` },
  blue: { primary: `#1769e0`, secondary: `#dbe9ff`, ink: `#10233e`, muted: `#60738c`, surface: `#f6f9ff`, border: `#b9d0ef` },
  teal: { primary: `#168f80`, secondary: `#cceee8`, ink: `#173d38`, muted: `#62827d`, surface: `#f3fbf9`, border: `#a6d5ce` },
  gold: { primary: `#b7852d`, secondary: `#f3e3b9`, ink: `#302719`, muted: `#85765d`, surface: `#fffaf0`, border: `#ddc78e` },
  violet: { primary: `#6d4bc3`, secondary: `#e7dfff`, ink: `#2f2550`, muted: `#74698e`, surface: `#faf8ff`, border: `#c9bced` },
  coral: { primary: `#e96652`, secondary: `#ffe0d8`, ink: `#3b201d`, muted: `#8f5e58`, surface: `#fff8f6`, border: `#efb8ae` },
  green: { primary: `#3d8b5f`, secondary: `#dcecdf`, ink: `#20372a`, muted: `#718078`, surface: `#f6faf7`, border: `#b8d1c0` },
  night: { primary: `#ff8a3d`, secondary: `#31445e`, ink: `#fff4e2`, muted: `#adc0d5`, surface: `#0a1626`, border: `#415875` },
} satisfies Record<string, BlockPalette>

const seeds: DataPresetSeed[] = [
  { id: `data-monument-number`, name: `纪念碑数字`, description: `超大数字与极简注脚形成强烈视觉锚点`, cue: `巨型数字`, variant: `hero`, fields: `metric`, palette: palettes.signal },
  { id: `data-unit-ledger`, name: `量纲账本`, description: `数字、单位和指标名像财务摘录般紧凑排列`, cue: `数字单位`, variant: `unit`, fields: `metric`, palette: palettes.gold },
  { id: `data-percent-poster`, name: `百分号海报`, description: `百分比占据画面中心，适合发布关键成果`, cue: `百分比`, variant: `percentage`, fields: `percentage`, palette: palettes.violet },
  { id: `data-progress-track`, name: `目标刻度`, description: `实色水平进度条清楚呈现目标完成度`, cue: `进度`, variant: `progress`, fields: `percentage`, palette: palettes.blue },
  { id: `data-star-verdict`, name: `星芒评鉴`, description: `五星刻度结合百分制评分，适合口碑展示`, cue: `评分`, variant: `stars`, fields: `rating`, palette: palettes.gold },
  { id: `data-dual-balance`, name: `双域天平`, description: `左右双列对照，直观看出两组数字差异`, cue: `对比`, variant: `compare`, fields: `compare`, palette: palettes.coral },
  { id: `data-trend-signal`, name: `趋势信号`, description: `箭头与涨跌语义色共同强调变化方向`, cue: `涨跌`, variant: `trend`, fields: `trend`, palette: palettes.green },
  { id: `data-kpi-terminal`, name: `KPI 终端`, description: `深色仪表盘卡片，聚焦单项经营指标`, cue: `经营指标`, variant: `kpi`, fields: `trend`, palette: palettes.night },
  { id: `data-podium-list`, name: `金榜前三`, description: `奖牌序号与三行名次构成轻量排行榜`, cue: `排行`, variant: `ranking`, fields: `ranking`, palette: palettes.gold },
  { id: `data-triple-window`, name: `三联观察窗`, description: `三栏同屏陈列核心数据，层级清晰均衡`, cue: `三栏统计`, variant: `triple`, fields: `triple`, palette: palettes.blue },
  { id: `data-orbit-progress`, name: `轨道完成环`, description: `动态 SVG 圆环表达进度，中央保留明确数字`, cue: `环形进度`, variant: `ring`, fields: `percentage`, palette: palettes.teal },
  { id: `data-bar-comparison`, name: `横向量尺`, description: `三条等宽量尺比较不同维度的相对水平`, cue: `条形图`, variant: `bars`, fields: `bars`, palette: palettes.violet },
  { id: `data-plain-register`, name: `素面数据簿`, description: `文字型行列结构承载简洁、可扫描的数据`, cue: `数据表`, variant: `data-list`, fields: `dataList`, palette: palettes.blue },
  { id: `data-milestone-stamp`, name: `里程碑印章`, description: `数字印章与说明组合，适合节点成果回顾`, cue: `里程碑`, variant: `milestone`, fields: `metric`, palette: palettes.coral },
  { id: `data-countdown-board`, name: `启幕倒计时`, description: `三段翻牌式数字营造活动临近的节奏感`, cue: `倒计时`, variant: `countdown`, fields: `countdown`, palette: palettes.night },
  { id: `data-stacked-share`, name: `结构切片`, description: `三段实色占比条展示整体内部构成`, cue: `堆叠占比`, variant: `stacked`, fields: `stacked`, palette: palettes.teal },
  { id: `data-yoy-pulse`, name: `同比脉冲`, description: `当前值与变化幅度并置，突出同比或环比信号`, cue: `同比环比`, variant: `yoy`, fields: `trend`, palette: palettes.signal },
  { id: `data-metric-cards`, name: `指标卡阵`, description: `三张紧凑卡片组成轻量化数据看板`, cue: `卡片组`, variant: `cards`, fields: `triple`, palette: palettes.green },
  { id: `data-grade-emblem`, name: `评级徽记`, description: `醒目字母徽章承载 S、A、B 等级结论`, cue: `评级`, variant: `grade`, fields: `grade`, palette: palettes.violet },
  { id: `data-number-timeline`, name: `数字航线`, description: `三段数字节点串联出阶段性增长轨迹`, cue: `时间线`, variant: `timeline`, fields: `timeline`, palette: palettes.blue },
]

const variants = new Map(seeds.map(seed => [seed.id, seed.variant]))

const presets: BlockPreset[] = seeds.map(seed => ({
  id: seed.id,
  category: `data`,
  name: seed.name,
  description: seed.description,
  cue: seed.cue,
  fields: fieldSets[seed.fields],
  palette: seed.palette,
  thumbnail: {
    background: seed.palette.surface,
    foreground: seed.palette.ink,
    accent: seed.palette.primary,
  },
}))

function valueOf(state: BlockState, key: string) {
  return state[key] ?? ``
}

function numberOf(state: BlockState, key: string) {
  const value = Number(valueOf(state, key))
  return Number.isFinite(value) ? value : 0
}

function percentOf(state: BlockState, key = `percent`) {
  return Math.min(100, Math.max(0, numberOf(state, key)))
}

function field(state: BlockState, key: string, style: string, tag = `span`) {
  const value = valueOf(state, key)
  return `<${tag} ${getBlockFieldAttrs(key, value)} style="${style}">${formatBlockText(value)}</${tag}>`
}

function metadataFields(preset: BlockPreset, state: BlockState) {
  return preset.fields
    .map(schema => `<span ${getBlockFieldAttrs(schema.key, valueOf(state, schema.key))} style="display:none;"></span>`)
    .join(``)
}

function normalizeState(preset: BlockPreset, state: BlockState) {
  return Object.fromEntries(
    preset.fields.map(schema => [
      schema.key,
      state[schema.key] === undefined ? schema.defaultValue : state[schema.key],
    ]),
  ) as BlockState
}

function metricColumn(state: BlockState, index: number, palette: BlockPalette, width = `31%`) {
  const labelKey = `item${index}Label`
  const valueKey = `item${index}Value`
  if (!valueOf(state, labelKey) && !valueOf(state, valueKey)) {
    return ``
  }
  return `<span style="display:inline-block;width:${width};max-width:${width} !important;box-sizing:border-box;vertical-align:top;text-align:center;"><span ${getBlockFieldAttrs(valueKey, valueOf(state, valueKey))} style="display:block;color:${palette.primary};font-size:25px;font-weight:850;line-height:1.15;word-break:break-all;">${formatBlockText(valueOf(state, valueKey))}</span><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))} style="display:block;margin-top:7px;color:${palette.muted};font-size:12px;line-height:1.45;">${formatBlockText(valueOf(state, labelKey))}</span></span>`
}

function ringDataUri(percent: number, palette: BlockPalette) {
  const circumference = 264
  const filled = Math.round(circumference * percent / 100)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="${palette.secondary}" stroke-width="9"/><circle cx="50" cy="50" r="42" fill="none" stroke="${palette.primary}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${filled} ${circumference}" transform="rotate(-90 50 50)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function renderBody(preset: BlockPreset, state: BlockState) {
  const p = preset.palette
  const percent = percentOf(state)
  const label = field(state, `label`, `display:block;color:${p.ink};font-size:14px;font-weight:750;line-height:1.5;`)
  const note = valueOf(state, `note`)
    ? field(state, `note`, `display:block;margin-top:7px;color:${p.muted};font-size:12px;line-height:1.55;`)
    : ``

  switch (variants.get(preset.id)) {
    case `hero`:
      return `<div style="padding:22px 20px;border-left:7px solid ${p.primary};background-color:${p.surface};color:${p.ink};box-shadow:0 8px 24px rgba(20,20,20,0.08);">${label}${field(state, `value`, `display:block;margin-top:10px;color:${p.primary};font-size:48px;font-weight:900;line-height:1;letter-spacing:-0.04em;word-break:break-all;`)}${field(state, `unit`, `display:inline-block;margin-top:7px;color:${p.ink};font-size:14px;font-weight:700;line-height:1.3;`)}${note}</div>`
    case `unit`:
      return `<div style="padding:17px 19px;border-top:2px solid ${p.ink};border-bottom:1px solid ${p.border};background-color:${p.surface};color:${p.ink};">${label}<span style="display:block;margin-top:11px;">${field(state, `value`, `display:inline;color:${p.ink};font-size:38px;font-weight:850;line-height:1.1;letter-spacing:-0.03em;word-break:break-all;`)}${field(state, `unit`, `display:inline-block;margin-left:8px;padding:3px 8px;border-radius:999px;background-color:${p.secondary};color:${p.primary};font-size:12px;font-weight:750;line-height:1.3;vertical-align:0.4em;`)}</span>${note}</div>`
    case `percentage`:
      return `<div style="padding:22px 18px;border-radius:16px;background-color:${p.primary};background-image:linear-gradient(135deg,${p.primary},${p.secondary});color:#ffffff;text-align:center;"><span ${getBlockFieldAttrs(`percent`, percent)} style="display:block;color:#ffffff;font-size:52px;font-weight:900;line-height:1;letter-spacing:-0.05em;">${percent}<span style="font-size:24px;">%</span></span><span ${getBlockFieldAttrs(`label`, valueOf(state, `label`))} style="display:block;margin-top:10px;color:#ffffff;font-size:15px;font-weight:750;line-height:1.4;">${formatBlockText(valueOf(state, `label`))}</span>${valueOf(state, `note`) ? field(state, `note`, `display:block;margin-top:6px;color:#ffffff;font-size:12px;line-height:1.5;`) : ``}</div>`
    case `progress`:
      return `<div style="padding:18px;border:1px solid ${p.border};border-radius:10px;background-color:${p.surface};">${label}<span style="display:block;margin-top:12px;height:12px;border-radius:999px;overflow:hidden;background-color:${p.secondary};transform:rotate(0deg);"><span ${getBlockFieldAttrs(`percent`, percent)} style="display:block;width:${percent}%;height:12px;border-radius:999px;background-color:${p.primary};"></span></span><span style="display:block;margin-top:7px;text-align:right;"><span style="color:${p.primary};font-size:18px;font-weight:850;">${percent}%</span></span>${note}</div>`
    case `stars`: {
      const filled = Math.round(percent / 20)
      const stars = Array.from({ length: 5 }, (_, index) => `<span style="display:inline-block;margin-right:4px;color:${index < filled ? p.primary : p.secondary};font-size:27px;line-height:1;">★</span>`).join(``)
      return `<div style="padding:19px;border:1px solid ${p.border};background-color:${p.surface};text-align:center;">${label}<span ${getBlockFieldAttrs(`percent`, percent)} style="display:block;margin-top:11px;">${stars}</span><span style="display:block;margin-top:8px;color:${p.primary};font-size:28px;font-weight:850;line-height:1;">${percent}<span style="font-size:13px;"> / 100</span></span>${note}</div>`
    }
    case `compare`:
      return `<div style="padding:18px 14px;border:1px solid ${p.border};background-color:${p.surface};"><div style="display:flex;align-items:stretch;text-align:center;"><span style="display:inline-block;width:47%;max-width:47% !important;padding:11px 8px;box-sizing:border-box;background-color:${p.secondary};">${field(state, `value`, `display:block;color:${p.primary};font-size:32px;font-weight:900;line-height:1.1;word-break:break-all;`)}${field(state, `label`, `display:block;margin-top:7px;color:${p.ink};font-size:12px;line-height:1.4;`)}</span><span style="display:inline-block;width:6%;max-width:6% !important;box-sizing:border-box;color:${p.muted};font-size:11px;line-height:68px;">VS</span><span style="display:inline-block;width:47%;max-width:47% !important;padding:11px 8px;box-sizing:border-box;background-color:${p.ink};">${field(state, `compareValue`, `display:block;color:#ffffff;font-size:32px;font-weight:900;line-height:1.1;word-break:break-all;`)}${field(state, `compareLabel`, `display:block;margin-top:7px;color:#ffffff;font-size:12px;line-height:1.4;`)}</span></div><span style="display:block;margin-top:8px;text-align:center;">${field(state, `unit`, `display:inline-block;color:${p.muted};font-size:11px;line-height:1.4;`)}${note}</span></div>`
    case `trend`: {
      const positive = Boolean(valueOf(state, `isPositive`))
      const signal = positive ? `#27845a` : `#c83d3d`
      return `<div style="padding:18px;border-left:5px solid ${signal};background-color:${p.surface};box-shadow:0 7px 20px rgba(20,40,30,0.08);">${label}<span style="display:block;margin-top:8px;">${field(state, `value`, `display:inline;color:${p.ink};font-size:35px;font-weight:880;line-height:1.1;word-break:break-all;`)}${field(state, `unit`, `display:inline-block;margin-left:4px;color:${p.muted};font-size:14px;line-height:1.2;`)}</span><span style="display:block;margin-top:9px;color:${signal};font-size:13px;font-weight:750;">${positive ? `▲` : `▼`} ${field(state, `compareValue`, `display:inline;color:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;`)} <span ${getBlockFieldAttrs(`isPositive`, positive)} style="display:none;"></span>${field(state, `note`, `display:inline;color:${p.muted};font-size:12px;font-weight:400;line-height:1.4;`)}</span></div>`
    }
    case `kpi`: {
      const positive = Boolean(valueOf(state, `isPositive`))
      return `<div style="padding:20px;border:1px solid ${p.border};border-radius:13px;background-color:${p.surface};color:${p.ink};box-shadow:7px 7px 0 ${p.secondary};"><span ${getBlockFieldAttrs(`label`, valueOf(state, `label`))} style="display:block;color:${p.muted};font-size:11px;font-weight:750;line-height:1.3;letter-spacing:0.18em;">KPI · ${formatBlockText(valueOf(state, `label`))}</span><span style="display:block;margin-top:13px;">${field(state, `value`, `display:inline;color:${p.ink};font-size:39px;font-weight:900;line-height:1;word-break:break-all;`)}${field(state, `unit`, `display:inline-block;margin-left:6px;color:${p.primary};font-size:14px;font-weight:700;line-height:1.2;`)}</span><span style="display:block;margin-top:12px;color:${positive ? `#5fd09a` : `#ff7b70`};font-size:13px;font-weight:750;">${positive ? `↑` : `↓`} ${field(state, `compareValue`, `display:inline;color:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;`)}<span ${getBlockFieldAttrs(`isPositive`, positive)} style="display:none;"></span></span>${field(state, `note`, `display:block;margin-top:5px;color:${p.muted};font-size:11px;line-height:1.4;`)}</div>`
    }
    case `ranking`: {
      const rows = [1, 2, 3].map((index) => {
        const labelKey = `item${index}Label`
        const valueKey = `item${index}Value`
        if (!valueOf(state, labelKey) && !valueOf(state, valueKey)) return ``
        return `<span style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid ${p.border};"><span style="display:inline-block;width:30px;height:30px;margin-right:10px;border-radius:999px;background-color:${index === 1 ? p.primary : p.secondary};color:${index === 1 ? `#ffffff` : p.primary};font-size:13px;font-weight:850;line-height:30px;text-align:center;">${index}</span><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))} style="display:block;flex:1;color:${p.ink};font-size:13px;line-height:1.4;">${formatBlockText(valueOf(state, labelKey))}</span><span ${getBlockFieldAttrs(valueKey, valueOf(state, valueKey))} style="display:inline-block;margin-left:8px;color:${p.primary};font-size:16px;font-weight:850;line-height:1.2;">${formatBlockText(valueOf(state, valueKey))}</span></span>`
      }).join(``)
      return `<div style="padding:17px 19px;border-top:4px solid ${p.primary};background-color:${p.surface};box-shadow:0 8px 22px rgba(60,45,20,0.08);">${label}${rows}</div>`
    }
    case `triple`:
      return `<div style="padding:18px 12px;border-top:1px solid ${p.border};border-bottom:1px solid ${p.border};background-color:${p.surface};">${field(state, `note`, `display:block;margin-bottom:13px;color:${p.muted};font-size:11px;font-weight:700;line-height:1.3;letter-spacing:0.14em;text-align:center;`)}<div style="display:flex;align-items:flex-start;justify-content:space-between;">${metricColumn(state, 1, p)}${metricColumn(state, 2, p)}${metricColumn(state, 3, p)}</div></div>`
    case `ring`: {
      const uri = ringDataUri(percent, p)
      return `<div style="display:flex;align-items:center;padding:17px;border:1px solid ${p.border};border-radius:14px;background-color:${p.surface};"><span style="display:inline-block;width:112px;max-width:35% !important;height:112px;margin-right:18px;border-radius:999px;background-color:${p.surface};background-image:url('${uri}');text-align:center;line-height:112px;"><span ${getBlockFieldAttrs(`percent`, percent)} style="display:inline-block;color:${p.primary};font-size:23px;font-weight:900;line-height:1;vertical-align:middle;">${percent}%</span></span><span style="display:block;flex:1;">${label}${note}</span></div>`
    }
    case `bars`: {
      const rows = [1, 2, 3].map((index) => {
        const labelKey = `item${index}Label`
        const valueKey = `item${index}Value`
        const width = percentOf(state, valueKey)
        if (!valueOf(state, labelKey) && !valueOf(state, valueKey)) return ``
        return `<span style="display:block;margin-top:12px;"><span style="display:flex;align-items:center;"><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))} style="display:block;flex:1;color:${p.ink};font-size:12px;line-height:1.4;">${formatBlockText(valueOf(state, labelKey))}</span><span style="display:inline-block;color:${p.primary};font-size:12px;font-weight:800;">${width}%</span></span><span style="display:block;margin-top:5px;height:9px;overflow:hidden;border-radius:999px;background-color:${p.secondary};transform:rotate(0deg);"><span ${getBlockFieldAttrs(valueKey, width)} style="display:block;width:${width}%;height:9px;background-color:${p.primary};"></span></span></span>`
      }).join(``)
      return `<div style="padding:18px;border:1px solid ${p.border};background-color:${p.surface};">${label}${rows}</div>`
    }
    case `data-list`: {
      const rows = [1, 2, 3].map((index) => {
        const labelKey = `item${index}Label`
        const valueKey = `item${index}Value`
        if (!valueOf(state, labelKey) && !valueOf(state, valueKey)) return ``
        return `<span style="display:flex;align-items:center;padding:10px 4px;border-bottom:1px solid ${p.border};"><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))} style="display:block;width:65%;max-width:65% !important;color:${p.muted};font-size:13px;line-height:1.4;">${formatBlockText(valueOf(state, labelKey))}</span><span ${getBlockFieldAttrs(valueKey, valueOf(state, valueKey))} style="display:inline-block;width:31%;max-width:31% !important;color:${p.ink};font-size:14px;font-weight:800;line-height:1.4;text-align:right;">${formatBlockText(valueOf(state, valueKey))}</span></span>`
      }).join(``)
      return `<div style="padding:16px 18px;border-top:2px solid ${p.ink};border-bottom:2px solid ${p.ink};background-color:${p.surface};">${label}<span style="display:block;margin-top:8px;">${rows}</span></div>`
    }
    case `milestone`:
      return `<div style="padding:18px;border:2px solid ${p.ink};background-color:${p.surface};box-shadow:7px 7px 0 ${p.primary};"><span style="display:flex;align-items:center;"><span style="display:inline-block;width:82px;height:82px;margin-right:16px;border-radius:999px;background-color:${p.primary};color:#ffffff;text-align:center;line-height:82px;">${field(state, `value`, `display:inline-block;max-width:72px;color:#ffffff;font-size:25px;font-weight:900;line-height:1;vertical-align:middle;word-break:break-all;`)}</span><span style="display:block;flex:1;">${label}${field(state, `unit`, `display:block;margin-top:5px;color:${p.primary};font-size:13px;font-weight:750;line-height:1.3;`)}${note}</span></span></div>`
    case `countdown`:
      return `<div style="padding:20px 12px;border-radius:12px;background-color:${p.surface};color:${p.ink};text-align:center;">${label}<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-top:15px;">${[1, 2, 3].map((index) => {
        const labelKey = `item${index}Label`
        const valueKey = `item${index}Value`
        if (!valueOf(state, labelKey) && !valueOf(state, valueKey)) return ``
        return `<span style="display:inline-block;width:31%;max-width:31% !important;box-sizing:border-box;"><span ${getBlockFieldAttrs(valueKey, valueOf(state, valueKey))} style="display:block;padding:12px 4px;border:1px solid ${p.border};border-radius:8px;background-color:${p.secondary};color:#ffffff;font-size:31px;font-weight:850;line-height:1;word-break:break-all;">${formatBlockText(valueOf(state, valueKey))}</span><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))} style="display:block;margin-top:7px;color:${p.muted};font-size:11px;line-height:1.3;">${formatBlockText(valueOf(state, labelKey))}</span></span>`
      }).join(``)}</div></div>`
    case `stacked`: {
      const values = [1, 2, 3].map(index => Math.max(0, numberOf(state, `item${index}Value`)))
      const total = values.reduce((sum, value) => sum + value, 0)
      const widths = values.map(value => total > 0 ? value * 100 / total : 0)
      const colors = [p.primary, p.secondary, p.ink]
      const segments = widths.map((width, index) => `<span ${getBlockFieldAttrs(`item${index + 1}Value`, values[index])} style="display:inline-block;width:${width}%;height:18px;background-color:${colors[index]};"></span>`).join(``)
      const legends = [1, 2, 3].map((index) => {
        const labelKey = `item${index}Label`
        if (!valueOf(state, labelKey) && values[index - 1] === 0) return ``
        return `<span style="display:inline-block;width:31%;max-width:31% !important;box-sizing:border-box;color:${p.muted};font-size:11px;line-height:1.4;"><span style="display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:999px;background-color:${colors[index - 1]};"></span><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))}>${formatBlockText(valueOf(state, labelKey))}</span><span style="display:block;margin-top:3px;color:${p.ink};font-weight:750;">${total > 0 ? Math.round(widths[index - 1]) : 0}%</span></span>`
      }).join(``)
      return `<div style="padding:18px;border:1px solid ${p.border};background-color:${p.surface};">${label}<span style="display:block;margin-top:13px;height:18px;overflow:hidden;border-radius:999px;background-color:${p.border};transform:rotate(0deg);white-space:nowrap;">${segments}</span><span style="display:flex;align-items:flex-start;justify-content:space-between;margin-top:12px;">${legends}</span></div>`
    }
    case `yoy`: {
      const positive = Boolean(valueOf(state, `isPositive`))
      const signal = positive ? `#258657` : `#c33e3e`
      return `<div style="padding:19px;border-top:4px solid ${signal};background-color:${p.surface};">${label}<span style="display:flex;align-items:flex-end;margin-top:10px;"><span style="display:block;flex:1;">${field(state, `value`, `display:inline;color:${p.ink};font-size:36px;font-weight:900;line-height:1;word-break:break-all;`)}${field(state, `unit`, `display:inline-block;margin-left:4px;color:${p.muted};font-size:13px;line-height:1.2;`)}</span><span style="display:inline-block;padding:5px 9px;border-radius:999px;background-color:${positive ? `#dcefe5` : `#f8dddd`};color:${signal};font-size:12px;font-weight:800;line-height:1.2;">${positive ? `+` : `−`}${field(state, `compareValue`, `display:inline;color:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;`)}</span></span><span ${getBlockFieldAttrs(`isPositive`, positive)} style="display:none;"></span>${field(state, `note`, `display:block;margin-top:9px;color:${p.muted};font-size:12px;line-height:1.4;`)}</div>`
    }
    case `cards`:
      return `<div style="padding:14px 10px;background-color:${p.secondary};"><div style="display:flex;align-items:stretch;justify-content:space-between;">${[1, 2, 3].map((index) => {
        const labelKey = `item${index}Label`
        const valueKey = `item${index}Value`
        if (!valueOf(state, labelKey) && !valueOf(state, valueKey)) return ``
        return `<span style="display:inline-block;width:31%;max-width:31% !important;padding:13px 7px;box-sizing:border-box;background-color:${p.surface};text-align:center;box-shadow:0 4px 12px rgba(30,70,45,0.08);"><span ${getBlockFieldAttrs(valueKey, valueOf(state, valueKey))} style="display:block;color:${p.primary};font-size:21px;font-weight:880;line-height:1.15;word-break:break-all;">${formatBlockText(valueOf(state, valueKey))}</span><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))} style="display:block;margin-top:7px;color:${p.muted};font-size:10px;line-height:1.4;">${formatBlockText(valueOf(state, labelKey))}</span></span>`
      }).join(``)}</div>${field(state, `note`, `display:block;margin-top:10px;color:${p.muted};font-size:11px;line-height:1.4;text-align:center;`)}</div>`
    case `grade`:
      return `<div style="display:flex;align-items:center;padding:18px;border:1px solid ${p.border};border-radius:14px;background-color:${p.surface};"><span style="display:inline-block;width:78px;height:78px;margin-right:17px;border-radius:18px;background-color:${p.primary};color:#ffffff;text-align:center;line-height:78px;box-shadow:6px 6px 0 ${p.secondary};">${field(state, `value`, `display:inline-block;max-width:64px;color:#ffffff;font-size:43px;font-weight:900;line-height:1;vertical-align:middle;word-break:break-all;`)}</span><span style="display:block;flex:1;">${label}${note}</span></div>`
    case `timeline`: {
      const items = [1, 2, 3].map((index) => {
        const labelKey = `item${index}Label`
        const valueKey = `item${index}Value`
        if (!valueOf(state, labelKey) && !valueOf(state, valueKey)) return ``
        return `<span style="display:inline-block;width:31%;max-width:31% !important;box-sizing:border-box;vertical-align:top;text-align:center;"><span ${getBlockFieldAttrs(valueKey, valueOf(state, valueKey))} style="display:inline-block;min-width:40px;padding:8px 5px;border:2px solid ${p.primary};border-radius:999px;background-color:${p.surface};color:${p.primary};font-size:15px;font-weight:850;line-height:1.2;">${formatBlockText(valueOf(state, valueKey))}</span><span ${getBlockFieldAttrs(labelKey, valueOf(state, labelKey))} style="display:block;margin-top:9px;color:${p.muted};font-size:11px;line-height:1.4;">${formatBlockText(valueOf(state, labelKey))}</span></span>`
      }).join(``)
      return `<div style="padding:17px 12px;background-color:${p.surface};">${label}<span style="display:block;height:2px;margin:30px 8% -22px;background-color:${p.border};"></span><div style="display:flex;align-items:flex-start;justify-content:space-between;">${items}</div></div>`
    }
    default:
      return label
  }
}

function render(preset: BlockPreset, inputState: BlockState, withMetadata: boolean) {
  const state = normalizeState(preset, inputState)
  const attrs = withMetadata ? getBlockRootAttrs(preset) : `data-block-export="data"`
  const metadata = withMetadata ? metadataFields(preset, state) : ``
  return compactBlockMarkup(`
    <section ${attrs} style="margin:24px 0;padding:0;box-sizing:border-box;">
      ${metadata}
      <div style="box-sizing:border-box;">${renderBody(preset, state)}</div>
    </section>
  `)
}

const dataCategory: BlockCategoryDefinition = {
  id: `data`,
  name: `数据`,
  description: `数字、指标、进度、评分与轻量图表`,
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
      category: `data`,
      presetId,
      state,
      title: String(state.label || preset.name),
    }
  },
  toWeChat: (preset, state) => render(preset, state, false),
}

export default dataCategory
