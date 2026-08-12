<script setup lang="ts">
import type {
  MediaLayoutBlockEntry,
  MediaLayoutFamily,
  MediaLayoutFormState,
  MediaLayoutPreset,
  MediaLayoutTextMode,
} from '@/utils/image-layouts'
import { Check, ImagePlus, LayoutTemplate, RotateCcw, Sparkles } from 'lucide-vue-next'
import { useImageQuickInsert } from '@/composables/useImageQuickInsert'
import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { useRenderStore } from '@/stores/render'
import { hasMpUploadConfig } from '@/utils/file'
import {
  buildMediaLayoutMarkup,
  cloneMediaLayoutState,
  createDefaultMediaLayoutState,
  getMediaLayoutBadgeFallback,
  getMediaLayoutCopyPlaceholders,
  getMediaLayoutPresetSlotDefaults,
  mediaAspectRatioOptions,
  mediaLayoutFamilyLabels,
  mediaLayoutPresets,
  mediaLayoutPresetSupportsBadge,
  mediaLayoutTextModeLabels,
  parseMediaLayoutBlocks,
  restoreMediaLayoutBlockToMarkdown,
} from '@/utils/image-layouts'

interface MarkdownImageEntry {
  id: string
  alt: string
  url: string
  raw: string
  from: number
  to: number
}

interface PresetPreviewCell {
  left: string
  top: string
  width: string
  height: string
  tone: `strong` | `soft` | `muted`
}

interface PresetPreviewBand {
  left: string
  top: string
  width: string
  height: string
}

interface PresetPreviewBlueprint {
  cells: PresetPreviewCell[]
  bands?: PresetPreviewBand[]
}

type TemplateCountFilter = `1` | `2` | `3` | `4`

const { open: openQuickInsert } = useImageQuickInsert()
const editorStore = useEditorStore()
const postStore = usePostStore()
const renderStore = useRenderStore()
const { currentPost } = storeToRefs(postStore)

const selectedPresetId = ref(``)
const selectedImageIds = ref<string[]>([])
const activeSlotIndex = ref(0)
const editingBlockId = ref(``)
const editingImagePool = ref<MarkdownImageEntry[]>([])
const showAdvancedDetailFields = ref(false)
const showAllGeneratedLayouts = ref(false)
const showImageLibrary = ref(false)
const showSlotTuning = ref(false)
const showTextEditor = ref(false)
const showAllTemplates = ref(false)
const templateCountFilter = ref<TemplateCountFilter | ``>(``)
const templateModeFilter = ref<MediaLayoutTextMode | ``>(``)
const templateFamilyFilter = ref<MediaLayoutFamily | `all`>(`all`)
const mpUploadReady = ref(false)
const formState = reactive(createWorkspaceLayoutFormState())

const templateCountOptions: Array<{ label: string, value: TemplateCountFilter }> = [
  { label: `1 张图`, value: `1` },
  { label: `2 张图`, value: `2` },
  { label: `3 张图`, value: `3` },
  { label: `4 张图`, value: `4` },
]

const templateModeOptions: Array<{ label: string, value: MediaLayoutTextMode }> = [
  { label: `纯图片`, value: `plain` },
  { label: `图文摘要`, value: `brief` },
  { label: `故事卡片`, value: `story` },
]

const templateFamilyOptions: Array<{ label: string, value: MediaLayoutFamily | `all` }> = [
  { label: `全部风格`, value: `all` },
  { label: mediaLayoutFamilyLabels.quiet, value: `quiet` },
  { label: mediaLayoutFamilyLabels.focus, value: `focus` },
  { label: mediaLayoutFamilyLabels.contrast, value: `contrast` },
  { label: mediaLayoutFamilyLabels.editorial, value: `editorial` },
]

