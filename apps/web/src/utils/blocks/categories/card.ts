import type { BlockCategoryDefinition, BlockPalette, BlockPreset, BlockState } from '../types'
import {
  compactBlockMarkup,
  createStateFromFields,
  escapeBlockHtml,
  formatBlockText,
  getBlockFieldAttrs,
  getBlockRootAttrs,
  parseBlockFieldState,
} from '../helpers'

type CardVariant
  = | 'basic' | 'compare' | 'profile' | 'product' | 'quote'
    | 'points' | 'steps' | 'warning' | 'tip' | 'note'
    | 'ticket' | 'business' | 'book' | 'event' | 'review'
    | 'tab' | 'outline' | 'shadow' | 'gradient' | 'image-top'

interface CardPresetSeed {
  id: string
  name: string
  description: string
  cue: string
  variant: CardVariant
  palette: BlockPalette
}

const fields = [
  { key: `title`, label: `标题`, type: `text`, required: true, placeholder: `输入卡片标题`, defaultValue: `值得记住的一件事` },
  { key: `body`, label: `正文`, type: `textarea`, placeholder: `输入主要内容`, defaultValue: `把重要信息收进一个边界清晰的容器，让读者一眼看见重点。` },
  { key: `imageUrl`, label: `图片 URL`, type: `url`, placeholder: `https://...`, defaultValue: `https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80` },
  { key: `subtitle`, label: `副标题`, type: `text`, placeholder: `姓名、作者或左栏标题`, defaultValue: `编辑手记` },
  { key: `label`, label: `标签`, type: `text`, placeholder: `分类或右栏标题`, defaultValue: `本期精选` },
  { key: `linkUrl`, label: `链接 URL`, type: `url`, placeholder: `https://...`, defaultValue: `https://example.com` },
  { key: `meta`, label: `辅助信息`, type: `text`, placeholder: `时间、地点或身份`, defaultValue: `周六 14:00 · 城市书店` },
  { key: `detail`, label: `补充内容`, type: `textarea`, placeholder: `右栏内容或附加说明`, defaultValue: `另一种视角也值得被认真看见。` },
  { key: `price`, label: `价格 / 编号`, type: `text`, placeholder: `如 ¥199 或 03`, defaultValue: `¥199` },
] satisfies BlockPreset[`fields`]

const palettes = {
  editorial: { primary: `#e00019`, secondary: `#ffe1e5`, ink: `#151515`, muted: `#666666`, surface: `#ffffff`, border: `#d8d8d8` },
  blue: { primary: `#1e6bb8`, secondary: `#dcecff`, ink: `#10233e`, muted: `#55708f`, surface: `#f5f9ff`, border: `#a9c7e8` },
  paper: { primary: `#c2352b`, secondary: `#ead6bd`, ink: `#3a3630`, muted: `#8a7f6a`, surface: `#f7f4ec`, border: `#d8cbb8` },
  teal: { primary: `#168f80`, secondary: `#c8eee8`, ink: `#173d38`, muted: `#62827d`, surface: `#f3fbf9`, border: `#9fd2ca` },
  navy: { primary: `#1b2a4a`, secondary: `#d7b56d`, ink: `#121827`, muted: `#746b5b`, surface: `#fffdf8`, border: `#d8c89f` },
  coral: { primary: `#ef7060`, secondary: `#ffe0d8`, ink: `#3b201d`, muted: `#8f5e58`, surface: `#fff8f6`, border: `#f1b4aa` },
  purple: { primary: `#6d4bc3`, secondary: `#e5dcff`, ink: `#2f2550`, muted: `#74698e`, surface: `#faf8ff`, border: `#c8b9ed` },
  green: { primary: `#5f8d72`, secondary: `#e0eadf`, ink: `#2f332e`, muted: `#788278`, surface: `#f7faf6`, border: `#bdcebb` },
  amber: { primary: `#c77b12`, secondary: `#fff0c7`, ink: `#3e2c13`, muted: `#806b4e`, surface: `#fffaf0`, border: `#e9cb8a` },
  night: { primary: `#ff7a2d`, secondary: `#415166`, ink: `#fff0d7`, muted: `#b7c5d6`, surface: `#07111f`, border: `#415166` },
} satisfies Record<string, BlockPalette>

