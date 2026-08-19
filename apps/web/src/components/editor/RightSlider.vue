<script setup lang="ts">
import type {
  HeadingStyles,
  IStylePreset,
  ThemeName,
} from '@mobi/shared/configs'
import type { StylePresetSession } from '@/utils/style-panel'
import type { CustomTheme, ThemeDraft } from '@/utils/theme-designer'
import {
  codeBlockThemeOptions,
  defaultStyleConfig,
  getThemeDefaultPrimaryColor,
  stylePresetOptions,
  themeCategoryOptions,
  themeMap,
  themeOptions,
  themeOptionsMap,
} from '@mobi/shared/configs'
import { X } from 'lucide-vue-next'
import HeadingBlockWorkspace from '@/components/editor/HeadingBlockWorkspace.vue'
import { useBlockSelectionStore } from '@/stores/blockSelection'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { useUIStore } from '@/stores/ui'
import {
  buildThemeSelectOptions,
  clearStylePresetSession,
  createLatestAsyncScheduler,
  createStylePresetSession,
  loadStylePresets,
  loadStylePresetSession,
  persistStylePresets,
  persistStylePresetSession,
  removeSavedItem,
  restoreSavedItem,
  shouldClearStylePreset,
  shouldIgnorePresetSelectValue,
  stepSelectValue,
  toPlainSnapshot,
  validateStylePresetName,
} from '@/utils/style-panel'
import { trackEvent } from '@/utils/telemetry'
import { exportCustomThemeAsCSS, exportCustomThemeAsJSON, themeDesignerGroupMap } from '@/utils/theme-designer'

const uiStore = useUIStore()
const blockSelectionStore = useBlockSelectionStore()
const themeStore = useThemeStore()
const themeDesignerStore = useThemeDesignerStore()
type DeletedCustomTheme = NonNullable<ReturnType<typeof themeDesignerStore.deleteCustomTheme>>
const { customThemes: customVisualThemes, draft: visualThemeDraft } = storeToRefs(themeDesignerStore)
const {
  theme,
  fontFamily,
  fontSize,
  primaryColor,
  primaryColorSource,
  codeBlockTheme,
  legend,
  isShowCodeLanguage,
  isShowLineNumber,
  isCiteStatus,
  isCountStatus,
  isUseIndent,
  isUseJustify,
  headingStyles,
  hiddenThemes,
} = storeToRefs(themeStore)

const activeStylePanel = ref(`template`)
const activeInspectorPanel = ref<`component` | `style`>(`style`)
const { selection: blockSelection } = storeToRefs(blockSelectionStore)
const { blockInspectorRequest } = storeToRefs(uiStore)

/**
 * 跟随预览里的点击：翻到对应的页、展开那一组、滚过去，再闪一下告诉用户「就是这里」。
 * 高亮用 class 而不是 :focus，focus 会被面板里第一个输入框抢走。
 */
let focusFlashTimer: ReturnType<typeof setTimeout> | undefined

watch(() => uiStore.styleFocusRequest, (request) => {
  if (!request) {
    return
  }

  activeInspectorPanel.value = `style`
  activeStylePanel.value = request.panel

  if (!request.groupId) {
    return
  }

  if (request.headingLevel) {
    themeDesignerStore.activeHeadingLevel = request.headingLevel as typeof themeDesignerStore.activeHeadingLevel
  }

  if (!themeDesignerStore.expandedGroups.includes(request.groupId)) {
    themeDesignerStore.expandedGroups = [...themeDesignerStore.expandedGroups, request.groupId]
  }

  nextTick(() => {
    const card = document.querySelector<HTMLElement>(`[data-style-group="${request.groupId}"]`)
    card?.scrollIntoView({ block: `nearest`, behavior: `smooth` })
    themeDesignerStore.focusedGroupId = request.groupId!
    clearTimeout(focusFlashTimer)
    focusFlashTimer = setTimeout(() => {
      themeDesignerStore.focusedGroupId = ``
    }, 1400)
  })
})

watch(blockInspectorRequest, (request) => {
  if (request) {
    activeInspectorPanel.value = `component`
  }
}, { immediate: true })

onBeforeUnmount(() => clearTimeout(focusFlashTimer))
const STYLE_PRESET_STORAGE_KEY = `mobi_savedStylePresets`
const STYLE_PRESET_SESSION_KEY = `mobi_activeStylePresetSession`
const CUSTOM_STYLE_PRESET_PLACEHOLDER = `__custom_style_preset__`

interface StyleSnapshot {
  preset: IStylePreset
  primaryColorSource: `theme` | `manual`
  visualDraft: ThemeDraft
}

interface StyleHistoryContext {
  style: StyleSnapshot
  activeStylePresetValue: string
  appliedPresetSignature: string | null
  presetSession: StylePresetSession<StyleSnapshot> | null
}

