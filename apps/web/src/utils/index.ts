import type { MediaLayoutFormState, MediaLayoutImageSlot, MediaLayoutPreset } from '@/utils/image-layouts'
import type { WeChatMediaPalette } from '@/utils/wechat-media'
import { markedAlert, MDKatex } from '@mobi/core'
import { prefix } from '@mobi/shared/configs'
// 直接导入供本文件内部使用
import {
  checkImage,
  createTable,
  downloadFile,
  formatDoc,
  removeLeft,
  sanitizeTitle,
  toBase64,
} from '@mobi/shared/utils'
import imageCompression from 'browser-image-compression'
import juice from 'juice'
import { Marked } from 'marked'

import { convertBlocksForWeChat } from '@/utils/blocks/registry'
import {

  mediaLayoutPresets,
  parseMediaLayoutBlocks,
} from '@/utils/image-layouts'
import { compactWeChatMarkup, renderWeChatRow, renderWeChatStack, renderWeChatVerticalScroller } from '@/utils/wechat-layout'
import { buildExtendedWeChatMediaBody, defaultWeChatMediaPalette } from '@/utils/wechat-media'
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
} from '@mobi/core/utils'

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

const CLIPBOARD_SIZE_ATTRIBUTE_PATTERN = /^\d+(?:\.\d+)?(?:px|%)?$/i

function sanitizeClipboardSizeAttribute(image: HTMLImageElement, attribute: `width` | `height`) {
  const value = image.getAttribute(attribute)
  if (!value) {
    return ``
  }

  // juice 会把 `height: auto` 这类关键字写成 HTML 属性，公众号读到非数值尺寸会丢弃整张图的排版
  if (!CLIPBOARD_SIZE_ATTRIBUTE_PATTERN.test(value.trim())) {
    image.removeAttribute(attribute)
    return ``
  }

  return value.trim()
}