const presetPreviewBlueprints: Record<string, PresetPreviewBlueprint> = {
  'hero-image': {
    cells: [{ left: `8%`, top: `12%`, width: `84%`, height: `62%`, tone: `strong` }],
  },
  'frame-single': {
    cells: [{ left: `14%`, top: `18%`, width: `72%`, height: `56%`, tone: `soft` }],
    bands: [{ left: `22%`, top: `79%`, width: `56%`, height: `7%` }],
  },
  'scroll-window': {
    cells: [{ left: `18%`, top: `10%`, width: `64%`, height: `70%`, tone: `strong` }],
    bands: [{ left: `22%`, top: `18%`, width: `56%`, height: `34%` }],
  },
  'duo-gallery': {
    cells: [
      { left: `8%`, top: `15%`, width: `39%`, height: `58%`, tone: `strong` },
      { left: `53%`, top: `15%`, width: `39%`, height: `58%`, tone: `soft` },
    ],
  },
  'vertical-pair': {
    cells: [
      { left: `10%`, top: `12%`, width: `80%`, height: `26%`, tone: `strong` },
      { left: `10%`, top: `48%`, width: `80%`, height: `26%`, tone: `soft` },
    ],
  },
  'duo-focus': {
    cells: [
      { left: `8%`, top: `12%`, width: `50%`, height: `64%`, tone: `strong` },
      { left: `63%`, top: `22%`, width: `29%`, height: `44%`, tone: `muted` },
    ],
  },
  'triptych-gallery': {
    cells: [
      { left: `6%`, top: `18%`, width: `26%`, height: `52%`, tone: `strong` },
      { left: `37%`, top: `18%`, width: `26%`, height: `52%`, tone: `soft` },
      { left: `68%`, top: `18%`, width: `26%`, height: `52%`, tone: `muted` },
    ],
  },
  'vertical-strip': {
    cells: [
      { left: `12%`, top: `10%`, width: `76%`, height: `18%`, tone: `strong` },
      { left: `12%`, top: `38%`, width: `76%`, height: `18%`, tone: `soft` },
      { left: `12%`, top: `66%`, width: `76%`, height: `18%`, tone: `muted` },
    ],
  },
  'filmstrip-gallery': {
    cells: [
      { left: `8%`, top: `12%`, width: `24%`, height: `64%`, tone: `strong` },
      { left: `38%`, top: `12%`, width: `24%`, height: `64%`, tone: `soft` },
      { left: `68%`, top: `12%`, width: `24%`, height: `64%`, tone: `muted` },
    ],
  },
  'stack-gallery': {
    cells: [
      { left: `8%`, top: `10%`, width: `84%`, height: `36%`, tone: `strong` },
      { left: `8%`, top: `54%`, width: `39%`, height: `24%`, tone: `soft` },
      { left: `53%`, top: `54%`, width: `39%`, height: `24%`, tone: `muted` },
    ],
  },
  'mosaic-focus': {
    cells: [
      { left: `8%`, top: `12%`, width: `48%`, height: `62%`, tone: `strong` },
      { left: `61%`, top: `12%`, width: `31%`, height: `27%`, tone: `soft` },
      { left: `61%`, top: `47%`, width: `31%`, height: `27%`, tone: `muted` },
    ],
  },
  'split-left': {
    cells: [{ left: `8%`, top: `16%`, width: `44%`, height: `54%`, tone: `strong` }],
    bands: [
      { left: `58%`, top: `18%`, width: `28%`, height: `8%` },
      { left: `58%`, top: `33%`, width: `32%`, height: `6%` },
      { left: `58%`, top: `45%`, width: `26%`, height: `6%` },
    ],
  },
  'split-right': {
    cells: [{ left: `48%`, top: `16%`, width: `44%`, height: `54%`, tone: `strong` }],
    bands: [
      { left: `12%`, top: `18%`, width: `28%`, height: `8%` },
      { left: `12%`, top: `33%`, width: `32%`, height: `6%` },
      { left: `12%`, top: `45%`, width: `26%`, height: `6%` },
    ],
  },
  'spotlight-card': {
    cells: [{ left: `8%`, top: `10%`, width: `84%`, height: `44%`, tone: `strong` }],
    bands: [{ left: `16%`, top: `58%`, width: `68%`, height: `22%` }],
  },
  'caption-band': {
    cells: [{ left: `8%`, top: `10%`, width: `84%`, height: `48%`, tone: `strong` }],
    bands: [{ left: `18%`, top: `64%`, width: `64%`, height: `12%` }],
  },
  'story-pair': {
    cells: [
      { left: `8%`, top: `12%`, width: `39%`, height: `36%`, tone: `strong` },
      { left: `53%`, top: `12%`, width: `39%`, height: `36%`, tone: `soft` },
    ],
    bands: [
      { left: `8%`, top: `56%`, width: `39%`, height: `14%` },
      { left: `53%`, top: `56%`, width: `39%`, height: `14%` },
    ],
  },
  'polaroid-single': {
    cells: [{ left: `30%`, top: `12%`, width: `40%`, height: `52%`, tone: `strong` }],
    bands: [
      { left: `26%`, top: `8%`, width: `48%`, height: `78%` },
      { left: `34%`, top: `70%`, width: `32%`, height: `8%` },
    ],
  },
  'shadow-card-single': {
    cells: [{ left: `12%`, top: `14%`, width: `76%`, height: `52%`, tone: `strong` }],
    bands: [{ left: `17%`, top: `70%`, width: `66%`, height: `8%` }],
  },
  'full-bleed-single': {
    cells: [{ left: `0%`, top: `14%`, width: `100%`, height: `54%`, tone: `strong` }],
    bands: [{ left: `0%`, top: `74%`, width: `44%`, height: `7%` }],
  },
  'compare-pair': {
    cells: [
      { left: `7%`, top: `16%`, width: `40%`, height: `56%`, tone: `strong` },
      { left: `53%`, top: `16%`, width: `40%`, height: `56%`, tone: `muted` },
    ],
    bands: [{ left: `49.6%`, top: `12%`, width: `0.8%`, height: `64%` }],
  },
  'magazine-spread': {
    cells: [
      { left: `8%`, top: `16%`, width: `42%`, height: `56%`, tone: `strong` },
      { left: `50%`, top: `16%`, width: `42%`, height: `56%`, tone: `soft` },
    ],
  },
  'quad-grid': {
    cells: [
      { left: `13%`, top: `10%`, width: `36%`, height: `36%`, tone: `strong` },
      { left: `51%`, top: `10%`, width: `36%`, height: `36%`, tone: `soft` },
      { left: `13%`, top: `50%`, width: `36%`, height: `36%`, tone: `muted` },
      { left: `51%`, top: `50%`, width: `36%`, height: `36%`, tone: `soft` },
    ],
  },
  'hero-trio': {
    cells: [
      { left: `8%`, top: `10%`, width: `84%`, height: `40%`, tone: `strong` },
      { left: `8%`, top: `56%`, width: `26%`, height: `26%`, tone: `soft` },
      { left: `37%`, top: `56%`, width: `26%`, height: `26%`, tone: `muted` },
      { left: `66%`, top: `56%`, width: `26%`, height: `26%`, tone: `soft` },
    ],
  },
  'numbered-figure': {
    cells: [{ left: `10%`, top: `10%`, width: `80%`, height: `48%`, tone: `strong` }],
    bands: [
      { left: `14%`, top: `15%`, width: `12%`, height: `10%` },
      { left: `10%`, top: `66%`, width: `56%`, height: `7%` },
      { left: `10%`, top: `77%`, width: `44%`, height: `6%` },
    ],
  },
  'gradient-caption': {
    cells: [{ left: `8%`, top: `12%`, width: `84%`, height: `64%`, tone: `strong` }],
    bands: [
      { left: `8%`, top: `56%`, width: `84%`, height: `20%` },
      { left: `14%`, top: `62%`, width: `44%`, height: `8%` },
    ],
  },
  'quote-figure': {
    cells: [{ left: `10%`, top: `10%`, width: `80%`, height: `44%`, tone: `strong` }],
    bands: [
      { left: `10%`, top: `62%`, width: `1.6%`, height: `22%` },
      { left: `16%`, top: `63%`, width: `60%`, height: `7%` },
      { left: `16%`, top: `74%`, width: `40%`, height: `6%` },
    ],
  },
}

const markdownContent = computed(() => currentPost.value?.content ?? editorStore.getContent() ?? ``)
const detectedImages = computed(() => parseMarkdownImages(markdownContent.value))
const detectedLayoutBlocks = computed(() => parseMediaLayoutBlocks(markdownContent.value))
const editingBlock = computed(() => {
  return detectedLayoutBlocks.value.find(block => block.id === editingBlockId.value) ?? null
})
const availableImages = computed<MarkdownImageEntry[]>(() => {
  return [...editingImagePool.value, ...detectedImages.value]
})

const hasPrimaryTemplateFilters = computed(() => Boolean(templateCountFilter.value && templateModeFilter.value))

const quickPresetOrderMap: Record<string, string[]> = {
  '1:plain': [`hero-image`, `shadow-card-single`, `frame-single`, `polaroid-single`, `full-bleed-single`, `scroll-window`],
  '2:plain': [`duo-gallery`, `compare-pair`, `magazine-spread`, `vertical-pair`, `duo-focus`],
  '3:plain': [`triptych-gallery`, `vertical-strip`, `stack-gallery`, `mosaic-focus`, `filmstrip-gallery`],
  '4:plain': [`quad-grid`, `hero-trio`],
  '1:brief': [`gradient-caption`, `numbered-figure`, `quote-figure`, `split-left`, `caption-band`, `spotlight-card`, `split-right`],
  '2:story': [`story-pair`],
}

const activePresets = computed(() => {
  if (!hasPrimaryTemplateFilters.value) {
    return []
  }

  return mediaLayoutPresets.filter((preset) => {
    return matchesCountFilter(preset) && matchesModeFilter(preset) && matchesFamilyFilter(preset)
  })
})

const rankedActivePresets = computed(() => {
  const key = `${templateCountFilter.value}:${templateModeFilter.value}`
  const preferredOrder = quickPresetOrderMap[key] || []

  return [...activePresets.value].sort((left, right) => {
    const leftRank = preferredOrder.indexOf(left.id)
    const rightRank = preferredOrder.indexOf(right.id)
    const normalizedLeftRank = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank
    const normalizedRightRank = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank
    return normalizedLeftRank - normalizedRightRank
  })
})

const recommendedPresets = computed(() => rankedActivePresets.value.slice(0, 3))
const hiddenPresetCount = computed(() => Math.max(0, rankedActivePresets.value.length - recommendedPresets.value.length))
const visiblePresets = computed(() => showAllTemplates.value ? rankedActivePresets.value : recommendedPresets.value)
const mpSafetyLabel = computed(() => mpUploadReady.value ? `公众号安全复制已就绪` : `未配置公众号图床`)
const mpSafetyHint = computed(() => {
  return mpUploadReady.value
    ? `复制到公众号时会优先把图片转成微信托管地址，并按 JPG/PNG 兼容链路处理。`
    : `当前未配置公众号图床。为了避免图片无法粘贴，含图片内容不应直接复制到公众号。`
})

const selectedPreset = computed<MediaLayoutPreset | null>(() => {
  return rankedActivePresets.value.find(preset => preset.id === selectedPresetId.value) ?? rankedActivePresets.value[0] ?? null
})

const selectedImageEntries = computed(() => {
  const slotCount = selectedPreset.value?.slotCount ?? 0
  return Array.from({ length: slotCount }, (_, index) => {
    const id = selectedImageIds.value[index]
    return availableImages.value.find(item => item.id === id) ?? null
  })
})

const activeSlotState = computed(() => {
  if (!selectedPreset.value) {
    return null
  }
  return formState.images[activeSlotIndex.value] ?? null
})

