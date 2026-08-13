<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'

import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { highlightPendingBlocks, hljs } from '@md/core'
import { markdownSetup, theme } from '@md/shared/editor'
import imageCompression from 'browser-image-compression'
import { X } from 'lucide-vue-next'
import FolderSourcePanel from '@/components/editor/FolderSourcePanel.vue'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { SearchTab } from '@/components/ui/search-tab'
import { useImageUploader } from '@/composables/useImageUploader'
import { useBlockSelectionStore } from '@/stores/blockSelection'
import { useCssEditorStore } from '@/stores/cssEditor'
import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'
import { checkImage, toBase64 } from '@/utils'
import { blockCategories, parseBlockEntries } from '@/utils/blocks/registry'
import { resolveMarkdownSourceRange } from '@/utils/blocks/source-selection'
import { fileUpload } from '@/utils/file'
import { repairIndentedMediaLayoutBlocks } from '@/utils/image-layouts'
import { store } from '@/utils/storage'

const blockSelectionStore = useBlockSelectionStore()
const editorStore = useEditorStore()
const postStore = usePostStore()
const renderStore = useRenderStore()
const themeStore = useThemeStore()
const uiStore = useUIStore()
const cssEditorStore = useCssEditorStore()
const { selection: blockSelection } = storeToRefs(blockSelectionStore)
const { upload } = useImageUploader()

const { editor } = storeToRefs(editorStore)
const { output, readingTime } = storeToRefs(renderStore)
const { isDark } = storeToRefs(uiStore)
const { posts, currentPostIndex, currentPost } = storeToRefs(postStore)
const {
  isMobile,
  isOpenPostSlider,
  isOpenFolderPanel,
  isOpenRightSlider,
  isOpenBlockWorkspace,
  isOpenConfirmDialog,
  isSimpleWorkspace,
  enableImageReupload,
  viewMode,
  previewDevice,
} = storeToRefs(uiStore)

const { toggleShowUploadImgDialog } = uiStore

// Editor refresh function
function editorRefresh() {
  themeStore.updateCodeTheme()

  const raw = editorStore.getContent()
  renderStore.render(renderStore.resolvePreviewContent(raw))
}

// Reset style function
function resetStyle() {
  themeStore.resetStyle()
  cssEditorStore.resetCssConfig()
  // 使用新主题系统
  themeStore.applyCurrentTheme()
  editorRefresh()
  toast.success(`样式已重置`)
}

watch(output, () => {
  nextTick(() => {
    const outputElement = document.getElementById(`output`)
    if (outputElement) {
      highlightPendingBlocks(hljs, outputElement)
      applyBlockSelectionHighlight()
    }
  })
})

watch(blockSelection, () => {
  nextTick(applyBlockSelectionHighlight)
})

const backLight = ref(false)
const isCoping = ref(false)

function startCopy() {
  backLight.value = true
  isCoping.value = true
}

// 拷贝结束
function endCopy() {
  backLight.value = false
  setTimeout(() => {
    isCoping.value = false
  }, 800)
}

// 简洁模式把这些面板交给抽屉，只有专业模式才让它们占一栏
const showPostRail = computed(() => !isSimpleWorkspace.value && isOpenPostSlider.value)
const showFolderRail = computed(() => !isSimpleWorkspace.value && isOpenFolderPanel.value)
const showBlockRail = computed(() => !isSimpleWorkspace.value && isOpenBlockWorkspace.value)
const showCssRail = computed(() => !isSimpleWorkspace.value && uiStore.isShowCssEditor)
const showStyleRail = computed(() => !isSimpleWorkspace.value && isOpenRightSlider.value)

// 是否有侧面板挤占编辑器与预览
const hasSidePanel = computed(() => showBlockRail.value || showCssRail.value || showStyleRail.value)

// 三条侧栏全开也要给编辑器和预览留够 34%，否则它们会被压到 min-size 以下
const blockPanelDefaultSize = computed(() => (showBlockRail.value ? 22 : 0))
const cssPanelDefaultSize = computed(() => (showCssRail.value ? 20 : 0))
const rightPanelDefaultSize = computed(() => (showStyleRail.value ? 24 : 0))
const mainAreaDefaultSize = computed(() => (
  100 - blockPanelDefaultSize.value - cssPanelDefaultSize.value - rightPanelDefaultSize.value
))
const editorPreviewDefaultSizes = computed(() => {
  const mainAreaSize = mainAreaDefaultSize.value

  if (viewMode.value === `preview`) {
    return { editor: 0, preview: mainAreaSize }
  }

  if (viewMode.value === `edit`) {
    return { editor: mainAreaSize, preview: 0 }
  }

  const sharedSize = mainAreaSize / 2
  return { editor: sharedSize, preview: sharedSize }
})

// 编辑器面板尺寸配置
const editorPanelConfig = computed(() => {
  const mode = viewMode.value
  if (mode === `preview`) {
    return { min: 0, max: 0 }
  }
  if (mode === `edit`) {
    return hasSidePanel.value ? { min: 30, max: 85 } : { min: 100, max: 100 }
  }
  // split
  if (isMobile.value)
    return { min: 30, max: 70 }
  return { min: 15, max: 85 }
})

// 预览面板尺寸配置
const previewPanelConfig = computed(() => {
  const mode = viewMode.value
  if (mode === `edit`) {
    return { min: 0, max: 0 }
  }
  if (mode === `preview`) {
    return hasSidePanel.value ? { min: 20, max: 75 } : { min: 100, max: 100 }
  }
  // split
  if (isMobile.value)
    return { min: 30, max: 70 }
  return { min: 15, max: 85 }
})

// 编辑器/预览面板引用（用于 collapse/expand）
const editorPanelRef = ref<InstanceType<typeof ResizablePanel> | null>(null)
const previewPanelRef = ref<InstanceType<typeof ResizablePanel> | null>(null)

function syncEditorPreviewPanelLayout() {
  nextTick(() => {
    editorPanelRef.value?.resize(editorPreviewDefaultSizes.value.editor)
    previewPanelRef.value?.resize(editorPreviewDefaultSizes.value.preview)
  })
}

watch([viewMode, mainAreaDefaultSize], syncEditorPreviewPanelLayout)

// 预览区域宽度样式（受设备切换影响）
const effectivePreviewWidth = computed(() => {
  if (isMobile.value)
    return `w-full`
  return previewDevice.value === `mobile` ? `w-[375px]` : `w-full`
})

function formatRelativeTime(date?: Date | string | null) {
  if (!date)
    return `刚刚`

  const now = Date.now()
  const target = new Date(date).getTime()
  const diff = Math.max(0, now - target)
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1)
    return `刚刚`
  if (minutes < 60)
    return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  if (days < 30)
    return `${days} 天前`

  return new Date(date).toLocaleDateString(`zh-CN`)
}

const currentPostTitle = computed(() => currentPost.value?.title?.trim() || `未命名内容`)
const currentPostUpdateLabel = computed(() => formatRelativeTime(currentPost.value?.updateDatetime))
const editorLineCount = computed(() => {
  return Math.max(1, currentPost.value?.content?.split(/\r?\n/).length || 1)
})
const editorCharCount = computed(() => currentPost.value?.content?.length || 0)
const viewModeLabel = computed(() => {
  if (viewMode.value === `split`)
    return `双栏对照`
  if (viewMode.value === `edit`)
    return `专注编辑`
  return `专注预览`
})
const previewDeviceLabel = computed(() => {
  if (isMobile.value)
    return `自适应预览`
  return previewDevice.value === `mobile` ? `移动端画板` : `桌面端画板`
})
const readingTimeLabel = computed(() => {
  return readingTime.value.minutes > 0 ? `${readingTime.value.minutes} 分钟阅读` : `少于 1 分钟`
})