export function solveWeChatImage() {
  const clipboardDiv = document.getElementById(`output`)!
  const images = clipboardDiv.getElementsByTagName(`img`)

  Array.from(images).forEach((image) => {
    const width = sanitizeClipboardSizeAttribute(image, `width`)
    const height = sanitizeClipboardSizeAttribute(image, `height`)

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

/**
 * 复制链路依赖 getComputedStyle 取真实值，暗色模式会把正文色算成浅色，
 * 因此取值期间临时切回浅色外观。整个过程同步执行，不会产生闪烁。
 */
function withLightAppearance<T>(callback: () => T): T {
  const htmlElement = document.documentElement
  const wasDark = htmlElement.classList.contains(`dark`)

  if (wasDark) {
    htmlElement.classList.remove(`dark`)
  }

  try {
    return callback()
  }
  finally {
    if (wasDark) {
      htmlElement.classList.add(`dark`)
    }
  }
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
    console.warn(`[getThemeStyles] 未找到主题样式`)
    return ``
  }

  // 移除 #output 作用域前缀，因为复制后的 HTML 不在 #output 容器中
  let cssContent = themeStyle.textContent

  // 处理 #output {} 为 body {}，避免出现 {} 无效样式
  cssContent = cssContent.replace(/#output\s*\{/g, `body {`)

  // 将 "#output h1" 替换为 "h1"，"#output .class" 替换为 ".class" 等
  // 同时处理换行和多个空格的情况
  cssContent = cssContent.replace(/#output\s+/g, ``)
  // 处理选择器开头的 #output（如果没有后续内容）
  cssContent = cssContent.replace(/^#output\s*/gm, ``)
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

function removeSourcePositionAttributes(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(`[data-src-kind], [data-src-ordinal]`).forEach((element) => {
    element.removeAttribute(`data-src-kind`)
    element.removeAttribute(`data-src-ordinal`)
  })
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

/**
 * 图床上传成功后，只要配置了代理域名，`mpFileUpload` 会把返回的 mmbiz 地址再套一层
 * `https://wsrv.nl?url=...`——那是给浏览器绕开防盗链看图用的，不能进剪贴板：
 * 公众号要的是 mmbiz 原始地址，套了壳它就成了一张外链图，
 * 复制前的安全校验也会因为域名不匹配直接中止整次复制。这里把壳剥回去。
 */
function unwrapMpHostedUrl(url: string) {
  const match = url.match(/^https?:\/\/(?:images\.)?wsrv\.nl\/?\?(?:.*&)?url=([^&]+)/i)
  if (!match) {
    return url
  }

  try {
    const inner = decodeURIComponent(match[1])
    return /mmbiz\.q(?:pic|logo)\.cn|res\.wx\.qq\.com/i.test(inner) ? inner : url
  }
  catch {
    return url
  }
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
      // 旧缓存里可能存着套了 wsrv.nl 壳的地址，读出来时一并剥掉
      const cached = unwrapMpHostedUrl(cachedEntries[src])
      cachedEntries[src] = cached
      image.setAttribute(`src`, cached)
      image.setAttribute(`data-src`, cached)
      image.removeAttribute(`data-mp-upload-error`)
      continue
    }

    try {
      const file = await convertImageUrlToFile(src, proxyOrigin)
      const uploadedUrl = unwrapMpHostedUrl(await uploadFileToMp(file))
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

function readClipboardColorChannels(value: string) {
  const hex = value.trim().match(/^#([0-9a-f]{3,8})$/i)
  if (hex) {
    const raw = hex[1]
    const full = raw.length === 3 || raw.length === 4
      ? raw.slice(0, 3).split(``).map(channel => channel + channel).join(``)
      : raw.slice(0, 6)
    const parsed = Number.parseInt(full, 16)
    return Number.isNaN(parsed) ? null : [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255]
  }

  const numbers = value.match(/[\d.]+/g)
  return numbers && numbers.length >= 3 ? numbers.slice(0, 3).map(Number) : null
}

function clipboardRelativeLuminance(channels: number[]) {
  const [r, g, b] = channels.map((channel) => {
    const scaled = channel / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function clipboardContrastRatio(a: number[], b: number[]) {
  const first = clipboardRelativeLuminance(a)
  const second = clipboardRelativeLuminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function toClipboardRgbString(channels: number[]) {
  return `rgb(${channels.map(channel => Math.round(Math.min(255, Math.max(0, channel)))).join(`, `)})`
}

function findClipboardPaperChannels(element: HTMLElement) {
  let node: HTMLElement | null = element
  while (node) {
    const computed = window.getComputedStyle(node)
    const channels = readClipboardColorChannels(computed.backgroundColor)
    const alpha = Number((computed.backgroundColor.match(/[\d.]+/g) || [])[3] ?? `1`)
    if (channels && alpha >= 0.5) {
      return channels
    }
    node = node.parentElement
  }
  return [255, 255, 255]
}

// 图文模块的文案色原本写死成浅色主题的灰阶，落到 terminal、nightread 这类深色主题上
// 就是深灰字压近黑底，粘进公众号直接看不见。这里按模块实际所处的底色挑一套能看清的。
// 单次转换是同步的，用模块级变量传递比给十几个渲染函数都加一个参数更好维护。
let activeWeChatMediaPalette = defaultWeChatMediaPalette

function resolveWeChatMediaPalette(blockElement: HTMLElement): WeChatMediaPalette {
  const paper = findClipboardPaperChannels(blockElement)
  if (clipboardRelativeLuminance(paper) > 0.5) {
    return defaultWeChatMediaPalette
  }

  const ink = readClipboardColorChannels(window.getComputedStyle(blockElement).color) || [237, 240, 245]
  // 主文案用主题字色，其余层级按比例往底色靠，复刻浅色主题里由深到浅的那套灰阶
  const fade = (amount: number) => toClipboardRgbString(
    ink.map((channel, index) => channel + (paper[index] - channel) * amount),
  )

  return {
    ink: toClipboardRgbString(ink),
    body: fade(0.18),
    secondary: fade(0.26),
    lead: fade(0.32),
    muted: fade(0.38),
  }
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

// 微信会剥离 position、transform、float 和 overflow，原先「padding-top 百分比撑高
// 加绝对定位图层加 transform 居中」的比例盒在公众号里会整体塌掉：撑高的空盒仍占位，
// 图片却掉出容器跟正文挤在一起。复制产物因此一律走文档流，按图片自身宽高比铺满栏宽。
function renderWeChatFigureImageStyle(radius: string, options: { frame?: boolean } = {}) {
  return [
    `display:block;`,
    `width:100%;`,
    `max-width:100%;`,
    `height:auto;`,
    `margin:0;`,
    `border-radius:${radius};`,
    options.frame ? `border:1px solid #e5e7eb;` : `border:0;`,
    `vertical-align:top;`,
  ].join(` `)
}

function renderWeChatFigureBox(
  slot: MediaLayoutImageSlot,
  metrics?: ClipboardImageMetrics,
  _renderWidth = 0,
  _renderHeight = 0,
  options: { frame?: boolean, radius?: string } = {},
) {
  const radius = options.radius || `18px`

  return `
    <section style="margin:0; padding:0; border:0; background:transparent; font-size:0; line-height:0; box-sizing:border-box;">
      <img class="rich_pages wxw-img" src="${escapeClipboardHtml(slot.url.trim())}" alt="${escapeClipboardHtml(slot.alt.trim() || `图片`)}"${renderWeChatImageMetricAttrs(slot, metrics)} style="${renderWeChatFigureImageStyle(radius, { frame: options.frame })}" />
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
      `<p style="margin:0; font-size:18px; line-height:1.55; font-weight:700; color:${activeWeChatMediaPalette.ink};">${formatClipboardText(form.sectionTitle)}</p>`,
    )
  }

  if (hasClipboardText(form.sectionLead)) {
    parts.push(
      `<p style="margin:8px 0 0; font-size:14px; line-height:1.75; color:${activeWeChatMediaPalette.lead};">${formatClipboardText(form.sectionLead)}</p>`,
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
      `<p style="margin:0; font-size:${compact ? 15 : 16}px; line-height:1.55; font-weight:700; color:${activeWeChatMediaPalette.ink};">${formatClipboardText(form.bodyTitle)}</p>`,
    )
  }

  if (hasClipboardText(form.bodyText)) {
    parts.push(
      `<p style="margin:${parts.length ? 8 : 0}px 0 0; font-size:14px; line-height:1.75; color:#444d5c;">${formatClipboardText(form.bodyText)}</p>`,
    )
  }

  if (hasClipboardText(form.secondaryText)) {
    parts.push(
      `<p style="margin:${parts.length ? 8 : 0}px 0 0; font-size:13px; line-height:1.7; color:${activeWeChatMediaPalette.muted};">${formatClipboardText(form.secondaryText)}</p>`,
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
    ? `<p style="margin:8px 0 0; font-size:13px; line-height:1.65; color:${activeWeChatMediaPalette.muted}; text-align:center;">${formatClipboardText(caption)}</p>`
    : ``

  return `<section style="margin:0; padding:0; border:0; background:transparent;">${imageBody}${captionBody}</section>`
}

/**
 * 长图视窗。
 *
 * 上一版直接放弃了滚动，理由写的是「微信不支持 overflow 滚动容器」——那个前提是错的。
 * 秀米自己的滑动组件就是 `overflow-x:auto` 撑起来的，真实文章 DOM 里 `overflow:hidden`
 * 也能穿过过滤。这里改成秀米那套滚动容器，并按秀米导出器的规则写 overflow 长写法。
 *
 * 只有当长图确实比视窗高时才套滚动容器：图片本来就装得下的话，
 * 加一个 max-height 只会白白引入被剥属性的风险。
 */
function renderWeChatScrollWindow(slot: MediaLayoutImageSlot, context: WeChatMediaLayoutRenderContext = {}) {
  if (!hasClipboardText(slot.url)) {
    return ``
  }

  const caption = resolveClipboardImageCaption(slot)
  const metrics = context.imageMetrics?.[0]
  // 和预览的 renderScrollableFigure 用同一条钳制，避免复制前后视窗高度对不上
  const viewportHeight = Math.max(180, Math.round(slot.minHeight || 380))
  const columnWidth = context.measuredBlockWidth || 0
  const projectedHeight = metrics?.naturalWidth && metrics?.naturalHeight && columnWidth
    ? (columnWidth * metrics.naturalHeight) / metrics.naturalWidth
    : 0
  // 拿不到真实尺寸时按「长图」处理：这个版式本来就是给长图用的。
  // 误判成需要滚动是无害的（max-height 撑不满就不裁剪），误判成不需要才会退回整幅长图。
  const needsScroller = !projectedHeight || projectedHeight > viewportHeight + 24

  const image = `
    <section style="margin:0; padding:0; border:0; background:transparent; font-size:0; line-height:0; box-sizing:border-box;">
      <img class="rich_pages wxw-img" src="${escapeClipboardHtml(slot.url.trim())}" alt="${escapeClipboardHtml(slot.alt.trim() || `图片`)}"${renderWeChatImageMetricAttrs(slot, metrics)} style="display:block; width:100%; max-width:100%; height:auto; margin:0; border-radius:${needsScroller ? `0` : `18px`}; border:0; vertical-align:top;" />
    </section>
  `

  const body = needsScroller
    ? renderWeChatVerticalScroller(image, {
        viewportHeight,
        hint: hasClipboardText(caption) ? `` : `上下滑动查看长图`,
        hintColor: activeWeChatMediaPalette.muted,
      })
    : image

  return `
    <section style="margin:0; padding:0; border:0; background:transparent; box-sizing:border-box;">
      ${body}
      ${hasClipboardText(caption) ? `<p style="margin:8px 0 0; font-size:13px; line-height:1.65; color:${activeWeChatMediaPalette.muted}; text-align:center;">${formatClipboardText(caption)}</p>` : ``}
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
      `<p style="margin:0; font-size:15px; line-height:1.55; font-weight:700; color:${activeWeChatMediaPalette.ink};">${formatClipboardText(slot.title)}</p>`,
    )
  }

  if (hasClipboardText(slot.summary)) {
    textParts.push(
      `<p style="margin:${textParts.length ? 8 : 0}px 0 0; font-size:13px; line-height:1.7; color:${activeWeChatMediaPalette.secondary};">${formatClipboardText(slot.summary)}</p>`,
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

function renderWeChatColumns(columns: Array<{ html: string, width: number }>, gap = 2) {
  return renderWeChatRow(
    columns.map(column => ({ html: column.html, weight: column.width })),
    { gap },
  )
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

  const extendedBody = buildExtendedWeChatMediaBody(preset.id, form, primaryColor, {
    imageMetrics: metrics,
    renderWidths,
    renderHeights,
    measuredBlockWidth: context.measuredBlockWidth,
    palette: activeWeChatMediaPalette,
  })
  if (extendedBody) {
    return extendedBody
  }

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
    return renderWeChatStack([
      renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]),
      renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]),
    ], 10)
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
    ], 2)
  }

  if (preset.id === `vertical-strip`) {
    return renderWeChatStack([
      renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]),
      renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]),
      renderWeChatFigure(slots[2], metrics[2], renderWidths[2], renderHeights[2]),
    ], 10)
  }

  if (preset.id === `stack-gallery`) {
    const tail = renderWeChatColumns([
      { html: renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]), width: 50 },
      { html: renderWeChatFigure(slots[2], metrics[2], renderWidths[2], renderHeights[2]), width: 50 },
    ])
    return renderWeChatStack([
      renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]),
      tail,
    ], 10)
  }

  if (preset.id === `mosaic-focus`) {
    const side = renderWeChatStack([
      renderWeChatFigure(slots[1], metrics[1], renderWidths[1], renderHeights[1]),
      renderWeChatFigure(slots[2], metrics[2], renderWidths[2], renderHeights[2]),
    ], 10)
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
    ], 3)
  }

  if (preset.id === `split-right`) {
    if (!textCard) {
      return renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0])
    }
    return renderWeChatColumns([
      { html: textCard, width: 46 },
      { html: renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 54 },
    ], 3)
  }

  if (preset.id === `spotlight-card` || preset.id === `caption-band`) {
    return renderWeChatStack([
      renderWeChatFigure(slots[0], metrics[0], renderWidths[0], renderHeights[0]),
      textCard,
    ], 12)
  }

  if (preset.id === `story-pair`) {
    return renderWeChatColumns([
      { html: renderWeChatStoryCard(slots[0], metrics[0], renderWidths[0], renderHeights[0]), width: 50 },
      { html: renderWeChatStoryCard(slots[1], metrics[1], renderWidths[1], renderHeights[1]), width: 50 },
    ], 2)
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
  // 压掉标签之间的换行和缩进：这些空白会被渲染成一个空格的宽度，
  // 足以把并排的两列挤到超过 100% 而换行。
  return compactWeChatMarkup(`
    <section style="text-align:center; margin:24px 0; font-size:0; box-sizing:border-box;">
      <section style="display:inline-block; width:${blockWidth}%; max-width:100%; vertical-align:top; font-size:15px; line-height:1.75; text-align:left; box-sizing:border-box;">
        ${header}
        ${body}
      </section>
    </section>
  `)
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

    activeWeChatMediaPalette = resolveWeChatMediaPalette(blockElement)

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

/**
 * 图文模块转换完之后，md-media-* 那批 class 已经不在产物里了，
 * juice 内联不掉的 @media 规则却还留在 <style> 里跟着进剪贴板。
 * 公众号官方的 verify_article_structure 接口会把这段 <style> 判成排版溢出，
 * 这里按选择器把死规则清掉，整段空了就把 <style> 一起删。
 */
function prunePreviewOnlyClipboardStyles(clipboardDiv: HTMLElement) {
  const deadSelector = /\.md-media-|\.md-layout-preview/

  Array.from(clipboardDiv.querySelectorAll(`style`)).forEach((styleElement) => {
    const sheet = styleElement.sheet
    if (!sheet) {
      return
    }

    const dropDeadRules = (container: CSSStyleSheet | CSSGroupingRule) => {
      const rules = container.cssRules
      for (let index = rules.length - 1; index >= 0; index -= 1) {
        const rule = rules[index]
        if (rule instanceof CSSGroupingRule) {
          dropDeadRules(rule)
          if (!rule.cssRules.length) {
            container.deleteRule(index)
          }
          continue
        }
        if (rule instanceof CSSStyleRule && deadSelector.test(rule.selectorText)) {
          container.deleteRule(index)
        }
      }
    }

    try {
      dropDeadRules(sheet)
      if (!sheet.cssRules.length) {
        styleElement.remove()
        return
      }
      styleElement.textContent = Array.from(sheet.cssRules).map(rule => rule.cssText).join(`\n`)
    }
    catch {
      // 跨域或只读样式表，保持原样
    }
  })
}

const CLIPBOARD_ZERO_LENGTH_PATTERN = /^0(?:px|em|rem|%)?$/i

function isClipboardZeroLength(value: string) {
  return !value || CLIPBOARD_ZERO_LENGTH_PATTERN.test(value)
}

const CLIPBOARD_MODERN_COLOR_PATTERN = /color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi

/**
 * Chrome 会把 color-mix() 的计算值序列化成 `color(srgb r g b)`，公众号只认 rgb/rgba/#hex，
 * 这里统一降级成旧写法。
 */
function toClipboardLegacyColor(value: string) {
  if (!value.includes(`color(`)) {
    return value
  }

  return value.replace(CLIPBOARD_MODERN_COLOR_PATTERN, (match, red, green, blue, alpha) => {
    const toChannel = (input: string) => Math.max(0, Math.min(255, Math.round(Number(input) * 255)))
    const channels = [red, green, blue].map(toChannel)

    if (channels.some(channel => Number.isNaN(channel))) {
      return match
    }

    const body = channels.join(`, `)

    if (alpha === undefined) {
      return `rgb(${body})`
    }

    const parsedAlpha = alpha.endsWith(`%`) ? Number(alpha.slice(0, -1)) / 100 : Number(alpha)
    if (Number.isNaN(parsedAlpha) || parsedAlpha >= 1) {
      return `rgb(${body})`
    }

    return `rgba(${body}, ${Number(parsedAlpha.toFixed(4))})`
  })
}

function captureClipboardImageMetrics(root: HTMLElement) {
  const metrics = new Map<string, ClipboardImageMetrics>()

  Array.from(root.querySelectorAll<HTMLImageElement>(`img`)).forEach((image) => {
    const src = image.getAttribute(`src`)?.trim() || ``
    if (!src || !image.naturalWidth || !image.naturalHeight) {
      return
    }

    metrics.set(src, {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    })
  })

  return metrics
}

function buildClipboardFigureWrapperStyle(figure: HTMLElement) {
  const computed = window.getComputedStyle(figure)

  return [
    `margin-top:${computed.marginTop || `20px`}`,
    `margin-bottom:${computed.marginBottom || `20px`}`,
    `margin-left:0`,
    `margin-right:0`,
    `padding:0`,
    `text-align:center`,
    `box-sizing:border-box`,
  ].join(`; `)
}

function buildClipboardFigureImageStyle(image: HTMLImageElement) {
  const computed = window.getComputedStyle(image)
  const declarations = [
    `display:block`,
    `max-width:100%`,
    `height:auto`,
    `margin-left:auto`,
    `margin-right:auto`,
    `vertical-align:top`,
  ]

  const borderRadius = computed.borderRadius.trim()
  if (!isClipboardZeroLength(borderRadius)) {
    declarations.push(`border-radius:${borderRadius}`)
  }

  const borderWidth = computed.borderTopWidth.trim()
  const borderStyle = computed.borderTopStyle.trim()
  if (!isClipboardZeroLength(borderWidth) && borderStyle && borderStyle !== `none`) {
    declarations.push(`border:${borderWidth} ${borderStyle} ${toClipboardLegacyColor(computed.borderTopColor.trim())}`)
  }
  else {
    declarations.push(`border:0`)
  }

  const boxShadow = computed.boxShadow.trim()
  if (boxShadow && boxShadow !== `none`) {
    declarations.push(`box-shadow:${toClipboardLegacyColor(boxShadow)}`)
  }

  return declarations.join(`; `)
}

function buildClipboardFigureCaptionStyle(caption: HTMLElement) {
  const computed = window.getComputedStyle(caption)

  return [
    `margin-top:8px`,
    `margin-bottom:0`,
    `padding:0`,
    `font-size:${computed.fontSize}`,
    `line-height:${computed.lineHeight}`,
    `color:${toClipboardLegacyColor(computed.color)}`,
    `text-align:center`,
  ].join(`; `)
}

/**
 * 普通 Markdown 图片渲染成 `<figure><img><figcaption>`，间距只由 `margin-block` 提供，
 * 而公众号会剥离 figure/figcaption 与逻辑属性，导致图片样式整体失效。
 * 这里改写成 section + img + p 的内联结构，取值全部来自预览区的计算样式。
 */
function convertMarkdownFiguresForWeChat(root: HTMLElement, imageMetrics: Map<string, ClipboardImageMetrics>) {
  const figures = Array.from(root.querySelectorAll<HTMLElement>(`figure`)).filter(
    figure => !figure.classList.contains(`md-media-figure`) && !figure.closest(`.md-media-block`),
  )

  figures.forEach((figure) => {
    const image = figure.querySelector<HTMLImageElement>(`img`)
    if (!image) {
      return
    }

    const caption = figure.querySelector<HTMLElement>(`figcaption`)
    const wrapperStyle = buildClipboardFigureWrapperStyle(figure)
    const imageStyle = buildClipboardFigureImageStyle(image)
    const captionStyle = caption ? buildClipboardFigureCaptionStyle(caption) : ``

    const section = document.createElement(`section`)
    section.setAttribute(`style`, wrapperStyle)

    const nextImage = document.createElement(`img`)
    Array.from(image.attributes).forEach((attribute) => {
      nextImage.setAttribute(attribute.name, attribute.value)
    })
    sanitizeClipboardSizeAttribute(nextImage, `width`)
    sanitizeClipboardSizeAttribute(nextImage, `height`)
    nextImage.setAttribute(`class`, `rich_pages wxw-img`)
    nextImage.setAttribute(`style`, imageStyle)

    const src = image.getAttribute(`data-src`)?.trim() || image.getAttribute(`src`)?.trim() || ``
    if (src) {
      // innerHTML 重建过 DOM，当前 img 往往还没解码完，尺寸要回退到预处理前抓的快照
      const metrics = imageMetrics.get(src)
      const naturalWidth = image.naturalWidth || metrics?.naturalWidth || 0
      const naturalHeight = image.naturalHeight || metrics?.naturalHeight || 0

      nextImage.setAttribute(`data-src`, src)
      nextImage.setAttribute(`data-type`, resolveWeChatImageType(src))

      if (naturalWidth > 0 && naturalHeight > 0) {
        nextImage.setAttribute(`data-ratio`, formatClipboardRatio(naturalHeight / naturalWidth))
        nextImage.setAttribute(`data-w`, String(Math.round(naturalWidth)))
      }
    }

    section.appendChild(nextImage)

    if (caption && caption.innerHTML.trim()) {
      const captionNode = document.createElement(`p`)
      captionNode.setAttribute(`style`, captionStyle)
      captionNode.innerHTML = caption.innerHTML
      section.appendChild(captionNode)
    }

    figure.replaceWith(section)
  })
}

const CLIPBOARD_UNRESOLVED_VALUE_PATTERN = /var\(|color-mix\(|calc\(|clamp\(|light-dark\(|(?:^|[\s,(])(?:min|max)\(/i

const CLIPBOARD_KEYWORD_VALUE_PATTERN = /^(?:auto|inherit|initial|unset|revert|revert-layer|none)$/i

const CLIPBOARD_DROPPED_PROPERTIES = new Set([`aspect-ratio`])

/**
 * 公众号只保留一部分简写属性的展开结果，
 * 而 border / background 这类简写在 getComputedStyle 里要么序列化不出来，要么会带上一长串默认值。
 */
const CLIPBOARD_SHORTHAND_LONGHANDS: Record<string, string[]> = {
  'background': [`background-color`, `background-image`],
  'border': [`border-top`, `border-right`, `border-bottom`, `border-left`],
  'border-color': [`border-top-color`, `border-right-color`, `border-bottom-color`, `border-left-color`],
  'outline': [`outline-width`, `outline-style`, `outline-color`],
}

const CLIPBOARD_ALWAYS_EXPANDED_SHORTHANDS = new Set([`background`])

const CLIPBOARD_LOGICAL_AXIS_PROPERTIES: Record<string, [string, string]> = {
  'margin-block': [`margin-top`, `margin-bottom`],
  'margin-inline': [`margin-left`, `margin-right`],
  'padding-block': [`padding-top`, `padding-bottom`],
  'padding-inline': [`padding-left`, `padding-right`],
  'inset-block': [`top`, `bottom`],
  'inset-inline': [`left`, `right`],
}

// 绝对定位元素的 top/right/bottom/left 计算值是布局后的 used value，
// 把 `inset: 0 auto 0 0` 换成计算值会把 auto 变成具体像素，必须保留字面量。
const CLIPBOARD_LITERAL_FIRST_PROPERTIES = new Set([
  `inset`,
  `inset-block`,
  `inset-inline`,
  `inset-block-start`,
  `inset-block-end`,
  `inset-inline-start`,
  `inset-inline-end`,
])

const CLIPBOARD_LOGICAL_SIDE_PROPERTIES: Record<string, string> = {
  'margin-block-start': `margin-top`,
  'margin-block-end': `margin-bottom`,
  'margin-inline-start': `margin-left`,
  'margin-inline-end': `margin-right`,
  'padding-block-start': `padding-top`,
  'padding-block-end': `padding-bottom`,
  'padding-inline-start': `padding-left`,
  'padding-inline-end': `padding-right`,
  'inset-block-start': `top`,
  'inset-block-end': `bottom`,
  'inset-inline-start': `left`,
  'inset-inline-end': `right`,
  'block-size': `height`,
  'inline-size': `width`,
  'min-block-size': `min-height`,
  'min-inline-size': `min-width`,
  'max-block-size': `max-height`,
  'max-inline-size': `max-width`,
}

interface ClipboardStyleDeclaration {
  property: string
  value: string
  important: boolean
}

function parseClipboardStyleDeclarations(styleText: string): ClipboardStyleDeclaration[] {
  const segments: string[] = []
  let depth = 0
  let current = ``

  for (const char of styleText) {
    if (char === `(`) {
      depth += 1
    }
    else if (char === `)`) {
      depth = Math.max(0, depth - 1)
    }

    if (char === `;` && depth === 0) {
      segments.push(current)
      current = ``
      continue
    }

    current += char
  }

  segments.push(current)

  return segments.reduce<ClipboardStyleDeclaration[]>((declarations, segment) => {
    const text = segment.trim()
    const separator = text.indexOf(`:`)
    if (separator <= 0) {
      return declarations
    }

    const property = text.slice(0, separator).trim().toLowerCase()
    const rawValue = text.slice(separator + 1).trim()
    const important = /!important$/i.test(rawValue)
    const value = important ? rawValue.replace(/!important$/i, ``).trim() : rawValue

    if (property && value) {
      declarations.push({ property, value, important })
    }

    return declarations
  }, [])
}

function dedupeClipboardStyleDeclarations(declarations: ClipboardStyleDeclaration[]) {
  const winners = new Map<string, ClipboardStyleDeclaration>()

  declarations.forEach((declaration) => {
    const existing = winners.get(declaration.property)
    if (existing?.important && !declaration.important) {
      return
    }

    winners.delete(declaration.property)
    winners.set(declaration.property, declaration)
  })

  return Array.from(winners.values())
}

function stringifyClipboardStyleDeclarations(declarations: ClipboardStyleDeclaration[]) {
  return declarations
    .map(({ property, value, important }) => `${property}: ${value}${important ? ` !important` : ``}`)
    .join(`; `)
}

function expandClipboardBoxShorthand(value: string) {
  const [top, right = top, bottom = top, left = right] = value.split(/\s+/u).filter(Boolean)
  return { top, right, bottom, left }
}

function resolveClipboardExpandedValue(
  literal: string,
  target: string,
  computed: CSSStyleDeclaration,
  literalFirst: boolean,
) {
  if (CLIPBOARD_KEYWORD_VALUE_PATTERN.test(literal)) {
    return literal
  }

  if (literalFirst && !CLIPBOARD_UNRESOLVED_VALUE_PATTERN.test(literal)) {
    return literal
  }

  const resolved = computed.getPropertyValue(target).trim()
  if (resolved && !CLIPBOARD_UNRESOLVED_VALUE_PATTERN.test(resolved)) {
    return resolved
  }

  return literal
}

function expandClipboardLogicalDeclaration(
  declaration: ClipboardStyleDeclaration,
  computed: CSSStyleDeclaration,
): ClipboardStyleDeclaration[] | null {
  const { property, value, important } = declaration
  const literalFirst = CLIPBOARD_LITERAL_FIRST_PROPERTIES.has(property)

  const axis = CLIPBOARD_LOGICAL_AXIS_PROPERTIES[property]
  if (axis) {
    const parts = value.split(/\s+/u).filter(Boolean)
    return axis.map((target, index) => ({
      property: target,
      value: resolveClipboardExpandedValue(parts[index] || parts[0] || value, target, computed, literalFirst),
      important,
    }))
  }

  const side = CLIPBOARD_LOGICAL_SIDE_PROPERTIES[property]
  if (side) {
    return [{
      property: side,
      value: resolveClipboardExpandedValue(value, side, computed, literalFirst),
      important,
    }]
  }

  if (property === `inset`) {
    const box = expandClipboardBoxShorthand(value)
    return ([`top`, `right`, `bottom`, `left`] as const).map(target => ({
      property: target,
      value: resolveClipboardExpandedValue(box[target], target, computed, true),
      important,
    }))
  }

  return null
}

function expandClipboardShorthand(
  declaration: ClipboardStyleDeclaration,
  computed: CSSStyleDeclaration,
): ClipboardStyleDeclaration[] | null {
  const longhands = CLIPBOARD_SHORTHAND_LONGHANDS[declaration.property]
  if (!longhands) {
    return null
  }

  const expanded = longhands.reduce<ClipboardStyleDeclaration[]>((items, longhand) => {
    const resolved = computed.getPropertyValue(longhand).trim()
    if (!resolved || resolved === `none` || CLIPBOARD_UNRESOLVED_VALUE_PATTERN.test(resolved)) {
      return items
    }

    items.push({ property: longhand, value: resolved, important: declaration.important })
    return items
  }, [])

  return expanded.length ? expanded : null
}

/**
 * juice 关闭了 CSS 变量解析，内联后的 style 里会留下 `var()` / `color-mix()` 字面量，
 * 而定义变量的规则又被公众号剥离，这些声明会整条失效。
 * 这里逐条用预览区的计算样式回填真实值，并把逻辑属性降级成公众号认识的物理属性。
 */
// 微信不支持 background-clip:text，渐变文字（aurora / summer 的 h1）粘贴后
// 只剩 color:transparent，整行标题直接消失。复制前压成纯色：取渐变里的第一个
// 色标当字色，取不到就退回主题主色。预览里的渐变不受影响。
function flattenClipboardGradientText(root: HTMLElement, primaryColor: string) {
  const targets = root.querySelectorAll<HTMLElement>(`[style*="background-clip"], [style*="text-fill-color"]`)

  Array.from(targets).forEach((element) => {
    const styleText = element.getAttribute(`style`) || ``
    const clipsToText = /background-clip\s*:\s*text/i.test(styleText)
    const transparentFill = /text-fill-color\s*:\s*transparent/i.test(styleText)
    if (!clipsToText && !transparentFill) {
      return
    }

    const swatch = window.getComputedStyle(element).backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i)?.[0]
    const isTransparent = swatch ? /rgba\([^)]*,\s*0(\.0+)?\s*\)/i.test(swatch) : true
    const color = swatch && !isTransparent ? swatch : primaryColor

    element.style.removeProperty(`background`)
    element.style.removeProperty(`background-image`)
    element.style.removeProperty(`background-clip`)
    element.style.removeProperty(`-webkit-background-clip`)
    element.style.setProperty(`-webkit-text-fill-color`, color)
    element.style.setProperty(`color`, color)
  })
}

// 渐变背景配浅色字（tech、sunrise 的 h1 都是白字压渐变）时 background-color 往往是透明的，
// 万一公众号没吃下 background-image 就会变成白字白底。这里挑一个跟字色对比度最高的色标
// 补进 background-color 当兜底；浏览器里渐变仍然盖在上面，观感不变。
function backfillClipboardGradientBackgrounds(root: HTMLElement) {
  const targets = root.querySelectorAll<HTMLElement>(`[style*="gradient("]`)

  Array.from(targets).forEach((element) => {
    if (!element.style.backgroundImage.includes(`gradient(`)) {
      return
    }

    const current = element.style.backgroundColor
    const isBlank = !current || /^transparent$/i.test(current) || /rgba\([^)]*,\s*0(\.0+)?\s*\)/i.test(current)
    if (!isBlank) {
      return
    }

    const stops = (element.style.backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/gi) || [])
      .filter(token => !/rgba\([^)]*,\s*0(\.0+)?\s*\)/i.test(token))
    if (!stops.length) {
      return
    }

    const ink = readClipboardColorChannels(window.getComputedStyle(element).color)
    const best = ink
      ? stops.reduce((winner, stop) => {
          const candidate = readClipboardColorChannels(stop)
          if (!candidate) {
            return winner
          }
          const winnerChannels = readClipboardColorChannels(winner)
          if (!winnerChannels) {
            return stop
          }
          return clipboardContrastRatio(ink, candidate) > clipboardContrastRatio(ink, winnerChannels) ? stop : winner
        }, stops[0])
      : stops[0]

    element.style.setProperty(`background-color`, best)
  })
}

// 主题写在 #output 上的底色和字色，复制时会被改写成 body 规则，而剪贴板片段里没有
// body，这层皮肤就整个丢了。深色主题因此会变成浅色字压公众号的白底，正文直接看不见。
// 这里在确认「字色在白底上读不清」时，量出主题皮肤，稍后包一层 section 带过去。
function readClipboardRootSkin(root: HTMLElement) {
  const computed = window.getComputedStyle(root)
  const ink = readClipboardColorChannels(computed.color)
  const paper = readClipboardColorChannels(computed.backgroundColor)
  const paperAlpha = Number((computed.backgroundColor.match(/[\d.]+/g) || [])[3] ?? `1`)

  if (!ink || !paper || paperAlpha < 0.5) {
    return null
  }
  // 字色本来就能在白底上看清，就不用多包一层
  if (clipboardContrastRatio(ink, [255, 255, 255]) >= 4.5) {
    return null
  }

  return { background: computed.backgroundColor, color: computed.color }
}

function normalizeClipboardInlineStyles(root: HTMLElement) {
  Array.from(root.querySelectorAll<HTMLElement>(`[style]`)).forEach((element) => {
    const styleText = element.getAttribute(`style`) || ``
    const declarations = parseClipboardStyleDeclarations(styleText)
    if (!declarations.length) {
      return
    }

    const needsNormalize = declarations.some(({ property, value }) => (
      property.startsWith(`--`)
      || CLIPBOARD_DROPPED_PROPERTIES.has(property)
      || property in CLIPBOARD_LOGICAL_AXIS_PROPERTIES
      || property in CLIPBOARD_LOGICAL_SIDE_PROPERTIES
      || property === `inset`
      || value.includes(`color(`)
      || CLIPBOARD_UNRESOLVED_VALUE_PATTERN.test(value)
    ))

    if (!needsNormalize) {
      return
    }

    const computed = window.getComputedStyle(element)
    const normalized: ClipboardStyleDeclaration[] = []

    declarations.forEach((declaration) => {
      if (declaration.property.startsWith(`--`) || CLIPBOARD_DROPPED_PROPERTIES.has(declaration.property)) {
        return
      }

      const expanded = expandClipboardLogicalDeclaration(declaration, computed) || [declaration]

      expanded.forEach((item) => {
        const mustExpand = CLIPBOARD_ALWAYS_EXPANDED_SHORTHANDS.has(item.property)

        if (!mustExpand && !CLIPBOARD_UNRESOLVED_VALUE_PATTERN.test(item.value)) {
          normalized.push({ ...item, value: toClipboardLegacyColor(item.value) })
          return
        }

        const resolved = mustExpand ? `` : computed.getPropertyValue(item.property).trim()
        if (resolved && !CLIPBOARD_UNRESOLVED_VALUE_PATTERN.test(resolved)) {
          normalized.push({ ...item, value: toClipboardLegacyColor(resolved) })
          return
        }

        const longhands = expandClipboardShorthand(item, computed)
        longhands?.forEach((longhand) => {
          normalized.push({ ...longhand, value: toClipboardLegacyColor(longhand.value) })
        })
      })
    })

    if (!normalized.length) {
      element.removeAttribute(`style`)
      return
    }

    element.setAttribute(`style`, stringifyClipboardStyleDeclarations(dedupeClipboardStyleDeclarations(normalized)))
  })
}

export async function processClipboardContent(primaryColor: string) {
  const clipboardDiv = document.getElementById(`output`)!
  const codeBlockSnapshots = snapshotCodeBlockStyles(clipboardDiv)
  const imageMetrics = captureClipboardImageMetrics(clipboardDiv)

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
  convertBlocksForWeChat(clipboardDiv)
  removeSourcePositionAttributes(clipboardDiv)
  prunePreviewOnlyClipboardStyles(clipboardDiv)

  const rootSkin = withLightAppearance(() => {
    convertMarkdownFiguresForWeChat(clipboardDiv, imageMetrics)
    flattenClipboardGradientText(clipboardDiv, primaryColor)
    normalizeClipboardInlineStyles(clipboardDiv)
    // 必须排在归一化之后：归一化会把 background 简写按计算值展开成
    // background-color + background-image，那一步会把提前写好的兜底色冲掉。
    backfillClipboardGradientBackgrounds(clipboardDiv)
    return readClipboardRootSkin(clipboardDiv)
  })

  // 如果已经配置公众号图床，则把复制内容里的图片先转成公众号可接受的图片地址
  await uploadClipboardImagesToMp(clipboardDiv)

  // 处理图片大小
  solveWeChatImage()
  applyCodeBlockSnapshots(clipboardDiv, codeBlockSnapshots)

  // 深色主题把底色和字色包成一层带过去，否则粘到公众号白底上正文会隐形
  if (rootSkin) {
    const skin = document.createElement(`section`)
    skin.setAttribute(`style`, `background-color:${rootSkin.background}; color:${rootSkin.color}; padding:20px 16px; box-sizing:border-box;`)
    while (clipboardDiv.firstChild) {
      skin.appendChild(clipboardDiv.firstChild)
    }
    clipboardDiv.appendChild(skin)
  }

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
  clipboardDiv.querySelectorAll(`.infographic-diagram`).forEach((diagram) => {
    diagram.querySelectorAll(`text`).forEach((textElem) => {
      // 如果有 dominant-baseline 属性，替换为 dy
      const dominantBaseline = textElem.getAttribute(`dominant-baseline`)
      const variantMap = {
        'alphabetic': ``,
        'central': `0.35em`,
        'middle': `0.35em`,
        'hanging': `-0.55em`,
        'ideographic': `0.18em`,
        'text-before-edge': `-0.85em`,
        'text-after-edge': `0.15em`,
      }
      if (dominantBaseline) {
        textElem.removeAttribute(`dominant-baseline`)
        const dy = variantMap[dominantBaseline as keyof typeof variantMap]
        if (dy) {
          textElem.setAttribute(`dy`, dy)
        }
      }
    })
  })
}