const seeds: CardPresetSeed[] = [
  { id: `card-editorial-brief`, name: `编辑简报`, description: `左侧信号色引线组织标题与正文`, cue: `基础信息`, variant: `basic`, palette: palettes.editorial },
  { id: `card-dual-lens`, name: `双面观察`, description: `两栏并置呈现观点、方案或优劣对照`, cue: `左右对比`, variant: `compare`, palette: palettes.blue },
  { id: `card-profile-note`, name: `人物侧写`, description: `圆形头像配姓名、身份与人物简介`, cue: `人物`, variant: `profile`, palette: palettes.paper },
  { id: `card-product-window`, name: `橱窗新选`, description: `商品图、卖点与价格组成完整产品卡`, cue: `产品`, variant: `product`, palette: palettes.coral },
  { id: `card-quoted-voice`, name: `留声引语`, description: `大引号与署名构成有分量的观点卡`, cue: `引用`, variant: `quote`, palette: palettes.purple },
  { id: `card-key-points`, name: `要点清册`, description: `醒目标记托住一段可快速扫描的摘要`, cue: `要点`, variant: `points`, palette: palettes.teal },
  { id: `card-step-marker`, name: `进程路标`, description: `大号步骤编号引导流程说明`, cue: `步骤`, variant: `steps`, palette: palettes.blue },
  { id: `card-alert-stripe`, name: `警戒条带`, description: `暖色警示带与高对比图标提示风险`, cue: `警告`, variant: `warning`, palette: palettes.amber },
  { id: `card-calm-tip`, name: `清风提示`, description: `轻浅底色与顶边强调承载友好提醒`, cue: `提示`, variant: `tip`, palette: palettes.green },
  { id: `card-folded-note`, name: `折角便笺`, description: `纸张底色配 SVG 折角，像随手贴下的笔记`, cue: `便签`, variant: `note`, palette: palettes.paper },
  { id: `card-admit-ticket`, name: `入场票根`, description: `虚线边与锯齿纹理呈现票据质感`, cue: `票据`, variant: `ticket`, palette: palettes.navy },
  { id: `card-contact-mark`, name: `联络名片`, description: `字母徽记与联系方式形成克制商务卡`, cue: `名片`, variant: `business`, palette: palettes.navy },
  { id: `card-reading-shelf`, name: `案头书目`, description: `封面与书名作者左右并排，适合阅读推荐`, cue: `书籍`, variant: `book`, palette: palettes.paper },
  { id: `card-event-calendar`, name: `城中日历`, description: `时间大字与地点信息构成活动邀请`, cue: `活动`, variant: `event`, palette: palettes.coral },
  { id: `card-reader-review`, name: `读者回声`, description: `头像、昵称与评论正文组成真实反馈`, cue: `评论`, variant: `review`, palette: palettes.teal },
  { id: `card-file-tab`, name: `卷宗页签`, description: `顶部标签条压住卡片边框，像一册档案`, cue: `标签`, variant: `tab`, palette: palettes.blue },
  { id: `card-pure-frame`, name: `素描边界`, description: `双层纯描边依靠留白建立清晰秩序`, cue: `描边`, variant: `outline`, palette: palettes.green },
  { id: `card-letterpress-shadow`, name: `活字投影`, description: `硬边错位投影带来复古印刷立体感`, cue: `投影`, variant: `shadow`, palette: palettes.editorial },
  { id: `card-evening-gradient`, name: `暮色渐层`, description: `深色兜底叠加双色渐变，适合重点信息`, cue: `渐变`, variant: `gradient`, palette: palettes.night },
  { id: `card-image-feature`, name: `画报特写`, description: `上图下文的杂志式分栏，适合案例展示`, cue: `图文`, variant: `image-top`, palette: palettes.purple },
]

const variants = new Map(seeds.map(seed => [seed.id, seed.variant]))