const previewRef = useTemplateRef<HTMLDivElement>(`previewRef`)
const mainSectionRef = useTemplateRef<HTMLDivElement>(`mainSectionRef`)

const codeMirrorView = ref<EditorView | null>(null)
const themeCompartment = new Compartment()
const cursorSyncTimer = ref<NodeJS.Timeout>()
const skipCursorDrivenPreviewSync = ref(false)

function getCurrentEditorContent() {
  return currentPost.value?.content ?? posts.value[currentPostIndex.value]?.content ?? ``
}

function normalizeCurrentPostMediaLayouts(post = currentPost.value) {
  if (!post) {
    return null
  }

  const repairedContent = repairIndentedMediaLayoutBlocks(post.content)
  if (repairedContent === post.content) {
    return repairedContent
  }

  postStore.updatePostContent(post.id, repairedContent)
  return repairedContent
}

function syncEditorDocument(force = false) {
  const view = codeMirrorView.value
  if (!view)
    return

  const nextContent = normalizeCurrentPostMediaLayouts() ?? getCurrentEditorContent()
  const currentContent = view.state.doc.toString()

  if (!force && currentContent === nextContent) {
    return
  }

  view.dispatch({
    changes: {
      from: 0,
      to: currentContent.length,
      insert: nextContent,
    },
  })
}

function ensureEditorPaint() {
  const view = codeMirrorView.value
  if (!view)
    return

  const selection = view.state.selection.main
  const repaint = () => {
    const activeView = codeMirrorView.value
    if (!activeView)
      return

    activeView.requestMeasure()
    activeView.dispatch({
      selection: {
        anchor: selection.anchor,
        head: selection.head,
      },
      effects: EditorView.scrollIntoView(selection.head, { y: `nearest` }),
    })
  }

  requestAnimationFrame(repaint)
  requestAnimationFrame(() => requestAnimationFrame(repaint))
  setTimeout(repaint, 120)
  setTimeout(repaint, 320)
}

function normalizeText(text: string) {
  return text
    .replace(/\s+/g, ` `)
    .trim()
}

function parseMarkdownHeadingLine(line: string): { level: number, title: string } | null {
  if (!line.startsWith(`#`)) {
    return null
  }

  let level = 0
  while (level < line.length && line[level] === `#` && level < 6) {
    level++
  }

  if (level === 0 || line[level] !== ` `) {
    return null
  }

  const title = normalizeText(line.slice(level + 1).replace(/#+\s*$/, ``))
  if (!title) {
    return null
  }

  return { level, title }
}

function scrollPreviewToElement(el: HTMLElement, behavior: ScrollBehavior = `auto`) {
  const container = previewRef.value
  if (!container)
    return

  const cRect = container.getBoundingClientRect()
  const eRect = el.getBoundingClientRect()
  const inView = eRect.top >= cRect.top + 32 && eRect.bottom <= cRect.bottom - 32

  if (inView) {
    return
  }

  // 只滚预览这一个容器。scrollIntoView 会把每一层可滚动祖先都滚一遍，
  // 外面的工作区容器是 overflow 隐藏的，被滚上去之后没有滚动条能让用户拉回来
  const centered = eRect.top - cRect.top - (cRect.height - Math.min(eRect.height, cRect.height)) / 2
  container.scrollTo({ top: container.scrollTop + centered, behavior })
}

function findHeadingElementInPreview(title: string, level?: number) {
  const headings = document.querySelectorAll<HTMLElement>(`#output [data-heading]`)
  const normalizedTitle = normalizeText(title)

  for (const heading of headings) {
    if (level && Number(heading.tagName.slice(1)) !== level)
      continue
    if (normalizeText(heading.textContent || ``) === normalizedTitle) {
      return heading
    }
  }

  for (const heading of headings) {
    if (level && Number(heading.tagName.slice(1)) !== level)
      continue
    if (normalizeText(heading.textContent || ``).includes(normalizedTitle)) {
      return heading
    }
  }
}

function findHeadingPosInEditor(title: string, level?: number) {
  const view = codeMirrorView.value
  if (!view)
    return null

  const doc = view.state.doc
  const normalizedTitle = normalizeText(title)

  for (let lineNo = 1; lineNo <= doc.lines; lineNo++) {
    const line = doc.line(lineNo)
    const parsed = parseMarkdownHeadingLine(line.text)
    if (!parsed)
      continue

    if (level && parsed.level !== level)
      continue

    const headingTitle = parsed.title
    if (headingTitle === normalizedTitle || headingTitle.includes(normalizedTitle) || normalizedTitle.includes(headingTitle)) {
      return line.from
    }
  }

  return null
}

function findTextPosInEditor(text: string) {
  const view = codeMirrorView.value
  if (!view)
    return null

  const docText = view.state.doc.toString()
  const normalized = normalizeText(text)
  if (!normalized)
    return null

  const candidates = [
    normalized,
    normalized.slice(0, 80),
    normalized.slice(0, 40),
    normalized.slice(0, 20),
  ].filter(item => item.length >= 6)

  for (const candidate of candidates) {
    const pos = docText.indexOf(candidate)
    if (pos !== -1) {
      return pos
    }
  }

  return null
}

function focusEditorAtPos(pos: number) {
  const view = codeMirrorView.value
  if (!view)
    return

  skipCursorDrivenPreviewSync.value = true
  view.dispatch({
    selection: { anchor: pos },
    effects: EditorView.scrollIntoView(pos, { y: `center` }),
  })
  view.focus()

  setTimeout(() => {
    skipCursorDrivenPreviewSync.value = false
  }, 180)
}

function syncPreviewToEditorCursor() {
  if (skipCursorDrivenPreviewSync.value)
    return

  const view = codeMirrorView.value
  if (!view)
    return

  const cursorPos = view.state.selection.main.head
  const doc = view.state.doc
  const cursorLineNo = doc.lineAt(cursorPos).number

  // 优先按“最近标题”进行语义定位，避免图片/代码块造成的高度失真。
  for (let lineNo = cursorLineNo; lineNo >= 1; lineNo--) {
    const text = doc.line(lineNo).text
    const parsed = parseMarkdownHeadingLine(text)
    if (!parsed)
      continue

    const headingEl = findHeadingElementInPreview(parsed.title, parsed.level)
    if (headingEl) {
      scrollPreviewToElement(headingEl)
      return
    }
  }

  // 无可用语义锚点时，退化为轻量比例定位。
  const container = previewRef.value
  if (!container)
    return
  const maxScrollTop = container.scrollHeight - container.offsetHeight
  const ratio = doc.length > 0 ? cursorPos / doc.length : 0
  container.scrollTo({ top: Math.max(0, maxScrollTop * ratio), behavior: `auto` })
}

function scheduleSyncPreviewToEditorCursor() {
  clearTimeout(cursorSyncTimer.value)
  cursorSyncTimer.value = setTimeout(() => {
    syncPreviewToEditorCursor()
  }, 100)
}

function syncEditorToPreviewElement(el: HTMLElement) {
  const tag = el.tagName.toLowerCase()
  let pos: number | null = null

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1))
    const title = normalizeText(el.textContent || ``)
    pos = findHeadingPosInEditor(title, level)
  }
  else if (tag === `img`) {
    const img = el as HTMLImageElement
    const alt = normalizeText(img.alt || ``)
    pos = alt ? findTextPosInEditor(alt) : null
    if (pos == null && img.src) {
      pos = findTextPosInEditor(img.src)
    }
  }
  else {
    const text = normalizeText(el.textContent || ``)
    pos = findTextPosInEditor(text)
  }

  if (pos != null) {
    focusEditorAtPos(pos)
  }
}

function extractBlockText(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll(`br`).forEach(node => node.replaceWith(`\n`))
  return (clone.textContent || ``)
    .split(`\n`)
    .map(normalizeText)
    .filter(Boolean)
    .join(`\n`)
}

