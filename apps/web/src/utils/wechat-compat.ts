const VISUAL_DECORATION_STYLE = /(?:^|;)\s*(?:background(?:-color|-image)?|border(?:-[a-z-]+)?|box-shadow)\s*:/i
const VISUAL_DECORATION_GEOMETRY = /(?:^|;)\s*(?:width|height|min-width|min-height|border(?:-[a-z-]+)?)\s*:/i

function isHiddenDecoration(element: HTMLElement) {
  return element.hidden || element.style.display === `none`
}

function isEmptyVisualDecoration(element: HTMLElement) {
  if (element.childNodes.length || element.textContent !== `` || isHiddenDecoration(element)) {
    return false
  }

  const style = element.getAttribute(`style`) || ``
  return VISUAL_DECORATION_STYLE.test(style) && VISUAL_DECORATION_GEOMETRY.test(style)
}

/**
 * 把伪元素和空装饰块物化成公众号清洗后仍能存活的真实 DOM。
 *
 * `juice` 会把 `::before/::after` 转成空 span，板块模板也会用空 span/section
 * 画线、点和色块。粘贴清洗会删除这些无内容节点，所以补一个零字号的
 * 不换行空格。标记属性供 text/plain 生成时排除，避免装饰污染文章语义。
 */
export function materializeWeChatDecorations(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(`span, section`).forEach((element) => {
    if (!isEmptyVisualDecoration(element)) {
      return
    }

    if (element.style.position === `absolute` || element.style.position === `fixed`) {
      element.style.removeProperty(`position`)
      element.style.removeProperty(`top`)
      element.style.removeProperty(`right`)
      element.style.removeProperty(`bottom`)
      element.style.removeProperty(`left`)
      element.style.setProperty(`display`, `block`)
    }
    else if (element.tagName === `SPAN` && !element.style.display && (element.style.width || element.style.height)) {
      element.style.setProperty(`display`, `inline-block`)
    }

    element.dataset.mobiClipboardDecoration = `true`
    element.setAttribute(`aria-hidden`, `true`)
    element.style.setProperty(`font-size`, `0`)
    element.style.setProperty(`line-height`, `0`)
    element.style.setProperty(`box-sizing`, `border-box`)
    element.textContent = `\u00A0`
  })
}

const PLAIN_TEXT_BLOCKS = `address, article, aside, blockquote, div, footer, h1, h2, h3, h4, h5, h6, header, main, nav, p, pre, section`

function buildWeChatPlainText(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll(`[data-mobi-clipboard-decoration], style, script, noscript, [hidden]`).forEach(element => element.remove())
  clone.querySelectorAll<HTMLElement>(`[style*="display: none"], [style*="display:none"]`).forEach(element => element.remove())

  clone.querySelectorAll<HTMLImageElement>(`img`).forEach((image) => {
    const alt = image.getAttribute(`alt`)?.trim()
    image.replaceWith(document.createTextNode(alt ? `[图片：${alt}]` : `[图片]`))
  })
  clone.querySelectorAll<HTMLAnchorElement>(`a[href]`).forEach((link) => {
    const href = link.getAttribute(`href`)?.trim() || ``
    const label = link.textContent?.trim() || ``
    if (href && href !== label) {
      link.appendChild(document.createTextNode(` (${href})`))
    }
  })
  clone.querySelectorAll(`.listitem-marker`).forEach(marker => marker.remove())
  clone.querySelectorAll(`br`).forEach(br => br.replaceWith(document.createTextNode(`\n`)))
  clone.querySelectorAll(`li`).forEach((item) => {
    item.insertBefore(document.createTextNode(`- `), item.firstChild)
    item.appendChild(document.createTextNode(`\n`))
  })
  clone.querySelectorAll(PLAIN_TEXT_BLOCKS).forEach(element => element.appendChild(document.createTextNode(`\n`)))

  return (clone.textContent || ``)
    .replace(/\u00A0/gu, ` `)
    .split(`\n`)
    .map(line => line.replace(/[\t ]+/gu, ` `).trim())
    .join(`\n`)
    .replace(/\n{3,}/gu, `\n\n`)
    .trim()
}

export function buildWeChatClipboardPayload(root: HTMLElement) {
  return {
    html: root.innerHTML,
    plainText: buildWeChatPlainText(root),
  }
}

export function createWeChatClipboardBlobs(root: HTMLElement) {
  const payload = buildWeChatClipboardPayload(root)
  return {
    'text/html': new Blob([payload.html], { type: `text/html` }),
    'text/plain': new Blob([payload.plainText], { type: `text/plain` }),
  }
}
