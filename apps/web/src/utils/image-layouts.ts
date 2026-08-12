export type MediaLayoutCategory = `image` | `mixed`
export type MediaLayoutFamily = `quiet` | `focus` | `contrast` | `editorial`
export type MediaLayoutTextMode = `plain` | `brief` | `story`
export type MediaAspectRatio = `auto` | `16:9` | `4:3` | `1:1` | `3:4` | `9:16`

export const MEDIA_LAYOUT_MAX_SLOTS = 4

export const mediaAspectRatioOptions: Array<{ value: MediaAspectRatio, label: string }> = [
  { value: `auto`, label: `原图比例` },
  { value: `16:9`, label: `横版 16:9` },
  { value: `4:3`, label: `横版 4:3` },
  { value: `1:1`, label: `方图 1:1` },
  { value: `3:4`, label: `竖版 3:4` },
  { value: `9:16`, label: `长图 9:16` },
]

export const mediaLayoutFamilyLabels: Record<MediaLayoutFamily, string> = {
  quiet: `留白`,
  focus: `强调`,
  contrast: `对比`,
  editorial: `叙事`,
}

export const mediaLayoutTextModeLabels: Record<MediaLayoutTextMode, string> = {
  plain: `纯图片`,
  brief: `图片+摘要`,
  story: `故事卡片`,
}

const mediaAspectRatioMap: Record<Exclude<MediaAspectRatio, `auto`>, string> = {
  '16:9': `16 / 9`,
  '4:3': `4 / 3`,
  '1:1': `1 / 1`,
  '3:4': `3 / 4`,
  '9:16': `9 / 16`,
}

const mediaAspectRatioPercentMap: Record<Exclude<MediaAspectRatio, `auto`>, string> = {
  '16:9': `56.25%`,
  '4:3': `75%`,
  '1:1': `100%`,
  '3:4': `133.3333%`,
  '9:16': `177.7778%`,
}

export interface MediaLayoutImageSlot {
  url: string
  alt: string
  caption: string
  title: string
  summary: string
  aspectRatio: MediaAspectRatio
  minHeight: number
}

export interface MediaLayoutFormState {
  blockWidth: number
  sectionLabel: string
  sectionTitle: string
  sectionLead: string
  bodyTitle: string
  bodyText: string
  secondaryText: string
  ctaText: string
  ctaUrl: string
  images: MediaLayoutImageSlot[]
}

export interface MediaLayoutPreset {
  id: string
  category: MediaLayoutCategory
  family: MediaLayoutFamily
  textMode: MediaLayoutTextMode
  name: string
  description: string
  cue: string
  slotCount: number
  requiredImageCount: number
}

export interface MediaLayoutBlockImage {
  alt: string
  url: string
}

export interface MediaLayoutBlockEntry {
  id: string
  raw: string
  from: number
  to: number
  title: string
  presetId: string
  layoutType: MediaLayoutCategory
  form: MediaLayoutFormState
  images: MediaLayoutBlockImage[]
}

