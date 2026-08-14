import type { MediaLayoutFormState, MediaLayoutImageSlot } from './image-layouts'
import { getMediaLayoutBadgeFallback, isExtendedMediaLayoutPreset } from './image-layouts'
import { renderWeChatRow, renderWeChatStack } from './wechat-layout'

export interface ExtendedWeChatImageMetrics {
  naturalWidth: number
  naturalHeight: number
}

/**
 * 图文模块的文案配色。默认值就是原来写死的浅色主题灰阶，
 * 只有当模块落在深色底上时才会整套换算，浅色主题的产物保持不变。
 */
export interface WeChatMediaPalette {
  /** 标题 */
  ink: string
  /** 正文 */
  body: string
  /** 次要正文 */
  secondary: string
  /** 版块导语 */
  lead: string
  /** 图注、落款 */
  muted: string
}

export const defaultWeChatMediaPalette: WeChatMediaPalette = {
  ink: `#1f2328`,
  body: `#374151`,
  secondary: `#4b5563`,
  lead: `#5b6475`,
  muted: `#6b7280`,
}

export interface ExtendedWeChatMediaContext {
  imageMetrics?: ExtendedWeChatImageMetrics[]
  renderWidths?: number[]
  renderHeights?: number[]
  measuredBlockWidth?: number
  palette?: WeChatMediaPalette
}

// 单次转换是同步的，用模块级变量传递比给十几个渲染函数都加一个参数更好维护
let palette = defaultWeChatMediaPalette

interface FigureBoxOptions {
  radius?: string
  border?: string
  background?: string
  shadow?: string
  overlay?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
}

function hasText(value: string) {
  return value.trim().length > 0
}

function formatText(value: string) {
  return escapeHtml(value.trim()).replace(/\n+/g, `<br/>`)
}

function formatRatio(value: number) {
  return value.toFixed(7).replace(/0+$/u, ``).replace(/\.$/u, ``)
}