const selectedImages = computed(() => {
  return selectedImageEntries.value.filter((item): item is MarkdownImageEntry => Boolean(item))
})

const supportsSlotBadge = computed(() => {
  return Boolean(selectedPreset.value && mediaLayoutPresetSupportsBadge(selectedPreset.value.id))
})

const activeSlotBadgePlaceholder = computed(() => {
  if (!selectedPreset.value) {
    return `角标文字，可不填`
  }
  const fallback = getMediaLayoutBadgeFallback(selectedPreset.value.id, activeSlotIndex.value)
  return fallback ? `角标文字，默认「${fallback}」` : `角标文字，可不填`
})

const copyPlaceholders = computed(() => {
  return getMediaLayoutCopyPlaceholders(selectedPreset.value?.id ?? ``)
})

const filledSlotCount = computed(() => {
  return selectedImageEntries.value.filter(Boolean).length
})

const remainingImageCount = computed(() => detectedImages.value.length)
const remainingGroupCount = computed(() => {
  if (!selectedPreset.value || selectedPreset.value.slotCount === 0) {
    return 0
  }
  return Math.floor(remainingImageCount.value / selectedPreset.value.slotCount)
})
const remainingImageRemainder = computed(() => {
  if (!selectedPreset.value || selectedPreset.value.slotCount === 0) {
    return 0
  }
  return remainingImageCount.value % selectedPreset.value.slotCount
})
const needsSmallerTemplate = computed(() => {
  const preset = selectedPreset.value
  if (!preset) {
    return false
  }
  return remainingImageCount.value > 0 && remainingImageCount.value < preset.slotCount
})

const canApplyLayout = computed(() => {
  if (!selectedPreset.value) {
    return false
  }
  return filledSlotCount.value === selectedPreset.value.slotCount
})

const shouldShowTextStage = computed(() => selectedPreset.value?.textMode !== `plain`)
const usesBodyCopyPreset = computed(() => selectedPreset.value?.textMode === `brief`)
const isStoryPreset = computed(() => selectedPreset.value?.textMode === `story`)

const latestGeneratedLayoutBlock = computed(() => {
  return detectedLayoutBlocks.value[detectedLayoutBlocks.value.length - 1] ?? null
})

const visibleGeneratedLayoutBlocks = computed(() => {
  if (showAllGeneratedLayouts.value) {
    return detectedLayoutBlocks.value
  }
  return latestGeneratedLayoutBlock.value ? [latestGeneratedLayoutBlock.value] : []
})

watch([templateCountFilter, templateModeFilter, templateFamilyFilter], () => {
  if (!selectedPreset.value || !activePresets.value.some(preset => preset.id === selectedPresetId.value)) {
    selectedPresetId.value = rankedActivePresets.value[0]?.id ?? ``
  }
  showAllTemplates.value = false
  normalizeSelectedImageIds(selectedImageIds.value, true)
})

watch(selectedPresetId, () => {
  applyPresetSlotDefaults()
  normalizeSelectedImageIds(selectedImageIds.value, true)
  showSlotTuning.value = false
  showImageLibrary.value = false
})

watch(shouldShowTextStage, (visible) => {
  if (!visible) {
    showTextEditor.value = false
    showAdvancedDetailFields.value = false
  }
})

watch(detectedImages, (images) => {
  const existingIds = new Set(images.map(item => item.id))
  const editingIds = new Set(editingImagePool.value.map(item => item.id))
  normalizeSelectedImageIds(selectedImageIds.value.filter(id => existingIds.has(id) || editingIds.has(id)), false)
}, { immediate: true })

watch(
  [markdownContent, selectedPreset, selectedImageEntries],
  syncLayoutPreviewToArticle,
  { deep: true, immediate: true },
)

watch(formState, syncLayoutPreviewToArticle, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener(`focus`, refreshMpUploadStatus)
  renderStore.clearPreviewContentOverride()
  renderStore.render(editorStore.getContent())
})

onMounted(async () => {
  await refreshMpUploadStatus()
  window.addEventListener(`focus`, refreshMpUploadStatus)
})

function parseMarkdownImages(content: string): MarkdownImageEntry[] {
  const entries: MarkdownImageEntry[] = []
  const regex = /!\[(.*?)\]\((.+?)\)/g
  for (const match of content.matchAll(regex)) {
    const rawTarget = (match[2] || ``).trim()
    const url = rawTarget.replace(/\s+["'][^"']*["']\s*$/, ``).trim()
    if (!url) {
      continue
    }

    const from = match.index ?? 0
    const raw = match[0]
    entries.push({
      id: `${from}-${url}`,
      alt: (match[1] || ``).trim(),
      url,
      raw,
      from,
      to: from + raw.length,
    })
  }
  return entries
}

async function refreshMpUploadStatus() {
  mpUploadReady.value = await hasMpUploadConfig()
}

function createWorkspaceLayoutFormState() {
  const state = createDefaultMediaLayoutState()
  state.blockWidth = 100
  state.sectionLabel = ``
  state.sectionTitle = ``
  state.sectionLead = ``
  state.bodyTitle = ``
  state.bodyText = ``
  state.secondaryText = ``
  state.ctaText = ``
  state.ctaUrl = ``
  state.images = state.images.map((slot, index) => ({
    ...slot,
    alt: `图片 ${index + 1}`,
    caption: ``,
    title: ``,
    summary: ``,
  }))
  return state
}

function clearTextFields() {
  const blank = createWorkspaceLayoutFormState()
  formState.sectionLabel = blank.sectionLabel
  formState.sectionTitle = blank.sectionTitle
  formState.sectionLead = blank.sectionLead
  formState.bodyTitle = blank.bodyTitle
  formState.bodyText = blank.bodyText
  formState.secondaryText = blank.secondaryText
  formState.ctaText = blank.ctaText
  formState.ctaUrl = blank.ctaUrl
  formState.images = formState.images.map((slot, index) => ({
    ...slot,
    caption: blank.images[index].caption,
    title: blank.images[index].title,
    summary: blank.images[index].summary,
  }))
}

function matchesCountFilter(preset: MediaLayoutPreset) {
  return preset.slotCount === Number(templateCountFilter.value)
}

function matchesModeFilter(preset: MediaLayoutPreset) {
  return preset.textMode === templateModeFilter.value
}

function matchesFamilyFilter(preset: MediaLayoutPreset) {
  if (templateFamilyFilter.value === `all`) {
    return true
  }
  return preset.family === templateFamilyFilter.value
}

function setPreset(preset: MediaLayoutPreset) {
  selectedPresetId.value = preset.id
  activeSlotIndex.value = 0
  applyPresetSlotDefaults(preset.id)
  normalizeSelectedImageIds(selectedImageIds.value, true)
}

function applyPresetSlotDefaults(presetId = selectedPreset.value?.id) {
  if (!presetId) {
    return
  }

  const slotDefaults = getMediaLayoutPresetSlotDefaults(presetId)
  for (let index = 0; index < formState.images.length; index += 1) {
    const currentSlot = formState.images[index]
    const defaults = slotDefaults[index] ?? slotDefaults[slotDefaults.length - 1]
    if (!defaults) {
      continue
    }
    currentSlot.aspectRatio = defaults.aspectRatio
    currentSlot.minHeight = defaults.minHeight
  }
}

function normalizeSelectedImageIds(nextIds: string[] = selectedImageIds.value, fillBlanks = false) {
  const slotCount = selectedPreset.value?.slotCount ?? 0
  const validIds = new Set(availableImages.value.map(item => item.id))
  const normalized = Array.from({ length: slotCount }, (_, index) => {
    const candidate = nextIds[index]
    return candidate && validIds.has(candidate) ? candidate : ``
  })

  if (fillBlanks) {
    const usedIds = new Set(normalized.filter(Boolean))
    const suggestedIds = availableImages.value
      .map(item => item.id)
      .filter(id => !usedIds.has(id))

    for (let index = 0; index < normalized.length; index += 1) {
      if (normalized[index]) {
        continue
      }
      normalized[index] = suggestedIds.shift() ?? ``
    }
  }

  selectedImageIds.value = normalized
  if (activeSlotIndex.value >= normalized.length) {
    activeSlotIndex.value = Math.max(0, normalized.length - 1)
  }
}

