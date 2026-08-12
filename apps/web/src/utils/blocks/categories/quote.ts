import type { BlockCategoryDefinition, BlockPalette, BlockPreset, BlockState } from '../types'
import {
  compactBlockMarkup,
  createStateFromFields,
  formatBlockText,
  getBlockFieldAttrs,
  getBlockRootAttrs,
  parseBlockFieldState,
} from '../helpers'

type QuoteVariant =
  | `opening` | `rail` | `card` | `centered` | `bubble`
  | `interview` | `note` | `excerpt` | `poster` | `enclosed`
  | `italic` | `signature` | `source` | `hanging` | `wash`
  | `frame` | `rules` | `vertical-marks` | `seal` | `commentary`

interface QuotePresetSeed {
  id: string
  name: string
  description: string
  cue: string
  variant: QuoteVariant
  palette: BlockPalette
}

const fields = [
  { key: `quote`, label: `引文正文`, type: `textarea`, required: true, placeholder: `输入引文、金句或观点`, defaultValue: `真正重要的进步，往往始于一次诚实的追问。` },
  { key: `author`, label: `作者 / 署名`, type: `text`, placeholder: `可选，如 林清玄`, defaultValue: `佚名` },
  { key: `source`, label: `出处`, type: `text`, placeholder: `可选，如《人间草木》`, defaultValue: `摘录` },
  { key: `question`, label: `访谈问题`, type: `textarea`, placeholder: `访谈问答类预设使用`, defaultValue: `你如何判断一件事值得长期投入？` },
  { key: `answer`, label: `访谈回答`, type: `textarea`, placeholder: `访谈问答类预设使用`, defaultValue: `看它是否让你在困难时仍愿意继续靠近。` },
  { key: `note`, label: `评注`, type: `textarea`, placeholder: `批注或多段引文使用`, defaultValue: `这句话提醒我们，判断力来自持续行动后的校准。` },
  { key: `work`, label: `书名 / 作品`, type: `text`, placeholder: `书摘类预设使用`, defaultValue: `《思想的尺度》` },
  { key: `page`, label: `页码`, type: `text`, placeholder: `如 P.128`, defaultValue: `P.128` },
] satisfies BlockPreset[`fields`]

const palettes = {
  editorial: { primary: `#d92142`, secondary: `#f7dfe4`, ink: `#171717`, muted: `#666666`, surface: `#ffffff`, border: `#d8d8d8` },
  cobalt: { primary: `#2456a6`, secondary: `#dfe9f8`, ink: `#17233a`, muted: `#61708a`, surface: `#f7faff`, border: `#b8c9e3` },
  paper: { primary: `#b34335`, secondary: `#ead9c2`, ink: `#3a352e`, muted: `#817665`, surface: `#f8f4e9`, border: `#d8cbb8` },
  sage: { primary: `#65866f`, secondary: `#dfe9df`, ink: `#303832`, muted: `#748078`, surface: `#f5f8f4`, border: `#bdccbf` },
  violet: { primary: `#6b54a3`, secondary: `#e9e2f7`, ink: `#302943`, muted: `#776d8d`, surface: `#faf8fd`, border: `#cfc2e5` },
  amber: { primary: `#b87520`, secondary: `#f7e4bc`, ink: `#3d3020`, muted: `#89745c`, surface: `#fffaf0`, border: `#dfc994` },
  night: { primary: `#f29b55`, secondary: `#263d58`, ink: `#f7ead8`, muted: `#b9c7d7`, surface: `#101d2d`, border: `#455a70` },
  cyan: { primary: `#168f80`, secondary: `#d5efeb`, ink: `#173d38`, muted: `#68827e`, surface: `#f4fbf9`, border: `#a9d3cc` },
} satisfies Record<string, BlockPalette>