const customStylePresets = ref<IStylePreset[]>(loadStylePresets(localStorage, STYLE_PRESET_STORAGE_KEY))
const storedPresetSession = loadStylePresetSession<StyleSnapshot>(localStorage, STYLE_PRESET_SESSION_KEY)
const storedPresetStillExists = Boolean(storedPresetSession?.snapshot?.preset && [
  ...stylePresetOptions,
  ...customStylePresets.value,
].some(preset => preset.value === storedPresetSession.activeValue))
const presetSession = ref(storedPresetStillExists ? storedPresetSession : null)
const activeStylePresetValue = ref(storedPresetStillExists
  ? storedPresetSession!.activeValue
  : CUSTOM_STYLE_PRESET_PLACEHOLDER)
if (storedPresetSession && !storedPresetStillExists)
  clearStylePresetSession(localStorage, STYLE_PRESET_SESSION_KEY)
const appliedPresetSignature = ref<string | null>(null)
const savePresetName = ref(``)
const savePresetError = ref(``)
const savePresetFeedback = ref(``)
const pendingThemeSelectValue = ref<string | null>(null)
const activeCustomStylePreset = computed(() => customStylePresets.value.find(preset => preset.value === activeStylePresetValue.value) || null)

type PendingStyleAction
  = | { type: `preset`, preset: IStylePreset }
    | { type: `cancel` }
    | { type: `layout`, value: string }
    | { type: `history`, context: StyleHistoryContext }

let pendingStyleAction: PendingStyleAction | null = null
let isApplyingStyleLifecycle = false
const scheduleStyleApply = createLatestAsyncScheduler()

