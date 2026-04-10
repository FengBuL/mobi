<script setup lang="ts">
import type {
  HeadingLevel,
  HeadingStyles,
  HeadingStyleType,
  IStylePreset,
  themeMap,
} from '@md/shared/configs'
import type { Format } from 'vue-pick-colors'
import {
  codeBlockThemeOptions,
  colorCategoryOptions,
  colorOptions,
  defaultStyleConfig,
  fontCategoryOptions,
  fontFamilyOptions,
  fontSizeOptions,
  headingLevelOptions,
  headingStyleOptions,
  legendOptions,
  stylePresetOptions,
  themeCategoryOptions,
  themeOptions,
} from '@md/shared/configs'
import { X } from 'lucide-vue-next'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import PickColors from 'vue-pick-colors'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const themeStore = useThemeStore()
const {
  theme,
  fontFamily,
  fontSize,
  primaryColor,
  codeBlockTheme,
  legend,
  isMacCodeBlock,
  isShowLineNumber,
  isCiteStatus,
  isUseIndent,
  isUseJustify,
  headingStyles,
  favoriteThemes,
  hiddenThemes,
  favoriteColors,
  hiddenColors,
  savedCustomColors,
} = storeToRefs(themeStore)

// 主题分类筛选
const selectedThemeCategory = ref(`全部`)
const themeCategoryNames = computed(() => [`常用`, `全部`, ...themeCategoryOptions.map(c => c.category)])
const filteredThemeOptions = computed(() => {
  const allFilteredThemes = themeOptions.filter(t => !hiddenThemes.value.includes(t.value as string))
  if (selectedThemeCategory.value === `常用`) {
    return themeOptions.filter(t => favoriteThemes.value.includes(t.value as string) && !hiddenThemes.value.includes(t.value as string))
  }
  if (selectedThemeCategory.value === `全部`) {
    return allFilteredThemes
  }
  const cat = themeCategoryOptions.find(c => c.category === selectedThemeCategory.value)
  return cat ? cat.themes.filter(t => !hiddenThemes.value.includes(t.value as string)) : allFilteredThemes
})

// 字体分类筛选
const selectedFontCategory = ref(`公众号常用`)
const fontCategoryNames = computed(() => fontCategoryOptions.map(c => c.category))
const filteredFontOptions = computed(() => {
  const cat = fontCategoryOptions.find(c => c.category === selectedFontCategory.value)
  return cat ? cat.fonts : fontFamilyOptions
})

// 主题色分类筛选
const selectedColorCategory = ref(`品牌`)
const colorCategoryNames = computed(() => [`常用`, ...colorCategoryOptions.map(c => c.category), `已保存`])
const filteredColorOptions = computed(() => {
  const allFilteredColors = colorOptions.filter(c => !hiddenColors.value.includes(c.value as string))
  if (selectedColorCategory.value === `常用`) {
    return colorOptions.filter(c => favoriteColors.value.includes(c.value as string) && !hiddenColors.value.includes(c.value as string))
  }
  if (selectedColorCategory.value === `已保存`) {
    return savedCustomColors.value.map(val => ({ label: val, value: val, desc: `` }))
  }
  const cat = colorCategoryOptions.find(c => c.category === selectedColorCategory.value)
  return cat ? cat.colors.filter(c => !hiddenColors.value.includes(c.value as string)) : allFilteredColors
})

const allFontOptions = fontCategoryOptions.flatMap(category => category.fonts)
const activeStylePanel = ref(`template`)
const STYLE_PRESET_STORAGE_KEY = `md_savedStylePresets`
const CUSTOM_STYLE_PRESET_PLACEHOLDER = `__custom_style_preset__`
const customStylePresets = ref<IStylePreset[]>(JSON.parse(localStorage.getItem(STYLE_PRESET_STORAGE_KEY) || `[]`))
const selectedThemeMeta = computed(() => themeOptions.find(({ value }) => value === theme.value))
const selectedFontMeta = computed(() => allFontOptions.find(({ value }) => value === fontFamily.value))
const selectedColorMeta = computed(() => {
  const currentColor = primaryColor.value as string
  return colorOptions.find(({ value }) => value === currentColor)
    || (savedCustomColors.value.includes(currentColor)
      ? { label: `自定义已保存`, value: currentColor, desc: `你保存过的颜色` }
      : { label: `自定义颜色`, value: currentColor, desc: `实时取色` })
})

