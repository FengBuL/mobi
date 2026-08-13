import type { IOpts, RendererAPI } from '@mobi/shared/types'
import type { ReadTimeResults } from '@mobi/shared/utils/readingTime'
import type { RendererObject, Tokens } from 'marked'
import readingTime from '@mobi/shared/utils/readingTime'
import frontMatter from 'front-matter'
import hljs from 'highlight.js/lib/core'
import { marked } from 'marked'
import {
  markedAlert,
  markedFootnotes,
  markedInfographic,
  markedMarkup,
  markedMermaid,
  markedPlantUML,
  markedRuby,
  markedSlider,
  markedToc,
  MDKatex,
} from '../extensions'
import { COMMON_LANGUAGES, highlightAndFormatCode } from '../utils/languages'

Object.entries(COMMON_LANGUAGES).forEach(([name, lang]) => {
  hljs.registerLanguage(name, lang)
})

export { hljs }

marked.setOptions({
  breaks: true,
})
marked.use(markedSlider())

const AMPERSAND_REGEX = /&/g
const LESS_THAN_REGEX = /</g
const GREATER_THAN_REGEX = />/g
const DOUBLE_QUOTE_REGEX = /"/g
const SINGLE_QUOTE_REGEX = /'/g
const BACKTICK_REGEX = /`/g
const UNDERSCORE_REGEX = /_/g
const HEADING_TAG_REGEX = /^h\d$/
const PARAGRAPH_WRAPPER_REGEX = /^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/
const MP_WEIXIN_LINK_REGEX = /^https?:\/\/mp\.weixin\.qq\.com/

function escapeHtml(text: string): string {
  return text
    .replace(AMPERSAND_REGEX, `&amp;`) // 转义 &
    .replace(LESS_THAN_REGEX, `&lt;`) // 转义 <
    .replace(GREATER_THAN_REGEX, `&gt;`) // 转义 >
    .replace(DOUBLE_QUOTE_REGEX, `&quot;`) // 转义 "
    .replace(SINGLE_QUOTE_REGEX, `&#39;`) // 转义 '
    .replace(BACKTICK_REGEX, `&#96;`) // 转义 `
}

function buildAddition(): string {
  return `
    <style>
      .preview-wrapper pre::before {
        position: absolute;
        top: 0;
        right: 0;
        color: #ccc;
        text-align: center;
        font-size: 0.8em;
        padding: 5px 10px 0;
        line-height: 15px;
        height: 15px;
        font-weight: 600;
      }
    </style>
  `
}

function buildFootnoteArray(footnotes: [number, string, string][]): string {
  return footnotes
    .map(([index, title, link]) =>
      link === title
        ? `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code>: <i style="word-break: break-all">${title}</i><br/>`
        : `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code> ${title}: <i style="word-break: break-all">${link}</i><br/>`,
    )
    .join(`\n`)
}

function extractFileName(href: string): string {
  try {
    // 移除查询参数和哈希
    const urlPath = href.split(`?`)[0].split(`#`)[0]
    // 获取最后一个 / 之后的部分
    const fileName = urlPath.split(`/`).pop() || ``
    // 移除文件扩展名
    const nameWithoutExt = fileName.replace(/\.[^.]*$/, ``)
    return nameWithoutExt
  }
  catch {
    return ``
  }
}

function transform(legend: string, text: string | null, title: string | null, href: string = ``): string {
  const options = legend.split(`-`)
  for (const option of options) {
    if (option === `alt` && text) {
      return text
    }
    if (option === `title` && title) {
      return title
    }
    if (option === `filename` && href) {
      const fileName = extractFileName(href)
      if (fileName) {
        return escapeHtml(fileName)
      }
    }
  }
  return ``
}

/**
 * 代码块顶栏。以前放的是三个 macOS 窗口圆点，纯装饰，读者看不出任何信息。
 * 换成语言名：占同样的位置，但能告诉读者这段是什么语言。
 *
 * 颜色用 inherit：25 套主题的代码块底色差得很远（有纯黑也有浅米），
 * 而 hljs 主题一定会给 pre 设一个在自己底色上可读的前景色，跟着它走就不会踩到看不清的组合。
 */
const UNLABELED_LANGUAGES = new Set([`plaintext`, `text`, `txt`, `plain`])

function codeBlockHeader(langText: string, language: { name?: string } | undefined): string {
  // 判空要看围栏上写的原文，不能看解析后的显示名：
  // hljs 把 plaintext 的 name 定义成 "Plain text"，拿它去比对会漏掉
  if (!langText || UNLABELED_LANGUAGES.has(langText.toLowerCase())) {
    return ``
  }

  const label = language?.name || langText

  const style = `padding: 10px 14px 0; font-size: 12px; letter-spacing: 0.08em; color: inherit; opacity: 0.5;`
  return `<span class="mac-sign" style="${style}">${escapeHtml(label)}</span>`
}

interface ParseResult {
  yamlData: Record<string, any>
  markdownContent: string
  readingTime: ReadTimeResults
}