export const mediaLayoutPresets: MediaLayoutPreset[] = [
  {
    id: `hero-image`,
    category: `image`,
    family: `focus`,
    textMode: `plain`,
    name: `留白头图`,
    description: `单图居中展示，适合章节转场和重点截图`,
    cue: `极简`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `frame-single`,
    category: `image`,
    family: `quiet`,
    textMode: `plain`,
    name: `边框单图`,
    description: `单图加轻边框，适合产品图、插画和实拍`,
    cue: `稳重`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `scroll-window`,
    category: `image`,
    family: `focus`,
    textMode: `plain`,
    name: `长图视窗`,
    description: `固定展示框内上下滑动长图，适合封面长海报和流程图`,
    cue: `长图`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `duo-gallery`,
    category: `image`,
    family: `quiet`,
    textMode: `plain`,
    name: `并排双图`,
    description: `两张图等权展示，适合前后对照和同类比较`,
    cue: `均衡`,
    slotCount: 2,
    requiredImageCount: 2,
  },
  {
    id: `vertical-pair`,
    category: `image`,
    family: `editorial`,
    textMode: `plain`,
    name: `上下双图`,
    description: `两张图纵向连排，适合步骤拆解、前后铺陈和双段讲述`,
    cue: `连读`,
    slotCount: 2,
    requiredImageCount: 2,
  },
  {
    id: `duo-focus`,
    category: `image`,
    family: `contrast`,
    textMode: `plain`,
    name: `主次双图`,
    description: `一张主图配一张辅助图，适合讲重点和补信息`,
    cue: `主次`,
    slotCount: 2,
    requiredImageCount: 2,
  },
  {
    id: `triptych-gallery`,
    category: `image`,
    family: `quiet`,
    textMode: `plain`,
    name: `三图均分`,
    description: `三张图并排，适合步骤、案例或同主题组图`,
    cue: `整齐`,
    slotCount: 3,
    requiredImageCount: 3,
  },
  {
    id: `vertical-strip`,
    category: `image`,
    family: `editorial`,
    textMode: `plain`,
    name: `纵向三联`,
    description: `三张图纵向排列，适合流程截图、案例串讲和节奏型叙事`,
    cue: `连排`,
    slotCount: 3,
    requiredImageCount: 3,
  },
  {
    id: `filmstrip-gallery`,
    category: `image`,
    family: `contrast`,
    textMode: `plain`,
    name: `胶片三联`,
    description: `更细长的三联版式，适合人物、实物和细节切片`,
    cue: `节奏`,
    slotCount: 3,
    requiredImageCount: 3,
  },
  {
    id: `stack-gallery`,
    category: `image`,
    family: `focus`,
    textMode: `plain`,
    name: `上下叠图`,
    description: `一张横向主图，下方两张辅助图，适合专题封面`,
    cue: `层级`,
    slotCount: 3,
    requiredImageCount: 3,
  },
  {
    id: `mosaic-focus`,
    category: `image`,
    family: `focus`,
    textMode: `plain`,
    name: `主次拼贴`,
    description: `左大右小的杂志式拼图，适合活动回顾和产品展示`,
    cue: `杂志`,
    slotCount: 3,
    requiredImageCount: 3,
  },
  {
    id: `split-left`,
    category: `mixed`,
    family: `editorial`,
    textMode: `brief`,
    name: `左图右文`,
    description: `图片负责引导，右侧用标题和摘要压住阅读节奏`,
    cue: `导读`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `split-right`,
    category: `mixed`,
    family: `editorial`,
    textMode: `brief`,
    name: `右图左文`,
    description: `和左图右文互补，适合在文章中交替出现`,
    cue: `换向`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `spotlight-card`,
    category: `mixed`,
    family: `focus`,
    textMode: `brief`,
    name: `下沉卡片`,
    description: `图片在上，说明卡片在下，适合案例、产品和亮点块`,
    cue: `重点`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `caption-band`,
    category: `mixed`,
    family: `quiet`,
    textMode: `brief`,
    name: `图片横注`,
    description: `纯图片为主，只在下方保留短标题和一句摘要`,
    cue: `轻文案`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `story-pair`,
    category: `mixed`,
    family: `editorial`,
    textMode: `story`,
    name: `双卡故事`,
    description: `两张图分别配标题和摘要，适合推荐位与双观点并列`,
    cue: `双卡`,
    slotCount: 2,
    requiredImageCount: 2,
  },
  {
    id: `polaroid-single`,
    category: `image`,
    family: `quiet`,
    textMode: `plain`,
    name: `拍立得相框`,
    description: `白色厚相框加底部留白，适合生活照、现场随拍和人物照`,
    cue: `拍立得`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `shadow-card-single`,
    category: `image`,
    family: `focus`,
    textMode: `plain`,
    name: `投影卡片图`,
    description: `大圆角配柔和投影，图片像卡片一样浮起来，适合产品图和界面图`,
    cue: `悬浮`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `full-bleed-single`,
    category: `image`,
    family: `editorial`,
    textMode: `plain`,
    name: `满栏直角图`,
    description: `去掉圆角贴满栏宽，图注左对齐加细分割线，适合封面和大场景`,
    cue: `满栏`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `compare-pair`,
    category: `image`,
    family: `contrast`,
    textMode: `plain`,
    name: `左右对比`,
    description: `两张图中间加分隔线，左右各带一个角标，适合改版前后和方案对照`,
    cue: `前后`,
    slotCount: 2,
    requiredImageCount: 2,
  },
  {
    id: `magazine-spread`,
    category: `image`,
    family: `editorial`,
    textMode: `plain`,
    name: `杂志跨页`,
    description: `两张图零间距无缝拼接，外圆角内细缝，适合全景和连续画面`,
    cue: `跨页`,
    slotCount: 2,
    requiredImageCount: 2,
  },
  {
    id: `quad-grid`,
    category: `image`,
    family: `quiet`,
    textMode: `plain`,
    name: `四宫格`,
    description: `2×2 等分方图，适合活动返图、素材集和同系列展示`,
    cue: `四格`,
    slotCount: 4,
    requiredImageCount: 4,
  },
  {
    id: `hero-trio`,
    category: `image`,
    family: `focus`,
    textMode: `plain`,
    name: `一主三副`,
    description: `上方一张主图压场，下方三张小图补细节，适合专题头图`,
    cue: `一拖三`,
    slotCount: 4,
    requiredImageCount: 4,
  },
  {
    id: `numbered-figure`,
    category: `mixed`,
    family: `editorial`,
    textMode: `brief`,
    name: `编号图注`,
    description: `图片左上角带编号角标，下方是左对齐竖线图注，适合步骤讲解`,
    cue: `编号`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `gradient-caption`,
    category: `mixed`,
    family: `focus`,
    textMode: `brief`,
    name: `渐变标题图`,
    description: `标题直接压在图片底部的渐变遮罩上，适合封面图和栏目头图`,
    cue: `遮罩`,
    slotCount: 1,
    requiredImageCount: 1,
  },
  {
    id: `quote-figure`,
    category: `mixed`,
    family: `quiet`,
    textMode: `brief`,
    name: `引用配图`,
    description: `图片下方接一段竖线引用文字和署名，适合观点、金句和访谈`,
    cue: `引用`,
    slotCount: 1,
    requiredImageCount: 1,
  },
]

const extendedMediaLayoutPresetIds = new Set([
  `polaroid-single`,
  `shadow-card-single`,
  `full-bleed-single`,
  `compare-pair`,
  `magazine-spread`,
  `quad-grid`,
  `hero-trio`,
  `numbered-figure`,
  `gradient-caption`,
  `quote-figure`,
])

const badgeMediaLayoutPresetIds = new Set([`compare-pair`, `numbered-figure`])

export function isExtendedMediaLayoutPreset(presetId: string) {
  return extendedMediaLayoutPresetIds.has(presetId)
}

export function mediaLayoutPresetSupportsBadge(presetId: string) {
  return badgeMediaLayoutPresetIds.has(presetId)
}

export function getMediaLayoutBadgeFallback(presetId: string, index: number) {
  if (presetId === `compare-pair`) {
    return index === 0 ? `前` : `后`
  }
  if (presetId === `numbered-figure`) {
    return `0${index + 1}`
  }
  return ``
}

export function getMediaLayoutCopyPlaceholders(presetId: string) {
  if (presetId === `quote-figure`) {
    return { title: `署名或出处，可不填`, body: `引用文字，可不填` }
  }
  if (presetId === `gradient-caption`) {
    return { title: `压在图片上的标题，可不填`, body: `压在图片上的副标题，可不填` }
  }
  if (presetId === `numbered-figure`) {
    return { title: `图注标题，可不填`, body: `图注说明，可不填` }
  }
  return { title: `标题，可不填`, body: `摘要，一两句话即可，可不填` }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
}

