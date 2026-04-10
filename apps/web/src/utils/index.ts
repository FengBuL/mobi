import { markedAlert, MDKatex } from '@md/core'
import { prefix } from '@md/shared/configs'
import {
  type MediaAspectRatio,
  type MediaLayoutFormState,
  type MediaLayoutImageSlot,
  type MediaLayoutPreset,
  mediaLayoutPresets,
  parseMediaLayoutBlocks,
} from '@/utils/image-layouts'
// 直接导入供本文件内部使用
import {
  checkImage,
  createTable,
  downloadFile,
  formatDoc,
  removeLeft,
  sanitizeTitle,
  toBase64,
} from '@md/shared/utils'

import juice from 'juice'
import { Marked } from 'marked'
import imageCompression from 'browser-image-compression'
import { getMpUploadConfig, hasMpUploadConfig, uploadFileToMp } from './file'
import { store } from './storage'

export {
  LocalStorageEngine as LocalEngine,
  RestfulStorageEngine as RestfulEngine,
  type StorageEngine,
} from './storage'

// 重新导出供外部使用
export {
  checkImage,
  createTable,
  downloadFile,
  formatDoc,
  removeLeft,
  sanitizeTitle,
  toBase64,
}

// 导出新主题系统需要的函数
export {
  modifyHtmlContent,
  postProcessHtml,
  renderMarkdown,
} from '@md/core/utils'

export function addPrefix(str: string) {
  return `${prefix}__${str}`
}

/**
 * 导出原始 Markdown 文档
 * @param {string} doc - 文档内容
 * @param {string} title - 文档标题
 */
export function downloadMD(doc: string, title: string = `untitled`) {
  const safeTitle = sanitizeTitle(title)
  downloadFile(doc, `${safeTitle}.md`, `text/markdown;charset=utf-8`)
}

/**
 * 批量导出多篇文章为 ZIP
 * @param posts - 文章列表（含 title 和 content）
 */
export async function exportPostsAsZip(posts: Array<{ title: string, content: string }>) {
  const JSZip = (await import(`jszip`)).default
  const zip = new JSZip()
  posts.forEach(({ title, content }) => {
    const safeTitle = sanitizeTitle(title)
    zip.file(`${safeTitle}.md`, content)
  })
  const blob = await zip.generateAsync({ type: `blob` })
  const date = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const a = document.createElement(`a`)
  a.href = url
  a.download = `posts-${date}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 获取 HTML 内容
 * @returns {string} HTML 字符串
 */
export function getHtmlContent(): string {
  const element = document.querySelector(`#output`)!
  return element.innerHTML
}

/**
 * 导出 HTML 生成内容
 */
export async function exportHTML(title: string = `untitled`) {
  const htmlStr = getHtmlContent()
  const stylesToAdd = await getStylesToAdd()

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${sanitizeTitle(title)}</title>
  ${stylesToAdd}
</head>
<body>
  <div style="width: 750px; margin: auto; padding: 20px;">
    ${htmlStr}
  </div>
</body>
</html>`

  downloadFile(fullHtml, `${sanitizeTitle(title)}.html`, `text/html`)
}

/**
 * 生成无样式 HTML
 * @param raw - 原始 Markdown 内容
 * @returns string
 */
export async function generatePureHTML(raw: string): Promise<string> {
  const markedInstance = new Marked()
  markedInstance.use(markedAlert({ withoutStyle: true }))
  markedInstance.use(
    MDKatex({ nonStandard: true }, false),
  )
  const pureHtml = await markedInstance.parse(raw)
  return pureHtml
}

/**
 * 导出无样式 HTML 文件
 * @param raw - 原始 Markdown 内容
 * @param title - 文档标题
 */
export async function exportPureHTML(raw: string, title: string = `untitled`) {
  const safeTitle = sanitizeTitle(title)

  const pureHtml = await generatePureHTML(raw)

  downloadFile(pureHtml, `${safeTitle}.html`, `text/html`)
}

/**
 * 导出 PDF 文档（新主题系统）
 * @param {string} title - 文档标题
 */
export async function exportPDF(title: string = `untitled`) {
  const htmlStr = getHtmlContent()
  const stylesToAdd = await getStylesToAdd()
  const safeTitle = sanitizeTitle(title)

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  ${stylesToAdd}
  <style>
    /* 强制打印背景颜色和图片 */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* 打印页面设置 */
    @page {
      @top-center {
        content: "${safeTitle}";
        font-size: 12px;
        color: #666;
      }
      @bottom-left {
        content: "https://md.doocs.org";
        font-size: 10px;
        color: #999;
      }
      @bottom-right {
        content: "第 " counter(page) " 页，共 " counter(pages) " 页";
        font-size: 10px;
        color: #999;
      }
    }

    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div style="width: 100%; max-width: 750px; margin: auto;">
    ${htmlStr}
  </div>
</body>
</html>`
  const iframe = document.createElement(`iframe`)
  iframe.style.cssText = `position:fixed;width:0;height:0;top:-9999px;left:-9999px;border:none;`
  iframe.srcdoc = printHtml
  document.body.appendChild(iframe)

  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    // 延迟移除，确保打印完成
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 500)
  }
}

