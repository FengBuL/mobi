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

type InteractiveVariant =
  | `follow` | `qr-card` | `profile` | `like` | `wow`
  | `share` | `comment` | `poll` | `signup` | `link`
  | `download` | `contact` | `community` | `reward` | `subscribe`
  | `directory` | `related` | `archive` | `copyright` | `disclaimer`

interface InteractivePresetSeed {
  id: string
  name: string
  description: string
  cue: string
  variant: InteractiveVariant
  palette: BlockPalette
}

const fields = [
  { key: `title`, label: `主文案`, type: `text`, required: true, placeholder: `输入主要引导语`, defaultValue: `愿这篇内容，对你有所启发` },
  { key: `subtitle`, label: `副文案`, type: `textarea`, placeholder: `补充说明或行动提示`, defaultValue: `把有价值的内容，留给下一次相遇` },
  { key: `qrUrl`, label: `二维码图片`, type: `url`, placeholder: `粘贴二维码图片地址`, defaultValue: `` },
  { key: `linkUrl`, label: `参考链接`, type: `url`, placeholder: `公众号链接需自行确认可用范围`, defaultValue: `` },
  { key: `buttonText`, label: `按钮文字`, type: `text`, placeholder: `如 阅读原文`, defaultValue: `阅读原文` },
  { key: `accountName`, label: `账号名称`, type: `text`, placeholder: `输入公众号或栏目名称`, defaultValue: `你的公众号` },
  { key: `contact`, label: `联系方式`, type: `text`, placeholder: `微信号、邮箱或其他联系信息`, defaultValue: `微信号：your_wechat` },
] satisfies BlockPreset[`fields`]

const palettes = {
  signal: { primary: `#e00019`, secondary: `#ffe1e5`, ink: `#171717`, muted: `#6b6264`, surface: `#ffffff`, border: `#e8c7cc` },
  wechat: { primary: `#07c160`, secondary: `#dcf7e8`, ink: `#173a27`, muted: `#5b7968`, surface: `#f6fffa`, border: `#a9dfc1` },
  blue: { primary: `#1e6bb8`, secondary: `#dcecff`, ink: `#10233e`, muted: `#59718d`, surface: `#f7faff`, border: `#b5cee8` },
  amber: { primary: `#d97706`, secondary: `#fff0c7`, ink: `#402b12`, muted: `#866f52`, surface: `#fffaf0`, border: `#e7c987` },
  coral: { primary: `#ef7060`, secondary: `#ffe1dc`, ink: `#43231f`, muted: `#8d625d`, surface: `#fff8f6`, border: `#efb7af` },
  purple: { primary: `#6d4bc3`, secondary: `#e9e1ff`, ink: `#30244f`, muted: `#756a8e`, surface: `#faf8ff`, border: `#c8b9ed` },
  teal: { primary: `#168f80`, secondary: `#d2f1ec`, ink: `#173d38`, muted: `#607f7a`, surface: `#f4fbfa`, border: `#a7d8d1` },
  navyGold: { primary: `#1b2a4a`, secondary: `#e5c77e`, ink: `#151c2b`, muted: `#756e61`, surface: `#fffdf8`, border: `#d9cba8` },
  ink: { primary: `#171717`, secondary: `#ededed`, ink: `#111111`, muted: `#6e6e6e`, surface: `#ffffff`, border: `#cfcfcf` },
  rose: { primary: `#b94e70`, secondary: `#f8dfe7`, ink: `#462733`, muted: `#8d6875`, surface: `#fff8fa`, border: `#e4b7c5` },
} satisfies Record<string, BlockPalette>