function headingStylesSignature(styles: HeadingStyles = {}) {
  return JSON.stringify(
    Object.entries(styles)
      .filter(([, value]) => Boolean(value))
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}
const allStylePresets = computed(() => [...stylePresetOptions, ...customStylePresets.value])
const presetSelectValue = computed({
  get: () => activeStylePresetValue.value,
  set: (value: string) => {
    if (shouldIgnorePresetSelectValue(value, CUSTOM_STYLE_PRESET_PLACEHOLDER, {
      isApplying: isApplyingStyleLifecycle,
      pendingType: pendingStyleAction?.type,
      hasPresetSession: Boolean(presetSession.value),
      currentValue: activeStylePresetValue.value,
    })) {
      return
    }

    if (value === CUSTOM_STYLE_PRESET_PLACEHOLDER) {
      cancelActiveStylePreset()
      return
    }

    const preset = allStylePresets.value.find(item => item.value === value)
    if (preset)
      applyStylePreset(preset)
  },
})

const visibleThemeCategories = computed(() => themeCategoryOptions.map(category => ({
  ...category,
  themes: category.themes.filter(option => !hiddenThemes.value.includes(option.value)),
})))
const themeSelectOptions = computed(() => buildThemeSelectOptions(visibleThemeCategories.value, customVisualThemes.value))
const themeSelectValue = computed({
  get: () => pendingThemeSelectValue.value ?? currentThemeSelectValue(),
  set: (value: string) => applyThemeSelectValue(value),
})
const activeCustomVisualTheme = computed(() => customVisualThemes.value.find(item => item.id === visualThemeDraft.value.sourceId) || null)
const isThemeSelectFocused = ref(false)

const { isMobile, isOpenRightSlider, isSimpleWorkspace } = storeToRefs(uiStore)

const editorStore = useEditorStore()
const renderStore = useRenderStore()

// Editor refresh function - triggers re-render with current theme settings
function editorRefresh() {
  themeStore.updateCodeTheme()

  const raw = editorStore.getContent()
  renderStore.render(renderStore.resolvePreviewContent(raw))
}

function currentThemeSelectValue() {
  return visualThemeDraft.value.sourceId
    ? `custom:${visualThemeDraft.value.sourceId}`
    : `theme:${theme.value}`
}

function getThemeLabel(value: string) {
  return themeOptions.find(option => option.value === value)?.label || value
}

function buildCurrentStylePreset(overrides: Partial<IStylePreset>): IStylePreset {
  return {
    label: overrides.label || `未命名预设`,
    value: overrides.value || `custom-${Date.now()}`,
    scene: overrides.scene || `我的预设`,
    desc: overrides.desc || `${getThemeLabel(theme.value)} · ${fontSize.value}`,
    theme: overrides.theme || theme.value,
    fontFamily: overrides.fontFamily || fontFamily.value,
    fontSize: overrides.fontSize || fontSize.value,
    primaryColor: overrides.primaryColor || (primaryColor.value as string),
    codeBlockTheme: overrides.codeBlockTheme || codeBlockTheme.value,
    legend: overrides.legend || legend.value,
    headingStyles: overrides.headingStyles || { ...headingStyles.value },
    isShowCodeLanguage: overrides.isShowCodeLanguage ?? isShowCodeLanguage.value,
    isShowLineNumber: overrides.isShowLineNumber ?? isShowLineNumber.value,
    isCiteStatus: overrides.isCiteStatus ?? isCiteStatus.value,
    isUseIndent: overrides.isUseIndent ?? isUseIndent.value,
    isUseJustify: overrides.isUseJustify ?? isUseJustify.value,
    previewSurface: overrides.previewSurface || `#f5f7fb`,
    previewInk: overrides.previewInk || `#111827`,
  }
}

function currentStylePresetSignature() {
  return JSON.stringify({
    theme: theme.value,
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    primaryColor: primaryColor.value,
    codeBlockTheme: codeBlockTheme.value,
    legend: legend.value,
    headingStyles: headingStylesSignature(headingStyles.value),
    isShowCodeLanguage: isShowCodeLanguage.value,
    isShowLineNumber: isShowLineNumber.value,
    isCiteStatus: isCiteStatus.value,
    isUseIndent: isUseIndent.value,
    isUseJustify: isUseJustify.value,
  })
}

if (storedPresetStillExists)
  appliedPresetSignature.value = currentStylePresetSignature()

function captureStyleSnapshot(): StyleSnapshot {
  return {
    preset: buildCurrentStylePreset({
      label: `当前自定义`,
      value: CUSTOM_STYLE_PRESET_PLACEHOLDER,
      scene: `当前自定义`,
    }),
    primaryColorSource: primaryColorSource.value === `theme` ? `theme` : `manual`,
    visualDraft: {
      sourceId: visualThemeDraft.value.sourceId,
      name: visualThemeDraft.value.name,
      baseTheme: visualThemeDraft.value.baseTheme,
      tokens: toPlainSnapshot(visualThemeDraft.value.tokens),
    },
  }
}

function applyPresetValues(preset: IStylePreset, colorSource: `theme` | `manual` = `manual`) {
  themeStore.theme = preset.theme
  themeStore.fontFamily = preset.fontFamily
  themeStore.fontSize = preset.fontSize
  themeStore.restorePrimaryColorState(String(preset.primaryColor), colorSource)
  themeStore.codeBlockTheme = preset.codeBlockTheme
  themeStore.legend = preset.legend
  themeStore.isShowCodeLanguage = preset.isShowCodeLanguage
  themeStore.isShowLineNumber = preset.isShowLineNumber
  themeStore.isCiteStatus = preset.isCiteStatus
  themeStore.isUseIndent = preset.isUseIndent
  themeStore.isUseJustify = preset.isUseJustify
  headingStyles.value = { ...preset.headingStyles }
}

function syncPresetSessionStorage() {
  if (presetSession.value) {
    persistStylePresetSession(localStorage, STYLE_PRESET_SESSION_KEY, presetSession.value)
  }
  else {
    clearStylePresetSession(localStorage, STYLE_PRESET_SESSION_KEY)
  }
}

function leaveActiveStylePreset() {
  activeStylePresetValue.value = CUSTOM_STYLE_PRESET_PLACEHOLDER
  appliedPresetSignature.value = null
  presetSession.value = null
  syncPresetSessionStorage()
}

/** 撤销点记不下来是小事，方案和版式必须照样换过去 */
function checkpointStyleHistory() {
  try {
    themeDesignerStore.checkpoint()
  }
  catch (error) {
    console.error(`[style] 记录撤销点失败，继续应用当前选择：`, error)
  }
}

function queueStyleAction(action: PendingStyleAction) {
  pendingStyleAction = action
  if (action.type === `preset`) {
    activeStylePresetValue.value = action.preset.value
  }
  else if (action.type === `cancel`) {
    activeStylePresetValue.value = CUSTOM_STYLE_PRESET_PLACEHOLDER
  }
  else if (action.type === `layout`) {
    pendingThemeSelectValue.value = action.value
    if (activeStylePresetValue.value !== CUSTOM_STYLE_PRESET_PLACEHOLDER)
      leaveActiveStylePreset()
  }
  scheduleStyleApply(runPendingStyleAction)
}

async function finishStyleApply(refresh: boolean) {
  try {
    await themeStore.applyCurrentTheme()
    if (refresh)
      editorRefresh()
    else
      themeStore.updateCodeTheme()
  }
  finally {
    await nextTick()
    isApplyingStyleLifecycle = false
  }
}

async function runPendingStyleAction() {
  const action = pendingStyleAction
  pendingStyleAction = null
  if (!action)
    return

  try {
    if (action.type === `preset`)
      await commitStylePreset(action.preset)
    else if (action.type === `cancel`)
      await commitCancelStylePreset()
    else if (action.type === `layout`)
      await commitLayoutSelect(action.value)
    else
      await commitRestoreHistory(action.context)
  }
  catch (error) {
    // 一次失败不能把调度器带崩，后面排队的选择还要继续
    console.error(`[style] 应用样式失败：`, error)
  }
  finally {
    isApplyingStyleLifecycle = false
  }
}

async function commitStylePreset(preset: IStylePreset) {
  const snapshot = captureStyleSnapshot()
  checkpointStyleHistory()
  isApplyingStyleLifecycle = true
  presetSession.value = createStylePresetSession(presetSession.value, preset.value, snapshot)
  themeDesignerStore.setBaseTheme(preset.theme)
  themeDesignerStore.detachSource()
  applyPresetValues(preset)
  activeStylePresetValue.value = preset.value
  appliedPresetSignature.value = currentStylePresetSignature()
  syncPresetSessionStorage()
  pendingThemeSelectValue.value = null
  // 主色进得了图表 SVG，方案改了主色就得整篇重渲，不能只换 CSS
  await finishStyleApply(true)
  trackEvent(`style_preset_apply`, { preset: preset.value })
}

function applyStylePreset(preset: IStylePreset) {
  if (
    pendingStyleAction?.type !== `preset`
    && preset.value === activeStylePresetValue.value
    && appliedPresetSignature.value === currentStylePresetSignature()
  ) {
    return
  }

  queueStyleAction({ type: `preset`, preset })
}

async function commitCancelStylePreset() {
  const snapshot = presetSession.value?.snapshot
  if (!snapshot) {
    leaveActiveStylePreset()
    return
  }

  checkpointStyleHistory()
  isApplyingStyleLifecycle = true
  applyPresetValues(snapshot.preset, snapshot.primaryColorSource)
  themeDesignerStore.replaceDraft(snapshot.visualDraft, false)
  leaveActiveStylePreset()
  pendingThemeSelectValue.value = null
  await finishStyleApply(true)
}

function cancelActiveStylePreset() {
  if (!presetSession.value?.snapshot) {
    leaveActiveStylePreset()
    return
  }

  queueStyleAction({ type: `cancel` })
}

function saveCurrentStylePreset() {
  savePresetError.value = ``
  savePresetFeedback.value = ``
  const validationError = validateStylePresetName(savePresetName.value, stylePresetOptions, customStylePresets.value)
  if (validationError) {
    savePresetError.value = validationError
    return
  }

  const name = savePresetName.value.trim()
  const nextPreset = buildCurrentStylePreset({
    label: name,
    value: `custom-${Date.now()}`,
    scene: `我的预设`,
    desc: `${getThemeLabel(theme.value)} · ${fontSize.value}`,
  })
  const nextPresets = [nextPreset, ...customStylePresets.value]

  if (!persistStylePresets(localStorage, STYLE_PRESET_STORAGE_KEY, nextPresets)) {
    savePresetError.value = `方案保存失败，请检查浏览器存储空间后重试`
    return
  }

  customStylePresets.value = nextPresets
  presetSession.value = createStylePresetSession(null, nextPreset.value, captureStyleSnapshot())
  activeStylePresetValue.value = nextPreset.value
  appliedPresetSignature.value = currentStylePresetSignature()
  syncPresetSessionStorage()
  savePresetName.value = ``
  savePresetFeedback.value = `方案「${name}」已保存`
  toast.success(savePresetFeedback.value)
}

function undoDeleteCustomStylePreset(removal: { item: IStylePreset, index: number }) {
  if (customStylePresets.value.some(preset => preset.value === removal.item.value))
    return

  const nextPresets = restoreSavedItem(customStylePresets.value, removal)
  if (!persistStylePresets(localStorage, STYLE_PRESET_STORAGE_KEY, nextPresets)) {
    toast.error(`方案恢复失败，请检查浏览器存储空间后重试`)
    return
  }

  customStylePresets.value = nextPresets
  toast.success(`方案「${removal.item.label}」已恢复`)
}

function deleteCustomStylePreset(item: IStylePreset) {
  const result = removeSavedItem(customStylePresets.value, preset => preset.value === item.value)
  if (!result)
    return

  if (!persistStylePresets(localStorage, STYLE_PRESET_STORAGE_KEY, result.items)) {
    toast.error(`方案删除失败，请检查浏览器存储空间后重试`)
    return
  }

  customStylePresets.value = result.items
  if (activeStylePresetValue.value === item.value)
    leaveActiveStylePreset()

  toast.success(`方案「${item.label}」已删除`, {
    duration: 5000,
    action: { label: `撤销`, onClick: () => undoDeleteCustomStylePreset(result.removal) },
  })
}

function resetTextGroup() {
  themeStore.fontFamily = defaultStyleConfig.fontFamily
  themeStore.fontSize = defaultStyleConfig.fontSize
  themeStore.primaryColor = defaultStyleConfig.primaryColor
  headingStyles.value = { ...defaultStyleConfig.headingStyles }
  themeStore.isUseIndent = false
  themeStore.isUseJustify = false
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function resetDetailGroup() {
  themeStore.codeBlockTheme = defaultStyleConfig.codeBlockTheme
  themeStore.legend = defaultStyleConfig.legend
  themeStore.isShowCodeLanguage = defaultStyleConfig.isShowCodeLanguage
  themeStore.isShowLineNumber = defaultStyleConfig.isShowLineNumber
  themeStore.isCiteStatus = defaultStyleConfig.isCiteStatus
  themeStore.isCountStatus = defaultStyleConfig.isCountStatus
  editorRefresh()
}

function getDesignerGroup(groupId: string) {
  return themeDesignerGroupMap[groupId]
}

async function applyLayoutBaseline(baseTheme: ThemeName, draft: ThemeDraft) {
  checkpointStyleHistory()
  isApplyingStyleLifecycle = true
  themeDesignerStore.replaceDraft(draft, false)
  themeStore.theme = baseTheme
  themeStore.restorePrimaryColorState(getThemeDefaultPrimaryColor(baseTheme), `theme`)
  headingStyles.value = {}
  if (activeStylePresetValue.value !== CUSTOM_STYLE_PRESET_PLACEHOLDER)
    leaveActiveStylePreset()
  // 版式只改注入的主题 CSS，不必整篇重渲 Markdown
  await finishStyleApply(false)
}

async function commitLayoutSelect(value: string) {
  if (value === currentThemeSelectValue()) {
    if (pendingThemeSelectValue.value === value)
      pendingThemeSelectValue.value = null
    return
  }

  if (value.startsWith(`custom:`)) {
    const target = customVisualThemes.value.find(item => item.id === value.slice(`custom:`.length))
    if (!target) {
      pendingThemeSelectValue.value = null
      return
    }

    await applyLayoutBaseline(target.baseTheme as ThemeName, {
      sourceId: target.id,
      name: target.name,
      baseTheme: target.baseTheme,
      tokens: toPlainSnapshot(target.tokens),
    })
  }
  else if (value.startsWith(`theme:`)) {
    const baseTheme = value.slice(`theme:`.length) as ThemeName
    await applyLayoutBaseline(baseTheme, {
      sourceId: null,
      name: ``,
      baseTheme,
      tokens: {},
    })
    trackEvent(`theme_change`, { theme: baseTheme })
  }

  if (pendingThemeSelectValue.value === value)
    pendingThemeSelectValue.value = null
}

function applyThemeSelectValue(value: string) {
  if (pendingStyleAction && pendingStyleAction.type !== `layout`)
    return
  // 与当前显示相同就是应用过程中的回写，不必再排一轮
  if (value === (pendingThemeSelectValue.value ?? currentThemeSelectValue()))
    return

  queueStyleAction({ type: `layout`, value })
}

function restoreCurrentLayout() {
  const source = activeCustomVisualTheme.value
  if (source) {
    applyLayoutBaseline(source.baseTheme as ThemeName, {
      sourceId: source.id,
      name: source.name,
      baseTheme: source.baseTheme,
      tokens: toPlainSnapshot(source.tokens),
    })
  }
  else {
    applyLayoutBaseline(theme.value, {
      sourceId: null,
      name: ``,
      baseTheme: theme.value,
      tokens: {},
    })
  }

  toast.success(`已恢复当前版式，可使用撤销返回`)
}

function handleThemeWheel(event: WheelEvent) {
  const nextValue = stepSelectValue(themeSelectOptions.value, themeSelectValue.value, event.deltaY)
  if (nextValue === themeSelectValue.value)
    return

  event.preventDefault()
  themeSelectValue.value = nextValue
}

function handleThemeKeyStep(direction: -1 | 1) {
  const nextValue = stepSelectValue(themeSelectOptions.value, themeSelectValue.value, direction)
  if (nextValue !== themeSelectValue.value)
    themeSelectValue.value = nextValue
}

function handleFocusedThemeWheel(event: WheelEvent) {
  if (!isThemeSelectFocused.value)
    return
  if ((event.target as Element | null)?.closest?.(`[data-theme-select-trigger]`))
    return
  handleThemeWheel(event)
}

function captureStyleHistoryContext(): StyleHistoryContext {
  return {
    style: captureStyleSnapshot(),
    activeStylePresetValue: activeStylePresetValue.value,
    appliedPresetSignature: appliedPresetSignature.value,
    presetSession: presetSession.value ? toPlainSnapshot(presetSession.value) : null,
  }
}

async function commitRestoreHistory(snapshot: StyleHistoryContext) {
  isApplyingStyleLifecycle = true
  applyPresetValues(snapshot.style.preset, snapshot.style.primaryColorSource)
  activeStylePresetValue.value = snapshot.activeStylePresetValue
  appliedPresetSignature.value = snapshot.appliedPresetSignature
  presetSession.value = snapshot.presetSession
  syncPresetSessionStorage()
  pendingThemeSelectValue.value = null
  await finishStyleApply(true)
}

function restoreStyleHistoryContext(context: unknown) {
  const snapshot = context as StyleHistoryContext | null
  if (!snapshot?.style?.preset)
    return

  queueStyleAction({ type: `history`, context: snapshot })
}

onMounted(() => {
  themeDesignerStore.setHistoryContextAdapter({
    capture: captureStyleHistoryContext,
    restore: restoreStyleHistoryContext,
  })
  window.addEventListener(`wheel`, handleFocusedThemeWheel, { passive: false })
})
onBeforeUnmount(() => {
  themeDesignerStore.setHistoryContextAdapter(null)
  window.removeEventListener(`wheel`, handleFocusedThemeWheel)
})

// 精细调节现在就在下面几页里，载入后跳到「文字」页即可继续改
function editCustomVisualTheme(id: string) {
  applyThemeSelectValue(`custom:${id}`)
  activeStylePanel.value = `text`
}

function renameCustomVisualTheme(item: CustomTheme) {
  const name = window.prompt(`请输入新的主题名称`, item.name)?.trim()
  if (!name)
    return

  if (themeDesignerStore.isNameTaken(name, item.id)) {
    toast.error(`已经有同名主题了`)
    return
  }

  themeDesignerStore.renameCustomTheme(item.id, name)
  toast.success(`已重命名为「${name}」`)
}

function undoDeleteCustomVisualTheme(removal: DeletedCustomTheme) {
  themeDesignerStore.restoreCustomTheme(removal)
  toast.success(`版式「${removal.item.name}」已恢复`)
}

function deleteCustomVisualTheme(item: CustomTheme) {
  const removal = themeDesignerStore.deleteCustomTheme(item.id)
  if (!removal)
    return

  themeStore.applyCurrentTheme()
  toast.success(`版式「${item.name}」已删除`, {
    duration: 5000,
    action: { label: `撤销`, onClick: () => undoDeleteCustomVisualTheme(removal) },
  })
}

function exportCustomVisualThemeCSS(item: CustomTheme) {
  const baseCSS = themeMap[item.baseTheme as ThemeName] || themeMap.default
  const label = themeOptionsMap[item.baseTheme as ThemeName]?.label || item.baseTheme
  exportCustomThemeAsCSS(item, baseCSS, label)
  toast.success(`已导出 CSS`)
}

function exportCustomVisualThemeJSON(item: CustomTheme) {
  exportCustomThemeAsJSON(item)
  toast.success(`已导出 JSON`)
}

function codeBlockThemeChanged(newTheme: string) {
  themeStore.codeBlockTheme = newTheme
  editorRefresh()
}

function macCodeBlockChanged() {
  themeStore.isShowCodeLanguage = !themeStore.isShowCodeLanguage
  editorRefresh()
}

function showLineNumberChanged() {
  themeStore.isShowLineNumber = !themeStore.isShowLineNumber
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

function setShowCodeLanguage(enabled: boolean) {
  if (isShowCodeLanguage.value !== enabled)
    macCodeBlockChanged()
}

function setShowLineNumber(enabled: boolean) {
  if (isShowLineNumber.value !== enabled)
    showLineNumberChanged()
}

function setUseIndent(enabled: boolean) {
  if (isUseIndent.value !== enabled)
    useIndentChanged()
}

function setUseJustify(enabled: boolean) {
  if (isUseJustify.value !== enabled)
    useJustifyChanged()
}

// 公众号渲染开关：原「格式」菜单里的两项，挪进细节页后带上可见的开关状态
function setCiteStatus(enabled: boolean) {
  if (themeStore.isCiteStatus === enabled)
    return
  themeStore.isCiteStatus = enabled
  editorRefresh()
}

function setCountStatus(enabled: boolean) {
  if (themeStore.isCountStatus === enabled)
    return
  themeStore.isCountStatus = enabled
  editorRefresh()
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

watch(computed(currentStylePresetSignature), (signature) => {
  if (isApplyingStyleLifecycle)
    return

  if (shouldClearStylePreset(
    activeStylePresetValue.value,
    CUSTOM_STYLE_PRESET_PLACEHOLDER,
    appliedPresetSignature.value,
    signature,
  )) {
    leaveActiveStylePreset()
  }
})

const isOpen = ref(false)

const addPostInputVal = ref(``)

watch(isOpen, () => {
  if (isOpen.value) {
    addPostInputVal.value = ``
  }
})
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
      class="style-panel space-y-4 h-full overflow-auto p-4"
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

      <StyleQuickControls v-if="isSimpleWorkspace" variant="compact" />

      <template v-else>
        <div class="inspector-mode-switch" aria-label="右侧检查器模式">
          <button
            type="button"
            :class="{ 'inspector-mode-switch__item--active': activeInspectorPanel === 'component' }"
            class="inspector-mode-switch__item"
            @click="activeInspectorPanel = 'component'"
          >
            当前组件
          </button>
          <button
            type="button"
            :class="{ 'inspector-mode-switch__item--active': activeInspectorPanel === 'style' }"
            class="inspector-mode-switch__item"
            @click="activeInspectorPanel = 'style'"
          >
            全局样式
          </button>
        </div>

        <section v-show="activeInspectorPanel === 'component'" id="block-inspector-slot" class="block-inspector-slot">
          <HeadingBlockWorkspace
            v-if="blockSelection"
            :category-id="blockSelection.category"
            mode="inspector"
          />
          <div v-else class="block-inspector-empty">
            <span>COMPONENT</span>
            <strong>从板块库选择一个组件</strong>
            <p>组件列表会保留当前位置，选中后可在这里直接修改文字和字号。</p>
          </div>
        </section>

        <Tabs v-show="activeInspectorPanel === 'style'" v-model="activeStylePanel" class="w-full">
          <TabsList class="grid w-full grid-cols-4">
            <TabsTrigger value="template">
              版式
            </TabsTrigger>
            <TabsTrigger value="text">
              文字
            </TabsTrigger>
            <TabsTrigger value="block">
              区块
            </TabsTrigger>
            <TabsTrigger value="detail">
              细节
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" class="mt-4 space-y-4">
            <div class="style-card space-y-3">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold">
                  方案
                </h2>
                <Button
                  v-if="presetSelectValue !== CUSTOM_STYLE_PRESET_PLACEHOLDER"
                  variant="ghost"
                  size="sm"
                  class="h-8 shrink-0 px-2.5 text-xs"
                  @click="cancelActiveStylePreset"
                >
                  取消方案
                </Button>
              </div>
              <Select v-model="presetSelectValue" :modal="false">
                <SelectTrigger class="h-9 w-full">
                  <SelectValue placeholder="当前自定义" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="CUSTOM_STYLE_PRESET_PLACEHOLDER">
                    当前自定义
                  </SelectItem>
                  <SelectItem v-for="preset in stylePresetOptions" :key="preset.value" :value="preset.value">
                    内置 · {{ preset.label }}
                  </SelectItem>
                  <SelectItem v-for="preset in customStylePresets" :key="preset.value" :value="preset.value">
                    我的 · {{ preset.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div v-if="activeCustomStylePreset" class="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2.5 text-xs text-destructive"
                  :aria-label="`删除方案 ${activeCustomStylePreset.label}`"
                  @click="deleteCustomStylePreset(activeCustomStylePreset)"
                >
                  删除方案
                </Button>
              </div>
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <Input
                    v-model="savePresetName"
                    class="h-9"
                    placeholder="方案名称"
                    aria-label="方案名称"
                    :aria-invalid="Boolean(savePresetError)"
                    @update:model-value="savePresetError = ''; savePresetFeedback = ''"
                    @keydown.enter="saveCurrentStylePreset"
                  />
                  <p v-if="savePresetError" role="alert" class="mt-1.5 text-xs text-destructive">
                    {{ savePresetError }}
                  </p>
                  <p v-else-if="savePresetFeedback" role="status" class="mt-1.5 text-xs text-primary">
                    {{ savePresetFeedback }}
                  </p>
                </div>
                <Button size="sm" class="h-9 shrink-0 px-3 text-xs" @click="saveCurrentStylePreset">
                  保存方案
                </Button>
              </div>
            </div>

            <div class="style-card space-y-3">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold">
                  版式
                </h2>
                <Button variant="ghost" size="sm" class="h-8 shrink-0 px-3 text-xs" @click="restoreCurrentLayout">
                  恢复当前版式
                </Button>
              </div>
              <Select v-model="themeSelectValue" :modal="false">
                <SelectTrigger
                  data-theme-select-trigger
                  class="h-9 w-full"
                  @focus="isThemeSelectFocused = true"
                  @blur="isThemeSelectFocused = false"
                  @wheel="handleThemeWheel"
                  @keydown.down.prevent="handleThemeKeyStep(1)"
                  @keydown.up.prevent="handleThemeKeyStep(-1)"
                >
                  <SelectValue placeholder="选择版式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in themeSelectOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <div v-if="activeCustomVisualTheme" class="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" class="h-8 px-2.5 text-xs" @click="editCustomVisualTheme(activeCustomVisualTheme.id)">
                  编辑
                </Button>
                <Button variant="outline" size="sm" class="h-8 px-2.5 text-xs" @click="renameCustomVisualTheme(activeCustomVisualTheme)">
                  重命名
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="outline" size="sm" class="h-8 px-2.5 text-xs">
                      导出
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem @click="exportCustomVisualThemeCSS(activeCustomVisualTheme)">
                      导出 CSS
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="exportCustomVisualThemeJSON(activeCustomVisualTheme)">
                      导出 JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2.5 text-xs text-destructive"
                  :aria-label="`删除版式 ${activeCustomVisualTheme.name}`"
                  @click="deleteCustomVisualTheme(activeCustomVisualTheme)"
                >
                  删除版式
                </Button>
              </div>

              <ThemeDraftControls />
            </div>
          </TabsContent>

          <TabsContent value="text" class="mt-4 space-y-4">
            <div class="flex items-center justify-end">
              <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="resetTextGroup">
                重置本组
              </Button>
            </div>

            <StyleQuickControls variant="full" />

            <div class="style-card space-y-3">
              <h2 class="text-sm font-semibold">
                段落阅读方式
              </h2>
              <div class="grid gap-3">
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-medium">
                      首行缩进
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
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-medium">
                      两端对齐
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

            <div class="space-y-2">
              <div class="px-1 text-xs font-medium text-muted-foreground">
                精细调节
              </div>
              <ThemeDesignerGroupCard :group="getDesignerGroup('base')" />
              <ThemeDesignerHeadingCard />
              <ThemeDesignerGroupCard :group="getDesignerGroup('paragraph')" />
              <ThemeDesignerGroupCard :group="getDesignerGroup('link')" />
            </div>
          </TabsContent>

          <TabsContent value="block" class="mt-4 space-y-2">
            <ThemeDesignerGroupCard :group="getDesignerGroup('blockquote')" />
            <ThemeDesignerGroupCard :group="getDesignerGroup('list')" />
            <ThemeDesignerGroupCard :group="getDesignerGroup('table')" />
            <ThemeDesignerGroupCard :group="getDesignerGroup('divider')" />
            <ThemeDesignerGroupCard :group="getDesignerGroup('image')" />
            <ThemeDesignerGroupCard :group="getDesignerGroup('figcaption')" />
          </TabsContent>

          <TabsContent value="detail" class="mt-4 space-y-4">
            <div class="flex items-center justify-end">
              <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="resetDetailGroup">
                重置本组
              </Button>
            </div>

            <div class="style-card space-y-3">
              <h2 class="text-sm font-semibold">
                代码块
              </h2>
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
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-medium">
                      代码块语言标注
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': isShowCodeLanguage }" @click="setShowCodeLanguage(true)">
                        开
                      </Button>
                      <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': !isShowCodeLanguage }" @click="setShowCodeLanguage(false)">
                        关
                      </Button>
                    </div>
                  </div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-medium">
                      代码块行号
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

            <div class="style-card space-y-3">
              <h2 class="text-sm font-semibold">
                公众号细节
              </h2>
              <div class="grid gap-3">
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-medium">
                      微信外链转底部引用
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
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-medium">
                      字数与阅读时间
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': isCountStatus }" @click="setCountStatus(true)">
                        开
                      </Button>
                      <Button variant="outline" class="h-8 px-3 text-xs" :class="{ 'border-black dark:border-white border-2': !isCountStatus }" @click="setCountStatus(false)">
                        关
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="px-1 text-xs font-medium text-muted-foreground">
                精细调节
              </div>
              <ThemeDesignerGroupCard :group="getDesignerGroup('codeBlock')" />
              <ThemeDesignerGroupCard :group="getDesignerGroup('inlineCode')" />
            </div>
          </TabsContent>
        </Tabs>
      </template>
    </div>
  </div>
</template>

<style scoped>
.inspector-mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--secondary) / 0.5);
}

.inspector-mode-switch__item {
  min-width: 0;
  padding: 0.48rem 0.65rem;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 650;
  color: hsl(var(--muted-foreground));
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.inspector-mode-switch__item--active {
  background: hsl(var(--background));
  box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
  color: hsl(var(--foreground));
}

.block-inspector-slot {
  min-height: 12rem;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.block-inspector-empty {
  display: grid;
  min-height: 12rem;
  place-content: center;
  padding: 1.5rem;
  border: 1px dashed hsl(var(--border));
  border-radius: 16px;
  text-align: center;
  background: hsl(var(--secondary) / 0.22);
}

.block-inspector-empty span {
  margin-bottom: 0.55rem;
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  color: hsl(var(--primary));
}

.block-inspector-empty strong {
  font-size: 0.88rem;
}

.block-inspector-empty p {
  max-width: 17rem;
  margin: 0.45rem auto 0;
  font-size: 0.72rem;
  line-height: 1.65;
  color: hsl(var(--muted-foreground));
}

/* 移动端右侧栏动画 - 只有添加了 animate 类才启用 */
.mobile-right-drawer.animate {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