function decodeHtml(value: string) {
  return value
    .replace(/&lt;/g, `<`)
    .replace(/&gt;/g, `>`)
    .replace(/&quot;/g, `"`)
    .replace(/&#39;/g, `'`)
    .replace(/&amp;/g, `&`)
}

function formatText(value: string) {
  return escapeHtml(value.trim()).replace(/\n+/g, `<br/>`)
}

function hasText(value: string) {
  return value.trim().length > 0
}

function stripMarkupIndent(value: string) {
  const normalized = value.replace(/\r/g, ``).trim()
  if (!normalized) {
    return ``
  }

  return normalized
    .split(`\n`)
    .map(line => line.trim())
    .filter(Boolean)
    .join(`\n`)
}

function createDefaultImageSlot(index: number): MediaLayoutImageSlot {
  return {
    url: ``,
    alt: `图片 ${index + 1}`,
    caption: `这里填写图片说明`,
    title: `这里填写卡片标题`,
    summary: `这里填写这一张图对应的简短说明。`,
    aspectRatio: index === 0 ? `16:9` : `4:3`,
    minHeight: 240,
  }
}

function createPlaceholder(label: string, index: number) {
  const tones = [
    { start: `#eef2ff`, end: `#c7d2fe`, text: `#4338ca` },
    { start: `#fef3c7`, end: `#fde68a`, text: `#b45309` },
    { start: `#dcfce7`, end: `#bbf7d0`, text: `#15803d` },
  ]
  const tone = tones[index % tones.length]
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${tone.start}" />
          <stop offset="100%" stop-color="${tone.end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="32" fill="url(#g)" />
      <text x="600" y="370" text-anchor="middle" font-size="40" font-family="Arial, sans-serif" fill="${tone.text}" opacity="0.74">请填写图片链接</text>
      <text x="600" y="430" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="${tone.text}" opacity="0.58">${escapeHtml(label)}</text>
    </svg>
  `.trim()
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function resolveImageUrl(slot: MediaLayoutImageSlot, index: number, preview: boolean) {
  if (hasText(slot.url)) {
    return escapeHtml(slot.url.trim())
  }
  return preview ? createPlaceholder(slot.alt || `图片 ${index + 1}`, index) : ``
}

interface FigureRenderOptions {
  figureStyle?: string
  frameStyle?: string
  imageStyle?: string
  captionStyle?: string
  overlay?: string
  suppressCaption?: boolean
}

function renderImageFigure(
  slot: MediaLayoutImageSlot,
  index: number,
  preview: boolean,
  extraClass = ``,
  options: FigureRenderOptions = {},
) {
  const url = resolveImageUrl(slot, index, preview)
  const alt = escapeHtml(slot.alt.trim() || `图片 ${index + 1}`)
  const ratioClass = slot.aspectRatio === `auto` ? `md-media-figure--auto` : ``
  const className = [`md-media-figure`, ratioClass, extraClass].filter(Boolean).join(` `)
  const styleTokens: string[] = []
  if (slot.aspectRatio !== `auto`) {
    styleTokens.push(`--md-media-aspect:${mediaAspectRatioMap[slot.aspectRatio]}`)
    styleTokens.push(`--md-media-ratio-percent:${mediaAspectRatioPercentMap[slot.aspectRatio]}`)
  }
  if (slot.minHeight > 0) {
    styleTokens.push(`--md-media-min-height:${Math.round(slot.minHeight)}px`)
  }
  if (options.figureStyle) {
    styleTokens.push(options.figureStyle)
  }
  const style = styleTokens.length > 0 ? ` style="${styleTokens.join(`;`)}"` : ``
  const frameStyle = options.frameStyle ? ` style="${options.frameStyle}"` : ``
  const imageStyle = options.imageStyle ? ` style="${options.imageStyle}"` : ``
  const captionStyle = options.captionStyle ? ` style="${options.captionStyle}"` : ``
  const overlay = options.overlay ?? ``
  const caption = !options.suppressCaption && hasText(slot.caption)
    ? `<figcaption class="md-media-figure__caption"${captionStyle}>${formatText(slot.caption)}</figcaption>`
    : ``

  return `
    <figure class="${className}"${style}>
      <span class="md-media-figure__frame"${frameStyle}>
        <img class="md-media-figure__image" src="${url}" alt="${alt}"${imageStyle} />
        ${overlay}
      </span>
      ${caption}
    </figure>
  `
}

function renderScrollableFigure(slot: MediaLayoutImageSlot, index: number, preview: boolean) {
  const url = resolveImageUrl(slot, index, preview)
  const alt = escapeHtml(slot.alt.trim() || `图片 ${index + 1}`)
  const viewportHeight = Math.max(180, Math.round(slot.minHeight || 380))
  const caption = hasText(slot.caption)
    ? `<figcaption class="md-media-figure__caption">${formatText(slot.caption)}</figcaption>`
    : ``

  return `
    <figure class="md-media-figure md-media-figure--scroll">
      <div class="md-media-scroll-window" style="--md-media-scroll-height:${viewportHeight}px">
        <img class="md-media-scroll-window__image" src="${url}" alt="${alt}" />
      </div>
      ${caption}
    </figure>
  `
}

function renderSectionHeader(form: MediaLayoutFormState) {
  const label = hasText(form.sectionLabel)
    ? `<span class="md-media-block__label">${formatText(form.sectionLabel)}</span>`
    : ``
  const title = hasText(form.sectionTitle)
    ? `<h3 class="md-media-block__title">${formatText(form.sectionTitle)}</h3>`
    : ``
  const lead = hasText(form.sectionLead)
    ? `<p class="md-media-block__lead">${formatText(form.sectionLead)}</p>`
    : ``

  if (!label && !title && !lead) {
    return ``
  }

  return `
    <header class="md-media-block__header">
      ${label}
      ${title}
      ${lead}
    </header>
  `
}

function renderSectionAttrs(form: MediaLayoutFormState, presetId: string, extraClass = ``) {
  const classes = [`md-media-block`, extraClass].filter(Boolean).join(` `)
  const blockWidth = Math.min(100, Math.max(52, Math.round(form.blockWidth || 100)))
  return `class="${classes}" data-layout-preset="${presetId}" style="--md-media-block-width:${blockWidth}%"`
}

function renderContentText(form: MediaLayoutFormState, extraClass = ``) {
  const title = hasText(form.bodyTitle)
    ? `<h4 class="md-media-content__title">${formatText(form.bodyTitle)}</h4>`
    : ``
  const body = hasText(form.bodyText)
    ? `<p class="md-media-content__body">${formatText(form.bodyText)}</p>`
    : ``
  const secondary = hasText(form.secondaryText)
    ? `<p class="md-media-content__meta">${formatText(form.secondaryText)}</p>`
    : ``
  const cta = hasText(form.ctaText) && hasText(form.ctaUrl)
    ? `<a class="md-media-content__link" href="${escapeHtml(form.ctaUrl.trim())}" target="_blank" rel="noreferrer">${formatText(form.ctaText)}</a>`
    : ``

  if (!title && !body && !secondary && !cta) {
    return ``
  }

  const className = [`md-media-content`, extraClass].filter(Boolean).join(` `)
  return `
    <div class="${className}">
      ${title}
      ${body}
      ${secondary}
      ${cta}
    </div>
  `
}

function renderStoryCard(slot: MediaLayoutImageSlot, index: number, preview: boolean) {
  const title = hasText(slot.title)
    ? `<h4 class="md-media-content__title">${formatText(slot.title)}</h4>`
    : ``
  const summary = hasText(slot.summary)
    ? `<p class="md-media-content__body">${formatText(slot.summary)}</p>`
    : ``
  const content = title || summary
    ? `
      <div class="md-media-content md-media-content--story">
        ${title}
        ${summary}
      </div>
    `
    : ``

  return `
    <article class="md-media-story-card">
      ${renderImageFigure(slot, index, preview)}
      ${content}
    </article>
  `
}

const extendedCaptionCenterStyle = `padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;`
const extendedBadgeBaseStyle = `position:absolute;z-index:2;left:12px;top:12px;display:inline-block;padding:0.24em 0.72em;border-radius:999px;background:var(--md-primary-color);color:#ffffff;font-size:0.72em;font-weight:700;line-height:1.6;letter-spacing:0.02em;`

function resolveBadgeText(slot: MediaLayoutImageSlot, presetId: string, index: number) {
  const custom = slot.title.trim()
  return custom || getMediaLayoutBadgeFallback(presetId, index)
}

function renderBadge(text: string) {
  if (!hasText(text)) {
    return ``
  }
  return `<span class="md-media-x-badge" style="${extendedBadgeBaseStyle}">${formatText(text)}</span>`
}

function renderExtendedGrid(columns: string, gap: string, children: string[], extraStyle = ``) {
  return `
    <div class="md-media-x-grid" style="display:grid;grid-template-columns:${columns};gap:${gap};align-items:start;${extraStyle}">
      ${children.join(`\n`)}
    </div>
  `
}

function renderRuleCopy(form: MediaLayoutFormState, options: { marginTop?: string } = {}) {
  const title = hasText(form.bodyTitle)
    ? `<p class="md-media-content__title" style="margin:0;font-size:0.94em;line-height:1.5;">${formatText(form.bodyTitle)}</p>`
    : ``
  const body = hasText(form.bodyText)
    ? `<p class="md-media-content__body" style="margin:${title ? `0.4rem` : `0`} 0 0;font-size:0.86em;line-height:1.72;">${formatText(form.bodyText)}</p>`
    : ``

  if (!title && !body) {
    return ``
  }

  return `
    <div class="md-media-x-copy" style="margin-top:${options.marginTop ?? `0.75rem`};padding:0.1rem 0 0.1rem 0.75rem;border-left:3px solid var(--md-primary-color);">
      ${title}
      ${body}
    </div>
  `
}

function renderQuoteCopy(form: MediaLayoutFormState) {
  const quote = hasText(form.bodyText)
    ? `<p class="md-media-content__body" style="margin:0;font-size:0.94em;line-height:1.85;">${formatText(form.bodyText)}</p>`
    : ``
  const source = hasText(form.bodyTitle)
    ? `<p class="md-media-content__meta" style="margin:${quote ? `0.55rem` : `0`} 0 0;font-size:0.8em;line-height:1.6;text-align:right;">— ${formatText(form.bodyTitle)}</p>`
    : ``

  if (!quote && !source) {
    return ``
  }

  return `
    <div class="md-media-x-copy" style="margin-top:0.85rem;padding:0.1rem 0 0.1rem 0.9rem;border-left:3px solid var(--md-primary-color);">
      ${quote}
      ${source}
    </div>
  `
}

function renderGradientOverlay(form: MediaLayoutFormState) {
  const title = hasText(form.bodyTitle)
    ? `<span class="md-media-content__title" style="display:block;margin:0;color:#ffffff;font-size:1.02em;font-weight:700;line-height:1.45;">${formatText(form.bodyTitle)}</span>`
    : ``
  const body = hasText(form.bodyText)
    ? `<span class="md-media-content__body" style="display:block;margin:${title ? `0.35rem` : `0`} 0 0;color:rgba(255,255,255,0.84);font-size:0.82em;line-height:1.65;">${formatText(form.bodyText)}</span>`
    : ``

  if (!title && !body) {
    return ``
  }

  return `
    <span class="md-media-x-copy" style="position:absolute;z-index:2;left:0;right:0;bottom:0;display:block;padding:2.6rem 1rem 0.95rem;background-image:linear-gradient(to top, rgba(15,23,42,0.88), rgba(15,23,42,0.52) 46%, rgba(15,23,42,0));">
      ${title}
      ${body}
    </span>
  `
}

function buildExtendedMediaLayoutMarkup(
  preset: MediaLayoutPreset,
  form: MediaLayoutFormState,
  preview: boolean,
  sectionHeader: string,
) {
  const slots = form.images.slice(0, preset.slotCount)

  if (preset.id === `polaroid-single`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-x-polaroid" style="padding:0.85rem 0.85rem 1.1rem;border:1px solid #ececec;border-radius:6px;background:#ffffff;box-shadow:0 14px 32px rgba(15,23,42,0.15);">
          ${renderImageFigure(slots[0], 0, preview, ``, {
            frameStyle: `border-radius:2px;`,
            imageStyle: `border-radius:2px;`,
            captionStyle: `padding:0.85rem 0.3rem 0;font-size:0.82em;line-height:1.6;text-align:center;color:#6b7280;`,
          })}
        </div>
      </section>
    `)
  }

  if (preset.id === `shadow-card-single`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${renderImageFigure(slots[0], 0, preview, ``, {
          figureStyle: `overflow:visible;`,
          frameStyle: `border-radius:20px;border:1px solid rgba(15,23,42,0.06);box-shadow:0 18px 40px rgba(15,23,42,0.2);`,
          imageStyle: `border-radius:20px;`,
          captionStyle: `padding:1rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;`,
        })}
      </section>
    `)
  }

  if (preset.id === `full-bleed-single`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${renderImageFigure(slots[0], 0, preview, ``, {
          frameStyle: `border-radius:0;`,
          imageStyle: `border-radius:0;`,
          captionStyle: `margin-top:0.65rem;padding:0.6rem 0 0;border-top:1px solid #e5e7eb;font-size:0.8em;line-height:1.6;text-align:left;`,
        })}
      </section>
    `)
  }

  if (preset.id === `compare-pair`) {
    const left = renderImageFigure(slots[0], 0, preview, ``, {
      captionStyle: extendedCaptionCenterStyle,
      overlay: renderBadge(resolveBadgeText(slots[0], preset.id, 0)),
    })
    const right = renderImageFigure(slots[1], 1, preview, ``, {
      captionStyle: extendedCaptionCenterStyle,
      overlay: renderBadge(resolveBadgeText(slots[1], preset.id, 1)),
    })
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-x-compare" style="display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);gap:0.68rem;align-items:stretch;">
          ${left}
          <span class="md-media-x-divider" style="display:block;width:1px;background:#e5e7eb;"></span>
          ${right}
        </div>
      </section>
    `)
  }

  if (preset.id === `magazine-spread`) {
    const left = renderImageFigure(slots[0], 0, preview, ``, {
      frameStyle: `border-radius:18px 0 0 18px;`,
      imageStyle: `border-radius:18px 0 0 18px;`,
      captionStyle: extendedCaptionCenterStyle,
    })
    const right = renderImageFigure(slots[1], 1, preview, ``, {
      frameStyle: `border-radius:0 18px 18px 0;border-left:1px solid rgba(255,255,255,0.55);`,
      imageStyle: `border-radius:0 18px 18px 0;`,
      captionStyle: extendedCaptionCenterStyle,
    })
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${renderExtendedGrid(`repeat(2, minmax(0, 1fr))`, `0`, [left, right])}
      </section>
    `)
  }

  if (preset.id === `quad-grid`) {
    const cells = slots.map((slot, index) => renderImageFigure(slot, index, preview, ``, {
      captionStyle: extendedCaptionCenterStyle,
    }))
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${renderExtendedGrid(`repeat(2, minmax(0, 1fr))`, `0.5rem`, cells)}
      </section>
    `)
  }

  if (preset.id === `hero-trio`) {
    const hero = renderImageFigure(slots[0], 0, preview, ``, {
      captionStyle: extendedCaptionCenterStyle,
    })
    const tail = slots.slice(1).map((slot, index) => renderImageFigure(slot, index + 1, preview, ``, {
      captionStyle: extendedCaptionCenterStyle,
    }))
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${hero}
        ${renderExtendedGrid(`repeat(3, minmax(0, 1fr))`, `0.45rem`, tail, `margin-top:0.5rem;`)}
      </section>
    `)
  }

  if (preset.id === `numbered-figure`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${renderImageFigure(slots[0], 0, preview, ``, {
          captionStyle: extendedCaptionCenterStyle,
          overlay: renderBadge(resolveBadgeText(slots[0], preset.id, 0)),
        })}
        ${renderRuleCopy(form)}
      </section>
    `)
  }

  if (preset.id === `gradient-caption`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${renderImageFigure(slots[0], 0, preview, ``, {
          captionStyle: extendedCaptionCenterStyle,
          overlay: renderGradientOverlay(form),
        })}
      </section>
    `)
  }

  if (preset.id === `quote-figure`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        ${renderImageFigure(slots[0], 0, preview, ``, {
          captionStyle: extendedCaptionCenterStyle,
        })}
        ${renderQuoteCopy(form)}
      </section>
    `)
  }

  return ``
}