function createNativeBlockSelection(element: HTMLElement) {
  const sourceKind = element.dataset.srcKind
  const sourceOrdinal = Number(element.dataset.srcOrdinal)
  if (!sourceKind || !Number.isInteger(sourceOrdinal)) {
    return null
  }

  const categoryId = sourceKind.startsWith(`heading-`)
    ? `heading`
    : sourceKind === `quote`
      ? `quote`
      : sourceKind.startsWith(`list-`)
        ? `list`
        : sourceKind === `divider`
          ? `divider`
          : null
  const category = blockCategories.find(item => item.id === categoryId)
  const preset = category?.presets[0]
  if (!category || !preset) {
    return null
  }

  const content = editorStore.getContent()
  const range = resolveMarkdownSourceRange(content, sourceKind, sourceOrdinal)
  if (!range) {
    return null
  }

  const state = category.createDefaultState(preset)
  preset.fields.forEach((field) => {
    if (typeof state[field.key] === `string`) {
      state[field.key] = ``
    }
  })

  let title = normalizeText(element.textContent || ``)
  if (category.id === `heading`) {
    state.title = title
  }
  else if (category.id === `quote`) {
    const paragraphs = Array.from(element.querySelectorAll<HTMLElement>(`:scope > p`))
      .map(extractBlockText)
      .filter(Boolean)
    const quote = paragraphs.join(`\n`) || title
    state.quote = quote
    title = quote
  }
  else if (category.id === `list`) {
    const items = Array.from(element.querySelectorAll<HTMLElement>(`li`))
      .map((item) => {
        const clone = item.cloneNode(true) as HTMLElement
        clone.querySelectorAll(`ul, ol, .listitem-marker`).forEach(node => node.remove())
        return normalizeText(clone.textContent || ``)
      })
      .filter(Boolean)
      .slice(0, 6)
    items.forEach((item, index) => {
      state[`item${index + 1}`] = item
    })
    title = items[0] || `列表`
  }

  return {
    category: category.id,
    from: range.from,
    to: range.to,
    sourceKind,
    sourceOrdinal,
    state,
    title,
  }
}

function createExistingBlockSelection(element: HTMLElement) {
  const outputElement = element.closest(`#output`)
  if (!outputElement) {
    return null
  }

  const blockElements = Array.from(outputElement.querySelectorAll<HTMLElement>(`section.md-block`))
  const index = blockElements.indexOf(element)
  const block = parseBlockEntries(editorStore.getContent())[index]
  if (!block) {
    return null
  }

  return {
    category: block.category,
    from: block.from,
    to: block.to,
    presetId: block.presetId,
    state: { ...block.state },
    title: block.title,
  }
}

function isSameBlockSelection(
  left: typeof blockSelection.value,
  right: NonNullable<typeof blockSelection.value>,
) {
  return Boolean(
    left
    && left.from === right.from
    && left.to === right.to
    && left.sourceKind === right.sourceKind
    && left.sourceOrdinal === right.sourceOrdinal,
  )
}

function applyBlockSelectionHighlight() {
  document.querySelectorAll<HTMLElement>(`#output`).forEach((outputElement) => {
    outputElement.querySelectorAll(`.preview-block-selected`).forEach(element => element.classList.remove(`preview-block-selected`))
    const selection = blockSelection.value
    if (!selection) {
      return
    }

    let selectedElement: HTMLElement | undefined
    if (selection.sourceKind && selection.sourceOrdinal) {
      selectedElement = outputElement.querySelector<HTMLElement>(
        `[data-src-kind="${selection.sourceKind}"][data-src-ordinal="${selection.sourceOrdinal}"]`,
      ) ?? undefined
    }
    else {
      const entries = parseBlockEntries(editorStore.getContent())
      const index = entries.findIndex(entry => (
        entry.from === selection.from
        && entry.to === selection.to
        && entry.presetId === selection.presetId
      ))
      if (index >= 0) {
        selectedElement = outputElement.querySelectorAll<HTMLElement>(`section.md-block`)[index]
      }
    }
    selectedElement?.classList.add(`preview-block-selected`)
  })
}

// 悬停在已插入板块上时，在其右上角浮出一个删除按钮。
// 用浮层而不是往预览 DOM 里插节点，避免按钮混进公众号复制产物。
const hoveredBlockElement = shallowRef<HTMLElement | null>(null)
const hoveredBlockAnchor = ref<{ top: number, left: number } | null>(null)

const hoverInset = 10
let hoverHideTimer: ReturnType<typeof setTimeout> | undefined

function measureHoveredBlock() {
  const element = hoveredBlockElement.value
  const container = element?.closest<HTMLElement>(`.preview`)
  if (!element || !container) {
    hoveredBlockAnchor.value = null
    return
  }

  const containerRect = container.getBoundingClientRect()
  const blockRect = element.getBoundingClientRect()
  if (blockRect.bottom < containerRect.top || blockRect.top > containerRect.bottom) {
    hoveredBlockAnchor.value = null
    return
  }

  // 按钮压在板块内侧而不是骑在边线上，这样从板块移到按钮的过程中指针始终没离开板块
  hoveredBlockAnchor.value = {
    top: blockRect.top - containerRect.top + hoverInset,
    left: blockRect.right - containerRect.left - hoverInset,
  }
}

function cancelHoverHide() {
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer)
    hoverHideTimer = undefined
  }
}

function handlePreviewPointerMove(event: PointerEvent) {
  const target = event.target as HTMLElement | null

  // 指针落在按钮自身上时按钮必须留住，否则移过去的一瞬间它就消失了
  if (target?.closest(`.preview-block-remove`)) {
    cancelHoverHide()
    return
  }

  const block = target?.closest<HTMLElement>(`#output section.md-block`) ?? null

  if (!block) {
    if (hoveredBlockElement.value && !hoverHideTimer) {
      hoverHideTimer = setTimeout(() => {
        hoverHideTimer = undefined
        hoveredBlockElement.value = null
        hoveredBlockAnchor.value = null
      }, 180)
    }
    return
  }

  cancelHoverHide()
  if (block === hoveredBlockElement.value) {
    return
  }
  hoveredBlockElement.value = block
  measureHoveredBlock()
}

function clearHoveredBlock() {
  cancelHoverHide()
  hoveredBlockElement.value = null
  hoveredBlockAnchor.value = null
}

function handlePreviewScroll() {
  if (hoveredBlockElement.value) {
    measureHoveredBlock()
  }
}

function deleteHoveredBlock() {
  const element = hoveredBlockElement.value
  if (!element) {
    return
  }

  const selection = createExistingBlockSelection(element)
  if (!selection) {
    toast.error(`没能定位这个板块，请在板块库里删除`)
    return
  }

  const current = editorStore.getContent()
  let { from, to } = selection
  while (from > 0 && /[\t ]/.test(current[from - 1])) {
    from -= 1
  }
  while (to < current.length && /[\t ]/.test(current[to])) {
    to += 1
  }
  if (current[from - 1] === `\n` && current[to] === `\n`) {
    to += 1
  }

  const next = `${current.slice(0, from)}${current.slice(to)}`
  editorStore.importContent(next)
  if (currentPost.value) {
    postStore.updatePostContent(currentPost.value.id, next)
  }
  renderStore.render(next)
  blockSelectionStore.clear()
  clearHoveredBlock()
  toast.success(`已删除该板块`)
}

/**
 * 预览里的元素 → 样式面板中管它的那一组设置。
 *
 * 判断顺序是从内到外：行内代码、链接这些嵌在段落里，先问 `p` 的话会被一路吃掉，
 * 点「行内代码」就只能跳到「正文段落」。
 */