function setActiveSlot(index: number) {
  activeSlotIndex.value = index
}

function clearSlot(index: number) {
  const slotCount = selectedPreset.value?.slotCount ?? 0
  const nextIds = Array.from({ length: slotCount }, (_, slotIndex) => selectedImageIds.value[slotIndex] ?? ``)
  nextIds[index] = ``
  selectedImageIds.value = nextIds
  activeSlotIndex.value = index
}

function resetActiveSlotTuning() {
  const preset = selectedPreset.value
  const slot = activeSlotState.value
  if (!preset || !slot) {
    return
  }

  const defaults = getMediaLayoutPresetSlotDefaults(preset.id)
  const activeDefaults = defaults[activeSlotIndex.value] ?? defaults[defaults.length - 1]
  if (!activeDefaults) {
    return
  }

  formState.blockWidth = 100
  slot.aspectRatio = activeDefaults.aspectRatio
  slot.minHeight = activeDefaults.minHeight
}

function getAssignedSlotIndex(id: string) {
  return selectedImageIds.value.findIndex(item => item === id)
}

function assignImageToSlot(id: string) {
  const slotCount = selectedPreset.value?.slotCount ?? 0
  const nextIds = Array.from({ length: slotCount }, (_, index) => selectedImageIds.value[index] ?? ``)
  const previousIndex = getAssignedSlotIndex(id)

  if (nextIds[activeSlotIndex.value] === id) {
    clearSlot(activeSlotIndex.value)
    return
  }

  if (previousIndex !== -1) {
    nextIds[previousIndex] = ``
  }

  nextIds[activeSlotIndex.value] = id
  selectedImageIds.value = nextIds

  const nextEmptyIndex = nextIds.findIndex((item, index) => !item && index > activeSlotIndex.value)
  if (nextEmptyIndex !== -1) {
    activeSlotIndex.value = nextEmptyIndex
  }
}

function selectSuggestedImages() {
  normalizeSelectedImageIds([], true)
}

function clearAllSelectedImages() {
  const slotCount = selectedPreset.value?.slotCount ?? 0
  selectedImageIds.value = Array.from({ length: slotCount }, () => ``)
  activeSlotIndex.value = 0
}

function startEditingBlock(block: MediaLayoutBlockEntry) {
  const preset = mediaLayoutPresets.find(item => item.id === block.presetId)
  if (!preset) {
    toast.error(`当前模块暂时无法回填编辑`)
    return
  }

  const blockImagePool = block.form.images
    .slice(0, preset.slotCount)
    .map((slot, index) => ({
      id: `editing-${block.id}-${index}`,
      alt: slot.alt || `图片 ${index + 1}`,
      url: slot.url,
      raw: ``,
      from: -1,
      to: -1,
    }))
    .filter(item => item.url.trim())

  editingBlockId.value = block.id
  editingImagePool.value = blockImagePool
  templateCountFilter.value = String(preset.slotCount) as TemplateCountFilter
  templateModeFilter.value = preset.textMode
  templateFamilyFilter.value = preset.family
  selectedPresetId.value = preset.id
  activeSlotIndex.value = 0
  showImageLibrary.value = true
  showSlotTuning.value = true
  showTextEditor.value = preset.textMode !== `plain`
  showAdvancedDetailFields.value = false

  nextTick(() => {
    Object.assign(formState, cloneMediaLayoutState(block.form))
    selectedImageIds.value = blockImagePool.map(item => item.id)
    showImageLibrary.value = true
    showSlotTuning.value = true
    syncLayoutPreviewToArticle()
  })
}

function cancelEditingBlock() {
  editingBlockId.value = ``
  editingImagePool.value = []
  renderStore.clearPreviewContentOverride()
  renderStore.render(editorStore.getContent())
  normalizeSelectedImageIds([], true)
}

function getPresetPreviewBlueprint(presetId: string) {
  return presetPreviewBlueprints[presetId] ?? presetPreviewBlueprints[`hero-image`]
}

function buildLayoutStateFromSelection(images: Array<MarkdownImageEntry | null>): MediaLayoutFormState {
  const nextState = cloneMediaLayoutState(formState)
  const slotCount = selectedPreset.value?.slotCount ?? 0
  for (let index = 0; index < slotCount; index += 1) {
    const image = images[index]
    if (!image) {
      continue
    }

    nextState.images[index].url = image.url
    if (!nextState.images[index].alt.trim() || /^图片 \d+$/.test(nextState.images[index].alt.trim())) {
      nextState.images[index].alt = image.alt || `图片 ${index + 1}`
    }
  }

  if (selectedPreset.value?.textMode === `plain`) {
    nextState.sectionLabel = ``
    nextState.sectionTitle = ``
    nextState.sectionLead = ``
    nextState.bodyTitle = ``
    nextState.bodyText = ``
    nextState.secondaryText = ``
    nextState.ctaText = ``
    nextState.ctaUrl = ``
    nextState.images = nextState.images.map(slot => ({
      ...slot,
      caption: ``,
      title: supportsSlotBadge.value ? slot.title : ``,
      summary: ``,
    }))
  }

  return nextState
}

function buildDraftLayoutContent() {
  if (!selectedPreset.value || selectedImages.value.length === 0) {
    return ``
  }

  const currentContent = markdownContent.value
  const layoutMarkup = buildMediaLayoutMarkup(selectedPreset.value, buildLayoutStateFromSelection(selectedImageEntries.value), true)

  if (editingBlock.value) {
    return `${currentContent.slice(0, editingBlock.value.from)}\n${layoutMarkup}\n${currentContent.slice(editingBlock.value.to)}`
      .replace(/\n{3,}/g, `\n\n`)
  }

  const sortedImages = [...selectedImages.value].sort((a, b) => a.from - b.from)
  const insertionPos = sortedImages[0].from

  let nextContent = currentContent
  for (let index = sortedImages.length - 1; index >= 0; index -= 1) {
    const image = sortedImages[index]
    nextContent = `${nextContent.slice(0, image.from)}${nextContent.slice(image.to)}`
  }

  return `${nextContent.slice(0, insertionPos)}\n${layoutMarkup}\n${nextContent.slice(insertionPos)}`
    .replace(/\n{3,}/g, `\n\n`)
}

function syncLayoutPreviewToArticle() {
  if (!renderStore.getRenderer()) {
    return
  }

  const previewContent = buildDraftLayoutContent()
  renderStore.setPreviewContentOverride(previewContent)
  renderStore.render(renderStore.resolvePreviewContent(editorStore.getContent()))
}