export function createDefaultMediaLayoutState(): MediaLayoutFormState {
  return {
    blockWidth: 100,
    sectionLabel: `图文模块`,
    sectionTitle: `这里填写版块标题`,
    sectionLead: `这里填写一句导语，用来说明这一组图片或这段图文的主题。`,
    bodyTitle: `这里填写正文标题`,
    bodyText: `这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。`,
    secondaryText: `这里填写补充说明、时间、地点或一句简短结论。`,
    ctaText: `延伸阅读`,
    ctaUrl: `https://example.com`,
    images: Array.from({ length: MEDIA_LAYOUT_MAX_SLOTS }, (_, index) => createDefaultImageSlot(index)),
  }
}

export function cloneMediaLayoutState(state: MediaLayoutFormState = createDefaultMediaLayoutState()): MediaLayoutFormState {
  return {
    blockWidth: state.blockWidth,
    sectionLabel: state.sectionLabel,
    sectionTitle: state.sectionTitle,
    sectionLead: state.sectionLead,
    bodyTitle: state.bodyTitle,
    bodyText: state.bodyText,
    secondaryText: state.secondaryText,
    ctaText: state.ctaText,
    ctaUrl: state.ctaUrl,
    images: Array.from({ length: MEDIA_LAYOUT_MAX_SLOTS }, (_, index) => ({
      ...createDefaultImageSlot(index),
      ...(state.images[index] ?? {}),
      aspectRatio: state.images[index]?.aspectRatio ?? createDefaultImageSlot(index).aspectRatio,
      minHeight: state.images[index]?.minHeight ?? createDefaultImageSlot(index).minHeight,
    })),
  }
}