function resolveStyleTarget(target: HTMLElement) {
  const code = target.closest<HTMLElement>(`code`)
  if (code) {
    return code.closest(`pre`)
      ? { panel: `detail`, groupId: `codeBlock` }
      : { panel: `detail`, groupId: `inlineCode` }
  }
  if (target.closest(`pre`)) {
    return { panel: `detail`, groupId: `codeBlock` }
  }
  if (target.closest(`figcaption`)) {
    return { panel: `block`, groupId: `figcaption` }
  }
  if (target.closest(`img`)) {
    return { panel: `block`, groupId: `image` }
  }
  if (target.closest(`a`)) {
    return { panel: `text`, groupId: `link` }
  }
  if (target.closest(`blockquote`)) {
    return { panel: `block`, groupId: `blockquote` }
  }
  if (target.closest(`table`)) {
    return { panel: `block`, groupId: `table` }
  }
  if (target.closest(`li,ul,ol`)) {
    return { panel: `block`, groupId: `list` }
  }
  if (target.closest(`hr`)) {
    return { panel: `block`, groupId: `divider` }
  }

  const heading = target.closest<HTMLElement>(`h1,h2,h3,h4,h5,h6`)
  if (heading) {
    return { panel: `text`, groupId: `heading`, headingLevel: heading.tagName.toLowerCase() }
  }
  if (target.closest(`p`)) {
    return { panel: `text`, groupId: `paragraph` }
  }

  return null
}

function handlePreviewContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target)
    return

  const styleTarget = resolveStyleTarget(target)
  if (styleTarget) {
    uiStore.focusStyleGroup(styleTarget.panel, styleTarget.groupId, styleTarget.headingLevel)
  }

  const existingBlock = target.closest<HTMLElement>(`section.md-block`)
  const nativeBlock = target.closest<HTMLElement>(`[data-src-kind][data-src-ordinal]`)
  const nextSelection = existingBlock
    ? createExistingBlockSelection(existingBlock)
    : nativeBlock
      ? createNativeBlockSelection(nativeBlock)
      : null

  if (nextSelection) {
    if (isSameBlockSelection(blockSelection.value, nextSelection)) {
      blockSelectionStore.clear()
    }
    else {
      blockSelectionStore.select(nextSelection)
      // 再点一次是取消选中，那时候不该再把面板叫出来
      uiStore.focusBlockLibrary()
    }
    focusEditorAtPos(nextSelection.from)
    return
  }

  blockSelectionStore.clear()

  // 图片归图文排版管，它不在 blockSelection 的七个类别里，得单独把板块库切过去
  const mediaBlock = target.closest<HTMLElement>(`.md-media-block`)
  if (mediaBlock) {
    // 正文里第几个图文块，就回填第几个：解析出来的顺序和预览里的渲染顺序一致
    const blocks = [...(previewRef.value?.querySelectorAll<HTMLElement>(`.md-media-block`) ?? [])]
    const index = blocks.indexOf(mediaBlock)
    uiStore.focusBlockLibrary(`image`, index >= 0 ? index : undefined)
  }
  else if (target.closest(`img, figure`)) {
    uiStore.focusBlockLibrary(`image`)
  }

  const block = target.closest(`h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,td,th,img`) as HTMLElement | null
  if (!block)
    return

  syncEditorToPreviewElement(block)
}

const searchTabRef
  = useTemplateRef<InstanceType<typeof SearchTab>>(`searchTabRef`)

// 用于存储待处理的搜索请求
const pendingSearchRequest = ref<{ selected: string } | null>(null)

function openSearchWithSelection(view: EditorView) {
  const selection = view.state.selection.main
  const selected = view.state.doc.sliceString(selection.from, selection.to).trim()

  if (searchTabRef.value) {
    // SearchTab 已准备好，直接使用
    if (selected) {
      searchTabRef.value.setSearchWord(selected)
    }
    else {
      searchTabRef.value.showSearchTab = true
    }
  }
  else {
    // SearchTab 还没准备好，保存请求
    pendingSearchRequest.value = { selected }
  }
}

function openReplaceWithSelection(view: EditorView) {
  const selection = view.state.selection.main
  const selected = view.state.doc.sliceString(selection.from, selection.to).trim()

  if (searchTabRef.value) {
    // SearchTab 已准备好，直接使用
    searchTabRef.value.setSearchWithReplace(selected)
  }
  else {
    // SearchTab 还没准备好，通过 UI Store 触发
    uiStore.openSearchTab(selected, true)
  }
}

// 监听 searchTabRef 的变化，处理待处理的请求
watch(searchTabRef, (newRef) => {
  if (newRef && pendingSearchRequest.value) {
    const { selected } = pendingSearchRequest.value
    if (selected) {
      newRef.setSearchWord(selected)
    }
    else {
      newRef.showSearchTab = true
    }
    pendingSearchRequest.value = null
  }
})

// 监听 UI Store 中的搜索请求
const { searchTabRequest } = storeToRefs(uiStore)
watch(searchTabRequest, (request) => {
  if (request && searchTabRef.value) {
    const { word, showReplace } = request

    // 根据是否需要替换功能，调用不同的方法
    if (showReplace) {
      searchTabRef.value.setSearchWithReplace(word)
    }
    else {
      if (word) {
        searchTabRef.value.setSearchWord(word)
      }
      else {
        searchTabRef.value.showSearchTab = true
      }
    }

    // 清除请求
    uiStore.clearSearchTabRequest()
  }
})

function handleGlobalKeydown(e: KeyboardEvent) {
  // 处理 ESC 键关闭搜索
  const editorView = codeMirrorView.value

  if (e.key === `Escape` && searchTabRef.value?.showSearchTab) {
    searchTabRef.value.showSearchTab = false
    e.preventDefault()
    editorView?.focus()
  }
}

onMounted(() => {
  // 使用较低优先级确保 CodeMirror 键盘事件先处理
  document.addEventListener(`keydown`, handleGlobalKeydown, { passive: false, capture: false })
  // 捕获阶段监听，任意祖先容器滚动都能让删除按钮跟住板块
  window.addEventListener(`scroll`, handlePreviewScroll, { passive: true, capture: true })
})

async function beforeImageUpload(file: File) {
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg)
    return false
  }

  // check image host
  const imgHost = (await store.get(`imgHost`)) || `default`

  if (imgHost === `default`) {
    toast.error(`还没有选择图床。请在「插入 → 插入图片」里选一个（推荐阿里云 OSS 或 Cloudflare R2），填好配置后再上传。`)
    return false
  }

  const config = await store.get(`${imgHost}Config`)
  if (!config) {
    toast.error(`请先配置 ${imgHost} 图床参数`)
    return false
  }

  return true
}

// 图片上传结束
function uploaded(imageUrl: string) {
  if (!imageUrl) {
    toast.error(`上传图片未知异常`)
    return
  }
  setTimeout(() => {
    toggleShowUploadImgDialog(false)
  }, 1000)
  // 上传成功，插入图片
  const markdownImage = `![](${imageUrl})`
  // 将 Markdown 形式的 URL 插入编辑框光标所在位置
  if (codeMirrorView.value) {
    codeMirrorView.value.dispatch(codeMirrorView.value.state.replaceSelection(`\n${markdownImage}\n`))
  }
  toast.success(`图片上传成功`)
}

const isImgLoading = ref(false)
async function compressImage(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  }
  const compressedFile = await imageCompression(file, options)
  return compressedFile
}
async function uploadImage(
  file: File,
  cb?: { (url: any, data: string): void, (arg0: unknown): void } | undefined,
  applyUrl?: boolean,
) {
  try {
    isImgLoading.value = true
    // compress image if useCompression is true
    const useCompression = (await store.get(`useCompression`)) === `true`
    if (useCompression) {
      file = await compressImage(file)
    }
    const base64Content = await toBase64(file)
    const url = await fileUpload(base64Content, file)
    if (cb) {
      cb(url, base64Content)
    }
    else {
      uploaded(url)
    }
    if (applyUrl) {
      return uploaded(url)
    }
  }
  catch (err) {
    toast.error((err as any).message)
  }
  finally {
    isImgLoading.value = false
  }
}