const presets: BlockPreset[] = seeds.map(seed => ({
  id: seed.id,
  category: `card`,
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

function fieldAttrs(key: string, value: unknown) {
  return getBlockFieldAttrs(key, value)
    .replace(/\r/g, `&#13;`)
    .replace(/\n/g, `&#10;`)
}

function field(key: string, value: unknown, style: string, tag = `span`) {
  return `<${tag} ${fieldAttrs(key, value)} style="${style}">${formatBlockText(value)}</${tag}>`
}

function imageField(value: unknown, title: unknown, style: string) {
  if (!value) {
    return ``
  }
  return `<img ${fieldAttrs(`imageUrl`, value)} src="${escapeBlockHtml(value)}" alt="${escapeBlockHtml(title)}" style="${style}"/>`
}

function linkField(value: unknown, style: string, text = `查看详情`) {
  if (!value) {
    return ``
  }
  return `<a ${fieldAttrs(`linkUrl`, value)} href="${escapeBlockHtml(value)}" style="${style}">${escapeBlockHtml(text)}</a>`
}

function hiddenState(state: BlockState) {
  return fields
    .map(item => `<span ${fieldAttrs(item.key, state[item.key])} style="display:none;">${formatBlockText(state[item.key])}</span>`)
    .join(``)
}

function renderCardBody(preset: BlockPreset, state: BlockState) {
  const p = preset.palette
  const title = field(`title`, state.title, `display:block;margin:0;color:inherit;font-size:20px;font-weight:800;line-height:1.4;letter-spacing:0.03em;`, `p`)
  const body = state.body
    ? field(`body`, state.body, `display:block;margin:9px 0 0;color:${p.muted};font-size:15px;line-height:1.8;letter-spacing:0.03em;text-align:justify;`, `p`)
    : ``
  const subtitle = state.subtitle
    ? field(`subtitle`, state.subtitle, `display:block;margin:5px 0 0;color:${p.muted};font-size:13px;line-height:1.6;letter-spacing:0.05em;`)
    : ``
  const label = state.label
    ? field(`label`, state.label, `display:inline-block;padding:3px 9px;border-radius:999px;background-color:${p.secondary};color:${p.primary};font-size:11px;font-weight:700;line-height:1.5;letter-spacing:0.08em;`)
    : ``
  const meta = state.meta
    ? field(`meta`, state.meta, `display:block;margin:6px 0 0;color:${p.muted};font-size:12px;line-height:1.6;letter-spacing:0.04em;`)
    : ``
  const detail = state.detail
    ? field(`detail`, state.detail, `display:block;margin:8px 0 0;color:${p.muted};font-size:14px;line-height:1.75;text-align:justify;`, `p`)
    : ``
  const price = state.price
    ? field(`price`, state.price, `display:inline-block;color:${p.primary};font-size:20px;font-weight:900;line-height:1.2;letter-spacing:0.02em;`)
    : ``
  const image = (style: string) => imageField(state.imageUrl, state.title, style)
  const link = (style: string, text?: string) => linkField(state.linkUrl, style, text)

  switch (variants.get(preset.id)) {
    case `basic`:
      return `<div style="padding:18px 20px;border:1px solid ${p.border};border-left:6px solid ${p.primary};background-color:${p.surface};color:${p.ink};">${label}${title}${body}${meta}</div>`
    case `compare`:
      return `<div style="padding:18px;border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};">${title}<div style="display:flex;width:100%;margin-top:14px;align-items:stretch;"><div style="display:inline-block;width:48%;max-width:48% !important;padding:13px;box-sizing:border-box;background-color:${p.secondary};vertical-align:top;">${subtitle}${body}</div><div style="display:inline-block;width:48%;max-width:48% !important;margin-left:4%;padding:13px;box-sizing:border-box;border:1px solid ${p.border};background-color:#ffffff;vertical-align:top;">${label}${detail}</div></div></div>`
    case `profile`:
      return `<div style="display:flex;width:100%;padding:18px;box-sizing:border-box;border-radius:14px;background-color:${p.surface};color:${p.ink};box-shadow:0 8px 22px rgba(58,54,48,0.12);align-items:center;">${image(`display:inline-block;width:24%;max-width:24% !important;height:auto;margin-right:5%;border:4px solid ${p.secondary};border-radius:999px;box-sizing:border-box;vertical-align:middle;`)}<div style="display:inline-block;width:70%;max-width:70% !important;box-sizing:border-box;vertical-align:middle;">${title}${subtitle}${meta}${body}</div></div>`
    case `product`:
      return `<div style="overflow:hidden;border:1px solid ${p.border};border-radius:14px;background-color:${p.surface};color:${p.ink};transform:rotate(0deg);">${image(`display:block;width:100%;max-width:100%;height:auto;`)}<div style="padding:17px 18px;">${label}${title}${body}<div style="margin-top:13px;">${price}${link(`display:inline-block;float:right;padding:6px 12px;border-radius:999px;background-color:${p.primary};color:#ffffff;font-size:12px;line-height:1.5;text-decoration:none;`)}</div></div></div>`
    case `quote`:
      return `<div style="padding:19px 22px;border-top:2px solid ${p.primary};border-bottom:2px solid ${p.primary};background-color:${p.surface};color:${p.ink};text-align:center;"><span style="display:block;margin-bottom:-20px;color:${p.secondary};font-size:64px;font-weight:900;line-height:1;">“</span>${body}${subtitle}${meta}</div>`
    case `points`:
      return `<div style="padding:18px 20px;border-radius:10px;background-color:${p.surface};color:${p.ink};box-shadow:0 7px 20px rgba(22,143,128,0.12);"><span style="display:inline-block;width:12px;height:12px;margin-right:10px;background-color:${p.primary};transform:rotate(45deg);vertical-align:0.05em;"></span><span style="display:inline-block;max-width:82%;vertical-align:middle;">${title}</span>${body}${detail}</div>`
    case `steps`:
      return `<div style="display:flex;width:100%;padding:18px;box-sizing:border-box;border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};align-items:center;"><div style="display:inline-block;width:22%;max-width:22% !important;margin-right:5%;color:${p.primary};font-size:48px;font-weight:900;line-height:1;text-align:center;vertical-align:middle;">${price}</div><div style="display:inline-block;width:72%;max-width:72% !important;vertical-align:middle;">${label}${title}${body}</div></div>`
    case `warning`:
      return `<div style="padding:16px 18px;border:2px solid ${p.primary};border-radius:8px;background-color:${p.secondary};color:${p.ink};"><span style="display:inline-block;width:30px;height:30px;margin-right:10px;border-radius:999px;background-color:${p.primary};color:#ffffff;font-size:18px;font-weight:900;line-height:30px;text-align:center;vertical-align:middle;">!</span><span style="display:inline-block;max-width:78%;vertical-align:middle;">${title}</span>${body}${meta}</div>`
    case `tip`:
      return `<div style="padding:17px 19px;border-top:5px solid ${p.primary};border-radius:0 0 12px 12px;background-color:${p.secondary};color:${p.ink};">${label}${title}${body}</div>`
    case `note`:
      return `<div style="padding:22px 24px;border:1px solid ${p.border};background-color:${p.surface};background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2256%22 viewBox=%220 0 56 56%22%3E%3Cpath d=%22M56 0v56L0 0z%22 fill=%22%23ead6bd%22/%3E%3Cpath d=%22M56 0H0l56 56z%22 fill=%22%23f7f4ec%22/%3E%3C/svg%3E');color:${p.ink};box-shadow:4px 5px 0 ${p.secondary};transform:rotate(-0.6deg);">${label}${title}${body}${meta}</div>`
    case `ticket`:
      return `<div style="padding:19px 22px;border:2px dashed ${p.secondary};background-color:${p.surface};background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2212%22 viewBox=%220 0 20 12%22%3E%3Ccircle cx=%220%22 cy=%226%22 r=%224%22 fill=%22%23d7b56d%22/%3E%3Ccircle cx=%2220%22 cy=%226%22 r=%224%22 fill=%22%23d7b56d%22/%3E%3C/svg%3E');color:${p.ink};text-align:center;">${label}${title}${meta}<span style="display:block;margin:13px 0;border-top:1px dashed ${p.secondary};transform:scale(1,0.5);"></span>${price}</div>`
    case `business`:
      return `<div style="display:flex;width:100%;padding:19px;box-sizing:border-box;background-color:${p.primary};color:#ffffff;align-items:center;"><span style="display:inline-block;width:22%;max-width:22% !important;margin-right:5%;border:1px solid ${p.secondary};color:${p.secondary};font-size:28px;font-weight:900;line-height:62px;text-align:center;vertical-align:middle;">✦</span><div style="display:inline-block;width:72%;max-width:72% !important;vertical-align:middle;">${title}${subtitle.replace(`color:${p.muted}`, `color:${p.secondary}`)}${meta.replace(`color:${p.muted}`, `color:#ffffff`)}${link(`display:inline-block;margin-top:8px;color:${p.secondary};font-size:12px;text-decoration:none;`, `联系我 →`)}</div></div>`
    case `book`:
      return `<div style="display:flex;width:100%;padding:18px;box-sizing:border-box;border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};align-items:center;">${image(`display:inline-block;width:30%;max-width:30% !important;height:auto;margin-right:5%;border:1px solid ${p.border};box-shadow:4px 5px 0 ${p.secondary};vertical-align:middle;`)}<div style="display:inline-block;width:65%;max-width:65% !important;vertical-align:middle;">${label}${title}${subtitle}${body}</div></div>`
    case `event`:
      return `<div style="padding:19px 21px;border-radius:15px;background-color:${p.primary};color:#ffffff;box-shadow:0 9px 24px rgba(239,112,96,0.22);">${label.replace(`background-color:${p.secondary};color:${p.primary}`, `background-color:#ffffff;color:${p.primary}`)}${title}<span style="display:block;margin:12px 0 0;color:#ffffff;font-size:17px;font-weight:800;line-height:1.5;">${meta}</span>${body.replace(`color:${p.muted}`, `color:#ffffff`)}</div>`
    case `review`:
      return `<div style="display:flex;width:100%;padding:18px;box-sizing:border-box;border-radius:12px;background-color:${p.surface};color:${p.ink};box-shadow:0 8px 20px rgba(22,143,128,0.1);align-items:flex-start;">${image(`display:inline-block;width:18%;max-width:18% !important;height:auto;margin-right:5%;border-radius:999px;vertical-align:top;`)}<div style="display:inline-block;width:77%;max-width:77% !important;vertical-align:top;">${title}${subtitle}${body}${meta}</div></div>`
    case `tab`:
      return `<div style="padding:0 18px 18px;border:2px solid ${p.primary};background-color:${p.surface};color:${p.ink};"><div style="margin-top:-2px;margin-bottom:14px;">${field(`label`, state.label, `display:inline-block;padding:6px 14px;border-radius:0 0 8px 8px;background-color:${p.primary};color:#ffffff;font-size:12px;font-weight:800;line-height:1.5;letter-spacing:0.08em;`)}</div>${title}${body}${meta}</div>`
    case `outline`:
      return `<div style="padding:7px;border:1px solid ${p.primary};background-color:${p.surface};color:${p.ink};"><div style="padding:16px;border:1px solid ${p.border};">${label}${title}${body}${detail}</div></div>`
    case `shadow`:
      return `<div style="padding:18px 20px;border:2px solid ${p.ink};background-color:${p.surface};color:${p.ink};box-shadow:8px 8px 0 ${p.primary};">${label}${title}${body}${meta}</div>`
    case `gradient`:
      return `<div style="padding:20px 22px;border:1px solid ${p.border};border-radius:15px;background-color:${p.surface};background-image:linear-gradient(135deg,${p.surface},${p.secondary});color:${p.ink};box-shadow:0 10px 26px rgba(7,17,31,0.28);">${label.replace(`background-color:${p.secondary};color:${p.primary}`, `background-color:${p.primary};color:#ffffff`)}${title}${body.replace(`color:${p.muted}`, `color:${p.muted}`)}${meta}${link(`display:inline-block;margin-top:12px;color:${p.primary};font-size:12px;font-weight:700;text-decoration:none;`, `继续阅读 →`)}</div>`
    case `image-top`:
      return `<div style="overflow:hidden;border:1px solid ${p.border};border-radius:12px;background-color:${p.surface};color:${p.ink};transform:rotate(0deg);">${image(`display:block;width:100%;max-width:100%;height:auto;`)}<div style="padding:16px 19px;border-top:5px solid ${p.primary};">${label}${title}${subtitle}${body}${link(`display:inline-block;margin-top:10px;color:${p.primary};font-size:12px;font-weight:700;text-decoration:none;`, `阅读案例 →`)}</div></div>`
    default:
      return `<div style="padding:18px;border:1px solid ${p.border};background-color:${p.surface};color:${p.ink};">${title}${body}</div>`
  }
}

function render(preset: BlockPreset, state: BlockState, withMetadata: boolean) {
  const attrs = withMetadata ? getBlockRootAttrs(preset) : `data-block-export="card"`
  const metadata = withMetadata ? hiddenState(state) : ``
  return compactBlockMarkup(`
    <section ${attrs} style="margin:24px 0;padding:0;box-sizing:border-box;">
      <div style="box-sizing:border-box;">${renderCardBody(preset, state)}</div>
      ${metadata}
    </section>
  `)
}

const cardCategory: BlockCategoryDefinition = {
  id: `card`,
  name: `卡片`,
  description: `结构化信息、人物产品与提示容器`,
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
      category: `card`,
      presetId,
      state,
      title: String(state.title || preset.name),
    }
  },
  toWeChat: (preset, state) => render(preset, state, false),
}

export default cardCategory