export function normalizeMediaLayoutState(
  state?: Partial<MediaLayoutFormState> | MediaLayoutFormState | null,
): MediaLayoutFormState {
  const defaults = createDefaultMediaLayoutState()
  if (!state) {
    return defaults
  }

  return cloneMediaLayoutState({
    ...defaults,
    ...state,
    images: Array.from({ length: MEDIA_LAYOUT_MAX_SLOTS }, (_, index) => ({
      ...defaults.images[index],
      ...(state.images?.[index] ?? {}),
      aspectRatio: state.images?.[index]?.aspectRatio ?? defaults.images[index].aspectRatio,
      minHeight: state.images?.[index]?.minHeight ?? defaults.images[index].minHeight,
    })),
  })
}

const autoMediaLayoutPresetMap: Record<number, string> = {
  1: `hero-image`,
  2: `duo-gallery`,
  3: `triptych-gallery`,
  4: `quad-grid`,
}

/**
 * 按图片张数挑一个默认版式，用于批量插入时自动套版
 */
export function resolveAutoMediaLayoutPresetId(count: number) {
  return autoMediaLayoutPresetMap[Math.min(Math.max(count, 1), MEDIA_LAYOUT_MAX_SLOTS)] ?? `hero-image`
}

export function createMediaLayoutStateFromImages(
  preset: MediaLayoutPreset,
  images: Array<{ url: string, alt?: string }>,
): MediaLayoutFormState {
  const state = createDefaultMediaLayoutState()
  const slotDefaults = getMediaLayoutPresetSlotDefaults(preset.id)

  state.sectionLabel = ``
  state.sectionTitle = ``
  state.sectionLead = ``
  state.bodyTitle = ``
  state.bodyText = ``
  state.secondaryText = ``
  state.ctaText = ``
  state.ctaUrl = ``
  state.images = state.images.map((slot, index) => {
    const defaults = slotDefaults[index] ?? slotDefaults[slotDefaults.length - 1]
    const image = images[index]
    return {
      ...slot,
      url: image?.url ?? ``,
      alt: image?.alt?.trim() || `图片 ${index + 1}`,
      caption: ``,
      title: mediaLayoutPresetSupportsBadge(preset.id) ? getMediaLayoutBadgeFallback(preset.id, index) : ``,
      summary: ``,
      aspectRatio: defaults?.aspectRatio ?? slot.aspectRatio,
      minHeight: defaults?.minHeight ?? slot.minHeight,
    }
  })

  return state
}