// 从文件列表中查找一个 md 文件并解析
async function getMd({ list }: { list: { path: string, file: File }[] }) {
  return new Promise<{ str: string, file: File, path: string }>((resolve) => {
    const { path, file } = list.find(item => item.path.match(/\.md$/))!
    const reader = new FileReader()
    reader.readAsText(file!, `UTF-8`)
    reader.onload = (evt) => {
      resolve({
        str: evt.target!.result as string,
        file,
        path,
      })
    }
  })
}

// 转换文件系统句柄中的文件为文件列表
async function showFileStructure(root: any) {
  const result = []
  let cwd = ``
  try {
    const dirs = [root]
    for (const dir of dirs) {
      cwd += `${dir.name}/`
      for await (const [, handle] of dir) {
        if (handle.kind === `file`) {
          result.push({
            path: cwd + handle.name,
            file: await handle.getFile(),
          })
        }
        else {
          result.push({
            path: `${cwd + handle.name}/`,
          })
          dirs.push(handle)
        }
      }
    }
  }
  catch (err) {
    console.error(err)
  }
  return result
}

// 上传 md 中的图片
async function uploadMdImg({
  md,
  list,
}: {
  md: { str: string, path: string, file: File }
  list: { path: string, file: File }[]
}) {
  // 获取所有相对地址的图片
  const mdImgList = [...(md.str.matchAll(/!\[(.*?)\]\((.*?)\)/g) || [])].filter(item => item)
  const root = md.path.match(/.+?\//)![0]
  const resList = await Promise.all<{ matchStr: string, url: string }>(
    mdImgList.map((item) => {
      return new Promise((resolve) => {
        let [, , matchStr] = item
        matchStr = matchStr.replace(/^.\//, ``) // 处理 ./img/ 为 img/ 统一相对路径风格
        const { file }
          = list.find(f => f.path === `${root}${matchStr}`) || {}
        uploadImage(file!, url => resolve({ matchStr, url }))
      })
    }),
  )
  resList.forEach((item) => {
    md.str = md.str
      .replace(`](./${item.matchStr})`, `](${item.url})`)
      .replace(`](${item.matchStr})`, `](${item.url})`)
  })
  if (codeMirrorView.value) {
    codeMirrorView.value.dispatch({
      changes: { from: 0, to: codeMirrorView.value.state.doc.length, insert: md.str },
    })
  }
}

const codeMirrorWrapper = useTemplateRef<ComponentPublicInstance<HTMLDivElement>>(`codeMirrorWrapper`)

// 转换 markdown 中的本地图片为线上图片
// todo 处理事件覆盖
function mdLocalToRemote() {
  const dom = codeMirrorWrapper.value
  if (!dom) {
    return
  }

  dom.ondragover = evt => evt.preventDefault()
  dom.ondrop = async (evt) => {
    evt.preventDefault()
    if (evt.dataTransfer == null || !Array.isArray(evt.dataTransfer.items)) {
      return
    }

    for (const item of evt.dataTransfer.items.filter(item => item.kind === `file`)) {
      item
        .getAsFileSystemHandle()
        .then(async (handle: { kind: string, getFile: () => any }) => {
          if (handle.kind === `directory`) {
            const list = (await showFileStructure(handle)) as {
              path: string
              file: File
            }[]
            const md = await getMd({ list })
            uploadMdImg({ md, list })
          }
          else {
            const file = await handle.getFile()
            console.log(`file`, file)
            if (await beforeImageUpload(file)) {
              uploadImage(file)
            }
          }
        })
    }
  }
}

const changeTimer = ref<NodeJS.Timeout>()

const editorRef = useTemplateRef<HTMLDivElement>(`editorRef`)
const progressValue = ref(0)

function createFormTextArea(dom: HTMLDivElement) {
  // 创建编辑器状态
  const state = EditorState.create({
    doc: getCurrentEditorContent(),
    extensions: [
      markdownSetup({
        onSearch: openSearchWithSelection,
        onReplace: openReplaceWithSelection,
      }),
      themeCompartment.of(theme(isDark.value)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          blockSelectionStore.clear()
          const value = update.state.doc.toString()
          clearTimeout(changeTimer.value)
          changeTimer.value = setTimeout(() => {
            editorRefresh()

            const currentPost = posts.value[currentPostIndex.value]
            if (value === currentPost.content) {
              return
            }

            currentPost.updateDatetime = new Date()
            currentPost.content = value
          }, 300)
        }

        if (update.selectionSet || update.docChanged) {
          scheduleSyncPreviewToEditorCursor()
        }
      }),
      EditorView.domEventHandlers({
        paste: (event, view) => {
          // 1. 处理剪贴板中的文件 (截图/复制文件)
          if (event.clipboardData?.items && [...event.clipboardData.items].some(item => item.kind === `file`)) {
            if (isImgLoading.value) {
              return true
            }
            Promise.all(
              Array.from(event.clipboardData.items, item => item.getAsFile())
                .filter(item => item != null)
                .map(async item => (await beforeImageUpload(item!)) ? item : null),
            ).then((items) => {
              const validItems = items.filter(item => item != null) as File[]
              if (validItems.length === 0) {
                return
              }
              // start progress
              const intervalId = setInterval(() => {
                const newProgress = progressValue.value + 1
                if (newProgress >= 100) {
                  return
                }
                progressValue.value = newProgress
              }, 100)

              const processFiles = async () => {
                for (const item of validItems) {
                  await uploadImage(item)
                }
                clearInterval(intervalId)
                progressValue.value = 100
                setTimeout(() => {
                  progressValue.value = 0
                }, 1000)
              }
              processFiles()
            })
            return true
          }

          // 2. 处理剪贴板中的文本 (检测 Markdown 图片链接)
          const text = event.clipboardData?.getData(`text/plain`)
          if (text) {
            // 匹配 ![alt](url) 格式
            const mdImgRegex = /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g
            const matches = [...text.matchAll(mdImgRegex)]

            if (matches.length > 0) {
              isImgLoading.value = true

              // 2.1 插入带有唯一 ID 的占位文本
              let previewText = text
              const placeholderMap = new Map<string, { originalUrl: string, originalAlt: string }>()

              // 使用 replace 来生成唯一的占位符
              let matchIndex = 0
              previewText = previewText.replace(mdImgRegex, (_, alt, url) => {
                const id = `LOADING_${Date.now()}_${matchIndex++}`
                placeholderMap.set(id, { originalUrl: url, originalAlt: alt })
                return `![⏳ 转存中...](${id})`
              })

              // 插入占位文本到编辑器
              view.dispatch(view.state.replaceSelection(previewText))

              // 2.2 提取唯一 URL 进行并发转存
              const uniqueUrls = [...new Set(matches.map(m => m[2]))]

              // 并发处理
              Promise.all(uniqueUrls.map(async (url) => {
                try {
                  // 根据开关决定是否转存
                  const newUrl = enableImageReupload.value ? await upload(url) : url

                  // 2.3 转存成功后（或直接使用原URL），精确替换编辑器中的对应内容
                  // 遍历 map，找到所有 originalUrl 为当前 url 的占位符 ID
                  for (const [id, info] of placeholderMap.entries()) {
                    if (info.originalUrl === url) {
                      // 查找该 ID 在文档中的位置
                      const searchStr = `![⏳ 转存中...](${id})`
                      const currentDoc = view.state.doc.toString()
                      const pos = currentDoc.indexOf(searchStr)

                      if (pos !== -1) {
                        const newText = `![${info.originalAlt}](${newUrl})`
                        view.dispatch({
                          changes: { from: pos, to: pos + searchStr.length, insert: newText },
                        })
                      }
                    }
                  }
                }
                catch (e) {
                  console.error(`转存失败: ${url}`, e)
                  // 失败时，将占位符恢复为原样
                  for (const [id, info] of placeholderMap.entries()) {
                    if (info.originalUrl === url) {
                      const searchStr = `![⏳ 转存中...](${id})`
                      const currentDoc = view.state.doc.toString()
                      const pos = currentDoc.indexOf(searchStr)

                      if (pos !== -1) {
                        const newText = `![${info.originalAlt}](${info.originalUrl})`
                        view.dispatch({
                          changes: { from: pos, to: pos + searchStr.length, insert: newText },
                        })
                      }
                    }
                  }
                  toast.error(`图片转存失败，已保留原链接`)
                }
              })).finally(() => {
                isImgLoading.value = false
              })

              return true
            }
          }
          return false
        },
      }),
    ],
  })

  // 创建编辑器视图
  const view = new EditorView({
    state,
    parent: dom,
  })

  codeMirrorView.value = view

  // 返回编辑器 view
  return view
}