function applyLayoutToMarkdown() {
  if (!currentPost.value || !selectedPreset.value) {
    return
  }

  if (!canApplyLayout.value) {
    toast.error(`请先选满 ${selectedPreset.value.slotCount} 张图片`)
    return
  }

  const currentContent = markdownContent.value
  const layoutMarkup = buildMediaLayoutMarkup(selectedPreset.value, buildLayoutStateFromSelection(selectedImages.value))

  if (editingBlock.value) {
    const nextContent = `${currentContent.slice(0, editingBlock.value.from)}\n${layoutMarkup}\n${currentContent.slice(editingBlock.value.to)}`
      .replace(/\n{3,}/g, `\n\n`)

    renderStore.clearPreviewContentOverride()
    editingBlockId.value = ``
    editingImagePool.value = []
    editorStore.importContent(nextContent)
    postStore.updatePostContent(currentPost.value.id, nextContent)
    renderStore.render(nextContent)
    toast.success(`已更新模块`)
    return
  }

  const sortedImages = [...selectedImages.value].sort((a, b) => a.from - b.from)
  const insertionPos = sortedImages[0].from

  let nextContent = currentContent
  for (let index = sortedImages.length - 1; index >= 0; index -= 1) {
    const image = sortedImages[index]
    nextContent = `${nextContent.slice(0, image.from)}${nextContent.slice(image.to)}`
  }

  nextContent = `${nextContent.slice(0, insertionPos)}\n${layoutMarkup}\n${nextContent.slice(insertionPos)}`
    .replace(/\n{3,}/g, `\n\n`)

  renderStore.clearPreviewContentOverride()
  selectedImageIds.value = []
  activeSlotIndex.value = 0
  editorStore.importContent(nextContent)
  postStore.updatePostContent(currentPost.value.id, nextContent)
  renderStore.render(nextContent)

  nextTick(() => {
    if (detectedImages.value.length > 0) {
      normalizeSelectedImageIds([], true)
    }
    else {
      clearAllSelectedImages()
    }
  })

  const nextRemainingCount = parseMarkdownImages(nextContent).length
  if (nextRemainingCount > 0) {
    toast.success(`已写入一组版式，剩余 ${nextRemainingCount} 张图片可继续处理`)
    return
  }

  toast.success(`已写入正文`)
}

function restoreLayoutBlock(block: MediaLayoutBlockEntry) {
  if (!currentPost.value) {
    return
  }

  const currentContent = markdownContent.value
  const restoredImages = restoreMediaLayoutBlockToMarkdown(block)
  if (!restoredImages) {
    toast.error(`当前拼图没有可恢复的图片`)
    return
  }

  const nextContent = `${currentContent.slice(0, block.from)}\n${restoredImages}\n${currentContent.slice(block.to)}`
    .replace(/\n{3,}/g, `\n\n`)

  renderStore.clearPreviewContentOverride()
  if (editingBlockId.value === block.id) {
    editingBlockId.value = ``
    editingImagePool.value = []
  }
  editorStore.importContent(nextContent)
  postStore.updatePostContent(currentPost.value.id, nextContent)
  renderStore.render(nextContent)
  selectedImageIds.value = []
  toast.success(`已恢复为普通 Markdown 图片`)
}

function getImageLabel(image: MarkdownImageEntry | null, index: number) {
  if (!image) {
    return `待选图片`
  }

  const alt = image.alt.trim()
  if (alt) {
    return alt
  }

  return `图片 ${index + 1}`
}
</script>