// 标题样式选择器状态
const selectedHeadingLevel = ref<HeadingLevel>(`h2`)
const selectedHeadingStyle = computed({
  get: () => themeStore.getHeadingStyle(selectedHeadingLevel.value),
  set: (val: HeadingStyleType) => {
    themeStore.setHeadingStyle(selectedHeadingLevel.value, val)
    // 无论选择哪种预设，都立即应用主题，确保标题样式及时恢复/更新
    themeStore.applyCurrentTheme()
    editorRefresh()
  },
})
const headingLevels = headingLevelOptions.map(({ value }) => value as HeadingLevel)
const selectedHeadingLevelLabel = computed(() => {
  return headingLevelOptions.find(({ value }) => value === selectedHeadingLevel.value)?.label || `二级标题`
})
const selectedHeadingStyleMeta = computed(() => {
  return headingStyleOptions.find(({ value }) => value === selectedHeadingStyle.value) || headingStyleOptions[0]
})
const headingSyncSnapshot = ref<HeadingStyles | null>(null)
const lastSyncedHeadingStyle = ref<HeadingStyleType | null>(null)
const isHeadingStyleFullySynced = computed(() => {
  return headingLevels.every(level => themeStore.getHeadingStyle(level) === selectedHeadingStyle.value)
})
const canUndoHeadingSync = computed(() => {
  return Boolean(headingSyncSnapshot.value)
    && lastSyncedHeadingStyle.value === selectedHeadingStyle.value
    && isHeadingStyleFullySynced.value
})
const headingSyncButtonLabel = computed(() => canUndoHeadingSync.value ? `取消同步` : `同步到全部标题`)
const headingStatusSummary = computed(() => {
  const activeLevels = headingLevels.filter(level => themeStore.getHeadingStyle(level) !== `default`)
  if (!activeLevels.length)
    return `跟随主题`

  const firstStyle = themeStore.getHeadingStyle(headingLevels[0])
  const allSame = headingLevels.every(level => themeStore.getHeadingStyle(level) === firstStyle)
  if (allSame) {
    return `${headingStyleOptions.find(({ value }) => value === firstStyle)?.label || `自定义`} · 全部标题`
  }

  return `已混搭 ${activeLevels.length} 个级别`
})
const paragraphStatusSummary = computed(() => {
  const parts = [
    isUseIndent.value ? `首行缩进` : ``,
    isUseJustify.value ? `两端对齐` : ``,
  ].filter(Boolean)

  return parts.length ? parts.join(` / `) : `默认段落`
})
const codeStatusSummary = computed(() => {
  const parts = [
    isMacCodeBlock.value ? `Mac 风格` : `标准代码块`,
    isShowLineNumber.value ? `带行号` : `无行号`,
  ]

  return parts.join(` / `)
})
const publishStatusSummary = computed(() => {
  return isCiteStatus.value ? `外链转底部引用已开启` : `外链保持原样`
})
const headingStylesSignature = (styles: HeadingStyles = {}) => JSON.stringify(
  Object.entries(styles)
    .filter(([, value]) => Boolean(value))
    .sort(([left], [right]) => left.localeCompare(right)),
)
const currentHeadingStylesSignature = computed(() => headingStylesSignature(headingStyles.value))
const allStylePresets = computed(() => [...customStylePresets.value, ...stylePresetOptions])
const activeMatchedPreset = computed(() => {
  return allStylePresets.value.find(preset => isPresetActive(preset)) || null
})
const presetSelectValue = computed({
  get: () => activeMatchedPreset.value?.value || CUSTOM_STYLE_PRESET_PLACEHOLDER,
  set: (value: string) => {
    if (value === CUSTOM_STYLE_PRESET_PLACEHOLDER)
      return

    const preset = allStylePresets.value.find(item => item.value === value)
    if (preset)
      applyStylePreset(preset)
  },
})
const displayedStylePreset = computed<IStylePreset>(() => {
  return activeMatchedPreset.value || buildCurrentStylePreset({
    label: `当前自定义`,
    value: CUSTOM_STYLE_PRESET_PLACEHOLDER,
    scene: `自定义组合`,
    desc: `当前搭配没有对应预设，可以保存成自己的方案。`,
    previewSurface: `#f5f7fb`,
    previewInk: `#111827`,
  })
})



const { isMobile, isOpenRightSlider, isDark } = storeToRefs(uiStore)

const editorStore = useEditorStore()
const renderStore = useRenderStore()

// Editor refresh function - triggers re-render with current theme settings
function editorRefresh() {
  themeStore.updateCodeTheme()

  const raw = editorStore.getContent()
  renderStore.render(renderStore.resolvePreviewContent(raw))
}