// 初始化编辑器
onMounted(() => {
  const editorDom = editorRef.value

  if (editorDom == null) {
    return
  }

  // 初始化渲染器（新主题系统）
  renderStore.initRendererInstance({
    isShowCodeLanguage: themeStore.isShowCodeLanguage,
    isShowLineNumber: themeStore.isShowLineNumber,
  })

  // 应用主题样式（新主题系统）
  themeStore.applyCurrentTheme()

  nextTick(() => {
    const editorView = createFormTextArea(editorDom)
    editor.value = editorView
    normalizeCurrentPostMediaLayouts()
    syncEditorPreviewPanelLayout()
    // 文档刚按当前内容建好，强制整篇替换只会多压一条撤销记录，
    // 再顺带引一次 300ms 之后的重复渲染。重绘交给 ensureEditorPaint。
    syncEditorDocument()
    ensureEditorPaint()

    // AI 工具箱已移到侧边栏，不再需要初始化编辑器事件
    editorRefresh()
    mdLocalToRemote()
  })
})

// 监听暗色模式变化并更新编辑器主题
watch(isDark, () => {
  if (codeMirrorView.value) {
    codeMirrorView.value.dispatch({
      effects: themeCompartment.reconfigure(theme(isDark.value)),
    })
  }
  // 重新渲染 markdown 以更新 infographic 等扩展的主题
  editorRefresh()
})

// 监听当前文章切换，更新编辑器内容
watch(currentPost, (post) => {
  if (!post || !codeMirrorView.value)
    return

  const nextContent = normalizeCurrentPostMediaLayouts(post) ?? post.content
  const currentContent = codeMirrorView.value.state.doc.toString()
  if (currentContent !== nextContent) {
    syncEditorDocument()
    editorRefresh()
  }
}, { immediate: true })

watch([viewMode, isMobile], ([mode, mobile]) => {
  if (!mobile || mode !== `edit`) {
    return
  }

  nextTick(() => {
    ensureEditorPaint()
  })
})

// 历史记录的定时器
const historyTimer = ref<NodeJS.Timeout>()
/**
 * scrollIntoView 和焦点管理会顺带把外壳容器也滚上去——它是 overflow 隐藏的，
 * 没有滚动条，用户只能看着整个版面卡在上移的位置，重启才能恢复。
 *
 * 不用 overflow: clip 换掉 hidden：clip 之后这个 flex 子项不再受父级高度约束，
 * 工作区会被预览内容直接撑到几千像素高。这里改成滚动一发生就归零。
 */
onMounted(() => {
  const shell = mainSectionRef.value
  if (!shell) {
    return
  }

  const resetShellScroll = () => {
    if (shell.scrollTop !== 0) {
      shell.scrollTop = 0
    }
    if (shell.scrollLeft !== 0) {
      shell.scrollLeft = 0
    }
  }

  shell.addEventListener(`scroll`, resetShellScroll, { passive: true })
  onBeforeUnmount(() => shell.removeEventListener(`scroll`, resetShellScroll))
})

onMounted(() => {
  // 定时，30 秒记录一次文章的历史记录
  historyTimer.value = setInterval(() => {
    const currentPost = posts.value[currentPostIndex.value]

    // 与最后一篇记录对比
    const pre = (currentPost.history || [])[0]?.content
    if (pre === currentPost.content) {
      return
    }

    currentPost.history ??= []
    currentPost.history.unshift({
      content: currentPost.content,
      datetime: new Date().toLocaleString(`zh-CN`),
    })

    currentPost.history.length = Math.min(currentPost.history.length, 10)
  }, 30 * 1000)
})

// 销毁时清理定时器和全局事件监听器
onUnmounted(() => {
  // 清理定时器 - 防止回调访问已销毁的DOM
  clearTimeout(historyTimer.value)
  clearTimeout(changeTimer.value)
  clearTimeout(cursorSyncTimer.value)

  cancelHoverHide()

  // 清理全局事件监听器 - 防止全局事件触发已销毁的组件
  document.removeEventListener(`keydown`, handleGlobalKeydown)
  window.removeEventListener(`scroll`, handlePreviewScroll, { capture: true })
})
</script>