<template>
  <div class="media-layout-workspace">
    <div class="media-layout-workspace__header">
      <div class="media-layout-workspace__eyebrow">
        <LayoutTemplate class="size-3.5" />
        Image Layout Studio
      </div>
      <div class="media-layout-workspace__headline">
        <div>
          <h2>图片排版工作台</h2>
          <p>面向公众号粘贴重做：先用推荐模板快速成组，只有需要时才展开换图、微调和补文案。</p>
        </div>
        <div class="media-layout-workspace__chips">
          <span class="workspace-chip workspace-chip--accent">{{ filledSlotCount }}/{{ selectedPreset?.slotCount ?? 0 }} 已选</span>
          <span class="workspace-chip">{{ remainingImageCount }} 张待排版</span>
          <span class="workspace-chip" :class="{ 'workspace-chip--warning': !mpUploadReady }">{{ mpSafetyLabel }}</span>
          <span v-if="editingBlock" class="workspace-chip workspace-chip--editing">正在编辑模块</span>
          <span v-if="detectedLayoutBlocks.length" class="workspace-chip">{{ detectedLayoutBlocks.length }} 组已生成</span>
        </div>
      </div>
    </div>

    <div class="media-layout-workspace__body">
      <section class="media-layout-section">
        <div class="media-layout-section__header">
          <div>
            <h3>1. 选择版式</h3>
            <p>先选图片数量和表达方式，默认只给推荐模板；需要时再展开更多风格。</p>
          </div>
        </div>

        <div class="media-layout-safety-note" :class="{ 'media-layout-safety-note--warning': !mpUploadReady }">
          <strong>{{ mpSafetyLabel }}</strong>
          <span>{{ mpSafetyHint }}</span>
        </div>

        <div class="media-layout-filter-grid">
          <div class="grid gap-2">
            <label class="media-layout-filter-label">图片数量</label>
            <Select v-model="templateCountFilter">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="先选图片数量" />
              </SelectTrigger>
              <SelectContent @close-auto-focus.prevent>
                <SelectItem v-for="option in templateCountOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2">
            <label class="media-layout-filter-label">表达方式</label>
            <Select v-model="templateModeFilter">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="再选表达方式" />
              </SelectTrigger>
              <SelectContent @close-auto-focus.prevent>
                <SelectItem v-for="option in templateModeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="hasPrimaryTemplateFilters" class="grid gap-2">
            <label class="media-layout-filter-label">视觉风格</label>
            <Select v-model="templateFamilyFilter">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="可选，默认全部风格" />
              </SelectTrigger>
              <SelectContent @close-auto-focus.prevent>
                <SelectItem v-for="option in templateFamilyOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div v-if="!hasPrimaryTemplateFilters" class="media-layout-empty">
          默认不展示模板。先选“图片数量”和“表达方式”，再显示对应版式。
        </div>

        <template v-else-if="rankedActivePresets.length">
          <div class="media-layout-preset-grid">
            <button
              v-for="preset in visiblePresets"
              :key="preset.id"
              type="button"
              class="media-layout-preset"
              :class="{ 'media-layout-preset--active': preset.id === selectedPresetId }"
              @click="setPreset(preset)"
            >
              <div class="media-layout-preset__preview">
                <template v-for="(cell, index) in getPresetPreviewBlueprint(preset.id).cells" :key="`${preset.id}-cell-${index}`">
                  <span
                    class="media-layout-preset__cell"
                    :class="`media-layout-preset__cell--${cell.tone}`"
                    :style="{ left: cell.left, top: cell.top, width: cell.width, height: cell.height }"
                  />
                </template>
                <template v-for="(band, index) in getPresetPreviewBlueprint(preset.id).bands ?? []" :key="`${preset.id}-band-${index}`">
                  <span
                    class="media-layout-preset__band"
                    :style="{ left: band.left, top: band.top, width: band.width, height: band.height }"
                  />
                </template>
              </div>

              <div class="media-layout-preset__body">
                <div class="media-layout-preset__title-row">
                  <div class="media-layout-preset__title">
                    {{ preset.name }}
                  </div>
                  <span class="media-layout-preset__cue">{{ preset.cue }}</span>
                </div>
                <div class="media-layout-preset__desc">
                  {{ preset.description }}
                </div>
                <div class="media-layout-preset__meta">
                  <span>{{ preset.slotCount }} 张图</span>
                  <span>{{ mediaLayoutTextModeLabels[preset.textMode] }}</span>
                  <span>{{ mediaLayoutFamilyLabels[preset.family] }}</span>
                </div>
              </div>
            </button>
          </div>

          <div v-if="hiddenPresetCount > 0" class="media-layout-inline-actions">
            <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="showAllTemplates = !showAllTemplates">
              {{ showAllTemplates ? '收起更多模板' : `查看更多模板（+${hiddenPresetCount}）` }}
            </Button>
          </div>
        </template>

        <div v-else class="media-layout-empty">
          当前筛选下没有匹配模板。换一个表达方式或视觉风格即可。
        </div>
      </section>

      <section class="media-layout-section">
        <div class="media-layout-section__header">
          <div>
            <h3>2. 选图并微调</h3>
            <p>{{ editingBlock ? '当前是已生成模块编辑模式。保存后会直接覆盖原模块。' : '当前组只处理正文里还没排版的图片。写入一组后，会自动接到下一组。' }}</p>
          </div>
          <div class="flex gap-2">
            <Button v-if="editingBlock" variant="outline" size="sm" class="h-8 px-3 text-xs" @click="cancelEditingBlock">
              取消编辑
            </Button>
            <Button variant="outline" size="sm" class="h-8 px-3 text-xs" @click="openQuickInsert('upload')">
              <ImagePlus class="mr-2 size-3.5" />
              加图片
            </Button>
            <Button variant="outline" size="sm" class="h-8 px-3 text-xs" :disabled="!selectedPreset" @click="selectSuggestedImages">
              自动填充
            </Button>
            <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" :disabled="!selectedPreset" @click="clearAllSelectedImages">
              清空本组
            </Button>
            <Button size="sm" class="h-8 px-3 text-xs" :disabled="!canApplyLayout" @click="applyLayoutToMarkdown">
              <Sparkles class="mr-2 size-3.5" />
              {{ editingBlock ? '保存修改' : '写入正文' }}
            </Button>
          </div>
        </div>

        <div v-if="!selectedPreset" class="media-layout-empty">
          先选一个版式，这里才会出现对应的图片槽位和微调项。
        </div>

        <div v-else-if="availableImages.length" class="media-layout-stage">
          <div class="media-layout-inline-actions">
            <Button variant="outline" size="sm" class="h-8 px-3 text-xs" :disabled="!selectedPreset" @click="selectSuggestedImages">
              重抓下一组
            </Button>
            <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" :disabled="!selectedPreset" @click="showImageLibrary = !showImageLibrary">
              {{ showImageLibrary ? '收起换图' : '换图' }}
            </Button>
            <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" :disabled="!selectedPreset" @click="showSlotTuning = !showSlotTuning">
              {{ showSlotTuning ? '收起微调' : '微调当前图' }}
            </Button>
          </div>

          <div class="media-layout-slot-dock">
            <div
              v-for="(image, index) in selectedImageEntries"
              :key="`slot-${index}`"
              class="media-layout-slot-card"
              :class="{ 'media-layout-slot-card--active': index === activeSlotIndex }"
              role="button"
              tabindex="0"
              @click="setActiveSlot(index)"
            >
              <div class="media-layout-slot-card__thumb">
                <img v-if="image" :src="image.url" :alt="getImageLabel(image, index)">
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="media-layout-slot-card__copy">
                <div class="media-layout-slot-card__title">
                  {{ index + 1 }} 号位
                </div>
                <div class="media-layout-slot-card__meta">
                  {{ image ? getImageLabel(image, index) : '待选图片' }}
                </div>
              </div>
              <button
                v-if="image"
                type="button"
                class="media-layout-slot-card__clear"
                @click.stop="clearSlot(index)"
              >
                清空
              </button>
            </div>
          </div>

          <div class="media-layout-stage__tip">
            {{ editingBlock ? '你可以继续替换图片、改宽度、调尺寸，最后点“保存修改”覆盖原模块。' : '默认已经自动抓取下一组图片。大多数情况下，直接点“写入正文”就够了。' }}
          </div>

          <div v-if="showSlotTuning && activeSlotState" class="media-layout-tuning">
            <div class="media-layout-tuning__header">
              <div>
                <h4>当前版式微调</h4>
                <p>宽度调整个模块，比例和高度调当前图片。</p>
              </div>
              <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="resetActiveSlotTuning">
                恢复默认
              </Button>
            </div>

            <div class="media-layout-tuning__grid">
              <div class="grid gap-2">
                <div class="media-layout-range-head">
                  <label class="media-layout-filter-label">模块宽度</label>
                  <span>{{ formState.blockWidth }}%</span>
                </div>
                <input
                  v-model.number="formState.blockWidth"
                  class="media-layout-range"
                  type="range"
                  min="52"
                  max="100"
                  step="2"
                >
              </div>

              <div class="grid gap-2">
                <label class="media-layout-filter-label">图片比例</label>
                <Select v-model="activeSlotState.aspectRatio">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="选择图片比例" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in mediaAspectRatioOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="grid gap-2">
                <div class="media-layout-range-head">
                  <label class="media-layout-filter-label">图片高度</label>
                  <span>{{ activeSlotState.minHeight }}px</span>
                </div>
                <input
                  v-model.number="activeSlotState.minHeight"
                  class="media-layout-range"
                  type="range"
                  min="120"
                  max="480"
                  step="10"
                >
              </div>

              <div v-if="supportsSlotBadge" class="grid gap-2">
                <label class="media-layout-filter-label">当前图角标</label>
                <Input v-model="activeSlotState.title" :placeholder="activeSlotBadgePlaceholder" />
              </div>
            </div>
          </div>

          <div v-if="remainingGroupCount > 0" class="media-layout-stage__tip">
            按当前模板，正文里还能继续生成 {{ remainingGroupCount }} 组。
            <span v-if="remainingImageRemainder > 0">最后还会剩 {{ remainingImageRemainder }} 张，可切到更小模板继续处理。</span>
          </div>

          <div v-else-if="needsSmallerTemplate" class="media-layout-stage__tip">
            当前只剩 {{ remainingImageCount }} 张图片，当前模板不匹配。把上面的图片数量切小即可继续。
          </div>

          <div v-if="showImageLibrary" class="media-layout-source-grid">
            <button
              v-for="(image, index) in detectedImages"
              :key="image.id"
              type="button"
              class="media-layout-source-card"
              :class="{ 'media-layout-source-card--active': getAssignedSlotIndex(image.id) !== -1 }"
              @click="assignImageToSlot(image.id)"
            >
              <div class="media-layout-source-card__thumb">
                <img :src="image.url" :alt="getImageLabel(image, index)">
                <span v-if="getAssignedSlotIndex(image.id) !== -1" class="media-layout-source-card__badge">
                  <Check class="size-3" />
                  {{ getAssignedSlotIndex(image.id) + 1 }}
                </span>
              </div>
              <div class="media-layout-source-card__copy">
                <div class="media-layout-source-card__title">
                  {{ getImageLabel(image, index) }}
                </div>
                <div class="media-layout-source-card__meta">
                  Markdown 图片
                </div>
              </div>
            </button>
          </div>
        </div>

        <div v-else class="media-layout-empty">
          <p>{{ editingBlock ? '当前模块没有可回填的图片，暂时无法编辑。' : '还没有识别到 Markdown 图片。可以直接从这里批量加图，也可以在左侧 Markdown 中插入 `![](url)`。' }}</p>
          <div v-if="!editingBlock" class="media-layout-inline-actions">
            <Button size="sm" class="h-8 px-3 text-xs" @click="openQuickInsert('upload')">
              <ImagePlus class="mr-2 size-3.5" />
              批量上传图片
            </Button>
            <Button variant="outline" size="sm" class="h-8 px-3 text-xs" @click="openQuickInsert('link')">
              按链接插入
            </Button>
            <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="openQuickInsert('recent')">
              最近使用的图片
            </Button>
          </div>
        </div>
      </section>

      <section v-if="shouldShowTextStage" class="media-layout-section">
        <div class="media-layout-section__header">
          <div>
            <h3>3. 文字微调</h3>
            <p>默认不展开。只有你确实要补标题、摘要或说明时，再打开这一栏。</p>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" class="h-8 px-3 text-xs" @click="showTextEditor = !showTextEditor">
              {{ showTextEditor ? '收起文字编辑' : '补一点文字' }}
            </Button>
            <Button v-if="showTextEditor" variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="clearTextFields">
              清空文字
            </Button>
          </div>
        </div>

        <div v-if="showTextEditor" class="media-layout-copy-stage">
          <template v-if="usesBodyCopyPreset">
            <div class="media-layout-copy-stage__core">
              <Input v-model="formState.bodyTitle" :placeholder="copyPlaceholders.title" />
              <Textarea v-model="formState.bodyText" class="min-h-[88px]" :placeholder="copyPlaceholders.body" />
            </div>
          </template>

          <template v-else-if="isStoryPreset">
            <div class="media-layout-copy-stage__core">
              <Input v-model="formState.sectionTitle" placeholder="这一组的总标题，可不填" />
              <Textarea v-model="formState.sectionLead" class="min-h-[72px]" placeholder="这一组的导语，可不填" />
            </div>

            <div class="media-layout-story-grid-edit">
              <div
                v-for="(slot, index) in formState.images.slice(0, selectedPreset?.slotCount ?? 0)"
                :key="`story-slot-${index}`"
                class="media-layout-story-edit-card"
              >
                <div class="media-layout-story-edit-card__head">
                  <div class="media-layout-story-edit-card__avatar">
                    <img
                      v-if="selectedImageEntries[index]"
                      :src="selectedImageEntries[index]?.url"
                      :alt="selectedImageEntries[index]?.alt || `图片 ${index + 1}`"
                    >
                    <span v-else>{{ index + 1 }}</span>
                  </div>
                  <span>卡片 {{ index + 1 }}</span>
                </div>
                <Input v-model="slot.title" placeholder="卡片标题，可不填" />
                <Textarea v-model="slot.summary" class="min-h-[72px]" placeholder="卡片摘要，可不填" />
              </div>
            </div>
          </template>

          <div v-if="showAdvancedDetailFields" class="media-layout-advanced-block">
            <div class="media-layout-advanced-block__title">
              高级项
            </div>

            <div class="grid gap-3">
              <Input v-model="formState.sectionLabel" placeholder="版块标签，可不填" />

              <template v-if="usesBodyCopyPreset">
                <Input v-model="formState.sectionTitle" placeholder="版块标题，可不填" />
                <Textarea v-model="formState.sectionLead" class="min-h-[72px]" placeholder="版块导语，可不填" />
                <Textarea v-model="formState.secondaryText" class="min-h-[72px]" placeholder="补充说明，可不填" />
                <div class="grid gap-3 md:grid-cols-2">
                  <Input v-model="formState.ctaText" placeholder="链接文案，可不填" />
                  <Input v-model="formState.ctaUrl" placeholder="链接地址，可不填" />
                </div>
              </template>

              <template v-if="selectedPreset?.slotCount">
                <div class="media-layout-caption-grid">
                  <Input
                    v-for="(slot, index) in formState.images.slice(0, selectedPreset.slotCount)"
                    :key="`caption-slot-${index}`"
                    v-model="slot.caption"
                    :placeholder="`图片 ${index + 1} 说明，可不填`"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="media-layout-empty">
          默认不补文案，直接写入正文即可。只有需要标题、摘要或说明时，再展开这一栏。
        </div>
      </section>

      <section v-if="detectedLayoutBlocks.length" class="media-layout-section">
        <div class="media-layout-section__header">
          <div>
            <h3>4. 已生成模块</h3>
            <p>已生成的拼图不再占据主工作流。只有在需要取消时，再从这里恢复原图。</p>
          </div>
          <div class="flex gap-2">
            <Button
              v-if="latestGeneratedLayoutBlock"
              variant="outline"
              size="sm"
              class="h-8 px-3 text-xs"
              @click="restoreLayoutBlock(latestGeneratedLayoutBlock)"
            >
              <RotateCcw class="mr-2 size-3.5" />
              恢复最近一组
            </Button>
            <Button
              v-if="detectedLayoutBlocks.length > 1"
              variant="ghost"
              size="sm"
              class="h-8 px-3 text-xs"
              @click="showAllGeneratedLayouts = !showAllGeneratedLayouts"
            >
              {{ showAllGeneratedLayouts ? '收起列表' : `查看全部 ${detectedLayoutBlocks.length} 组` }}
            </Button>
          </div>
        </div>

        <div class="media-layout-generated-list">
          <div
            v-for="block in visibleGeneratedLayoutBlocks"
            :key="block.id"
            class="media-layout-generated-item"
          >
            <div class="media-layout-generated-item__content">
              <div class="media-layout-generated-item__title">
                {{ block.title }}
              </div>
              <div class="media-layout-generated-item__meta">
                {{ block.layoutType === 'image' ? '图片排版' : '图文排版' }} · {{ block.images.length }} 张图
              </div>
            </div>
            <div class="media-layout-generated-item__actions">
              <Button variant="outline" size="sm" class="h-9 shrink-0 px-3" @click="startEditingBlock(block)">
                编辑模块
              </Button>
              <Button variant="outline" size="sm" class="h-9 shrink-0 px-3" @click="restoreLayoutBlock(block)">
                <RotateCcw class="mr-2 size-3.5" />
                恢复原图
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="less">
.media-layout-workspace {
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid hsl(var(--border) / 0.82);
  border-radius: 28px;
  background:
    linear-gradient(180deg, hsl(var(--card) / 0.99), hsl(var(--card) / 0.95)),
    radial-gradient(circle at top left, hsl(var(--accent) / 0.16), transparent 40%);
  box-shadow:
    0 22px 70px hsl(var(--foreground) / 0.07),
    inset 0 1px 0 hsl(var(--background));
}