export function getMediaLayoutPresetSlotDefaults(presetId: string) {
  if (presetId === `hero-image`) {
    return [{ aspectRatio: `16:9` as MediaAspectRatio, minHeight: 300 }]
  }
  if (presetId === `frame-single`) {
    return [{ aspectRatio: `4:3` as MediaAspectRatio, minHeight: 280 }]
  }
  if (presetId === `scroll-window`) {
    return [{ aspectRatio: `auto` as MediaAspectRatio, minHeight: 420 }]
  }
  if (presetId === `duo-gallery`) {
    return [
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 230 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 230 },
    ]
  }
  if (presetId === `vertical-pair`) {
    return [
      { aspectRatio: `16:9` as MediaAspectRatio, minHeight: 220 },
      { aspectRatio: `16:9` as MediaAspectRatio, minHeight: 220 },
    ]
  }
  if (presetId === `duo-focus`) {
    return [
      { aspectRatio: `3:4` as MediaAspectRatio, minHeight: 300 },
      { aspectRatio: `1:1` as MediaAspectRatio, minHeight: 220 },
    ]
  }
  if (presetId === `triptych-gallery`) {
    return [
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 210 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 210 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 210 },
    ]
  }
  if (presetId === `vertical-strip`) {
    return [
      { aspectRatio: `16:9` as MediaAspectRatio, minHeight: 180 },
      { aspectRatio: `16:9` as MediaAspectRatio, minHeight: 180 },
      { aspectRatio: `16:9` as MediaAspectRatio, minHeight: 180 },
    ]
  }
  if (presetId === `filmstrip-gallery`) {
    return [
      { aspectRatio: `3:4` as MediaAspectRatio, minHeight: 250 },
      { aspectRatio: `3:4` as MediaAspectRatio, minHeight: 250 },
      { aspectRatio: `3:4` as MediaAspectRatio, minHeight: 250 },
    ]
  }
  if (presetId === `stack-gallery`) {
    return [
      { aspectRatio: `16:9` as MediaAspectRatio, minHeight: 260 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 180 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 180 },
    ]
  }
  if (presetId === `mosaic-focus`) {
    return [
      { aspectRatio: `3:4` as MediaAspectRatio, minHeight: 320 },
      { aspectRatio: `1:1` as MediaAspectRatio, minHeight: 150 },
      { aspectRatio: `1:1` as MediaAspectRatio, minHeight: 150 },
    ]
  }
  if (presetId === `split-left` || presetId === `split-right`) {
    return [{ aspectRatio: `4:3` as MediaAspectRatio, minHeight: 280 }]
  }
  if (presetId === `spotlight-card`) {
    return [{ aspectRatio: `16:9` as MediaAspectRatio, minHeight: 280 }]
  }
  if (presetId === `caption-band`) {
    return [{ aspectRatio: `16:9` as MediaAspectRatio, minHeight: 260 }]
  }
  if (presetId === `story-pair`) {
    return [
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 220 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 220 },
    ]
  }
  if (presetId === `polaroid-single`) {
    return [{ aspectRatio: `1:1` as MediaAspectRatio, minHeight: 300 }]
  }
  if (presetId === `shadow-card-single`) {
    return [{ aspectRatio: `16:9` as MediaAspectRatio, minHeight: 300 }]
  }
  if (presetId === `full-bleed-single`) {
    return [{ aspectRatio: `16:9` as MediaAspectRatio, minHeight: 300 }]
  }
  if (presetId === `compare-pair`) {
    return [
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 240 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 240 },
    ]
  }
  if (presetId === `magazine-spread`) {
    return [
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 240 },
      { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 240 },
    ]
  }
  if (presetId === `quad-grid`) {
    return Array.from({ length: 4 }, () => ({ aspectRatio: `1:1` as MediaAspectRatio, minHeight: 180 }))
  }
  if (presetId === `hero-trio`) {
    return [
      { aspectRatio: `16:9` as MediaAspectRatio, minHeight: 260 },
      { aspectRatio: `1:1` as MediaAspectRatio, minHeight: 140 },
      { aspectRatio: `1:1` as MediaAspectRatio, minHeight: 140 },
      { aspectRatio: `1:1` as MediaAspectRatio, minHeight: 140 },
    ]
  }
  if (presetId === `numbered-figure`) {
    return [{ aspectRatio: `4:3` as MediaAspectRatio, minHeight: 280 }]
  }
  if (presetId === `gradient-caption`) {
    return [{ aspectRatio: `16:9` as MediaAspectRatio, minHeight: 300 }]
  }
  if (presetId === `quote-figure`) {
    return [{ aspectRatio: `16:9` as MediaAspectRatio, minHeight: 280 }]
  }

  return [
    { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 260 },
    { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 260 },
    { aspectRatio: `4:3` as MediaAspectRatio, minHeight: 260 },
  ]
}

export function repairIndentedMediaLayoutBlocks(content: string) {
  const lines = content.replace(/\r/g, ``).split(`\n`)
  const result: string[] = []
  let changed = false

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index]
    const trimmed = currentLine.trimStart()

    if (trimmed.startsWith(`<section class="md-media-block`)) {
      const blockLines = [currentLine]
      let endIndex = index

      while (endIndex + 1 < lines.length) {
        endIndex += 1
        blockLines.push(lines[endIndex])
        if (lines[endIndex].trimStart().startsWith(`</section>`)) {
          break
        }
      }

      const repairedBlock = stripMarkupIndent(blockLines.join(`\n`))
      if (repairedBlock !== blockLines.join(`\n`)) {
        changed = true
      }
      result.push(...repairedBlock.split(`\n`))
      index = endIndex
      continue
    }

    result.push(currentLine)
  }

  return changed ? result.join(`\n`) : content
}

export function parseMediaLayoutBlocks(content: string): MediaLayoutBlockEntry[] {
  const entries: MediaLayoutBlockEntry[] = []
  const regex = /<section class="md-media-block[\s\S]*?<\/section>/g

  for (const match of content.matchAll(regex)) {
    const raw = match[0]
    const from = match.index ?? 0
    const images = Array.from(
      raw.matchAll(/<img\b[^>]*\bsrc="([^"]*)"[^>]*\balt="([^"]*)"[^>]*\/?>/g),
      imageMatch => ({
        url: decodeHtml((imageMatch[1] || ``).trim()),
        alt: decodeHtml((imageMatch[2] || ``).trim()),
      }),
    ).filter(image => image.url)

    if (!images.length) {
      continue
    }

    const form = parseMediaLayoutForm(raw)
    const title = form.sectionTitle.trim() || form.bodyTitle.trim() || form.sectionLabel.trim() || `未命名拼图`
    const presetId = resolveMediaLayoutPresetId(raw)

    entries.push({
      id: `${from}-${images.map(image => image.url).join(`|`)}`,
      raw,
      from,
      to: from + raw.length,
      title,
      presetId,
      layoutType: mediaLayoutPresets.find(item => item.id === presetId)?.category
        ?? (raw.includes(`md-media-combo`) ? `mixed` : `image`),
      form,
      images,
    })
  }

  return entries
}