const seeds: InteractivePresetSeed[] = [
  { id: `interactive-signal-follow`, name: `信号关注`, description: `鲜明通栏承载公众号名与关注提醒`, cue: `关注`, variant: `follow`, palette: palettes.signal },
  { id: `interactive-qr-window`, name: `识别之窗`, description: `二维码与说明并排，适合关注和活动入口`, cue: `二维码`, variant: `qr-card`, palette: palettes.wechat },
  { id: `interactive-editorial-profile`, name: `刊物名片`, description: `编辑部式账号名片，兼顾二维码和定位说明`, cue: `名片`, variant: `profile`, palette: palettes.navyGold },
  { id: `interactive-heartbeat-like`, name: `心意回响`, description: `以心形线稿引导读者点赞支持`, cue: `点赞`, variant: `like`, palette: palettes.rose },
  { id: `interactive-echo-wow`, name: `在看回声`, description: `双圆视线符号突出在看行动`, cue: `在看`, variant: `wow`, palette: palettes.blue },
  { id: `interactive-paper-plane`, name: `纸间传递`, description: `纸飞机箭头配分享提示，轻快有方向感`, cue: `分享`, variant: `share`, palette: palettes.teal },
  { id: `interactive-open-comment`, name: `留声开场`, description: `对话框结构邀请读者留下观点`, cue: `留言`, variant: `comment`, palette: palettes.coral },
  { id: `interactive-choice-ballot`, name: `选择发生`, description: `选项票签营造投票前的参与感`, cue: `投票`, variant: `poll`, palette: palettes.purple },
  { id: `interactive-event-ticket`, name: `入场凭证`, description: `票券式边框呈现报名方式与二维码`, cue: `报名`, variant: `signup`, palette: palettes.amber },
  { id: `interactive-reading-origin`, name: `原文引路`, description: `按钮视觉提示从文末阅读原文继续`, cue: `原文`, variant: `link`, palette: palettes.blue },
  { id: `interactive-resource-station`, name: `资料驿站`, description: `下载入口改为二维码或阅读原文引导`, cue: `下载`, variant: `download`, palette: palettes.teal },
  { id: `interactive-contact-line`, name: `联络频率`, description: `清晰呈现微信号、邮箱等联系信息`, cue: `联系`, variant: `contact`, palette: palettes.ink },
  { id: `interactive-community-gate`, name: `同路人入口`, description: `社群二维码与入群说明并排呈现`, cue: `社群`, variant: `community`, palette: palettes.wechat },
  { id: `interactive-appreciation-note`, name: `一杯心意`, description: `克制的赞赏提示，不打断正文气质`, cue: `赞赏`, variant: `reward`, palette: palettes.amber },
  { id: `interactive-subscription-bell`, name: `更新来信`, description: `订阅提醒卡强调持续更新与账号名称`, cue: `订阅`, variant: `subscribe`, palette: palettes.purple },
  { id: `interactive-content-map`, name: `阅读航图`, description: `三段索引线构成简洁的目录导航提示`, cue: `目录`, variant: `directory`, palette: palettes.navyGold },
  { id: `interactive-related-reading`, name: `延伸书签`, description: `书签形态承接相关阅读与专题入口`, cue: `延伸`, variant: `related`, palette: palettes.coral },
  { id: `interactive-past-archive`, name: `往期档案`, description: `档案编号式布局召回往期精选内容`, cue: `回顾`, variant: `archive`, palette: palettes.blue },
  { id: `interactive-rights-seal`, name: `原创印章`, description: `细框印章承载版权与转载说明`, cue: `版权`, variant: `copyright`, palette: palettes.signal },
  { id: `interactive-calm-notice`, name: `边界说明`, description: `低干扰信息框呈现免责声明`, cue: `声明`, variant: `disclaimer`, palette: palettes.ink },
]

const variants = new Map(seeds.map(seed => [seed.id, seed.variant]))