export function solveWeChatImage() {
  const clipboardDiv = document.getElementById(`output`)!
  const images = clipboardDiv.getElementsByTagName(`img`)

  Array.from(images).forEach((image) => {
    const width = image.getAttribute(`width`)
    const height = image.getAttribute(`height`)

    if (width && !image.style.width) {
      // 如果是纯数字，添加 px 单位；否则保持原值
      image.style.width = /^\d+$/.test(width) ? `${width}px` : width
    }

    if (height && !image.style.height) {
      // 如果是纯数字，添加 px 单位；否则保持原值
      image.style.height = /^\d+$/.test(height) ? `${height}px` : height
    }
  })
}

async function getHljsStyles(): Promise<string> {
  const hljsLink = document.querySelector(`#hljs`) as HTMLLinkElement
  if (!hljsLink)
    return ``

  try {
    const response = await fetch(hljsLink.href)
    const cssText = await response.text()
    return `<style>${cssText}</style>`
  }
  catch (error) {
    console.warn(`Failed to fetch highlight.js styles:`, error)
    return ``
  }
}

function getResolvedThemeTokens() {
  const output = document.querySelector<HTMLElement>(`#output`)
  const computed = window.getComputedStyle(output || document.documentElement)

  return {
    primaryColor: computed.getPropertyValue(`--md-primary-color`).trim() || `#1f2328`,
    fontFamily: computed.getPropertyValue(`--md-font-family`).trim() || computed.fontFamily || `inherit`,
    fontSize: computed.getPropertyValue(`--md-font-size`).trim() || computed.fontSize || `16px`,
  }
}

function resolveThemeTokenReferences(value: string, tokens = getResolvedThemeTokens()) {
  return value
    .replace(/var\(--md-primary-color\)/g, tokens.primaryColor)
    .replace(/var\(--md-font-family\)/g, tokens.fontFamily)
    .replace(/var\(--md-font-size\)/g, tokens.fontSize)
}