.media-layout-workspace__header {
  padding: 1.25rem 1.35rem 0.95rem;
  border-bottom: 1px solid hsl(var(--border) / 0.75);
}

.media-layout-workspace__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.9rem;
  padding: 0.42rem 0.76rem;
  border: 1px solid hsl(var(--border) / 0.82);
  border-radius: 999px;
  background: hsl(var(--background) / 0.88);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

.media-layout-workspace__headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.media-layout-workspace__headline h2 {
  margin: 0;
  font-size: clamp(1.08rem, 1rem + 0.42vw, 1.38rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: hsl(var(--foreground));
}

.media-layout-workspace__headline p {
  margin: 0.45rem 0 0;
  font-size: 0.86rem;
  line-height: 1.58;
  color: hsl(var(--muted-foreground));
}

.media-layout-workspace__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
}

.workspace-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.46rem 0.78rem;
  border: 1px solid hsl(var(--border) / 0.82);
  border-radius: 999px;
  background: hsl(var(--secondary) / 0.94);
  font-size: 0.76rem;
  line-height: 1;
  white-space: nowrap;
  color: hsl(var(--muted-foreground));
}

.workspace-chip--accent {
  border-color: hsl(var(--primary) / 0.24);
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.workspace-chip--editing {
  border-color: hsl(var(--ring) / 0.35);
  background: hsl(var(--accent) / 0.3);
  color: hsl(var(--foreground));
}

.workspace-chip--warning {
  border-color: hsl(var(--destructive) / 0.25);
  background: hsl(var(--destructive) / 0.08);
  color: hsl(var(--destructive));
}

.media-layout-workspace__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
  background:
    radial-gradient(circle at top left, hsl(var(--accent) / 0.13), transparent 30%),
    linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.44));
}

.media-layout-section + .media-layout-section {
  margin-top: 1rem;
}

.media-layout-section {
  border: 1px solid hsl(var(--border) / 0.78);
  border-radius: 24px;
  background: hsl(var(--background) / 0.88);
  padding: 1rem;
}

.media-layout-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.95rem;
}