const presets: BlockPreset[] = seeds.map(seed => ({
  id: seed.id,
  category: `interactive`,
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

function value(state: BlockState, key: string) {
  return String(state[key] ?? ``).trim()
}

function text(state: BlockState, key: string) {
  return formatBlockText(value(state, key))
}

function metadata(state: BlockState) {
  return fields
    .map(item => `<span ${getBlockFieldAttrs(item.key, state[item.key]).replace(/\r\n?|\n/gu, `&#10;`)} style="display:none;"></span>`)
    .join(``)
}

function icon(kind: `heart` | `eye` | `share` | `comment` | `check` | `arrow` | `download` | `contact` | `group` | `gift` | `bell` | `menu` | `book` | `archive` | `shield` | `info`, color: string) {
  const paths = {
    heart: `<path d="M12 21s-7-4.5-9.2-8.5C.7 8.7 3 4.5 7.2 4.5c2.1 0 3.6 1.3 4.8 2.7 1.2-1.4 2.7-2.7 4.8-2.7 4.2 0 6.5 4.2 4.4 8C19 16.5 12 21 12 21Z"/>`,
    eye: `<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/>`,
    share: `<path d="M4 15v5h16v-5M12 17V4m0 0L7 9m5-5 5 5"/>`,
    comment: `<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h6"/>`,
    check: `<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8"/>`,
    arrow: `<path d="M4 12h15m-6-6 6 6-6 6"/>`,
    download: `<path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16"/>`,
    contact: `<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-5 3.3-7 8-7s7.3 2 8 7"/>`,
    group: `<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6m0-5c3.5 0 5.5 1.7 6 5"/>`,
    gift: `<path d="M3 9h18v12H3V9Zm-1-4h20v4H2V5Zm10 0v16M12 5C9 5 7 4 7 2c3 0 5 1 5 3Zm0 0c3 0 5-1 5-3-3 0-5 1-5 3Z"/>`,
    bell: `<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 3h4"/>`,
    menu: `<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="3" cy="6" r=".6"/><circle cx="3" cy="12" r=".6"/><circle cx="3" cy="18" r=".6"/>`,
    book: `<path d="M4 4h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4V4Zm16 0h-3a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h3V4Z"/>`,
    archive: `<path d="M4 7h16v14H4V7Zm-1-4h18v4H3V3Zm6 9h6"/>`,
    shield: `<path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>`,
    info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>`,
  }
  return `<svg viewBox="0 0 24 24" width="24" height="24" style="display:block;width:24px;height:24px;fill:none;stroke:${color};stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">${paths[kind]}</svg>`
}

function iconBadge(kind: Parameters<typeof icon>[0], palette: BlockPalette, inverse = false) {
  const background = inverse ? palette.primary : palette.secondary
  const color = inverse ? `#ffffff` : palette.primary
  return `<span style="display:inline-block;padding:10px;border-radius:999px;background-color:${background};vertical-align:middle;">${icon(kind, color)}</span>`
}

function qrImage(state: BlockState, palette: BlockPalette) {
  const src = value(state, `qrUrl`)
  if (!src) {
    return ``
  }
  return `<img src="${escapeBlockHtml(src)}" alt="二维码" style="display:block;width:100%;height:auto;border:1px solid ${palette.border};border-radius:8px;box-sizing:border-box;"/>`
}

function qrColumns(state: BlockState, palette: BlockPalette, body: string) {
  const image = qrImage(state, palette)
  if (!image) {
    return `<div style="padding:18px;color:${palette.ink};">${body}</div>`
  }
  return `<div style="display:flex;align-items:center;padding:16px;box-sizing:border-box;"><span style="display:inline-block;width:32%;max-width:32% !important;margin-right:4%;box-sizing:border-box;">${image}</span><span style="display:inline-block;width:62%;max-width:62% !important;box-sizing:border-box;vertical-align:middle;">${body}</span></div>`
}

function heading(state: BlockState, palette: BlockPalette, align = `left`) {
  const title = value(state, `title`)
    ? `<p style="display:block;margin:0;color:${palette.ink};font-size:19px;font-weight:800;line-height:1.4;letter-spacing:0.04em;text-align:${align};">${text(state, `title`)}</p>`
    : ``
  const subtitle = value(state, `subtitle`)
    ? `<p style="display:block;margin:7px 0 0;color:${palette.muted};font-size:13px;line-height:1.75;letter-spacing:0.03em;text-align:${align};">${text(state, `subtitle`)}</p>`
    : ``
  return `${title}${subtitle}`
}

function actionLabel(state: BlockState, palette: BlockPalette, filled = true) {
  const label = value(state, `buttonText`)
  if (!label) {
    return ``
  }
  return `<span style="display:inline-block;margin-top:12px;padding:8px 18px;border:1px solid ${palette.primary};border-radius:999px;background-color:${filled ? palette.primary : palette.surface};color:${filled ? `#ffffff` : palette.primary};font-size:13px;font-weight:700;line-height:1.2;letter-spacing:0.06em;">${text(state, `buttonText`)}</span>`
}

function referenceLink(state: BlockState, palette: BlockPalette) {
  if (!value(state, `linkUrl`)) {
    return ``
  }
  return `<p style="margin:9px 0 0;color:${palette.muted};font-size:11px;line-height:1.6;word-break:break-all;">链接参考：${text(state, `linkUrl`)}</p>`
}

function renderBody(preset: BlockPreset, state: BlockState) {
  const p = preset.palette
  const account = value(state, `accountName`) ? text(state, `accountName`) : ``
  const contact = value(state, `contact`) ? text(state, `contact`) : ``

  switch (variants.get(preset.id)) {
    case `follow`:
      return `<div style="padding:18px 20px;border-radius:6px;background-color:${p.primary};background-image:linear-gradient(135deg,${p.primary},#8f0011);color:#ffffff;box-shadow:6px 6px 0 ${p.secondary};"><p style="margin:0;color:#ffffff;font-size:11px;font-weight:700;line-height:1.2;letter-spacing:0.26em;">FOLLOW / 关注</p><p style="margin:8px 0 0;color:#ffffff;font-size:21px;font-weight:800;line-height:1.4;">${account || text(state, `title`)}</p>${value(state, `subtitle`) ? `<p style="margin:5px 0 0;color:#ffe9ec;font-size:13px;line-height:1.7;">${text(state, `subtitle`)}</p>` : ``}</div>`
    case `qr-card`:
      return `<div style="border:1px solid ${p.border};border-radius:14px;background-color:${p.surface};box-shadow:0 8px 22px rgba(20,90,55,0.10);">${qrColumns(state, p, `${heading(state, p)}${actionLabel(state, p, false)}`)}</div>`
    case `profile`:
      return `<div style="border-top:3px solid ${p.primary};border-bottom:1px solid ${p.border};background-color:${p.surface};">${qrColumns(state, p, `<p style="margin:0;color:${p.secondary};font-size:11px;font-weight:800;line-height:1.2;letter-spacing:0.22em;">PUBLICATION PROFILE</p><p style="margin:8px 0 0;color:${p.ink};font-size:20px;font-weight:800;line-height:1.4;">${account || text(state, `title`)}</p>${value(state, `subtitle`) ? `<p style="margin:6px 0 0;color:${p.muted};font-size:13px;line-height:1.7;">${text(state, `subtitle`)}</p>` : ``}`)}</div>`
    case `like`:
      return `<div style="padding:18px;border:1px solid ${p.border};border-radius:999px;background-color:${p.surface};text-align:center;"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`heart`, p)}</span><span style="display:inline-block;max-width:72%;margin-left:12px;color:${p.ink};text-align:left;vertical-align:middle;">${heading(state, p)}${actionLabel(state, p, false)}</span></div>`
    case `wow`:
      return `<div style="padding:18px;border-radius:10px;background-color:${p.secondary};text-align:center;"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`eye`, p, true)}</span><span style="display:inline-block;max-width:72%;margin-left:13px;text-align:left;vertical-align:middle;">${heading(state, p)}</span><span style="display:block;width:64px;height:3px;margin:13px auto 0;border-radius:999px;background-color:${p.primary};"></span></div>`
    case `share`:
      return `<div style="padding:16px 18px;border-left:5px solid ${p.primary};background-color:${p.surface};box-shadow:5px 5px 0 ${p.secondary};"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`share`, p)}</span><span style="display:inline-block;max-width:74%;margin-left:12px;vertical-align:middle;">${heading(state, p)}${actionLabel(state, p, false)}</span></div>`
    case `comment`:
      return `<div style="padding:17px 18px 20px;border:1px solid ${p.border};border-radius:14px 14px 14px 3px;background-color:${p.surface};"><span style="display:inline-block;margin-bottom:10px;">${iconBadge(`comment`, p)}</span>${heading(state, p)}<span style="display:block;width:46px;height:4px;margin-top:14px;border-radius:999px;background-color:${p.primary};"></span></div>`
    case `poll`:
      return `<div style="padding:18px;border:2px solid ${p.primary};background-color:${p.surface};box-shadow:7px 7px 0 ${p.secondary};">${heading(state, p)}<div style="margin-top:13px;"><span style="display:inline-block;width:46%;margin-right:4%;padding:8px 5px;border:1px solid ${p.border};border-radius:5px;color:${p.primary};font-size:12px;text-align:center;box-sizing:border-box;">${icon(`check`, p.primary)}<span style="display:block;margin-top:4px;">选项 A</span></span><span style="display:inline-block;width:46%;padding:8px 5px;border:1px solid ${p.border};border-radius:5px;color:${p.primary};font-size:12px;text-align:center;box-sizing:border-box;">${icon(`check`, p.primary)}<span style="display:block;margin-top:4px;">选项 B</span></span></div></div>`
    case `signup`:
      return `<div style="border:2px dashed ${p.primary};border-radius:12px;background-color:${p.surface};">${qrColumns(state, p, `<p style="margin:0;color:${p.primary};font-size:11px;font-weight:800;letter-spacing:0.22em;">ADMISSION / 入场</p>${heading(state, p)}${actionLabel(state, p, true)}`)}</div>`
    case `link`:
      return `<div style="padding:20px;border-radius:12px;background-color:${p.surface};background-image:linear-gradient(135deg,${p.surface},${p.secondary});text-align:center;">${heading(state, p, `center`)}${actionLabel(state, p, true)}<p style="margin:10px 0 0;color:${p.muted};font-size:11px;line-height:1.6;">请在公众号文末使用“阅读原文”入口</p>${referenceLink(state, p)}</div>`
    case `download`:
      return `<div style="padding:17px;border:1px solid ${p.border};border-radius:9px;background-color:${p.surface};"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`download`, p, true)}</span><span style="display:inline-block;max-width:73%;margin-left:12px;vertical-align:middle;">${heading(state, p)}<p style="margin:7px 0 0;color:${p.primary};font-size:12px;font-weight:700;line-height:1.6;">长按识别二维码，或从阅读原文获取资料</p></span>${qrImage(state, p) ? `<span style="display:block;width:116px;margin:15px auto 0;">${qrImage(state, p)}</span>` : ``}${referenceLink(state, p)}</div>`
    case `contact`:
      return `<div style="padding:18px;border-top:1px solid ${p.ink};border-bottom:1px solid ${p.ink};background-color:${p.surface};"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`contact`, p)}</span><span style="display:inline-block;max-width:74%;margin-left:12px;vertical-align:middle;">${heading(state, p)}${contact ? `<p style="margin:8px 0 0;color:${p.ink};font-size:14px;font-weight:700;line-height:1.7;word-break:break-all;">${contact}</p>` : ``}</span></div>`
    case `community`:
      return `<div style="border-radius:14px;background-color:${p.secondary};overflow:hidden;transform:rotate(0deg);"><div style="padding:11px 16px;background-color:${p.primary};color:#ffffff;"><span style="display:inline-block;vertical-align:middle;">${icon(`group`, `#ffffff`)}</span><span style="display:inline-block;margin-left:9px;color:#ffffff;font-size:14px;font-weight:800;vertical-align:middle;">同路人集合</span></div>${qrColumns(state, p, `${heading(state, p)}${contact ? `<p style="margin:8px 0 0;color:${p.primary};font-size:12px;font-weight:700;">${contact}</p>` : ``}`)}</div>`
    case `reward`:
      return `<div style="margin-left:8%;margin-right:8%;padding:20px 16px;border-top:1px solid ${p.border};border-bottom:1px solid ${p.border};background-color:${p.surface};text-align:center;"><span style="display:inline-block;">${iconBadge(`gift`, p)}</span>${heading(state, p, `center`)}${value(state, `qrUrl`) ? `<span style="display:block;width:120px;margin:14px auto 0;">${qrImage(state, p)}</span>` : ``}</div>`
    case `subscribe`:
      return `<div style="padding:18px;border-radius:14px;background-color:${p.primary};color:#ffffff;box-shadow:0 9px 24px rgba(70,45,130,0.20);"><span style="display:inline-block;padding:9px;border-radius:999px;background-color:${p.secondary};vertical-align:middle;">${icon(`bell`, p.primary)}</span><span style="display:inline-block;max-width:73%;margin-left:13px;vertical-align:middle;"><p style="margin:0;color:#ffffff;font-size:19px;font-weight:800;line-height:1.4;">${account || text(state, `title`)}</p>${value(state, `subtitle`) ? `<p style="margin:6px 0 0;color:#f2edff;font-size:13px;line-height:1.7;">${text(state, `subtitle`)}</p>` : ``}</span></div>`
    case `directory`:
      return `<div style="padding:18px;border-left:6px solid ${p.primary};background-color:${p.surface};"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`menu`, p)}</span><span style="display:inline-block;max-width:73%;margin-left:12px;vertical-align:middle;">${heading(state, p)}</span><div style="margin-top:14px;"><span style="display:block;padding:8px 0;border-top:1px solid ${p.border};color:${p.muted};font-size:12px;">01　从这里开始</span><span style="display:block;padding:8px 0;border-top:1px solid ${p.border};color:${p.muted};font-size:12px;">02　继续向下阅读</span><span style="display:block;padding:8px 0;border-top:1px solid ${p.border};border-bottom:1px solid ${p.border};color:${p.muted};font-size:12px;">03　抵达文末入口</span></div></div>`
    case `related`:
      return `<div style="padding:18px;border:1px solid ${p.border};border-radius:6px;background-color:${p.surface};box-shadow:6px 6px 0 ${p.secondary};"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`book`, p)}</span><span style="display:inline-block;max-width:73%;margin-left:12px;vertical-align:middle;">${heading(state, p)}${actionLabel(state, p, false)}${referenceLink(state, p)}</span></div>`
    case `archive`:
      return `<div style="padding:17px 18px;border:1px solid ${p.border};background-color:${p.surface};"><p style="margin:0 0 12px;padding-bottom:9px;border-bottom:3px solid ${p.primary};color:${p.primary};font-size:11px;font-weight:800;letter-spacing:0.24em;">ARCHIVE / 往期</p><span style="display:inline-block;vertical-align:middle;">${iconBadge(`archive`, p)}</span><span style="display:inline-block;max-width:73%;margin-left:12px;vertical-align:middle;">${heading(state, p)}${actionLabel(state, p, false)}${referenceLink(state, p)}</span></div>`
    case `copyright`:
      return `<div style="padding:16px 18px;border:2px solid ${p.primary};background-color:${p.surface};box-shadow:5px 5px 0 ${p.secondary};"><span style="display:inline-block;vertical-align:middle;">${iconBadge(`shield`, p)}</span><span style="display:inline-block;max-width:73%;margin-left:12px;vertical-align:middle;">${heading(state, p)}${account ? `<p style="margin:7px 0 0;color:${p.primary};font-size:12px;font-weight:700;">版权归 ${account} 所有</p>` : ``}</span></div>`
    case `disclaimer`:
      return `<div style="padding:15px 17px;border:1px solid ${p.border};border-radius:7px;background-color:#f7f7f7;"><span style="display:inline-block;vertical-align:top;">${iconBadge(`info`, p)}</span><span style="display:inline-block;max-width:74%;margin-left:12px;vertical-align:top;">${heading(state, p)}${contact ? `<p style="margin:7px 0 0;color:${p.muted};font-size:11px;line-height:1.7;">如需沟通：${contact}</p>` : ``}</span></div>`
    default:
      return heading(state, p)
  }
}

function render(preset: BlockPreset, state: BlockState, withMetadata: boolean) {
  const attrs = withMetadata ? getBlockRootAttrs(preset) : `data-block-export="interactive"`
  return compactBlockMarkup(`
    <section ${attrs} style="margin:24px 0;padding:0;box-sizing:border-box;">
      ${withMetadata ? metadata(state) : ``}
      <div style="box-sizing:border-box;">${renderBody(preset, state)}</div>
    </section>
  `)
}

const interactiveCategory: BlockCategoryDefinition = {
  id: `interactive`,
  name: `互动`,
  description: `关注引导、行动召唤与联系入口`,
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
      category: `interactive`,
      presetId,
      state,
      title: String(state.title || preset.name),
    }
  },
  toWeChat: (preset, state) => render(preset, state, false),
}

export default interactiveCategory