function parseStyleNumericValue(style: string, propertyName: string) {
  const match = style.match(new RegExp(`${propertyName}\\s*:\\s*([\\d.]+)`))
  return match ? Number(match[1]) : null
}

function parseAspectRatioValue(style: string): MediaAspectRatio | null {
  if (!style.includes(`--md-media-aspect`)) {
    return null
  }

  if (style.includes(`16 / 9`)) {
    return `16:9`
  }
  if (style.includes(`4 / 3`)) {
    return `4:3`
  }
  if (style.includes(`1 / 1`)) {
    return `1:1`
  }
  if (style.includes(`3 / 4`)) {
    return `3:4`
  }
  if (style.includes(`9 / 16`)) {
    return `9:16`
  }
  return null
}

function resolveMediaLayoutPresetId(raw: string) {
  const presetMatch = raw.match(/data-layout-preset="([^"]+)"/)
  if (presetMatch?.[1]) {
    return presetMatch[1]
  }

  if (raw.includes(`md-media-block--scroll-window`)) {
    return `scroll-window`
  }
  if (raw.includes(`md-media-grid--mosaic`)) {
    return `mosaic-focus`
  }
  if (raw.includes(`md-media-grid--stacked`) || raw.includes(`md-media-grid--stack`)) {
    return `stack-gallery`
  }
  if (raw.includes(`md-media-grid--filmstrip`)) {
    return `filmstrip-gallery`
  }
  if (raw.includes(`md-media-grid--triptych`)) {
    return `triptych-gallery`
  }
  if (raw.includes(`md-media-grid--duo-focus`)) {
    return `duo-focus`
  }
  if (raw.includes(`md-media-grid--duo`)) {
    return `duo-gallery`
  }
  if (raw.includes(`md-media-grid--vertical-pair`)) {
    return `vertical-pair`
  }
  if (raw.includes(`md-media-combo--caption-band`)) {
    return `caption-band`
  }
  if (raw.includes(`md-media-combo--spotlight`)) {
    return `spotlight-card`
  }
  if ((raw.includes(`md-media-combo--editorial`) || raw.includes(`md-media-combo--split`)) && raw.includes(`md-media-combo--reverse`)) {
    return `split-right`
  }
  if (raw.includes(`md-media-combo--editorial`) || raw.includes(`md-media-combo--split`)) {
    return `split-left`
  }
  if (raw.includes(`md-media-story-grid`)) {
    return `story-pair`
  }
  if (raw.includes(`md-media-grid--vertical-strip`)) {
    return `vertical-strip`
  }
  if (raw.includes(`md-media-figure--frame`)) {
    return `frame-single`
  }
  return `hero-image`
}

function parseMediaLayoutForm(raw: string): MediaLayoutFormState {
  const presetId = resolveMediaLayoutPresetId(raw)
  const defaults = createDefaultMediaLayoutState()
  const form = cloneMediaLayoutState(defaults)

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(raw, `text/html`)
    const section = doc.body.querySelector(`section.md-media-block`)
    if (!section) {
      return form
    }

    const sectionStyle = section.getAttribute(`style`) || ``
    const blockWidth = parseStyleNumericValue(sectionStyle, `--md-media-block-width`)
    if (blockWidth) {
      form.blockWidth = blockWidth
    }

    form.sectionLabel = section.querySelector(`.md-media-block__label`)?.textContent?.trim() || ``
    form.sectionTitle = section.querySelector(`.md-media-block__title`)?.textContent?.trim() || ``
    form.sectionLead = section.querySelector(`.md-media-block__lead`)?.textContent?.trim() || ``

    const figures = Array.from(section.querySelectorAll<HTMLElement>(`.md-media-figure`))
    figures.forEach((figure, index) => {
      const imageEl = figure.querySelector<HTMLImageElement>(`img`)
      if (!imageEl || !form.images[index]) {
        return
      }

      form.images[index].url = imageEl.getAttribute(`src`) || ``
      form.images[index].alt = imageEl.getAttribute(`alt`) || `图片 ${index + 1}`
      form.images[index].caption = figure.querySelector(`.md-media-figure__caption`)?.textContent?.trim() || ``

      const figureStyle = figure.getAttribute(`style`) || ``
      const parsedAspect = parseAspectRatioValue(figureStyle)
      const parsedHeight = parseStyleNumericValue(figureStyle, `--md-media-min-height`)
      if (parsedAspect) {
        form.images[index].aspectRatio = parsedAspect
      }
      if (parsedHeight) {
        form.images[index].minHeight = parsedHeight
      }
    })

    if (presetId === `scroll-window`) {
      const scrollWindow = section.querySelector<HTMLElement>(`.md-media-scroll-window`)
      const scrollStyle = scrollWindow?.getAttribute(`style`) || ``
      const scrollHeight = parseStyleNumericValue(scrollStyle, `--md-media-scroll-height`)
      if (scrollHeight) {
        form.images[0].minHeight = scrollHeight
      }
      form.images[0].aspectRatio = `auto`
    }

    if (mediaLayoutPresetSupportsBadge(presetId)) {
      figures.forEach((figure, index) => {
        if (!form.images[index]) {
          return
        }
        form.images[index].title = figure.querySelector(`.md-media-x-badge`)?.textContent?.trim() || ``
      })
    }

    if (presetId === `story-pair`) {
      const cards = Array.from(section.querySelectorAll<HTMLElement>(`.md-media-story-card`))
      cards.forEach((card, index) => {
        if (!form.images[index]) {
          return
        }
        form.images[index].title = card.querySelector(`.md-media-content__title`)?.textContent?.trim() || ``
        form.images[index].summary = card.querySelector(`.md-media-content__body`)?.textContent?.trim() || ``
      })
      return form
    }

    if (presetId === `quote-figure`) {
      const quoteBlock = section.querySelector<HTMLElement>(`.md-media-x-copy`)
      form.bodyText = quoteBlock?.querySelector(`.md-media-content__body`)?.textContent?.trim() || ``
      form.bodyTitle = (quoteBlock?.querySelector(`.md-media-content__meta`)?.textContent?.trim() || ``)
        .replace(/^—\s*/u, ``)
      return form
    }

    const contentBlock = section.querySelector<HTMLElement>(`.md-media-combo__content, .md-media-combo__spotlight-card, .md-media-combo__caption-band, .md-media-x-copy`)
    if (contentBlock) {
      form.bodyTitle = contentBlock.querySelector(`.md-media-content__title`)?.textContent?.trim() || ``
      const bodyParagraphs = Array.from(contentBlock.querySelectorAll<HTMLElement>(`.md-media-content__body`))
      form.bodyText = bodyParagraphs[0]?.textContent?.trim() || ``
      form.secondaryText = contentBlock.querySelector(`.md-media-content__meta`)?.textContent?.trim() || ``
      const link = contentBlock.querySelector<HTMLAnchorElement>(`.md-media-content__link`)
      form.ctaText = link?.textContent?.trim() || ``
      form.ctaUrl = link?.getAttribute(`href`) || ``
    }
  }
  catch {
    return form
  }

  return form
}