const seeds: QuotePresetSeed[] = [
  { id: `quote-opening-mark`, name: `卷首回声`, description: `巨型开引号下承一段郑重陈述`, cue: `开场`, variant: `opening`, palette: palettes.editorial },
  { id: `quote-editorial-rail`, name: `编辑侧注`, description: `粗细双竖线建立清晰的引文层级`, cue: `稳健`, variant: `rail`, palette: palettes.cobalt },
  { id: `quote-paper-card`, name: `纸页藏句`, description: `柔和纸色卡片配轻投影与出处`, cue: `温润`, variant: `card`, palette: palettes.paper },
  { id: `quote-center-statement`, name: `留白宣言`, description: `无引号居中大字，靠留白凸显观点`, cue: `极简`, variant: `centered`, palette: palettes.sage },
  { id: `quote-dialogue-bubble`, name: `圆桌发言`, description: `圆润气泡与短尾标记呈现对话感`, cue: `交流`, variant: `bubble`, palette: palettes.cyan },
  { id: `quote-interview-exchange`, name: `问答切片`, description: `问与答分层排布，适合人物访谈`, cue: `访谈`, variant: `interview`, palette: palettes.cobalt },
  { id: `quote-margin-note`, name: `案头批笺`, description: `便签底色与倾斜笔触承载批注`, cue: `手记`, variant: `note`, palette: palettes.amber },
  { id: `quote-book-excerpt`, name: `书页坐标`, description: `书名、页码和摘录组成阅读卡片`, cue: `书摘`, variant: `excerpt`, palette: palettes.paper },
  { id: `quote-type-poster`, name: `醒目金句`, description: `高对比大字与实心投影形成海报感`, cue: `传播`, variant: `poster`, palette: palettes.editorial },
  { id: `quote-double-embrace`, name: `双引相拥`, description: `开合引号从两端包围正文`, cue: `经典`, variant: `enclosed`, palette: palettes.violet },
  { id: `quote-literary-italic`, name: `斜体余韵`, description: `细斜体与宽行距营造文学停顿`, cue: `人文`, variant: `italic`, palette: palettes.sage },
  { id: `quote-author-signature`, name: `署名侧影`, description: `正文与作者签名形成明确落款`, cue: `人物`, variant: `signature`, palette: palettes.night },
  { id: `quote-source-ledger`, name: `出处档案`, description: `来源眉标与正文组成克制档案条目`, cue: `溯源`, variant: `source`, palette: palettes.cobalt },
  { id: `quote-hanging-glyph`, name: `悬字引声`, description: `引号向左悬出，正文保持整齐起线`, cue: `杂志`, variant: `hanging`, palette: palettes.editorial },
  { id: `quote-color-wash`, name: `雾色观点`, description: `纯色浅底承载适合长读的观点段落`, cue: `舒缓`, variant: `wash`, palette: palettes.cyan },
  { id: `quote-hairline-frame`, name: `细框陈词`, description: `双层细边框呈现理性而精致的引文`, cue: `克制`, variant: `frame`, palette: palettes.violet },
  { id: `quote-ceremony-rules`, name: `上下弦音`, description: `上下分隔线夹住居中的完整引语`, cue: `庄重`, variant: `rules`, palette: palettes.night },
  { id: `quote-vertical-punctuation`, name: `纵引题签`, description: `纵向排列的引号装饰强化东方节奏`, cue: `东方`, variant: `vertical-marks`, palette: palettes.paper },
  { id: `quote-seal-imprint`, name: `朱印摘句`, description: `方形朱印搭配宣纸底与作者落款`, cue: `古意`, variant: `seal`, palette: palettes.paper },
  { id: `quote-text-commentary`, name: `引评对读`, description: `引文与评注上下分区，适合观点拆解`, cue: `解析`, variant: `commentary`, palette: palettes.sage },
]

const variants = new Map(seeds.map(seed => [seed.id, seed.variant]))