function clearHeadingSyncState() {
  headingSyncSnapshot.value = null
  lastSyncedHeadingStyle.value = null
}

function getThemeLabel(value: string) {
  return themeOptions.find(option => option.value === value)?.label || value
}

function getFontLabel(value: string) {
  return fontFamilyOptions.find(option => option.value === value)?.label || `自定义字体`
}

function getColorLabel(value: string) {
  return colorOptions.find(option => option.value === value)?.label || `自定义颜色`
}

function isCustomPresetValue(value: string) {
  return customStylePresets.value.some(preset => preset.value === value)
}

function buildCurrentStylePreset(overrides: Partial<IStylePreset>): IStylePreset {
  return {
    label: overrides.label || `未命名预设`,
    value: overrides.value || `custom-${Date.now()}`,
    scene: overrides.scene || `我的预设`,
    desc: overrides.desc || `${getThemeLabel(theme.value)} · ${getFontLabel(fontFamily.value)} · ${getColorLabel(primaryColor.value as string)}`,
    theme: overrides.theme || theme.value,
    fontFamily: overrides.fontFamily || fontFamily.value,
    fontSize: overrides.fontSize || fontSize.value,
    primaryColor: overrides.primaryColor || (primaryColor.value as string),
    codeBlockTheme: overrides.codeBlockTheme || codeBlockTheme.value,
    legend: overrides.legend || legend.value,
    headingStyles: overrides.headingStyles || { ...headingStyles.value },
    isMacCodeBlock: overrides.isMacCodeBlock ?? isMacCodeBlock.value,
    isShowLineNumber: overrides.isShowLineNumber ?? isShowLineNumber.value,
    isCiteStatus: overrides.isCiteStatus ?? isCiteStatus.value,
    isUseIndent: overrides.isUseIndent ?? isUseIndent.value,
    isUseJustify: overrides.isUseJustify ?? isUseJustify.value,
    previewSurface: overrides.previewSurface || `#f5f7fb`,
    previewInk: overrides.previewInk || `#111827`,
  }
}

function selectThemeCategoryByTheme(themeValue: string) {
  selectedThemeCategory.value = themeCategoryOptions.find(category =>
    category.themes.some(option => option.value === themeValue),
  )?.category || `全部`
}

function selectFontCategoryByFont(fontValue: string) {
  selectedFontCategory.value = fontCategoryOptions.find(category =>
    category.fonts.some(option => option.value === fontValue),
  )?.category || fontCategoryOptions[0].category
}

function selectColorCategoryByColor(colorValue: string) {
  if (savedCustomColors.value.includes(colorValue)) {
    selectedColorCategory.value = `已保存`
    return
  }

  selectedColorCategory.value = colorCategoryOptions.find(category =>
    category.colors.some(option => option.value === colorValue),
  )?.category || colorCategoryOptions[0].category
}

function isPresetActive(preset: IStylePreset) {
  return theme.value === preset.theme
    && fontFamily.value === preset.fontFamily
    && fontSize.value === preset.fontSize
    && primaryColor.value === preset.primaryColor
    && codeBlockTheme.value === preset.codeBlockTheme
    && legend.value === preset.legend
    && isMacCodeBlock.value === preset.isMacCodeBlock
    && isShowLineNumber.value === preset.isShowLineNumber
    && isCiteStatus.value === preset.isCiteStatus
    && isUseIndent.value === preset.isUseIndent
    && isUseJustify.value === preset.isUseJustify
    && currentHeadingStylesSignature.value === headingStylesSignature(preset.headingStyles)
}