function parseFrontMatterAndContent(markdownText: string): ParseResult {
  try {
    const parsed = frontMatter(markdownText)
    const yamlData = parsed.attributes
    const markdownContent = parsed.body

    const readingTimeResult = readingTime(markdownContent)

    return {
      yamlData: yamlData as Record<string, any>,
      markdownContent,
      readingTime: readingTimeResult,
    }
  }
  catch (error) {
    console.error(`Error parsing front-matter:`, error)
    return {
      yamlData: {},
      markdownContent: markdownText,
      readingTime: readingTime(markdownText),
    }
  }
}

export function initRenderer(opts: IOpts = {}): RendererAPI {
  const footnotes: [number, string, string][] = []
  let footnoteIndex: number = 0
  const listOrderedStack: boolean[] = []
  const listCounters: number[] = []
  const sourceOrdinals = new Map<string, number>()
  let sourceBlockDepth = 0

  function getOpts(): IOpts {
    return opts
  }

  /**
   * 生成带 CSS 类的内容（新主题系统）
   * @param styleLabel CSS 类名标识
   * @param content 内容
   * @param tagName HTML 标签名（可选）
   */
  function styledContent(styleLabel: string, content: string, tagName?: string, attrs = ``): string {
    const tag = tagName ?? styleLabel
    const className = `${styleLabel.replace(UNDERSCORE_REGEX, `-`)}`
    const headingAttr = HEADING_TAG_REGEX.test(tag) ? ` data-heading="true"` : ``
    return `<${tag} class="${className}"${headingAttr}${attrs}>${content}</${tag}>`
  }

  function buildSourceAttrs(kind: string) {
    if (sourceBlockDepth > 0) {
      return ``
    }
    const ordinal = (sourceOrdinals.get(kind) ?? 0) + 1
    sourceOrdinals.set(kind, ordinal)
    return ` data-src-kind="${kind}" data-src-ordinal="${ordinal}"`
  }

  function addFootnote(title: string, link: string): number {
    // 检查是否已经存在相同的链接
    const existingFootnote = footnotes.find(([, , existingLink]) => existingLink === link)
    if (existingFootnote) {
      return existingFootnote[0] // 返回已存在的脚注索引
    }

    // 如果不存在，创建新的脚注
    footnotes.push([++footnoteIndex, title, link])
    return footnoteIndex
  }

  function reset(newOpts: Partial<IOpts>): void {
    footnotes.length = 0
    footnoteIndex = 0
    sourceOrdinals.clear()
    sourceBlockDepth = 0
    setOptions(newOpts)
  }

  function setOptions(newOpts: Partial<IOpts>): void {
    opts = { ...opts, ...newOpts }
    marked.use(markedInfographic({ themeMode: newOpts.themeMode }))
  }

  function buildReadingTime(readingTime: ReadTimeResults): string {
    if (!opts.countStatus) {
      return ``
    }
    if (!readingTime.words) {
      return ``
    }
    return `
      <blockquote class="md-blockquote">
        <p class="md-blockquote-p">字数 ${readingTime?.words}，阅读大约需 ${Math.ceil(readingTime?.minutes)} 分钟</p>
      </blockquote>
    `
  }

  const buildFootnotes = () => {
    if (!footnotes.length) {
      return ``
    }

    return (
      styledContent(`h4`, `引用链接`)
      + styledContent(`footnotes`, buildFootnoteArray(footnotes), `p`)
    )
  }

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens)
      const tag = `h${depth}`
      return styledContent(tag, text, undefined, buildSourceAttrs(`heading-${depth}`))
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      const text = this.parser.parseInline(tokens)
      const isFigureImage = text.includes(`<figure`) && text.includes(`<img`)
      const isEmpty = text.trim() === ``
      if (isFigureImage || isEmpty) {
        return text
      }
      return styledContent(`p`, text)
    },

    blockquote({ tokens }: Tokens.Blockquote): string {
      const attrs = buildSourceAttrs(`quote`)
      sourceBlockDepth += 1
      try {
        const text = this.parser.parse(tokens)
        return styledContent(`blockquote`, text, undefined, attrs)
      }
      finally {
        sourceBlockDepth -= 1
      }
    },

    code({ text, lang = `` }: Tokens.Code): string {
      const langText = lang.split(` `)[0]
      const isLanguageRegistered = hljs.getLanguage(langText)
      const language = isLanguageRegistered ? langText : `plaintext`

      const highlighted = highlightAndFormatCode(text, language, hljs, !!opts.isShowLineNumber)

      const span = codeBlockHeader(langText, isLanguageRegistered || undefined)
      // 如果语言未注册，添加 data-language-pending 属性和原始代码文本用于后续动态加载
      let pendingAttr = ``
      if (!isLanguageRegistered && langText !== `plaintext`) {
        const escapedText = text.replace(DOUBLE_QUOTE_REGEX, `&quot;`)
        pendingAttr = ` data-language-pending="${langText}" data-raw-code="${escapedText}" data-show-line-number="${opts.isShowLineNumber}"`
      }
      const code = `<code class="language-${lang}"${pendingAttr}>${highlighted}</code>`

      return `<pre class="hljs code__pre">${span}${code}</pre>`
    },

    codespan({ text }: Tokens.Codespan): string {
      const escapedText = escapeHtml(text)
      return styledContent(`codespan`, escapedText, `code`)
    },

    list({ ordered, items, start = 1 }: Tokens.List) {
      const attrs = buildSourceAttrs(ordered ? `list-ol` : `list-ul`)
      sourceBlockDepth += 1
      listOrderedStack.push(ordered)
      listCounters.push(Number(start))

      try {
        const html = items
          .map(item => this.listitem(item))
          .join(``)

        return styledContent(
          ordered ? `ol` : `ul`,
          html,
          undefined,
          attrs,
        )
      }
      finally {
        listOrderedStack.pop()
        listCounters.pop()
        sourceBlockDepth -= 1
      }
    },

    // 2. listitem：从栈顶取 ordered + counter，计算 prefix 并自增
    listitem(token: Tokens.ListItem) {
      const ordered = listOrderedStack[listOrderedStack.length - 1]
      const idx = listCounters[listCounters.length - 1]!

      // 准备下一个
      listCounters[listCounters.length - 1] = idx + 1

      const prefix = ordered
        ? `${idx}. `
        : `• `

      // 渲染内容：优先 inline，fallback 去掉 <p> 包裹
      let content: string
      try {
        content = this.parser.parseInline(token.tokens)
      }
      catch {
        content = this.parser
          .parse(token.tokens)
          .replace(PARAGRAPH_WRAPPER_REGEX, `$1`)
      }

      // 序号 / 圆点包一层 span：实测 li::marker 的样式进不了剪贴板（juice 的
      // inlinePseudoElements 只处理 ::before/::after），而 <ul> 的原生 marker 又会
      // 和这里的字面前缀在公众号里叠成两个点。写成真实节点后主题才能给它上色。
      return styledContent(
        `listitem`,
        `<span class="listitem-marker">${prefix}</span>${content}`,
        `li`,
      )
    },

    image({ href, title, text }: Tokens.Image): string {
      const newText = opts.legend ? transform(opts.legend, text, title, href) : ``
      const subText = newText ? styledContent(`figcaption`, newText) : ``
      const titleAttr = title ? ` title="${title}"` : ``
      return `<figure><img src="${href}"${titleAttr} alt="${text}"/>${subText}</figure>`
    },

    link({ href, title, text, tokens }: Tokens.Link): string {
      const parsedText = this.parser.parseInline(tokens)
      if (MP_WEIXIN_LINK_REGEX.test(href)) {
        return `<a href="${href}" title="${title || text}">${parsedText}</a>`
      }
      if (href === text) {
        return parsedText
      }
      if (opts.citeStatus) {
        const ref = addFootnote(title || text, href)
        return `<a href="${href}" title="${title || text}">${parsedText}<sup>[${ref}]</sup></a>`
      }
      return `<a href="${href}" title="${title || text}">${parsedText}</a>`
    },

    strong({ tokens }: Tokens.Strong): string {
      return styledContent(`strong`, this.parser.parseInline(tokens))
    },

    em({ tokens }: Tokens.Em): string {
      return styledContent(`em`, this.parser.parseInline(tokens))
    },

    table({ header, rows }: Tokens.Table): string {
      const headerRow = header
        .map((cell) => {
          const text = this.parser.parseInline(cell.tokens)
          return styledContent(`th`, text)
        })
        .join(``)
      const body = rows
        .map((row) => {
          const rowContent = row
            .map(cell => this.tablecell(cell))
            .join(``)
          return styledContent(`tr`, rowContent)
        })
        .join(``)
      return `
        <section style="max-width: 100%; overflow: auto">
          <table class="preview-table">
            <thead>${headerRow}</thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `
    },

    tablecell(token: Tokens.TableCell): string {
      const text = this.parser.parseInline(token.tokens)
      return styledContent(`td`, text)
    },

    hr(token: Tokens.Hr): string {
      const raw = token.raw.trim()
      let variant = `dash`
      if (raw.includes(`*`)) {
        variant = `star`
      }
      else if (raw.includes(`_`)) {
        variant = `underscore`
      }
      return `<hr class="hr hr-${variant}"${buildSourceAttrs(`divider`)}>`
    },
  }

  marked.use({ renderer })
  // 新主题系统：扩展不再需要 styles 参数
  marked.use(markedMarkup())
  marked.use(markedToc())
  marked.use(markedSlider())
  marked.use(markedAlert({}))
  marked.use(MDKatex({ nonStandard: true }, true))
  marked.use(markedFootnotes())
  marked.use(markedMermaid())
  marked.use(markedPlantUML({
    inlineSvg: true, // 启用SVG内嵌，适用于微信公众号
  }))
  marked.use(markedInfographic({ themeMode: opts.themeMode }))
  marked.use(markedRuby())

  return {
    buildAddition,
    buildFootnotes,
    setOptions,
    reset,
    parseFrontMatterAndContent,
    buildReadingTime,
    createContainer(content: string) {
      return styledContent(`container`, content, `section`)
    },
    getOpts,
  }
}