const presets: BlockPreset[] = seeds.map(seed => ({
  id: seed.id,
  category: `quote`,
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

function byline(preset: BlockPreset, state: BlockState, align = `right`) {
  const p = preset.palette
  const author = state.author
    ? field(`author`, state.author, `display:inline;color:${p.ink};font-weight:700;`)
    : ``
  const source = state.source
    ? field(`source`, state.source, `display:inline;color:${p.muted};`)
    : ``
  if (!author && !source) {
    return ``
  }
  return `<p style="margin:12px 0 0;color:${p.muted};font-size:12px;line-height:1.6;letter-spacing:0.05em;text-align:${align};">${author}${author && source ? ` · ` : ``}${source}</p>`
}

function renderQuoteBody(preset: BlockPreset, state: BlockState) {
  const p = preset.palette
  const quote = field(`quote`, state.quote, `display:block;margin:0;color:inherit;font-size:16px;font-weight:500;line-height:1.9;letter-spacing:0.035em;`, `p`)

  switch (variants.get(preset.id)) {
    case `opening`:
      return `<div style="padding:4px 18px 18px;border-bottom:4px solid ${p.primary};color:${p.ink};"><span style="display:block;margin-bottom:-28px;color:${p.secondary};font-size:82px;font-weight:900;line-height:1;">“</span>${quote}${byline(preset, state)}</div>`
    case `rail`:
      return `<div style="padding:14px 17px;border-left:6px solid ${p.primary};background-color:${p.surface};box-shadow:-3px 0 0 ${p.secondary};color:${p.ink};">${quote}${byline(preset, state)}</div>`
    case `card`:
      return `<div style="padding:22px 20px;border:1px solid ${p.border};border-radius:12px;background-color:${p.surface};color:${p.ink};box-shadow:0 8px 20px rgba(74,60,40,0.10);"><span style="display:block;margin-bottom:12px;color:${p.primary};font-size:12px;font-weight:800;letter-spacing:0.22em;">QUOTE</span>${quote}${byline(preset, state)}</div>`
    case `centered`:
      return `<div style="margin-left:8%;margin-right:8%;padding:18px 0;color:${p.ink};text-align:center;">${field(`quote`, state.quote, `display:block;margin:0;color:inherit;font-size:20px;font-weight:700;line-height:1.8;letter-spacing:0.08em;`, `p`)}<span style="display:block;width:42px;height:2px;margin:16px auto 0;background-color:${p.primary};"></span>${byline(preset, state, `center`)}</div>`
    case `bubble`:
      return `<div style="padding:18px 20px 20px;border-radius:20px 20px 20px 4px;background-color:${p.secondary};color:${p.ink};box-shadow:5px 5px 0 ${p.primary};">${quote}${byline(preset, state)}</div>`
    case `interview`:
      return `<div style="border-top:3px solid ${p.primary};border-bottom:1px solid ${p.border};background-color:${p.surface};color:${p.ink};"><div style="padding:16px 17px;border-bottom:1px solid ${p.border};"><span style="display:inline-block;width:28px;height:28px;margin-right:10px;border-radius:999px;background-color:${p.primary};color:#ffffff;font-size:13px;font-weight:800;line-height:28px;text-align:center;vertical-align:top;">问</span>${field(`question`, state.question, `display:inline-block;width:calc(100% - 42px);margin:1px 0 0;color:${p.ink};font-size:15px;font-weight:700;line-height:1.75;vertical-align:top;`, `p`)}</div><div style="padding:16px 17px;"><span style="display:inline-block;width:28px;height:28px;margin-right:10px;border:1px solid ${p.primary};border-radius:999px;color:${p.primary};font-size:13px;font-weight:800;line-height:26px;text-align:center;vertical-align:top;">答</span>${field(`answer`, state.answer, `display:inline-block;width:calc(100% - 42px);margin:1px 0 0;color:${p.muted};font-size:15px;line-height:1.85;vertical-align:top;`, `p`)}</div></div>`
    case `note`:
      return `<div style="padding:20px 19px;border:1px solid ${p.border};background-color:${p.surface};background-image:linear-gradient(180deg,transparent 95%,${p.secondary} 95%);color:${p.ink};box-shadow:6px 7px 0 ${p.secondary};transform:rotate(-1deg);"><span style="display:inline-block;margin-bottom:12px;padding:3px 9px;background-color:${p.primary};color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.16em;">NOTE</span>${quote}${field(`note`, state.note, `display:block;margin:13px 0 0;padding-top:11px;border-top:1px dashed ${p.border};color:${p.muted};font-size:13px;line-height:1.75;`, `p`)}</div>`
    case `excerpt`:
      return `<div style="padding:20px;border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};"><div style="margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid ${p.border};">${field(`work`, state.work, `display:inline-block;color:${p.primary};font-size:14px;font-weight:800;letter-spacing:0.06em;`)}${field(`page`, state.page, `display:inline-block;float:right;color:${p.muted};font-size:11px;line-height:1.8;letter-spacing:0.08em;`)}</div>${quote}${byline(preset, state)}</div>`
    case `poster`:
      return `<div style="padding:24px 20px;border:2px solid ${p.ink};background-color:${p.primary};color:#ffffff;box-shadow:8px 8px 0 ${p.ink};">${field(`quote`, state.quote, `display:block;margin:0;color:#ffffff;font-size:23px;font-weight:900;line-height:1.55;letter-spacing:0.04em;text-shadow:2px 2px 0 ${p.ink};`, `p`)}${byline(preset, state).split(p.ink).join(`#ffffff`).split(p.muted).join(`#ffe8ec`)}</div>`
    case `enclosed`:
      return `<div style="padding:8px 16px;color:${p.ink};text-align:center;"><span style="display:block;color:${p.primary};font-size:52px;font-weight:800;line-height:0.8;text-align:left;">“</span>${quote}<span style="display:block;color:${p.primary};font-size:52px;font-weight:800;line-height:0.8;text-align:right;">”</span>${byline(preset, state, `center`)}</div>`
    case `italic`:
      return `<div style="margin-left:7%;margin-right:7%;padding:8px 0;color:${p.muted};font-style:italic;">${field(`quote`, state.quote, `display:block;margin:0;color:inherit;font-size:17px;font-weight:400;font-style:italic;line-height:2.05;letter-spacing:0.06em;`, `p`)}${byline(preset, state)}</div>`
    case `signature`:
      return `<div style="padding:22px 20px;border-radius:10px;background-color:${p.surface};color:${p.ink};">${quote}<div style="margin-top:18px;text-align:right;"><span style="display:inline-block;width:32px;height:1px;margin-right:9px;background-color:${p.primary};vertical-align:middle;"></span>${field(`author`, state.author, `display:inline-block;color:${p.primary};font-size:14px;font-weight:800;letter-spacing:0.08em;vertical-align:middle;`)}${state.source ? field(`source`, state.source, `display:block;margin-top:4px;color:${p.muted};font-size:11px;letter-spacing:0.05em;`) : ``}</div></div>`
    case `source`:
      return `<div style="padding:18px;border-left:1px solid ${p.border};border-right:1px solid ${p.border};color:${p.ink};"><div style="margin-bottom:12px;">${field(`source`, state.source, `display:inline-block;padding:4px 9px;border-radius:999px;background-color:${p.secondary};color:${p.primary};font-size:11px;font-weight:800;letter-spacing:0.1em;`)}${state.author ? field(`author`, state.author, `display:inline-block;margin-left:8px;color:${p.muted};font-size:12px;`) : ``}</div>${quote}</div>`
    case `hanging`:
      return `<div style="margin-left:22px;padding:8px 0 8px 16px;border-left:1px solid ${p.border};color:${p.ink};"><span style="display:block;width:42px;margin-left:-48px;margin-bottom:-39px;color:${p.primary};font-size:62px;font-weight:900;line-height:1;">“</span>${quote}${byline(preset, state)}</div>`
    case `wash`:
      return `<div style="padding:20px 21px;border-radius:8px;background-color:${p.secondary};color:${p.ink};">${quote}${byline(preset, state)}</div>`
    case `frame`:
      return `<div style="padding:5px;border:1px solid ${p.border};background-color:${p.surface};"><div style="padding:18px;border:1px solid ${p.primary};color:${p.ink};">${quote}${byline(preset, state)}</div></div>`
    case `rules`:
      return `<div style="padding:18px 7%;border-top:2px solid ${p.primary};border-bottom:2px solid ${p.primary};background-color:${p.surface};color:${p.ink};text-align:center;">${quote}${byline(preset, state, `center`)}</div>`
    case `vertical-marks`:
      return `<div style="display:flex;align-items:stretch;padding:16px;border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};"><span style="display:inline-block;width:26px;margin-right:15px;color:${p.primary};font-size:26px;font-weight:800;line-height:1.2;text-align:center;">“<br/>”</span><div style="display:block;flex:1;">${quote}${byline(preset, state)}</div></div>`
    case `seal`:
      return `<div style="display:flex;align-items:flex-start;padding:20px;border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};"><span style="display:inline-block;width:44px;margin-right:15px;padding:7px 3px;border:2px solid ${p.primary};color:${p.primary};font-size:13px;font-weight:800;line-height:1.25;text-align:center;transform:rotate(-3deg);">摘<br/>句</span><div style="display:block;flex:1;">${quote}${byline(preset, state)}</div></div>`
    case `commentary`:
      return `<div style="border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};"><div style="padding:19px;border-bottom:1px solid ${p.border};">${quote}${byline(preset, state)}</div><div style="padding:15px 19px;background-color:${p.secondary};"><span style="display:block;margin-bottom:6px;color:${p.primary};font-size:11px;font-weight:800;letter-spacing:0.18em;">评注</span>${field(`note`, state.note, `display:block;margin:0;color:${p.muted};font-size:14px;line-height:1.8;`, `p`)}</div></div>`
    default:
      return quote
  }
}

function stateCarrier(state: BlockState) {
  return `<span style="display:none;">${fields.map(item => `<i ${getBlockFieldAttrs(item.key, state[item.key]).replace(/\r/g, `&#13;`).replace(/\n/g, `&#10;`)}></i>`).join(``)}</span>`
}

function render(preset: BlockPreset, state: BlockState, withMetadata: boolean) {
  const attrs = withMetadata ? getBlockRootAttrs(preset) : `data-block-export="quote"`
  return compactBlockMarkup(`
    <section ${attrs} style="margin:24px 0;padding:0;box-sizing:border-box;">
      ${withMetadata ? stateCarrier(state) : ``}
      <div style="box-sizing:border-box;">${renderQuoteBody(preset, state)}</div>
    </section>
  `)
}

const quoteCategory: BlockCategoryDefinition = {
  id: `quote`,
  name: `引用`,
  description: `引文、金句、观点与访谈问答`,
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
      category: `quote`,
      presetId,
      state,
      title: String(state.quote || preset.name),
    }
  },
  toWeChat: (preset, state) => render(preset, state, false),
}

export default quoteCategory