function resolveImageType(url: string) {
  const normalizedUrl = url.trim().toLowerCase()
  const queryMatch = normalizedUrl.match(/[?&]wx_fmt=([a-z0-9]+)/u)
  const pathMatch = normalizedUrl.match(/\.([a-z0-9]+)(?:[?#].*)?$/u)
  const rawType = queryMatch?.[1] || pathMatch?.[1] || `png`

  if (rawType === `jpg`) {
    return `jpeg`
  }
  if ([`jpeg`, `png`, `gif`, `webp`].includes(rawType)) {
    return rawType
  }
  return `png`
}

function renderImageMetricAttrs(slot: MediaLayoutImageSlot, metrics?: ExtendedWeChatImageMetrics) {
  const url = escapeHtml(slot.url.trim())
  const type = resolveImageType(slot.url)
  const cropAttribute = slot.aspectRatio === `auto`
    ? ``
    : ` data-mobi-crop-aspect="${slot.aspectRatio}"`
  if (!metrics?.naturalWidth || !metrics?.naturalHeight) {
    return ` data-src="${url}" data-type="${type}"${cropAttribute}`
  }

  return [
    ` data-src="${url}"`,
    ` data-type="${type}"`,
    ` data-ratio="${formatRatio(metrics.naturalHeight / metrics.naturalWidth)}"`,
    ` data-w="${Math.round(metrics.naturalWidth)}"`,
    cropAttribute,
  ].join(``)
}

function resolveSlotCaption(slot: MediaLayoutImageSlot) {
  const caption = slot.caption.trim()
  return /^图片\s*\d+$/u.test(caption) ? `` : caption
}

// 微信会剥离 position、transform、float 和 overflow，比例盒方案在公众号里会整体塌掉，
// 因此复制产物一律走文档流：图片按自身宽高比铺满栏宽，圆角和描边直接落在 img 上。
function renderImageStyle(radius: string, options: FigureBoxOptions = {}) {
  return [
    `display:block;`,
    `width:100%;`,
    `max-width:100%;`,
    `height:auto;`,
    `margin:0;`,
    `border-radius:${radius};`,
    options.border ? `border:${options.border};` : `border:0;`,
    options.shadow ? `box-shadow:${options.shadow};` : ``,
    `vertical-align:top;`,
  ].filter(Boolean).join(` `)
}

function renderFigureBox(
  slot: MediaLayoutImageSlot,
  metrics?: ExtendedWeChatImageMetrics,
  _renderWidth = 0,
  _renderHeight = 0,
  options: FigureBoxOptions = {},
) {
  const radius = options.radius ?? `18px`

  return `
    <section style="margin:0; padding:0; border:0; background:transparent; font-size:0; line-height:0; box-sizing:border-box;">
      <img class="rich_pages wxw-img" src="${escapeHtml(slot.url.trim())}" alt="${escapeHtml(slot.alt.trim() || `图片`)}"${renderImageMetricAttrs(slot, metrics)} style="${renderImageStyle(radius, options)}" />
      ${options.overlay ?? ``}
    </section>
  `
}

function renderCenterCaption(text: string) {
  if (!hasText(text)) {
    return ``
  }
  return `<p style="margin:8px 0 0; font-size:13px; line-height:1.65; color:${palette.muted}; text-align:center;">${formatText(text)}</p>`
}

// 微信剥离 position，角标无法压在图片上，退化成图片下方的一枚居中药丸标签。
function renderBadgeOverlay(text: string, primaryColor: string) {
  if (!hasText(text)) {
    return ``
  }
  return `<section style="margin:8px 0 0; padding:0; font-size:0; line-height:0; text-align:center;"><span style="display:inline-block; padding:3px 10px; border-radius:999px; background:${primaryColor}; color:#ffffff; font-size:12px; font-weight:700; line-height:1.6; letter-spacing:0.02em;">${formatText(text)}</span></section>`
}

function renderGradientOverlay(form: MediaLayoutFormState) {
  const parts: string[] = []

  if (hasText(form.bodyTitle)) {
    parts.push(`<p style="margin:0; color:#ffffff; font-size:17px; font-weight:700; line-height:1.45;">${formatText(form.bodyTitle)}</p>`)
  }
  if (hasText(form.bodyText)) {
    parts.push(`<p style="margin:${parts.length ? 6 : 0}px 0 0; color:rgba(255,255,255,0.84); font-size:13px; line-height:1.65;">${formatText(form.bodyText)}</p>`)
  }

  if (!parts.length) {
    return ``
  }

  // 微信剥离 position，标题无法压在图片上，退化成紧贴图片下沿的深色标题条，
  // 上沿不留圆角以保持和图片连成一块。
  return `
    <section style="margin:0; padding:14px 16px 15px; background-color:#0f172a; border-radius:0 0 18px 18px; box-sizing:border-box;">
      ${parts.join(``)}
    </section>
  `
}

function renderRuleCopy(form: MediaLayoutFormState, primaryColor: string) {
  const parts: string[] = []

  if (hasText(form.bodyTitle)) {
    parts.push(`<p style="margin:0; font-size:15px; font-weight:700; line-height:1.5; color:${palette.ink};">${formatText(form.bodyTitle)}</p>`)
  }
  if (hasText(form.bodyText)) {
    parts.push(`<p style="margin:${parts.length ? 6 : 0}px 0 0; font-size:14px; line-height:1.72; color:${palette.secondary};">${formatText(form.bodyText)}</p>`)
  }

  if (!parts.length) {
    return ``
  }

  return `
    <section style="margin-top:12px; padding:1px 0 1px 12px; border-left:3px solid ${primaryColor}; text-align:left; box-sizing:border-box;">
      ${parts.join(``)}
    </section>
  `
}

function renderQuoteCopy(form: MediaLayoutFormState, primaryColor: string) {
  const parts: string[] = []

  if (hasText(form.bodyText)) {
    parts.push(`<p style="margin:0; font-size:15px; line-height:1.85; color:${palette.body};">${formatText(form.bodyText)}</p>`)
  }
  if (hasText(form.bodyTitle)) {
    parts.push(`<p style="margin:${parts.length ? 9 : 0}px 0 0; font-size:13px; line-height:1.6; color:${palette.muted}; text-align:right;">— ${formatText(form.bodyTitle)}</p>`)
  }

  if (!parts.length) {
    return ``
  }

  return `
    <section style="margin-top:14px; padding:1px 0 1px 14px; border-left:3px solid ${primaryColor}; text-align:left; box-sizing:border-box;">
      ${parts.join(``)}
    </section>
  `
}

function resolveBadgeText(slot: MediaLayoutImageSlot | undefined, presetId: string, index: number) {
  return slot?.title.trim() || getMediaLayoutBadgeFallback(presetId, index)
}

export function buildExtendedWeChatMediaBody(
  presetId: string,
  form: MediaLayoutFormState,
  primaryColor: string,
  context: ExtendedWeChatMediaContext = {},
) {
  if (!isExtendedMediaLayoutPreset(presetId)) {
    return ``
  }

  palette = context.palette ?? defaultWeChatMediaPalette

  const metrics = context.imageMetrics || []
  const widths = context.renderWidths || []
  const heights = context.renderHeights || []
  const slots = form.images

  const figure = (index: number, options: FigureBoxOptions = {}) => {
    const slot = slots[index]
    if (!slot || !hasText(slot.url)) {
      return ``
    }
    return renderFigureBox(slot, metrics[index], widths[index], heights[index], options)
  }

  const captionOf = (index: number) => {
    const slot = slots[index]
    return slot ? resolveSlotCaption(slot) : ``
  }

  const plainCell = (index: number, options: FigureBoxOptions = {}) => {
    const body = figure(index, options)
    if (!body) {
      return ``
    }
    return `<section style="margin:0; padding:0; border:0; background:transparent;">${body}${renderCenterCaption(captionOf(index))}</section>`
  }

  if (presetId === `polaroid-single`) {
    const body = figure(0, { radius: `2px`, background: `#f1f5f9` })
    if (!body) {
      return ``
    }
    const caption = hasText(captionOf(0))
      ? `<p style="margin:12px 0 0; font-size:13px; line-height:1.6; color:#6b7280; text-align:center;">${formatText(captionOf(0))}</p>`
      : ``
    return `
      <section style="padding:13px 13px 17px; border:1px solid #ececec; border-radius:6px; background:#ffffff; box-shadow:0 14px 32px rgba(15,23,42,0.15); box-sizing:border-box;">
        ${body}
        ${caption}
      </section>
    `
  }

  if (presetId === `shadow-card-single`) {
    const body = figure(0, {
      radius: `20px`,
      border: `1px solid rgba(15,23,42,0.06)`,
      shadow: `0 18px 40px rgba(15,23,42,0.2)`,
    })
    if (!body) {
      return ``
    }
    return `<section style="margin:0; padding:0; border:0; background:transparent;">${body}${renderCenterCaption(captionOf(0))}</section>`
  }

  if (presetId === `full-bleed-single`) {
    const body = figure(0, { radius: `0` })
    if (!body) {
      return ``
    }
    const caption = hasText(captionOf(0))
      ? `<p style="margin:10px 0 0; padding-top:9px; border-top:1px solid #e5e7eb; font-size:13px; line-height:1.6; color:${palette.muted}; text-align:left;">${formatText(captionOf(0))}</p>`
      : ``
    return `<section style="margin:0; padding:0; border:0; background:transparent;">${body}${caption}</section>`
  }

  if (presetId === `compare-pair`) {
    const left = plainCell(0, { overlay: renderBadgeOverlay(resolveBadgeText(slots[0], presetId, 0), primaryColor) })
    const right = plainCell(1, { overlay: renderBadgeOverlay(resolveBadgeText(slots[1], presetId, 1), primaryColor) })
    if (!left || !right) {
      return left || right
    }
    // 分隔线只用 1px 边框，不再叠 padding：一旦公众号剥掉 box-sizing，
    // 内边距会外扩到列宽之外，两列就挤不下一行了。
    return renderWeChatRow([
      { html: left },
      { html: right, extraStyle: `border-left:1px solid #e5e7eb;` },
    ], { gap: 4 })
  }

  if (presetId === `magazine-spread`) {
    const left = plainCell(0, { radius: `18px 0 0 18px` })
    const right = plainCell(1, { radius: `0 18px 18px 0` })
    return renderWeChatRow([
      { html: left },
      { html: right },
    ], { gap: 0 })
  }

  if (presetId === `quad-grid`) {
    const cells = [0, 1, 2, 3].map(index => plainCell(index))
    return renderWeChatStack([
      renderWeChatRow([{ html: cells[0] }, { html: cells[1] }], { gap: 2 }),
      renderWeChatRow([{ html: cells[2] }, { html: cells[3] }], { gap: 2 }),
    ], 8)
  }

  if (presetId === `hero-trio`) {
    const tail = renderWeChatRow([
      { html: plainCell(1) },
      { html: plainCell(2) },
      { html: plainCell(3) },
    ], { gap: 2 })
    return renderWeChatStack([plainCell(0), tail], 8)
  }

  if (presetId === `numbered-figure`) {
    const body = figure(0, { overlay: renderBadgeOverlay(resolveBadgeText(slots[0], presetId, 0), primaryColor) })
    if (!body) {
      return ``
    }
    return `
      <section style="margin:0; padding:0; border:0; background:transparent;">
        ${body}
        ${renderCenterCaption(captionOf(0))}
        ${renderRuleCopy(form, primaryColor)}
      </section>
    `
  }

  if (presetId === `gradient-caption`) {
    const overlay = renderGradientOverlay(form)
    const body = figure(0, { overlay, radius: overlay ? `18px 18px 0 0` : `18px` })
    if (!body) {
      return ``
    }
    return `<section style="margin:0; padding:0; border:0; background:transparent;">${body}${renderCenterCaption(captionOf(0))}</section>`
  }

  if (presetId === `quote-figure`) {
    const body = figure(0)
    if (!body) {
      return ``
    }
    return `
      <section style="margin:0; padding:0; border:0; background:transparent;">
        ${body}
        ${renderCenterCaption(captionOf(0))}
        ${renderQuoteCopy(form, primaryColor)}
      </section>
    `
  }

  if (presetId === `double-rule-single`) {
    const body = figure(0, { radius: `0` })
    if (!body) {
      return ``
    }
    return `
      <section style="padding:7px; border:1px solid #1f2328; background:#ffffff; box-sizing:border-box;">
        <section style="margin:0; padding:0; border:3px solid #1f2328; font-size:0; line-height:0; box-sizing:border-box;">
          ${body}
        </section>
        ${renderCenterCaption(captionOf(0))}
      </section>
    `
  }

  if (presetId === `passepartout-single`) {
    const body = figure(0, { radius: `0` })
    if (!body) {
      return ``
    }
    const caption = hasText(captionOf(0))
      ? `<p style="margin:14px 0 0; font-size:13px; line-height:1.6; letter-spacing:0.04em; color:#6b7280; text-align:center;">${formatText(captionOf(0))}</p>`
      : ``
    return `
      <section style="padding:20px; border:1px solid #e5e7eb; background:#ffffff; box-shadow:0 10px 30px rgba(15,23,42,0.1); box-sizing:border-box;">
        ${body}
        ${caption}
      </section>
    `
  }

  if (presetId === `dashed-note-single`) {
    const body = figure(0, { radius: `4px` })
    if (!body) {
      return ``
    }
    const caption = hasText(captionOf(0))
      ? `<p style="margin:10px 0 0; font-size:13px; line-height:1.6; color:#8a7f6a; text-align:left;">${formatText(captionOf(0))}</p>`
      : ``
    return `
      <section style="padding:12px; border:2px dashed #d6cfc0; border-radius:8px; background:#fbf8f1; box-sizing:border-box;">
        ${body}
        ${caption}
      </section>
    `
  }

  if (presetId === `accent-band-single`) {
    const body = figure(0, { radius: `0` })
    if (!body) {
      return ``
    }
    return `
      <section style="padding:10px 0; border-top:4px solid ${primaryColor}; border-bottom:4px solid ${primaryColor}; box-sizing:border-box;">
        ${body}
        ${renderCenterCaption(captionOf(0))}
      </section>
    `
  }

  if (presetId === `duo-framed-gallery` || presetId === `triptych-framed-gallery`) {
    const columnCount = presetId === `duo-framed-gallery` ? 2 : 3
    const framed = { radius: `6px`, border: `1px solid #e2e5ea` }
    const cells = Array.from({ length: columnCount }, (_, index) => plainCell(index, framed))
    return renderWeChatRow(cells.map(html => ({ html })), { gap: columnCount === 2 ? 4 : 3 })
  }

  return ``
}
