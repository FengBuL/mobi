import { toPng } from 'html-to-image'
import {
  downloadFile,
  downloadMD,
  exportHTML,
  exportPDF,
  exportPureHTML,
  getHtmlContent,
  sanitizeTitle,
} from '@/utils'
import { usePostStore } from './post'
import { useRenderStore } from './render'
import { useUIStore } from './ui'

/**
 * 导出功能 Store
 * 负责处理各种导出功能：HTML、PDF、MD、图片等
 */
export const useExportStore = defineStore(`export`, () => {
  const postStore = usePostStore()
  const renderStore = useRenderStore()
  const uiStore = useUIStore()

  // 将编辑器内容转换为 HTML
  const editorContent2HTML = () => {
    const temp = getHtmlContent()
    document.querySelector(`#output`)!.innerHTML = renderStore.output
    return temp
  }

  const renderCardImageDataUrl = async () => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return null

    const el = document.querySelector<HTMLElement>(`#output-wrapper>.preview`)
    if (!el)
      return null

    // 导出图片前临时关闭代码块横向滚动，避免长代码被截断。
    const style = document.createElement('style')
    style.textContent = `
      .preview pre.code__pre,
      .preview .hljs.code__pre,
      .preview pre.code__pre > code,
      .preview .hljs.code__pre > code,
      .preview .code-scroll,
      .preview pre section,
      .preview code section {
        overflow: visible !important;
      }
      .preview pre.code__pre > code,
      .preview .code-scroll,
      .preview .code-scroll > div {
        white-space: pre-wrap !important;
        word-break: break-all !important;
        min-width: auto !important;
      }
    `
    document.head.appendChild(style)

    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      const dataUrl = await toPng(el, {
        backgroundColor: uiStore.isDark ? `` : `#fff`,
        skipFonts: true,
        pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
        style: { margin: `0` },
      })
      return {
        dataUrl,
        fileName: `${sanitizeTitle(currentPost.title)}.png`,
      }
    }
    finally {
      style.remove()
    }
  }

  // 导出编辑器内容为 HTML，并且下载到本地
  const exportEditorContent2HTML = async () => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return

    await exportHTML(currentPost.title)
    document.querySelector(`#output`)!.innerHTML = renderStore.output
  }

  // 导出编辑器内容为无样式 HTML
  const exportEditorContent2PureHTML = (content: string) => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return

    exportPureHTML(content, currentPost.title)
  }

  // 下载卡片图片
  const downloadAsCardImage = async () => {
    const result = await renderCardImageDataUrl()
    if (!result)
      return

    downloadFile(result.dataUrl, result.fileName, `image/png`)
  }

  // 导出编辑器内容为 PDF
  const exportEditorContent2PDF = async () => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return

    await exportPDF(currentPost.title)
    document.querySelector(`#output`)!.innerHTML = renderStore.output
  }

  // 导出编辑器内容到本地（Markdown）
  const exportEditorContent2MD = (content: string) => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return

    downloadMD(content, currentPost.title)
  }

  return {
    editorContent2HTML,
    exportEditorContent2HTML,
    exportEditorContent2PureHTML,
    renderCardImageDataUrl,
    downloadAsCardImage,
    exportEditorContent2PDF,
    exportEditorContent2MD,
  }
})