function getThemeStyles(): string {
  const themeStyle = document.querySelector(`#md-theme`) as HTMLStyleElement

  if (!themeStyle || !themeStyle.textContent) {
    console.warn('[getThemeStyles] 未找到主题样式')
    return ``
  }

  // 移除 #output 作用域前缀，因为复制后的 HTML 不在 #output 容器中
  let cssContent = themeStyle.textContent

  // 处理 #output {} 为 body {}，避免出现 {} 无效样式
  cssContent = cssContent.replace(/#output\s*\{/g, 'body {')

  // 将 "#output h1" 替换为 "h1"，"#output .class" 替换为 ".class" 等
  // 同时处理换行和多个空格的情况
  cssContent = cssContent.replace(/#output\s+/g, '')
  // 处理选择器开头的 #output（如果没有后续内容）
  cssContent = cssContent.replace(/^#output\s*/gm, '')
  cssContent = resolveThemeTokenReferences(cssContent)

  const styleContent = `<style>${cssContent}</style>`
  return styleContent
}

function mergeCss(html: string): string {
  return juice(html, {
    inlinePseudoElements: true,
    preserveImportant: true,
    // 禁用 CSS 变量解析，避免 juice 处理时的错误
    // 新主题系统已通过 postcss 处理 CSS 变量
    resolveCSSVariables: false,
  })
}

function modifyHtmlStructure(htmlString: string): string {
  const tempDiv = document.createElement(`div`)
  tempDiv.innerHTML = htmlString

  // 移动 `li > ul` 和 `li > ol` 到 `li` 后面
  tempDiv.querySelectorAll(`li > ul, li > ol`).forEach((originalItem) => {
    originalItem.parentElement!.insertAdjacentElement(`afterend`, originalItem)
  })

  return tempDiv.innerHTML
}

function camelToKebab(property: string) {
  return property.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
}

function pickComputedStyles(element: Element, properties: string[]) {
  const computed = window.getComputedStyle(element)
  return Object.fromEntries(
    properties.map(property => [property, String(computed[property as keyof CSSStyleDeclaration] || ``)]),
  )
}

function applyStyleSnapshot(element: HTMLElement | null, snapshot?: Record<string, string> | null) {
  if (!element || !snapshot) {
    return
  }

  Object.entries(snapshot).forEach(([property, value]) => {
    if (!value) {
      return
    }

    element.style.setProperty(camelToKebab(property), value)
  })
}

function snapshotCodeBlockStyles(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(`pre.code__pre, pre.hljs.code__pre`)).map((pre) => {
    const code = pre.querySelector<HTMLElement>(`:scope > code`)
    const macSign = pre.querySelector<HTMLElement>(`:scope > .mac-sign`)
    const lineNumbers = pre.querySelector<HTMLElement>(`.line-numbers`)
    const codeScroll = pre.querySelector<HTMLElement>(`.code-scroll`)
    const codeInner = codeScroll?.querySelector<HTMLElement>(`:scope > div`) || null
    const tokens = code ? Array.from(code.querySelectorAll<HTMLElement>(`span`)) : []

    return {
      pre: pickComputedStyles(pre, [
        `backgroundColor`,
        `color`,
        `border`,
        `borderRadius`,
        `boxShadow`,
        `padding`,
        `fontFamily`,
        `fontSize`,
        `lineHeight`,
      ]),
      code: code
        ? pickComputedStyles(code, [
            `display`,
            `margin`,
            `padding`,
            `border`,
            `borderRadius`,
            `backgroundColor`,
            `color`,
            `fontFamily`,
            `fontSize`,
            `lineHeight`,
            `whiteSpace`,
            `wordBreak`,
          ])
        : null,
      macSign: macSign
        ? pickComputedStyles(macSign, [`display`, `padding`, `margin`, `lineHeight`, `alignItems`])
        : null,
      lineNumbers: lineNumbers
        ? pickComputedStyles(lineNumbers, [
            `backgroundColor`,
            `color`,
            `fontFamily`,
            `fontSize`,
            `lineHeight`,
            `borderRight`,
            `padding`,
          ])
        : null,
      codeScroll: codeScroll
        ? pickComputedStyles(codeScroll, [`padding`, `margin`, `fontFamily`, `fontSize`, `lineHeight`])
        : null,
      codeInner: codeInner
        ? pickComputedStyles(codeInner, [`whiteSpace`, `fontFamily`, `fontSize`, `lineHeight`])
        : null,
      tokens: tokens.map(token => pickComputedStyles(token, [
        `color`,
        `backgroundColor`,
        `fontWeight`,
        `fontStyle`,
        `textDecorationLine`,
      ])),
    }
  })
}

function applyCodeBlockSnapshots(root: HTMLElement, snapshots: ReturnType<typeof snapshotCodeBlockStyles>) {
  const codeBlocks = Array.from(root.querySelectorAll<HTMLElement>(`pre.code__pre, pre.hljs.code__pre`))

  codeBlocks.forEach((pre, index) => {
    const snapshot = snapshots[index]
    if (!snapshot) {
      return
    }

    applyStyleSnapshot(pre, snapshot.pre)

    const code = pre.querySelector<HTMLElement>(`:scope > code`)
    const macSign = pre.querySelector<HTMLElement>(`:scope > .mac-sign`)
    const lineNumbers = pre.querySelector<HTMLElement>(`.line-numbers`)
    const codeScroll = pre.querySelector<HTMLElement>(`.code-scroll`)
    const codeInner = codeScroll?.querySelector<HTMLElement>(`:scope > div`) || null

    applyStyleSnapshot(code, snapshot.code)
    applyStyleSnapshot(macSign, snapshot.macSign)
    applyStyleSnapshot(lineNumbers, snapshot.lineNumbers)
    applyStyleSnapshot(codeScroll, snapshot.codeScroll)
    applyStyleSnapshot(codeInner, snapshot.codeInner)

    if (code) {
      const tokens = Array.from(code.querySelectorAll<HTMLElement>(`span`))
      tokens.forEach((token, tokenIndex) => {
        applyStyleSnapshot(token, snapshot.tokens[tokenIndex])
      })
    }
  })
}

function getClipboardFileExtension(url: string, mimeType: string) {
  const sanitized = url.split(`?`)[0].split(`#`)[0]
  const urlExtension = sanitized.includes(`.`) ? sanitized.split(`.`).pop()?.toLowerCase() : ``
  if (urlExtension && /^[a-z0-9]{2,6}$/i.test(urlExtension)) {
    return urlExtension
  }

  const mimeMap: Record<string, string> = {
    'image/jpeg': `jpg`,
    'image/png': `png`,
    'image/webp': `webp`,
    'image/gif': `gif`,
    'image/svg+xml': `svg`,
  }

  return mimeMap[mimeType] || `png`
}

function buildClipboardFilename(extension: string) {
  return `wechat-copy-${Date.now()}.${extension}`
}

function normalizeClipboardErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function normalizeClipboardImageFile(file: File) {
  const mimeType = file.type.toLowerCase()
  if (mimeType === `image/jpeg` || mimeType === `image/png`) {
    return file
  }

  const targetType = `image/jpeg`
  const normalized = await imageCompression(file, {
    maxSizeMB: 8,
    maxWidthOrHeight: 6144,
    useWebWorker: true,
    fileType: targetType,
    initialQuality: 0.92,
  })

  return new File([normalized], buildClipboardFilename(`jpg`), {
    type: normalized.type || targetType,
  })
}

async function fetchClipboardImageBlob(url: string, proxyOrigin = ``) {
  try {
    const response = await window.fetch(url)
    if (!response.ok) {
      throw new Error(`下载图片失败：${response.status}`)
    }

    return await response.blob()
  }
  catch (error) {
    if (!proxyOrigin || url.startsWith(`blob:`) || url.startsWith(`data:`)) {
      throw error
    }

    const proxyUrl = `${proxyOrigin}/fetch-image?url=${encodeURIComponent(url)}`
    const response = await window.fetch(proxyUrl)
    if (!response.ok) {
      let message = `代理抓取图片失败：${response.status}`
      try {
        const data = await response.json()
        if (data?.error) {
          message = data.error
        }
      }
      catch {
        // ignore json parse failure
      }
      throw new Error(message)
    }

    return await response.blob()
  }
}

async function convertImageUrlToFile(url: string, proxyOrigin = ``) {
  const blob = await fetchClipboardImageBlob(url, proxyOrigin)
  const extension = getClipboardFileExtension(url, blob.type)
  const rawFile = new File([blob], buildClipboardFilename(extension), {
    type: blob.type || `image/${extension}`,
  })
  return normalizeClipboardImageFile(rawFile)
}

async function uploadClipboardImagesToMp(clipboardDiv: HTMLElement) {
  const hasConfig = await hasMpUploadConfig()
  if (!hasConfig) {
    return
  }

  const mpConfig = await getMpUploadConfig()
  const proxyOrigin = mpConfig?.proxyOrigin || ``
  const cacheKey = addPrefix(`wechat-copy-mp-image-cache`)
  const cachedEntries = await store.getJSON<Record<string, string>>(cacheKey, {}) || {}
  const images = Array.from(clipboardDiv.querySelectorAll<HTMLImageElement>(`img`))

  for (const image of images) {
    const src = image.getAttribute(`data-src`)?.trim() || image.getAttribute(`src`)?.trim() || ``
    if (!src || src.includes(`mmbiz.qpic.cn`) || src.includes(`mmbiz.qlogo.cn`) || src.includes(`res.wx.qq.com`)) {
      continue
    }

    if (cachedEntries[src]) {
      image.setAttribute(`src`, cachedEntries[src])
      image.setAttribute(`data-src`, cachedEntries[src])
      image.removeAttribute(`data-mp-upload-error`)
      continue
    }

    try {
      const file = await convertImageUrlToFile(src, proxyOrigin)
      const uploadedUrl = await uploadFileToMp(file)
      if (uploadedUrl) {
        cachedEntries[src] = uploadedUrl
        image.setAttribute(`src`, uploadedUrl)
        image.setAttribute(`data-src`, uploadedUrl)
        image.removeAttribute(`data-mp-upload-error`)
      }
    }
    catch (error) {
      image.setAttribute(`data-mp-upload-error`, normalizeClipboardErrorMessage(error))
    }
  }

  await store.setJSON(cacheKey, cachedEntries)
}

function createEmptyNode(): HTMLElement {
  const node = document.createElement(`p`)
  node.style.fontSize = `0`
  node.style.lineHeight = `0`
  node.style.margin = `0`
  node.innerHTML = `&nbsp;`
  return node
}

/**
 * 获取需要添加的样式
 * @returns {Promise<string>} 样式字符串
 */
async function getStylesToAdd(): Promise<string> {
  const themeStyles = getThemeStyles()
  const hljsStyles = await getHljsStyles()
  return [themeStyles, hljsStyles].filter(Boolean).join(``)
}

function escapeClipboardHtml(value: string) {
  return value
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
}

function hasClipboardText(value: string) {
  return value.trim().length > 0
}

function formatClipboardText(value: string) {
  return escapeClipboardHtml(value.trim()).replace(/\n+/g, `<br/>`)
}

function normalizeMediaBlockWidth(value: number) {
  return Math.min(100, Math.max(52, Math.round(value || 100)))
}

interface ClipboardImageMetrics {
  naturalWidth: number
  naturalHeight: number
}

interface WeChatMediaLayoutRenderContext {
  measuredBlockWidth?: number
  measuredBlockHeight?: number
  imageMetrics?: ClipboardImageMetrics[]
  renderWidths?: number[]
  renderHeights?: number[]
}

function formatClipboardRatio(value: number) {
  return value.toFixed(7).replace(/0+$/u, ``).replace(/\.$/u, ``)
}

function resolveWeChatImageType(url: string) {
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

const mediaAspectRatioPercentMap: Record<Exclude<MediaAspectRatio, `auto`>, number> = {
  '16:9': 56.25,
  '4:3': 75,
  '1:1': 100,
  '3:4': 133.3333,
  '9:16': 177.7778,
}

function renderWeChatImageMetricAttrs(slot: MediaLayoutImageSlot, metrics?: ClipboardImageMetrics) {
  const url = escapeClipboardHtml(slot.url.trim())
  const type = resolveWeChatImageType(slot.url)
  if (!metrics?.naturalWidth || !metrics?.naturalHeight) {
    return [
      ` data-src="${url}"`,
      ` data-type="${type}"`,
    ].join(``)
  }

  return [
    ` data-src="${url}"`,
    ` data-type="${type}"`,
    ` data-ratio="${formatClipboardRatio(metrics.naturalHeight / metrics.naturalWidth)}"`,
    ` data-w="${Math.round(metrics.naturalWidth)}"`,
  ].join(``)
}

function resolveClipboardImageCaption(slot: MediaLayoutImageSlot) {
  const caption = slot.caption.trim()
  return /^图片\s*\d+$/u.test(caption) ? `` : caption
}

function resolveWeChatFigureRatioPercent(
  slot: MediaLayoutImageSlot,
  metrics?: ClipboardImageMetrics,
  renderWidth = 0,
  renderHeight = 0,
) {
  if (renderWidth > 0 && renderHeight > 0) {
    return Math.max(24, Number(((renderHeight / renderWidth) * 100).toFixed(2)))
  }

  const naturalRatio = metrics?.naturalWidth && metrics?.naturalHeight
    ? (metrics.naturalHeight / metrics.naturalWidth) * 100
    : 0
  const baseRatio = slot.aspectRatio === `auto`
    ? naturalRatio || 75
    : mediaAspectRatioPercentMap[slot.aspectRatio]
  const minHeightRatio = renderWidth > 0 && slot.minHeight > 0
    ? (slot.minHeight / renderWidth) * 100
    : 0

  return Math.max(24, Number(Math.max(baseRatio, minHeightRatio).toFixed(2)))
}

function renderWeChatFigureImageStyle(
  slot: MediaLayoutImageSlot,
  metrics?: ClipboardImageMetrics,
  renderWidth = 0,
  renderHeight = 0,
) {
  const ratioPercent = resolveWeChatFigureRatioPercent(slot, metrics, renderWidth, renderHeight)
  const boxRatio = ratioPercent / 100
  const imageRatio = metrics?.naturalWidth && metrics?.naturalHeight
    ? metrics.naturalHeight / metrics.naturalWidth
    : 0

  const sizeStyle = imageRatio > 0 && imageRatio < boxRatio
    ? `width:auto; height:100%;`
    : `width:100%; height:auto;`

  return [
    `position:absolute;`,
    `left:50%;`,
    `top:50%;`,
    `transform:translate(-50%, -50%);`,
    `display:block;`,
    sizeStyle,
    `max-width:none;`,
    `max-height:none;`,
    `border:0;`,
    `vertical-align:top;`,
  ].join(` `)
}

function renderWeChatFigureBox(
  slot: MediaLayoutImageSlot,
  metrics?: ClipboardImageMetrics,
  renderWidth = 0,
  renderHeight = 0,
  options: { frame?: boolean, radius?: string } = {},
) {
  const ratio = resolveWeChatFigureRatioPercent(slot, metrics, renderWidth, renderHeight)
  const radius = options.radius || `18px`
  const frameStyle = options.frame ? `border:1px solid #e5e7eb;` : ``
  const backgroundStyle = options.frame ? `background:#f8fafc;` : `background:transparent;`

  return `
    <section style="display:inline-block; width:100%; max-width:100%; vertical-align:top; position:relative; box-sizing:border-box;">
      <section style="height:0; padding-top:${ratio}%; box-sizing:border-box;">
        <svg viewBox="0 0 1 1" style="float:left; line-height:0; width:0; vertical-align:top;"></svg>
      </section>
      <section style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:hidden; line-height:0; border-radius:${radius}; ${backgroundStyle}${frameStyle}box-sizing:border-box;" nodeleaf="">
        <img class="rich_pages wxw-img" src="${escapeClipboardHtml(slot.url.trim())}" alt="${escapeClipboardHtml(slot.alt.trim() || `图片`)}"${renderWeChatImageMetricAttrs(slot, metrics)} style="${renderWeChatFigureImageStyle(slot, metrics, renderWidth, renderHeight)}" />
      </section>
    </section>
  `
}

function renderWeChatSectionHeader(form: MediaLayoutFormState, primaryColor: string) {
  const parts: string[] = []

  if (hasClipboardText(form.sectionLabel)) {
    parts.push(
      `<p style="margin:0 0 6px; font-size:12px; line-height:1.5; font-weight:700; letter-spacing:0.08em; color:${primaryColor};">${formatClipboardText(form.sectionLabel)}</p>`,
    )
  }

  if (hasClipboardText(form.sectionTitle)) {
    parts.push(
      `<p style="margin:0; font-size:18px; line-height:1.55; font-weight:700; color:#1f2328;">${formatClipboardText(form.sectionTitle)}</p>`,
    )
  }

  if (hasClipboardText(form.sectionLead)) {
    parts.push(
      `<p style="margin:8px 0 0; font-size:14px; line-height:1.75; color:#5b6475;">${formatClipboardText(form.sectionLead)}</p>`,
    )
  }

  if (!parts.length) {
    return ``
  }

  return `<div style="margin:0 0 14px;">${parts.join(``)}</div>`
}

function renderWeChatTextCard(form: MediaLayoutFormState, primaryColor: string, compact = false) {
  const parts: string[] = []

  if (hasClipboardText(form.bodyTitle)) {
    parts.push(
      `<p style="margin:0; font-size:${compact ? 15 : 16}px; line-height:1.55; font-weight:700; color:#1f2328;">${formatClipboardText(form.bodyTitle)}</p>`,
    )
  }

  if (hasClipboardText(form.bodyText)) {
    parts.push(
      `<p style="margin:${parts.length ? 8 : 0}px 0 0; font-size:14px; line-height:1.75; color:#444d5c;">${formatClipboardText(form.bodyText)}</p>`,
    )
  }

  if (hasClipboardText(form.secondaryText)) {
    parts.push(
      `<p style="margin:${parts.length ? 8 : 0}px 0 0; font-size:13px; line-height:1.7; color:#6b7280;">${formatClipboardText(form.secondaryText)}</p>`,
    )
  }

  if (hasClipboardText(form.ctaText) && hasClipboardText(form.ctaUrl)) {
    parts.push(
      `<p style="margin:${parts.length ? 10 : 0}px 0 0;"><a href="${escapeClipboardHtml(form.ctaUrl.trim())}" target="_blank" rel="noreferrer" style="color:${primaryColor}; text-decoration:none; font-size:13px; line-height:1.7; font-weight:700;">${formatClipboardText(form.ctaText)}</a></p>`,
    )
  }

  if (!parts.length) {
    return ``
  }

  return `
    <section style="padding:${compact ? 12 : 14}px 15px; border:1px solid #e5e7eb; border-radius:16px; background:#fafafa;">
      ${parts.join(``)}
    </section>
  `
}

function renderWeChatFigure(
  slot: MediaLayoutImageSlot,
  metrics?: ClipboardImageMetrics,
  renderWidth = 0,
  renderHeight = 0,
  options: { frame?: boolean } = {},
) {
  if (!hasClipboardText(slot.url)) {
    return ``
  }

  const caption = resolveClipboardImageCaption(slot)
  const imageBody = renderWeChatFigureBox(slot, metrics, renderWidth, renderHeight, { frame: options.frame })
  const captionBody = hasClipboardText(caption)
    ? `<p style="margin:8px 0 0; font-size:13px; line-height:1.65; color:#6b7280; text-align:center;">${formatClipboardText(caption)}</p>`
    : ``

  return `<section style="margin:0; padding:0; border:0; background:transparent;">${imageBody}${captionBody}</section>`
}

function renderWeChatScrollWindow(slot: MediaLayoutImageSlot, context: WeChatMediaLayoutRenderContext = {}) {
  if (!hasClipboardText(slot.url)) {
    return ``
  }

  const caption = resolveClipboardImageCaption(slot)
  const viewportHeight = Math.max(180, Math.round(context.measuredBlockHeight || slot.minHeight || 420))
  const measuredWidth = Math.max(1, Math.round(context.measuredBlockWidth || 0))
  const viewportRatio = measuredWidth > 0
    ? Math.max(24, Number(((viewportHeight / measuredWidth) * 100).toFixed(2)))
    : 109.09

  return `
    <section style="margin:0; padding:0; border:0; background:transparent; box-sizing:border-box;">
      <section style="display:inline-block; width:100%; max-width:100%; vertical-align:top; position:relative; box-sizing:border-box;">
        <section style="height:0; padding-top:${viewportRatio}%; box-sizing:border-box;">
          <svg viewBox="0 0 1 1" style="float:left; line-height:0; width:0; vertical-align:top;"></svg>
        </section>
        <section width="100%" height="${viewportHeight}" style="position:absolute; left:0; top:0; width:100%; height:100%; overflow-x:hidden; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; border-radius:18px; background:#f8fafc; box-sizing:border-box;" nodeleaf="">
          <img class="rich_pages wxw-img" src="${escapeClipboardHtml(slot.url.trim())}" alt="${escapeClipboardHtml(slot.alt.trim() || `图片`)}"${renderWeChatImageMetricAttrs(slot, context.imageMetrics?.[0])} style="display:block; width:100%; max-width:100%; height:auto; border:0; vertical-align:top; background:#f8fafc;" />
        </section>
      </section>
      ${hasClipboardText(caption) ? `<p style="margin:8px 0 0; font-size:13px; line-height:1.65; color:#6b7280; text-align:center;">${formatClipboardText(caption)}</p>` : ``}
    </section>
  `
}

function renderWeChatStoryCard(
  slot: MediaLayoutImageSlot,
  metrics?: ClipboardImageMetrics,
  renderWidth = 0,
  renderHeight = 0,
) {
  if (!hasClipboardText(slot.url)) {
    return ``
  }

  const textParts: string[] = []

  if (hasClipboardText(slot.title)) {
    textParts.push(
      `<p style="margin:0; font-size:15px; line-height:1.55; font-weight:700; color:#1f2328;">${formatClipboardText(slot.title)}</p>`,
    )
  }

  if (hasClipboardText(slot.summary)) {
    textParts.push(
      `<p style="margin:${textParts.length ? 8 : 0}px 0 0; font-size:13px; line-height:1.7; color:#4b5563;">${formatClipboardText(slot.summary)}</p>`,
    )
  }

  const textBody = textParts.length
    ? `<section style="padding:12px 14px; border:1px solid #e5e7eb; border-top:0; border-radius:0 0 16px 16px; background:#fafafa;">${textParts.join(``)}</section>`
    : ``

  const image = renderWeChatFigureBox(slot, metrics, renderWidth, renderHeight, {
    radius: textBody ? `16px 16px 0 0` : `16px`,
  })

  return `
    <section style="margin:0; padding:0; border:0; background:transparent;">
      <section style="margin:0;">
        ${image}
      </section>
      ${textBody}
    </section>
  `
}

function renderWeChatColumns(columns: Array<{ html: string, width: number }>, gap = 10) {
  const validColumns = columns.filter(column => column.html)
  if (!validColumns.length) {
    return ``
  }
  if (validColumns.length === 1) {
    return validColumns[0].html
  }

  const cells = validColumns.map((column, index) => {
    const leftPadding = index === 0 ? 0 : Math.floor(gap / 2)
    const rightPadding = index === validColumns.length - 1 ? 0 : Math.ceil(gap / 2)
    return `
      <td valign="top" width="${column.width}%" style="width:${column.width}%; padding-left:${leftPadding}px; padding-right:${rightPadding}px;">
        ${column.html}
      </td>
    `
  }).join(``)

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%; border-collapse:collapse; border-spacing:0; table-layout:fixed;">
      <tbody>
        <tr>${cells}</tr>
      </tbody>
    </table>
  `
}

function buildWeChatMediaLayoutBody(
  preset: MediaLayoutPreset,
  form: MediaLayoutFormState,
  primaryColor: string,
  context: WeChatMediaLayoutRenderContext = {},
) {
  const slots = form.images.slice(0, preset.slotCount)
  const textCard = renderWeChatTextCard(form, primaryColor, preset.id === `caption-band`)
  const metrics = context.imageMetrics || []
  const renderWidths = context.renderWidths || []
  const renderHeights = context.renderHeights || []

  if (preset.id === `hero-image`) {
    return renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])
  }

  if (preset.id === `frame-single`) {
    return renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0], { frame: true })
  }

  if (preset.id === `scroll-window`) {
    return renderWeChatScrollWindow(slots[0], {
      measuredBlockWidth: context.measuredBlockWidth,
      measuredBlockHeight: context.measuredBlockHeight,
      imageMetrics: metrics.slice(0, 1),
    })
  }

  if (preset.id === `duo-gallery`) {
    return renderWeChatColumns([
      { html: renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 50 },
      { html: renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]), width: 50 },
    ])
  }

  if (preset.id === `vertical-pair`) {
    return `
      <section>
        ${renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])}
        ${hasClipboardText(slots[1]?.url || ``) ? `<section style="margin-top:10px;">${renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1])}</section>` : ``}
      </section>
    `
  }

  if (preset.id === `duo-focus`) {
    return renderWeChatColumns([
      { html: renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 58 },
      { html: renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]), width: 42 },
    ])
  }

  if (preset.id === `triptych-gallery` || preset.id === `filmstrip-gallery`) {
    return renderWeChatColumns([
      { html: renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 33.34 },
      { html: renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]), width: 33.33 },
      { html: renderWeChatFigure(slots[2], metrics[2], renderWidths[2], renderHeights[2]), width: 33.33 },
    ], 8)
  }

  if (preset.id === `vertical-strip`) {
    return `
      <section>
        ${renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])}
        ${hasClipboardText(slots[1]?.url || ``) ? `<section style="margin-top:10px;">${renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1])}</section>` : ``}
        ${hasClipboardText(slots[2]?.url || ``) ? `<section style="margin-top:10px;">${renderWeChatFigure(slots[2], metrics[2], renderWidths[2], renderHeights[2])}</section>` : ``}
      </section>
    `
  }

  if (preset.id === `stack-gallery`) {
    const tail = renderWeChatColumns([
      { html: renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]), width: 50 },
      { html: renderWeChatFigure(slots[2], metrics[2], renderWidths[2], renderHeights[2]), width: 50 },
    ])
    return `
      <section>
        ${renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])}
        ${tail ? `<section style="margin-top:10px;">${tail}</section>` : ``}
      </section>
    `
  }

  if (preset.id === `mosaic-focus`) {
    const side = `
      <section>
        ${renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1])}
        ${hasClipboardText(slots[2]?.url || ``) ? `<section style="margin-top:10px;">${renderWeChatFigure(slots[2], metrics[2], renderWidths[2], renderHeights[2])}</section>` : ``}
      </section>
    `
    return renderWeChatColumns([
      { html: renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 56 },
      { html: side, width: 44 },
    ])
  }

  if (preset.id === `split-left`) {
    if (!textCard) {
      return renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])
    }
    return renderWeChatColumns([
      { html: renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 54 },
      { html: textCard, width: 46 },
    ], 12)
  }

  if (preset.id === `split-right`) {
    if (!textCard) {
      return renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])
    }
    return renderWeChatColumns([
      { html: textCard, width: 46 },
      { html: renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 54 },
    ], 12)
  }

  if (preset.id === `spotlight-card` || preset.id === `caption-band`) {
    return `
      <section>
        ${renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])}
        ${textCard ? `<section style="margin-top:12px;">${textCard}</section>` : ``}
      </section>
    `
  }

  if (preset.id === `story-pair`) {
    return renderWeChatColumns([
      { html: renderWeChatStoryCard(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 50 },
      { html: renderWeChatStoryCard(slots[1], metrics[1], renderWidths[1], renderHeights[1]), width: 50 },
    ], 10)
  }

  return renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])
}

function buildWeChatMediaLayoutMarkup(
  preset: MediaLayoutPreset,
  form: MediaLayoutFormState,
  primaryColor: string,
  context: WeChatMediaLayoutRenderContext = {},
) {
  const header = renderWeChatSectionHeader(form, primaryColor)
  const body = buildWeChatMediaLayoutBody(preset, form, primaryColor, context)
  if (!body) {
    return ``
  }
  const blockWidth = normalizeMediaBlockWidth(form.blockWidth)
  return `
    <section style="text-align:center; margin:24px 0; position:static; box-sizing:border-box;">
      <section style="display:inline-block; width:${blockWidth}%; max-width:100%; vertical-align:top; box-sizing:border-box;">
        ${header}
        ${body}
      </section>
    </section>
  `
}

function convertMediaLayoutsForWeChat(clipboardDiv: HTMLElement, primaryColor: string) {
  const blocks = Array.from(clipboardDiv.querySelectorAll<HTMLElement>(`section.md-media-block`))

  blocks.forEach((blockElement) => {
    const block = parseMediaLayoutBlocks(blockElement.outerHTML)[0]
    if (!block) {
      return
    }

    const preset = mediaLayoutPresets.find(item => item.id === block.presetId)
    if (!preset) {
      return
    }

    const figureElements = Array.from(blockElement.querySelectorAll<HTMLElement>(`.md-media-figure`))
    const imageMetrics = figureElements.map((figure) => {
      const image = figure.querySelector<HTMLImageElement>(`img`)
      return {
        naturalWidth: image?.naturalWidth || 0,
        naturalHeight: image?.naturalHeight || 0,
      }
    })
    const renderSizes = figureElements.map((figure) => {
      const figureBody = figure.querySelector<HTMLElement>(`.md-media-figure__frame, .md-media-scroll-window`)
      const image = figure.querySelector<HTMLElement>(`img`)
      const imageRect = image?.getBoundingClientRect()
      const bodyRect = figureBody?.getBoundingClientRect()
      const figureRect = figure.getBoundingClientRect()
      return {
        width: Math.round(bodyRect?.width || imageRect?.width || figureRect.width || 0),
        height: Math.round(bodyRect?.height || imageRect?.height || figureRect.height || 0),
      }
    })
    const renderWidths = renderSizes.map(item => item.width)
    const renderHeights = renderSizes.map(item => item.height)
    const scrollWindowRect = blockElement.querySelector<HTMLElement>(`.md-media-scroll-window`)?.getBoundingClientRect()
    const scrollWindowWidth = scrollWindowRect?.width || 0
    const scrollWindowHeight = scrollWindowRect?.height || 0
    const blockWidth = blockElement.getBoundingClientRect().width || 0
    const markup = buildWeChatMediaLayoutMarkup(preset, block.form, primaryColor, {
      measuredBlockWidth: scrollWindowWidth || blockWidth,
      measuredBlockHeight: scrollWindowHeight || 0,
      imageMetrics,
      renderWidths,
      renderHeights,
    })
    if (!markup) {
      return
    }

    const wrapper = document.createElement(`div`)
    wrapper.innerHTML = markup.trim()
    const replacementNodes = Array.from(wrapper.childNodes)
    if (!replacementNodes.length) {
      return
    }

    blockElement.replaceWith(...replacementNodes)
  })
}

export async function processClipboardContent(primaryColor: string) {
  const clipboardDiv = document.getElementById(`output`)!
  const codeBlockSnapshots = snapshotCodeBlockStyles(clipboardDiv)

  const stylesToAdd = await getStylesToAdd()

  if (stylesToAdd) {
    clipboardDiv.innerHTML = stylesToAdd + clipboardDiv.innerHTML
  }

  // 先合并 CSS 和修改 HTML 结构
  clipboardDiv.innerHTML = modifyHtmlStructure(mergeCss(clipboardDiv.innerHTML))

  // 处理样式和颜色变量
  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(/([^-])top:(.*?)em/g, `$1transform: translateY($2em)`)
    .replace(/hsl\(var\(--foreground\)\)/g, `#3f3f3f`)
    .replace(/var\(--blockquote-background\)/g, `#f7f7f7`)
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)
    .replace(/--md-font-family:.+?;/g, ``)
    .replace(/--md-font-size:.+?;/g, ``)
    .replace(
      /<span class="nodeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="nodeLabel"$1>$2</span>`,
    )
    .replace(
      /<span class="edgeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="edgeLabel"$1>$2</span>`,
    )

  // 图文模块改写为公众号更稳定的内联结构，避免 grid / flex / aspect-ratio 粘贴后失效
  convertMediaLayoutsForWeChat(clipboardDiv, primaryColor)

  // 如果已经配置公众号图床，则把复制内容里的图片先转成公众号可接受的图片地址
  await uploadClipboardImagesToMp(clipboardDiv)

  // 处理图片大小
  solveWeChatImage()
  applyCodeBlockSnapshots(clipboardDiv, codeBlockSnapshots)

  // 添加空白节点用于兼容 SVG 复制
  const beforeNode = createEmptyNode()
  const afterNode = createEmptyNode()
  clipboardDiv.insertBefore(beforeNode, clipboardDiv.firstChild)
  clipboardDiv.appendChild(afterNode)

  // 兼容 Mermaid
  const nodes = clipboardDiv.querySelectorAll(`.nodeLabel`)
  nodes.forEach((node) => {
    const parent = node.parentElement!
    const xmlns = parent.getAttribute(`xmlns`)!
    const style = parent.getAttribute(`style`)!
    const section = document.createElement(`section`)
    section.setAttribute(`xmlns`, xmlns)
    section.setAttribute(`style`, style)
    section.innerHTML = parent.innerHTML

    const grand = parent.parentElement!
    // 清空父元素
    grand.innerHTML = ``
    grand.appendChild(section)
  })

  // fix: mermaid 部分文本颜色被 stroke 覆盖
  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(
      /<tspan([^>]*)>/g,
      `<tspan$1 style="fill: #333333 !important; color: #333333 !important; stroke: none !important;">`,
    )

  // fix: antv infographic 复制到微信公众平台时 <text></text> 被自动转为 <text><tspan></tspan></text> 导致在 Safari 浏览器中文字异常的问题
  clipboardDiv.querySelectorAll('.infographic-diagram').forEach((diagram) => {
    diagram.querySelectorAll('text').forEach((textElem) => {
      // 如果有 dominant-baseline 属性，替换为 dy
      const dominantBaseline = textElem.getAttribute('dominant-baseline')
      const variantMap = {
        'alphabetic': '',
        'central': '0.35em',
        'middle': '0.35em',
        'hanging': '-0.55em',
        'ideographic': '0.18em',
        'text-before-edge': '-0.85em',
        'text-after-edge': '0.15em',
      }
      if (dominantBaseline) {
        textElem.removeAttribute('dominant-baseline')
        const dy = variantMap[dominantBaseline as keyof typeof variantMap]
        if (dy) {
          textElem.setAttribute('dy', dy)
        }
      }
    })
  })
}