<template>
  <div class="container flex flex-col">
    <Progress v-model="progressValue" class="absolute left-0 right-0 rounded-none" style="height: 2px;" />
    <EditorHeader
      @start-copy="startCopy"
      @end-copy="endCopy"
    />

    <main class="container-main flex flex-1 flex-col">
      <div ref="mainSectionRef" class="container-main-section border-radius-10 relative flex flex-1 overflow-hidden border-x border-b">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            v-if="showPostRail"
            id="post-rail"
            :order="1"
            :default-size="15"
            :min-size="10"
            :max-size="22"
          >
            <PostSlider />
          </ResizablePanel>
          <ResizableHandle v-if="showPostRail" class="hidden md:block" />

          <ResizablePanel
            v-if="showFolderRail"
            id="folder-rail"
            :order="2"
            :default-size="16"
            :min-size="10"
            :max-size="26"
          >
            <FolderSourcePanel />
          </ResizablePanel>
          <ResizableHandle v-if="showFolderRail" class="hidden md:block" />

          <ResizablePanel id="workspace-main" :order="3" :min-size="40">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel
                id="editor-panel"
                ref="editorPanelRef"
                :order="1"
                :default-size="editorPreviewDefaultSizes.editor"
                :min-size="editorPanelConfig.min"
                :max-size="editorPanelConfig.max"
                collapsible
                :collapsed-size="0"
              >
                <div
                  v-show="viewMode !== 'preview'"
                  ref="codeMirrorWrapper"
                  class="codeMirror-wrapper relative h-full p-3 md:p-4"
                >
                  <div class="workspace-panel editor-panel">
                    <div class="workspace-panel__header" :class="{ 'workspace-panel__header--compact': isSimpleWorkspace }">
                      <div class="workspace-panel__headline">
                        <div class="workspace-panel__copy">
                          <h2>{{ currentPostTitle }}</h2>
                        </div>
                        <div class="workspace-panel__chips">
                          <span class="workspace-chip workspace-chip--accent">{{ viewModeLabel }}</span>
                          <span class="workspace-chip">{{ editorLineCount }} 行</span>
                          <span class="workspace-chip">{{ editorCharCount }} 字</span>
                        </div>
                      </div>
                    </div>
                    <div class="workspace-panel__body editor-panel__body">
                      <SearchTab v-if="codeMirrorView" ref="searchTabRef" :editor-view="codeMirrorView as any" />

                      <div class="editor-panel__canvas">
                        <EditorContextMenu>
                          <div
                            id="editor"
                            ref="editorRef"
                            class="codemirror-container"
                          />
                        </EditorContextMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle v-show="viewMode === 'split'" />

              <ResizablePanel
                v-if="showBlockRail"
                id="block-rail"
                :order="2"
                :default-size="blockPanelDefaultSize"
                :min-size="18"
                :max-size="36"
              >
                <div class="h-full p-3 md:p-4">
                  <ImageLayoutWorkspace />
                </div>
              </ResizablePanel>
              <ResizableHandle v-if="showBlockRail" class="hidden md:block" />

              <ResizablePanel
                id="preview-panel"
                ref="previewPanelRef"
                :order="3"
                :default-size="editorPreviewDefaultSizes.preview"
                :min-size="previewPanelConfig.min"
                :max-size="previewPanelConfig.max"
                collapsible
                :collapsed-size="0"
              >
                <div v-show="viewMode !== 'edit'" class="preview-stage relative h-full overflow-x-hidden p-3 md:p-4">
                  <div class="workspace-panel preview-panel">
                    <!-- 标题和描述在左栏已经有了，隔两厘米再写一遍只是占地方 -->
                    <div class="workspace-panel__header workspace-panel__header--compact">
                      <div class="workspace-panel__headline">
                        <div class="workspace-panel__copy">
                          <span class="workspace-panel__label">预览</span>
                        </div>
                        <div class="workspace-panel__chips">
                          <span class="workspace-chip workspace-chip--accent">{{ previewDeviceLabel }}</span>
                          <span class="workspace-chip">{{ readingTimeLabel }}</span>
                          <span class="workspace-chip">{{ currentPostUpdateLabel }}</span>
                        </div>
                      </div>
                    </div>

                    <ThemeQuickBar v-if="isSimpleWorkspace" />

                    <div class="workspace-panel__body preview-panel__body">
                      <div
                        id="preview"
                        ref="previewRef"
                        class="preview-wrapper w-full flex justify-center"
                      >
                        <div
                          id="output-wrapper"
                          class="w-full max-w-full preview-paper-stack"
                          :class="{ output_night: !backLight }"
                        >
                          <div
                            class="preview mx-auto"
                            :class="[
                              effectivePreviewWidth,
                              effectivePreviewWidth === 'w-[375px]' ? 'max-w-full' : '',
                            ]"
                            @pointermove="handlePreviewPointerMove"
                            @pointerleave="clearHoveredBlock"
                          >
                            <section id="output" class="w-full" @click="handlePreviewContentClick" v-html="output" />
                            <button
                              v-if="hoveredBlockAnchor"
                              type="button"
                              class="preview-block-remove"
                              :style="{ top: `${hoveredBlockAnchor.top}px`, left: `${hoveredBlockAnchor.left}px` }"
                              title="删除这个板块"
                              @click.stop="deleteHoveredBlock"
                            >
                              <X class="size-3.5" />
                            </button>
                            <div v-if="isCoping" class="loading-mask">
                              <div class="loading-mask-box">
                                <div class="loading__img" />
                                <span>正在生成</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <BackTop
                          target="preview"
                          :right="20"
                          :bottom="isMobile ? 90 : 20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle v-if="showCssRail" class="hidden md:block" />
              <ResizablePanel
                v-if="showCssRail"
                id="css-rail"
                :order="4"
                :default-size="cssPanelDefaultSize"
                :min-size="10"
                :max-size="50"
              >
                <CssEditor />
              </ResizablePanel>

              <ResizableHandle v-if="showStyleRail" class="hidden md:block" />
              <ResizablePanel
                v-if="showStyleRail"
                id="style-rail"
                :order="5"
                :default-size="rightPanelDefaultSize"
                :min-size="20"
                :max-size="50"
              >
                <RightSlider />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <!-- 移动端这几个面板自带全屏抽屉，不参与分栏 -->
      <template v-if="isMobile">
        <PostSlider />
        <CssEditor v-if="uiStore.isShowCssEditor" />
        <RightSlider v-if="isOpenRightSlider" />
      </template>

      <WorkspaceDrawer />

      <UploadImgDialog @upload-image="uploadImage" />

      <ImageLayoutDialog v-if="isMobile" />

      <InsertFormDialog />

      <InsertMpCardDialog />

      <ImportMarkdownDialog />

      <TemplateDialog />

      <WorkspaceModeGuide />

      <AlertDialog v-model:open="isOpenConfirmDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提示</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将丢失本地自定义样式，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction @click="resetStyle">
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>

    <Footer />
  </div>
</template>

<style lang="less" scoped>
@import url('../assets/less/app.less');
</style>

<style lang="less" scoped>
.container {
  height: 100%;
  min-width: 100%;
  padding: 0;
}

.mobile-app-container {
  min-height: 100dvh;
  height: 100dvh;
  background:
    radial-gradient(circle at top center, hsl(var(--accent) / 0.16), transparent 30%),
    linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.46));
}

.container-main {
  overflow: hidden;
}

.mobile-app-main {
  gap: 0.25rem;
  padding-bottom: calc(env(safe-area-inset-bottom) + 6rem);
}

.mobile-app-main--editing {
  padding-bottom: calc(env(safe-area-inset-bottom) + 10.6rem);
}

.mobile-app-main--keyboard-open {
  padding-bottom: calc(env(safe-area-inset-bottom) + 5rem);
}

.container-main-section {
  border-color: hsl(var(--border));
  background:
    radial-gradient(circle at left top, hsl(var(--accent) / 0.4), transparent 30%),
    radial-gradient(circle at right top, hsl(var(--primary) / 0.08), transparent 26%),
    linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.75));
}

.mobile-app-section {
  border-left: none;
  border-right: none;
  border-bottom: none;
  border-radius: 0;
}

#output-wrapper {
  position: relative;
  user-select: text;
  width: 100%;
  height: auto;
  min-height: 100%;
}

.workspace-panel {
  position: relative;
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid hsl(var(--border) / 0.8);
  border-radius: 30px;
  background: linear-gradient(180deg, hsl(var(--card) / 0.98), hsl(var(--card) / 0.94));
  box-shadow:
    0 28px 80px hsl(var(--foreground) / 0.08),
    inset 0 1px 0 hsl(var(--background));
  backdrop-filter: blur(18px);
}

.workspace-panel--mobile-app {
  border-radius: 24px;
  box-shadow:
    0 16px 42px hsl(var(--foreground) / 0.06),
    inset 0 1px 0 hsl(var(--background));
}

.editor-panel,
.preview-panel {
  min-height: 0;
}

.workspace-panel__header {
  position: relative;
  padding: 1.3rem 1.4rem 1rem;
  border-bottom: 1px solid hsl(var(--border) / 0.75);
  background:
    linear-gradient(180deg, hsl(var(--background) / 0.92), hsl(var(--background) / 0.72)),
    radial-gradient(circle at top left, hsl(var(--accent) / 0.22), transparent 48%);
}

/* 简洁模式的标题栏只留一行，把纵向空间让给稿子本身 */
.workspace-panel__header--compact {
  padding: 0.7rem 1rem;
}

.workspace-panel__header--compact .workspace-panel__headline {
  align-items: center;
}

.workspace-panel__header--compact .workspace-panel__copy h2 {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.workspace-panel__header--compact .workspace-chip {
  padding: 0.3rem 0.6rem;
  font-size: 0.7rem;
}

/* 预览栏的静默标签：不跟左栏的文章标题抢层级 */
.workspace-panel__label {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: hsl(var(--muted-foreground));
}

.workspace-panel__headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.workspace-panel__copy {
  min-width: 0;
}

.workspace-panel__copy h2 {
  margin: 0;
  font-size: clamp(1.1rem, 1rem + 0.45vw, 1.45rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: hsl(var(--foreground));
}

.workspace-panel__copy p {
  margin: 0.5rem 0 0;
  max-width: 42rem;
  font-size: 0.88rem;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
}

.workspace-panel__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
  min-width: 0;
}

.workspace-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.4rem 0.72rem;
  border: 1px solid hsl(var(--rule));
  border-radius: 999px;
  background: transparent;
  font-size: 0.74rem;
  line-height: 1;
  white-space: nowrap;
  color: hsl(var(--muted-foreground));
  box-shadow: inset 0 1px 0 hsl(var(--background));
}