.media-layout-section__header h3 {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.media-layout-section__header p {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
  color: hsl(var(--muted-foreground));
}

.media-layout-filter-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.media-layout-filter-label {
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.2;
  color: hsl(var(--muted-foreground));
}

.media-layout-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.media-layout-safety-note {
  display: grid;
  gap: 0.22rem;
  margin-bottom: 0.9rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid hsl(var(--border) / 0.82);
  border-radius: 18px;
  background: hsl(var(--secondary) / 0.58);
}

.media-layout-safety-note strong {
  font-size: 0.78rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.media-layout-safety-note span {
  font-size: 0.74rem;
  line-height: 1.55;
  color: hsl(var(--muted-foreground));
}

.media-layout-safety-note--warning {
  border-color: hsl(var(--destructive) / 0.2);
  background: hsl(var(--destructive) / 0.06);
}

.media-layout-safety-note--warning strong,
.media-layout-safety-note--warning span {
  color: hsl(var(--destructive));
}

.media-layout-preset-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.media-layout-preset {
  display: grid;
  gap: 0.85rem;
  padding: 0.9rem;
  border: 1px solid hsl(var(--border));
  border-radius: 20px;
  text-align: left;
  background: linear-gradient(180deg, hsl(var(--background)), hsl(var(--background) / 0.92));
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.media-layout-preset:hover {
  border-color: hsl(var(--ring) / 0.42);
  background: hsl(var(--accent) / 0.22);
  transform: translateY(-1px);
}

.media-layout-preset--active {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsl(var(--accent) / 0.26);
  background: hsl(var(--accent) / 0.28);
}

.media-layout-preset__preview {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border: 1px solid hsl(var(--border) / 0.72);
  border-radius: 18px;
  background:
    linear-gradient(180deg, #ffffff, hsl(var(--muted) / 0.55)),
    radial-gradient(circle at top left, hsl(var(--accent) / 0.34), transparent 44%);
}

.media-layout-preset__cell,
.media-layout-preset__band {
  position: absolute;
  border-radius: 12px;
}

.media-layout-preset__cell {
  border: 1px solid hsl(var(--border) / 0.5);
}

.media-layout-preset__cell--strong {
  background: linear-gradient(135deg, hsl(var(--primary) / 0.28), hsl(var(--primary) / 0.14));
}

.media-layout-preset__cell--soft {
  background: linear-gradient(135deg, hsl(var(--accent) / 0.42), hsl(var(--accent) / 0.18));
}

.media-layout-preset__cell--muted {
  background: linear-gradient(135deg, hsl(var(--muted) / 0.92), hsl(var(--muted) / 0.62));
}

.media-layout-preset__band {
  background: hsl(var(--background) / 0.84);
  border: 1px solid hsl(var(--border) / 0.52);
}

.media-layout-preset__body {
  display: grid;
  gap: 0.42rem;
}

.media-layout-preset__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.media-layout-preset__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.media-layout-preset__cue {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.48rem;
  border-radius: 999px;
  background: hsl(var(--secondary));
  font-size: 0.68rem;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.media-layout-preset__desc {
  font-size: 0.77rem;
  line-height: 1.52;
  color: hsl(var(--muted-foreground));
}

.media-layout-preset__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
}

.media-layout-preset__meta span {
  padding: 0.18rem 0.46rem;
  border-radius: 999px;
  background: hsl(var(--secondary) / 0.82);
}

.media-layout-stage {
  display: grid;
  gap: 0.85rem;
}

.media-layout-slot-dock {
  display: grid;
  gap: 0.7rem;
}

.media-layout-slot-card {
  display: grid;
  align-items: center;
  gap: 0.75rem;
  grid-template-columns: 3.25rem minmax(0, 1fr) auto;
  padding: 0.7rem;
  border: 1px solid hsl(var(--border));
  border-radius: 18px;
  background: hsl(var(--background));
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.media-layout-slot-card:hover {
  border-color: hsl(var(--ring) / 0.42);
  transform: translateY(-1px);
}

.media-layout-slot-card--active {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsl(var(--accent) / 0.26);
}

.media-layout-slot-card__thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  overflow: hidden;
  border-radius: 0.95rem;
  background: hsl(var(--muted) / 0.72);
  font-size: 0.82rem;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
}

.media-layout-slot-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-layout-slot-card__copy {
  min-width: 0;
}

.media-layout-slot-card__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.media-layout-slot-card__meta {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: hsl(var(--muted-foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-layout-slot-card__clear {
  padding: 0.28rem 0.5rem;
  border-radius: 999px;
  background: hsl(var(--secondary));
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
}

.media-layout-stage__tip {
  padding: 0.72rem 0.85rem;
  border-radius: 16px;
  background: hsl(var(--secondary) / 0.88);
  font-size: 0.76rem;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.media-layout-tuning {
  padding: 0.9rem;
  border: 1px solid hsl(var(--border));
  border-radius: 18px;
  background: linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.24));
}

.media-layout-tuning__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.media-layout-tuning__header h4 {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.media-layout-tuning__header p {
  margin: 0.28rem 0 0;
  font-size: 0.74rem;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.media-layout-tuning__grid {
  display: grid;
  gap: 0.85rem;
}

.media-layout-range-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.76rem;
  color: hsl(var(--muted-foreground));
}

.media-layout-range {
  width: 100%;
  accent-color: hsl(var(--primary));
  cursor: ew-resize;
}

.media-layout-source-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 0.15rem;
}

.media-layout-source-card {
  display: grid;
  gap: 0.68rem;
  padding: 0.7rem;
  border: 1px solid hsl(var(--border));
  border-radius: 18px;
  background: hsl(var(--background));
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.media-layout-source-card:hover {
  border-color: hsl(var(--ring) / 0.4);
  transform: translateY(-1px);
}

.media-layout-source-card--active {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsl(var(--accent) / 0.24);
}

.media-layout-source-card__thumb {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  background: hsl(var(--muted) / 0.72);
}

.media-layout-source-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-layout-source-card__badge {
  position: absolute;
  right: 0.45rem;
  bottom: 0.45rem;
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  padding: 0.22rem 0.42rem;
  border-radius: 999px;
  background: hsl(var(--primary));
  font-size: 0.66rem;
  font-weight: 700;
  color: hsl(var(--primary-foreground));
}

.media-layout-source-card__copy {
  min-width: 0;
}

.media-layout-source-card__title {
  font-size: 0.78rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-layout-source-card__meta {
  margin-top: 0.18rem;
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
}

.media-layout-copy-stage {
  display: grid;
  gap: 0.85rem;
}

.media-layout-copy-stage__core {
  display: grid;
  gap: 0.75rem;
}

.media-layout-story-grid-edit {
  display: grid;
  gap: 0.75rem;
}

.media-layout-story-edit-card {
  display: grid;
  gap: 0.75rem;
  padding: 0.95rem;
  border: 1px solid hsl(var(--border));
  border-radius: 18px;
  background: hsl(var(--background));
}

.media-layout-story-edit-card__head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.media-layout-story-edit-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border-radius: 0.9rem;
  background: hsl(var(--muted) / 0.78);
  font-size: 0.78rem;
  color: hsl(var(--muted-foreground));
}

.media-layout-story-edit-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-layout-advanced-block {
  display: grid;
  gap: 0.85rem;
  padding: 0.95rem;
  border: 1px dashed hsl(var(--border));
  border-radius: 18px;
  background: hsl(var(--muted) / 0.24);
}

.media-layout-advanced-block__title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: hsl(var(--muted-foreground));
}

.media-layout-caption-grid {
  display: grid;
  gap: 0.75rem;
}

.media-layout-generated-list {
  display: grid;
  gap: 0.75rem;
}

.media-layout-generated-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid hsl(var(--border));
  border-radius: 18px;
  background: hsl(var(--background));
}

.media-layout-generated-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: flex-end;
}

.media-layout-generated-item__content {
  min-width: 0;
}

.media-layout-generated-item__title {
  font-size: 0.86rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.media-layout-generated-item__meta {
  margin-top: 0.28rem;
  font-size: 0.74rem;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.media-layout-empty {
  padding: 1rem;
  border: 1px dashed hsl(var(--border));
  border-radius: 18px;
  font-size: 0.8rem;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 0.34);
}

@media (max-width: 1280px) {
  .media-layout-filter-grid {
    grid-template-columns: 1fr;
  }

  .media-layout-source-grid {
    grid-template-columns: 1fr;
  }
}
</style>