export function restoreMediaLayoutBlockToMarkdown(block: MediaLayoutBlockEntry) {
  return block.images
    .map(image => `![${image.alt}](${image.url})`)
    .join(`\n\n`)
}

export function buildMediaLayoutMarkup(preset: MediaLayoutPreset, form: MediaLayoutFormState, preview = false) {
  const slots = form.images.slice(0, preset.slotCount)
  const sectionHeader = renderSectionHeader(form)

  if (isExtendedMediaLayoutPreset(preset.id)) {
    return buildExtendedMediaLayoutMarkup(preset, form, preview, sectionHeader)
  }

  if (preset.id === `hero-image`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet md-media-block--hero`)}>
        ${sectionHeader}
        ${renderImageFigure(slots[0], 0, preview, `md-media-figure--hero`)}
      </section>
    `)
  }

  if (preset.id === `frame-single`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--frame`)}>
        ${sectionHeader}
        ${renderImageFigure(slots[0], 0, preview, `md-media-figure--frame`)}
      </section>
    `)
  }

  if (preset.id === `scroll-window`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--frame md-media-block--scroll-window`)}>
        ${sectionHeader}
        ${renderScrollableFigure(slots[0], 0, preview)}
      </section>
    `)
  }

  if (preset.id === `duo-gallery`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--duo">
          ${renderImageFigure(slots[0], 0, preview)}
          ${renderImageFigure(slots[1], 1, preview)}
        </div>
      </section>
    `)
  }

  if (preset.id === `vertical-pair`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--vertical-pair">
          ${renderImageFigure(slots[0], 0, preview)}
          ${renderImageFigure(slots[1], 1, preview)}
        </div>
      </section>
    `)
  }

  if (preset.id === `duo-focus`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--duo-focus">
          ${renderImageFigure(slots[0], 0, preview, `md-media-figure--focus`)}
          ${renderImageFigure(slots[1], 1, preview)}
        </div>
      </section>
    `)
  }

  if (preset.id === `triptych-gallery`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--triptych">
          ${renderImageFigure(slots[0], 0, preview)}
          ${renderImageFigure(slots[1], 1, preview)}
          ${renderImageFigure(slots[2], 2, preview)}
        </div>
      </section>
    `)
  }

  if (preset.id === `vertical-strip`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--vertical-strip">
          ${renderImageFigure(slots[0], 0, preview)}
          ${renderImageFigure(slots[1], 1, preview)}
          ${renderImageFigure(slots[2], 2, preview)}
        </div>
      </section>
    `)
  }

  if (preset.id === `filmstrip-gallery`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--filmstrip">
          ${renderImageFigure(slots[0], 0, preview)}
          ${renderImageFigure(slots[1], 1, preview)}
          ${renderImageFigure(slots[2], 2, preview)}
        </div>
      </section>
    `)
  }

  if (preset.id === `stack-gallery`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--stacked">
          ${renderImageFigure(slots[0], 0, preview, `md-media-figure--stack-hero`)}
          <div class="md-media-grid md-media-grid--stacked-tail">
            ${renderImageFigure(slots[1], 1, preview)}
            ${renderImageFigure(slots[2], 2, preview)}
          </div>
        </div>
      </section>
    `)
  }

  if (preset.id === `mosaic-focus`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-grid md-media-grid--mosaic">
          ${renderImageFigure(slots[0], 0, preview, `md-media-figure--focus`)}
          <div class="md-media-grid md-media-grid--mosaic-side">
            ${renderImageFigure(slots[1], 1, preview)}
            ${renderImageFigure(slots[2], 2, preview)}
          </div>
        </div>
      </section>
    `)
  }

  if (preset.id === `split-left`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-combo md-media-combo--editorial`)}>
        <div class="md-media-combo__figure">
          ${renderImageFigure(slots[0], 0, preview)}
        </div>
        <div class="md-media-combo__content">
          ${sectionHeader}
          ${renderContentText(form)}
        </div>
      </section>
    `)
  }

  if (preset.id === `split-right`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-combo md-media-combo--editorial md-media-combo--reverse`)}>
        <div class="md-media-combo__figure">
          ${renderImageFigure(slots[0], 0, preview)}
        </div>
        <div class="md-media-combo__content">
          ${sectionHeader}
          ${renderContentText(form)}
        </div>
      </section>
    `)
  }

  if (preset.id === `spotlight-card`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-combo md-media-combo--spotlight`)}>
        ${renderImageFigure(slots[0], 0, preview, `md-media-figure--hero`)}
        <div class="md-media-combo__spotlight-card">
          ${sectionHeader}
          ${renderContentText(form)}
        </div>
      </section>
    `)
  }

  if (preset.id === `caption-band`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-combo md-media-combo--caption-band`)}>
        ${renderImageFigure(slots[0], 0, preview, `md-media-figure--hero`)}
        <div class="md-media-combo__caption-band">
          ${sectionHeader}
          ${renderContentText(form, `md-media-content--compact`)}
        </div>
      </section>
    `)
  }

  if (preset.id === `story-pair`) {
    return stripMarkupIndent(`
      <section ${renderSectionAttrs(form, preset.id, `md-media-block--quiet`)}>
        ${sectionHeader}
        <div class="md-media-story-grid">
          ${renderStoryCard(slots[0], 0, preview)}
          ${renderStoryCard(slots[1], 1, preview)}
        </div>
      </section>
    `)
  }

  return ``
}