/* 状态标签只是标注当前视图，朱砂留给「复制到公众号」，一屏里只该有一处高饱和 */
.workspace-chip--accent {
  border-color: hsl(var(--foreground) / 0.14);
  background: hsl(var(--foreground) / 0.06);
  font-weight: 500;
  color: hsl(var(--foreground) / 0.78);
}

.workspace-panel__body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 1rem;
}

.codeMirror-wrapper,
.preview-stage {
  position: relative;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.codeMirror-wrapper--mobile,
.preview-stage--mobile {
  width: 100%;
}

.editor-panel__body {
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, hsl(var(--accent) / 0.18), transparent 32%),
    linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.52));
}

.editor-panel__body--mobile-app {
  padding-bottom: 0.5rem;
}

.editor-panel__body::before {
  content: '';
  position: absolute;
  inset: 1rem 1rem auto;
  height: 140px;
  border-radius: 24px;
  background: linear-gradient(135deg, hsl(var(--accent) / 0.18), transparent 74%);
  pointer-events: none;
}

.editor-panel__canvas {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-height: 0;
}

.codemirror-container {
  position: relative;
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid hsl(var(--border) / 0.78);
  border-radius: 24px;
  background: linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.36));
  box-shadow:
    inset 0 1px 0 hsl(var(--background)),
    0 20px 50px hsl(var(--foreground) / 0.06);
}

.preview-panel__body {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top center, hsl(var(--background)), transparent 72%),
    linear-gradient(180deg, hsl(var(--muted) / 0.76), hsl(var(--background)));
}

.preview-wrapper {
  position: relative;
  align-items: flex-start;
  justify-content: center;
  padding: 0 0 2rem;
}

.preview-paper-stack {
  position: relative;
  width: min(100%, 860px);
  padding: 0.6rem 0.4rem 1.2rem;
}

.preview-panel :deep(#output-wrapper > .preview) {
  position: relative;
  z-index: 2;
  min-height: calc(100% - 0.5rem);
  padding: clamp(1.35rem, 2vw, 1.9rem);
  border: 1px solid hsl(var(--border) / 0.82);
  border-radius: 28px;
  background: hsl(var(--background));
  box-shadow:
    0 32px 80px hsl(var(--foreground) / 0.08),
    0 8px 20px hsl(var(--foreground) / 0.05);
}

/*
 * 深色模式只暗化桌面，纸不跟着反色。
 * 正文颜色来自主题 CSS，不会随深浅模式变化，纸一黑就成了深字压深底；
 * 而且这里预览的是发布后的样子，公众号里本来就是白底。
 * 深色主题自己会在 #output 上铺底色，盖在这层之上，不受影响。
 */
.dark .preview-panel :deep(#output-wrapper > .preview) {
  background: hsl(40 22% 95%);
  color: hsl(24 9% 13%);
  box-shadow: 0 32px 80px rgb(0 0 0 / 0.5);
}

.editor-panel__body :deep(.cm-editor) {
  height: 100% !important;
  background: transparent;
  color: hsl(var(--foreground));
}

.editor-panel__body :deep(.cm-scroller) {
  height: 100%;
  padding: 1.15rem 0 1.6rem !important;
}

.editor-panel--mobile-app :deep(.cm-scroller) {
  padding-bottom: calc(env(safe-area-inset-bottom) + 11rem) !important;
}

.editor-panel--mobile-app.editor-panel--keyboard-open :deep(.cm-scroller) {
  padding-bottom: calc(env(safe-area-inset-bottom) + 5.5rem) !important;
}

.editor-panel__body :deep(.cm-gutters) {
  padding-right: 0.75rem;
  border-right: 1px solid hsl(var(--border) / 0.72);
  background: transparent;
}

.editor-panel__body :deep(.cm-lineNumbers .cm-gutterElement) {
  color: hsl(var(--muted-foreground));
  opacity: 0.75;
}

.editor-panel__body :deep(.cm-content) {
  padding: 0 !important;
  caret-color: hsl(var(--foreground));
}

.editor-panel__body :deep(.cm-line) {
  padding: 0 1.25rem 0 0.85rem;
}

.editor-panel__body :deep(.cm-activeLine) {
  border-radius: 0.8rem;
  background: hsl(var(--accent) / 0.34);
}

.editor-panel__body :deep(.cm-activeLineGutter) {
  background: transparent;
}

.editor-panel__body :deep(.cm-selectionBackground),
.editor-panel__body :deep(.cm-editor ::selection) {
  background: hsl(var(--primary) / 0.16) !important;
}

.editor-panel__body :deep(.cm-cursor) {
  border-left-color: hsl(var(--foreground));
}

.editor-panel__body :deep(.cm-foldGutter .cm-gutterElement) {
  color: hsl(var(--muted-foreground));
}

.editor-panel__body :deep(.cm-panels) {
  border-bottom: 1px solid hsl(var(--border) / 0.7);
  background: hsl(var(--background) / 0.88);
}

.loading-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));

  .loading-mask-box {
    position: sticky;
    top: 50%;
    transform: translateY(-50%);

    .loading__img {
      width: 64px;
      height: 64px;
      background: url('/logo.svg') no-repeat;
      margin: 1em auto;
      background-size: cover;
    }
  }
}

:deep(.preview-table) {
  border-spacing: 0;
}

:deep(#output [data-src-kind]),
:deep(#output section.md-block) {
  cursor: pointer;
}

.preview-block-remove {
  position: absolute;
  z-index: 20;
  display: flex;
  width: 1.5rem;
  height: 1.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}

// 24px 的圆点对鼠标偏小，用透明外扩把命中区放到 40px
.preview-block-remove::before {
  position: absolute;
  content: '';
  inset: -8px;
  border-radius: inherit;
}

.preview-block-remove:hover {
  border-color: hsl(var(--destructive));
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
}

:deep(#output .preview-block-selected) {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 4px;
  border-radius: 6px;
  box-shadow: 0 0 0 6px hsl(var(--primary) / 0.12);
}

.codeMirror-wrapper,
.preview-wrapper {
  height: 100%;
}

.preview-wrapper {
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.codeMirror-wrapper {
  overflow-x: hidden;
  height: 100%;
  position: relative;
}

@media (max-width: 1024px) {
  .workspace-panel {
    border-radius: 26px;
  }

  .workspace-panel__headline {
    flex-direction: column;
  }

  .workspace-panel__chips {
    justify-content: flex-start;
  }

  .preview-paper-stack {
    width: 100%;
    padding-inline: 0;
  }
}

@media (max-width: 768px) {
  .mobile-app-main {
    padding-bottom: calc(env(safe-area-inset-bottom) + 10.6rem);
  }

  .workspace-panel__header {
    padding: 1rem 1rem 0.9rem;
  }

  .workspace-panel__body {
    padding: 0.8rem;
  }

  .workspace-chip {
    font-size: 0.7rem;
  }

  .preview-panel :deep(#output-wrapper > .preview) {
    border-radius: 24px;
  }

  .workspace-panel--mobile-app {
    border-radius: 22px;
  }

  .workspace-panel--mobile-app .workspace-panel__body {
    padding: 0.75rem;
  }

  .workspace-panel--mobile-app .editor-panel__body,
  .workspace-panel--mobile-app .preview-panel__body {
    background: linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.42));
  }
}
</style>