function applyStylePreset(preset: IStylePreset) {
  clearHeadingSyncState()
  themeStore.theme = preset.theme
  themeStore.fontFamily = preset.fontFamily
  themeStore.fontSize = preset.fontSize
  themeStore.primaryColor = preset.primaryColor
  themeStore.codeBlockTheme = preset.codeBlockTheme
  themeStore.legend = preset.legend
  themeStore.isMacCodeBlock = preset.isMacCodeBlock
  themeStore.isShowLineNumber = preset.isShowLineNumber
  themeStore.isCiteStatus = preset.isCiteStatus
  themeStore.isUseIndent = preset.isUseIndent
  themeStore.isUseJustify = preset.isUseJustify
  headingStyles.value = { ...preset.headingStyles }
  selectedHeadingLevel.value = `h2`
  selectThemeCategoryByTheme(preset.theme)
  selectFontCategoryByFont(preset.fontFamily)
  selectColorCategoryByColor(preset.primaryColor)
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function saveCurrentStylePreset() {
  const fallbackName = activeMatchedPreset.value
    ? `${activeMatchedPreset.value.label} 变体`
    : `${getThemeLabel(theme.value)}预设`
  const name = window.prompt(`请输入预设名称`, fallbackName)?.trim()

  if (!name)
    return

  if (stylePresetOptions.some(preset => preset.label === name)) {
    toast.error(`该名称已被内置预设占用`)
    return
  }

  const existingIndex = customStylePresets.value.findIndex(preset => preset.label === name)
  const nextPreset = buildCurrentStylePreset({
    label: name,
    value: existingIndex >= 0 ? customStylePresets.value[existingIndex].value : `custom-${Date.now()}`,
    scene: `我的预设`,
    desc: `${getThemeLabel(theme.value)} · ${getFontLabel(fontFamily.value)} · ${getColorLabel(primaryColor.value as string)}`,
  })

  if (existingIndex >= 0) {
    customStylePresets.value = customStylePresets.value.map((preset, index) => index === existingIndex ? nextPreset : preset)
    toast.success(`预设「${name}」已更新`)
  }
  else {
    customStylePresets.value = [nextPreset, ...customStylePresets.value]
    toast.success(`预设「${name}」已保存`)
  }
}

function resetTemplateGroup() {
  clearHeadingSyncState()
  themeStore.theme = defaultStyleConfig.theme
  headingStyles.value = { ...defaultStyleConfig.headingStyles }
  selectedHeadingLevel.value = `h2`
  selectThemeCategoryByTheme(defaultStyleConfig.theme)
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function resetTextGroup() {
  themeStore.fontFamily = defaultStyleConfig.fontFamily
  themeStore.fontSize = defaultStyleConfig.fontSize
  themeStore.primaryColor = defaultStyleConfig.primaryColor
  themeStore.isUseIndent = false
  themeStore.isUseJustify = false
  selectFontCategoryByFont(defaultStyleConfig.fontFamily)
  selectColorCategoryByColor(defaultStyleConfig.primaryColor)
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function resetDetailGroup() {
  themeStore.codeBlockTheme = defaultStyleConfig.codeBlockTheme
  themeStore.legend = defaultStyleConfig.legend
  themeStore.isMacCodeBlock = defaultStyleConfig.isMacCodeBlock
  themeStore.isShowLineNumber = defaultStyleConfig.isShowLineNumber
  themeStore.isCiteStatus = defaultStyleConfig.isCiteStatus
  editorRefresh()
}

// Theme change handlers
function themeChanged(newTheme: keyof typeof themeMap) {
  themeStore.theme = newTheme
  // 使用新主题系统
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function fontChanged(fonts: string) {
  themeStore.fontFamily = fonts
  // 使用新主题系统
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function sizeChanged(size: string) {
  themeStore.fontSize = size
  // 使用新主题系统
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function colorChanged(newColor: string) {
  themeStore.primaryColor = newColor
  // 使用新主题系统
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function codeBlockThemeChanged(newTheme: string) {
  themeStore.codeBlockTheme = newTheme
  editorRefresh()
}

function legendChanged(newVal: string) {
  themeStore.legend = newVal
  editorRefresh()
}

function macCodeBlockChanged() {
  themeStore.isMacCodeBlock = !themeStore.isMacCodeBlock
  editorRefresh()
}

function showLineNumberChanged() {
  themeStore.isShowLineNumber = !themeStore.isShowLineNumber
  editorRefresh()
}

function citeStatusChanged() {
  themeStore.isCiteStatus = !themeStore.isCiteStatus
  editorRefresh()
}

function useIndentChanged() {
  themeStore.isUseIndent = !themeStore.isUseIndent
  // 使用新主题系统
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function useJustifyChanged() {
  themeStore.isUseJustify = !themeStore.isUseJustify
  // 使用新主题系统
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function resetStyleConfirm() {
  uiStore.isOpenConfirmDialog = true
}

function saveCustomColor() {
  const col = primaryColor.value as string
  if (col && !savedCustomColors.value.includes(col)) {
    savedCustomColors.value.push(col)
  }
}

function toggleFavoriteTheme(val: string) {
  if (favoriteThemes.value.includes(val)) {
    favoriteThemes.value = favoriteThemes.value.filter(v => v !== val)
  }
  else {
    favoriteThemes.value.push(val)
  }
}

function deleteThemeOption(val: string) {
  if (!hiddenThemes.value.includes(val)) {
    hiddenThemes.value.push(val)
  }
}

function toggleFavoriteColor(val: string) {
  if (favoriteColors.value.includes(val)) {
    favoriteColors.value = favoriteColors.value.filter(v => v !== val)
  }
  else {
    favoriteColors.value.push(val)
  }
}

function deleteColorOption(val: string) {
  if (!hiddenColors.value.includes(val)) {
    hiddenColors.value.push(val)
  }
}

function deleteCustomColorOption(val: string) {
  savedCustomColors.value = savedCustomColors.value.filter(c => c !== val)
}

function applyHeadingStyleToAll(style: HeadingStyleType) {
  if (canUndoHeadingSync.value && headingSyncSnapshot.value) {
    headingStyles.value = { ...headingSyncSnapshot.value }
    clearHeadingSyncState()
    themeStore.applyCurrentTheme()
    editorRefresh()
    return
  }

  headingSyncSnapshot.value = { ...headingStyles.value }
  lastSyncedHeadingStyle.value = style
  const syncedStyles: HeadingStyles = {}
  if (style !== `default`) {
    for (const level of headingLevels) {
      syncedStyles[level] = style
    }
  }
  headingStyles.value = syncedStyles
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function resetAllHeadingStyles() {
  clearHeadingSyncState()
  headingStyles.value = {}
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function setMacCodeBlock(enabled: boolean) {
  if (isMacCodeBlock.value !== enabled)
    macCodeBlockChanged()
}

function setShowLineNumber(enabled: boolean) {
  if (isShowLineNumber.value !== enabled)
    showLineNumberChanged()
}

function setCiteStatus(enabled: boolean) {
  if (isCiteStatus.value !== enabled)
    citeStatusChanged()
}

function setUseIndent(enabled: boolean) {
  if (isUseIndent.value !== enabled)
    useIndentChanged()
}

function setUseJustify(enabled: boolean) {
  if (isUseJustify.value !== enabled)
    useJustifyChanged()
}

// 控制是否启用动画
const enableAnimation = ref(false)

// 监听 RightSlider 开关状态变化
watch(isOpenRightSlider, () => {
  if (isMobile.value) {
    // 在移动端，用户操作时启用动画
    enableAnimation.value = true
  }
})

// 监听设备类型变化，重置动画状态
watch(isMobile, () => {
  enableAnimation.value = false
})

watch(customStylePresets, value => localStorage.setItem(STYLE_PRESET_STORAGE_KEY, JSON.stringify(value)), { deep: true })

watch(headingStyles, () => {
  if (!lastSyncedHeadingStyle.value)
    return

  const stillSynced = headingLevels.every(level => themeStore.getHeadingStyle(level) === lastSyncedHeadingStyle.value)
  if (!stillSynced) {
    headingSyncSnapshot.value = null
    lastSyncedHeadingStyle.value = null
  }
}, { deep: true })

const isOpen = ref(false)

const addPostInputVal = ref(``)

watch(isOpen, () => {
  if (isOpen.value) {
    addPostInputVal.value = ``
  }
})

const pickColorsContainer = useTemplateRef<HTMLElement | undefined>(`pickColorsContainer`)
const format = ref<Format>(`rgb`)
const formatOptions = ref<Format[]>([`rgb`, `hex`, `hsl`, `hsv`])
</script>

<template>
  <!-- 移动端遮罩层 -->
  <div
    v-if="isMobile && isOpenRightSlider"
    class="fixed inset-0 bg-black/50 z-40"
    @click="isOpenRightSlider = false"
  />

  <div
    class="h-full overflow-hidden"
    :class="{
      'fixed top-0 right-0 w-full h-full z-55 bg-background border-l shadow-lg mobile-right-drawer': isMobile,
      'animate': isMobile && enableAnimation,
    }"
    :style="isMobile ? { transform: isOpenRightSlider ? 'translateX(0)' : 'translateX(100%)' } : undefined"
  >
    <div
      class="space-y-4 h-full overflow-auto p-4"
      :class="{ 'pt-0': isMobile }"
    >
      <!-- 移动端标题栏 -->
      <div v-if="isMobile" class="sticky top-0 z-10 flex items-center justify-between -mx-4 px-4 py-3 border-b mb-4 bg-background">
        <h2 class="text-lg font-semibold">
          样式设置
        </h2>
        <Button variant="ghost" size="sm" @click="isOpenRightSlider = false">
          <X class="h-4 w-4" />
        </Button>
      </div>
      <div class="space-y-3 rounded-2xl border bg-muted/20 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <h2 class="text-sm font-semibold">
              样式工作台
            </h2>
            <p class="text-xs leading-5 text-muted-foreground">
              先定版式气质，再调文字系统，最后补发布细节。主题、颜色、字体、字号始终可以自由搭配。
            </p>
          </div>
          <Button variant="ghost" size="sm" class="h-8 shrink-0 px-3 text-xs" @click="resetStyleConfirm">
            全部重置
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-xl border bg-background/85 px-3 py-2">
            <div class="text-muted-foreground">
              模板
            </div>
            <div class="mt-1 font-medium">
              {{ selectedThemeMeta?.label || '未选择' }}
            </div>
          </div>
          <div class="rounded-xl border bg-background/85 px-3 py-2">
            <div class="text-muted-foreground">
              文字
            </div>
            <div class="mt-1 font-medium">
              {{ selectedFontMeta?.label || '未选择' }} · {{ fontSize }}
            </div>
          </div>
          <div class="rounded-xl border bg-background/85 px-3 py-2">
            <div class="text-muted-foreground">
              主题色
            </div>
            <div class="mt-1 flex items-center gap-2 font-medium">
              <span class="inline-block h-3.5 w-3.5 rounded-full border" :style="{ background: primaryColor as string }" />
              {{ selectedColorMeta.label }}
            </div>
          </div>
          <div class="rounded-xl border bg-background/85 px-3 py-2">
            <div class="text-muted-foreground">
              标题
            </div>
            <div class="mt-1 font-medium">
              {{ headingStatusSummary }}
            </div>
          </div>
        </div>
      </div>

      <Tabs v-model="activeStylePanel" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="template">
            模板
          </TabsTrigger>
          <TabsTrigger value="text">
            文字
          </TabsTrigger>
          <TabsTrigger value="detail">
            细节
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template" class="mt-4 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                模板流
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                先套一个场景方案，再微调主题和标题系统，会比从零拼装更快。
              </p>
            </div>
            <Button variant="ghost" size="sm" class="h-8 shrink-0 px-3 text-xs" @click="resetTemplateGroup">
              重置本组
            </Button>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <h2 class="text-sm font-semibold">
                  1. 套用场景预设
                </h2>
                <p class="text-xs leading-5 text-muted-foreground">
                  先选一个场景方案，再微调主题和标题，会比从零拼装快很多。
                </p>
              </div>
              <Button variant="ghost" size="sm" class="h-8 shrink-0 px-3 text-xs" @click="saveCurrentStylePreset">
                保存为我的预设
              </Button>
            </div>
            <div class="grid gap-3">
              <Select v-model="presetSelectValue">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择一个场景预设" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="CUSTOM_STYLE_PRESET_PLACEHOLDER" disabled>
                    当前自定义组合
                  </SelectItem>
                  <SelectItem v-for="preset in allStylePresets" :key="preset.value" :value="preset.value">
                    {{ isCustomPresetValue(preset.value) ? `我的 · ${preset.label}` : preset.label }}
                    <span class="ml-2 text-muted-foreground">{{ preset.scene }}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div
                class="rounded-xl border px-3 py-3"
                :style="{
                  background: `linear-gradient(135deg, ${displayedStylePreset.previewSurface}, #ffffff)`,
                  color: displayedStylePreset.previewInk,
                  fontFamily: displayedStylePreset.fontFamily,
                }"
              >
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold">{{ displayedStylePreset.label }}</span>
                    <span class="rounded-full border border-current/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]" :style="{ color: displayedStylePreset.primaryColor }">
                      {{ displayedStylePreset.scene }}
                    </span>
                    <span class="rounded-full border border-current/15 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {{ activeMatchedPreset ? (isCustomPresetValue(activeMatchedPreset.value) ? '已保存的我的预设' : '内置预设') : '未保存组合' }}
                    </span>
                  </div>
                  <p class="text-xs leading-5 opacity-80">
                    {{ displayedStylePreset.desc }}
                  </p>
                </div>
                <div class="mt-3 flex flex-wrap gap-1">
                  <span class="rounded-full border border-current/10 px-2 py-1 text-[11px] opacity-80">{{ getThemeLabel(displayedStylePreset.theme) }}</span>
                  <span class="rounded-full border border-current/10 px-2 py-1 text-[11px] opacity-80">{{ getFontLabel(displayedStylePreset.fontFamily) }}</span>
                  <span class="rounded-full border border-current/10 px-2 py-1 text-[11px] opacity-80">{{ getColorLabel(displayedStylePreset.primaryColor) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                2. 选择版式模板
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                主题主要决定排版气质和模块结构，不会再锁死颜色和字体。
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <Button
                v-for="cat in themeCategoryNames"
                :key="cat"
                size="sm"
                :variant="selectedThemeCategory === cat ? 'default' : 'ghost'"
                class="h-7 px-2 text-xs"
                @click="selectedThemeCategory = cat"
              >
                {{ cat }}
              </Button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <ContextMenu v-for="{ label, value } in filteredThemeOptions" :key="value">
                <ContextMenuTrigger as-child>
                  <Button
                    class="w-full justify-start" variant="outline" :class="{
                      'border-black dark:border-white border-2': theme === value,
                    }" @click="themeChanged(value as any)"
                  >
                    {{ label }}
                  </Button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem @click="toggleFavoriteTheme(value as string)">
                    {{ favoriteThemes.includes(value as string) ? '取消常用' : '设为常用' }}
                  </ContextMenuItem>
                  <ContextMenuItem @click="deleteThemeOption(value as string)">
                    删除
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                3. 调整标题系统
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                标题样式会覆盖当前主题的原生标题装饰。可以单独调某一级，也可以一键同步到全部标题。
              </p>
            </div>
            <div class="grid gap-3">
              <div class="space-y-2">
                <div class="text-xs text-muted-foreground">
                  标题级别
                </div>
                <Select v-model="selectedHeadingLevel">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="选择标题级别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="{ label, value } in headingLevelOptions" :key="value" :value="value">
                      {{ label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <div class="text-xs text-muted-foreground">
                  标题样式
                </div>
                <Select v-model="selectedHeadingStyle">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="选择标题样式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="{ label, value, desc } in headingStyleOptions" :key="value" :value="value">
                      {{ label }} <span class="ml-2 text-muted-foreground">{{ desc }}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" class="h-8 px-3 text-xs" @click="applyHeadingStyleToAll(selectedHeadingStyle)">
                {{ headingSyncButtonLabel }}
              </Button>
              <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="resetAllHeadingStyles">
                全部恢复默认
              </Button>
            </div>
            <div class="rounded-xl border border-dashed border-border bg-muted/35 px-3 py-2 text-xs leading-5 text-muted-foreground">
              当前正在编辑 {{ selectedHeadingLevelLabel }}，{{ selectedHeadingStyleMeta.desc }}。
            </div>
          </div>
        </TabsContent>

        <TabsContent value="text" class="mt-4 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                文字流
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                先把正文气质定下来，再补颜色和段落阅读方式。
              </p>
            </div>
            <Button variant="ghost" size="sm" class="h-8 shrink-0 px-3 text-xs" @click="resetTextGroup">
              重置本组
            </Button>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                1. 选择字体与字号
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                先确定整体阅读气质，再用字号控制版面密度。
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <Button
                v-for="cat in fontCategoryNames"
                :key="cat"
                size="sm"
                :variant="selectedFontCategory === cat ? 'default' : 'ghost'"
                class="h-7 px-2 text-xs"
                @click="selectedFontCategory = cat"
              >
                {{ cat }}
              </Button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <Button
                v-for="{ label, value } in filteredFontOptions" :key="value" variant="outline"
                class="w-full justify-start"
                :class="{ 'border-black dark:border-white border-2': fontFamily === value }" @click="fontChanged(value)"
              >
                {{ label }}
              </Button>
            </div>
            <div class="space-y-2">
              <div class="text-xs text-muted-foreground">
                正文字号
              </div>
              <Select v-model="fontSize" @update:model-value="sizeChanged">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择字号" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="{ label, value, desc } in fontSizeOptions" :key="value" :value="value">
                    {{ label }} <span class="ml-2 text-muted-foreground">{{ desc }}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                2. 选择主题色
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                主题色会影响标题强调、引用块和部分模块高光。
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <Button
                v-for="cat in colorCategoryNames"
                :key="cat"
                size="sm"
                :variant="selectedColorCategory === cat ? 'default' : 'ghost'"
                class="h-7 px-2 text-xs"
                @click="selectedColorCategory = cat"
              >
                {{ cat }}
              </Button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <ContextMenu v-for="{ label, value } in filteredColorOptions" :key="value">
                <ContextMenuTrigger as-child>
                  <Button
                    class="w-full justify-start" variant="outline" :class="{
                      'border-black dark:border-white border-2': primaryColor === value,
                    }" @click="colorChanged(value)"
                  >
                    <span class="mr-2 inline-block h-4 w-4 rounded-full" :style="{ background: value as string }" />
                    {{ label }}
                  </Button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem v-if="selectedColorCategory !== '已保存'" @click="toggleFavoriteColor(value as string)">
                    {{ favoriteColors.includes(value as string) ? '取消常用' : '设为常用' }}
                  </ContextMenuItem>
                  <ContextMenuItem v-if="selectedColorCategory === '已保存'" @click="deleteCustomColorOption(value as string)">
                    删除
                  </ContextMenuItem>
                  <ContextMenuItem v-else @click="deleteColorOption(value as string)">
                    删除
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-xs text-muted-foreground">
                  自定义取色
                </div>
                <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" @click="saveCustomColor">
                  保存颜色
                </Button>
              </div>
              <div ref="pickColorsContainer">
                <PickColors
                  v-if="pickColorsContainer" v-model:value="primaryColor" show-alpha :format="format"
                  :format-options="formatOptions" :theme="isDark ? 'dark' : 'light'"
                  :popup-container="pickColorsContainer" @change="colorChanged"
                />
              </div>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                3. 调整段落阅读方式
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                当前状态：{{ paragraphStatusSummary }}
              </p>
            </div>
            <div class="grid gap-3">
              <div class="rounded-xl border bg-muted/25 p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium">
                      首行缩进
                    </div>
                    <div class="text-xs text-muted-foreground">
                      适合长文和评论型内容
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': isUseIndent }" @click="setUseIndent(true)">
                      开
                    </Button>
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': !isUseIndent }" @click="setUseIndent(false)">
                      关
                    </Button>
                  </div>
                </div>
              </div>
              <div class="rounded-xl border bg-muted/25 p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium">
                      两端对齐
                    </div>
                    <div class="text-xs text-muted-foreground">
                      更接近刊物和纸媒阅读感
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': isUseJustify }" @click="setUseJustify(true)">
                      开
                    </Button>
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': !isUseJustify }" @click="setUseJustify(false)">
                      关
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="detail" class="mt-4 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                细节流
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                最后补代码块、图注和发布细节，让文章更适合真正发出去。
              </p>
            </div>
            <Button variant="ghost" size="sm" class="h-8 shrink-0 px-3 text-xs" @click="resetDetailGroup">
              重置本组
            </Button>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                1. 代码块表现
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                当前状态：{{ codeStatusSummary }}
              </p>
            </div>
            <div class="space-y-2">
              <div class="text-xs text-muted-foreground">
                代码块主题
              </div>
              <Select v-model="codeBlockTheme" @update:model-value="codeBlockThemeChanged">
                <SelectTrigger>
                  <SelectValue placeholder="选择代码块主题" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="{ label, value } in codeBlockThemeOptions" :key="label" :value="value">
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-3">
              <div class="rounded-xl border bg-muted/25 p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium">
                      Mac 代码块外观
                    </div>
                    <div class="text-xs text-muted-foreground">
                      顶部显示三色圆点
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': isMacCodeBlock }" @click="setMacCodeBlock(true)">
                      开
                    </Button>
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': !isMacCodeBlock }" @click="setMacCodeBlock(false)">
                      关
                    </Button>
                  </div>
                </div>
              </div>
              <div class="rounded-xl border bg-muted/25 p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium">
                      代码块行号
                    </div>
                    <div class="text-xs text-muted-foreground">
                      适合教程和调试类文章
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': isShowLineNumber }" @click="setShowLineNumber(true)">
                      开
                    </Button>
                    <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': !isShowLineNumber }" @click="setShowLineNumber(false)">
                      关
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">
                2. 发布与注释细节
              </h2>
              <p class="text-xs leading-5 text-muted-foreground">
                当前状态：{{ publishStatusSummary }}
              </p>
            </div>
            <div class="space-y-2">
              <div class="text-xs text-muted-foreground">
                图注格式
              </div>
              <Select v-model="legend" @update:model-value="legendChanged">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择图注格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="{ label, value } in legendOptions" :key="value" :value="value">
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="rounded-xl border bg-muted/25 p-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">
                    微信外链转底部引用
                  </div>
                  <div class="text-xs text-muted-foreground">
                    便于发布到公众号时统一整理引用来源
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': isCiteStatus }" @click="setCiteStatus(true)">
                    开
                  </Button>
                  <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': !isCiteStatus }" @click="setCiteStatus(false)">
                    关
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>

<style scoped>
/* 移动端右侧栏动画 - 只有添加了 animate 类才启用 */
.mobile-right-drawer.animate {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
