import type {
  CustomTheme,
  HeadingLevelId,
  ParsedThemeFile,
  ThemeDraft,
  ThemeTokens,
  ThemeTokenValue,
} from '@/utils/theme-designer'
import { addPrefix } from '@/utils'
import { createClientId } from '@/utils/id'
import { store } from '@/utils/storage'
import { removeSavedItem, restoreSavedItem } from '@/utils/style-panel'
import {
  cloneThemeTokens,
  collectThemeTokenDiff,
  collectWechatRisks,
  countGroupTokens,
  countThemeTokens,
  derivePaletteTokens,
  generateThemeOverrideCSS,
  sanitizeThemeTokens,
} from '@/utils/theme-designer'
import {
  createHistoryState,
  pushHistory as pushHistoryState,
  redoHistory,
  undoHistory,
} from '@/utils/theme-designer/history'

const HISTORY_LIMIT = 60

interface ThemeHistoryContextAdapter {
  capture: () => unknown
  restore: (context: unknown) => void
}

interface ThemeHistoryEntry {
  draft: ThemeDraft
  context: unknown
}

interface DeletedCustomTheme {
  item: CustomTheme
  index: number
}

function createEmptyDraft(baseTheme: string): ThemeDraft {
  return {
    sourceId: null,
    name: ``,
    baseTheme,
    tokens: {},
  }
}

function cloneThemeDraft(source: ThemeDraft): ThemeDraft {
  return {
    sourceId: source.sourceId,
    name: source.name,
    baseTheme: source.baseTheme,
    tokens: cloneThemeTokens(source.tokens),
  }
}

function normalizeCustomTheme(raw: Partial<CustomTheme>): CustomTheme {
  const now = Date.now()
  return {
    id: typeof raw.id === `string` && raw.id ? raw.id : createClientId(),
    name: typeof raw.name === `string` && raw.name.trim() ? raw.name.trim() : `未命名主题`,
    baseTheme: typeof raw.baseTheme === `string` ? raw.baseTheme : `default`,
    tokens: sanitizeThemeTokens(raw.tokens),
    createdAt: typeof raw.createdAt === `number` ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === `number` ? raw.updatedAt : now,
  }
}

/**
 * 主题可视化编辑器 Store
 * 只负责 token 草稿、自定义主题的增删改查和覆盖层 CSS 的生成，
 * 不直接依赖 theme store，由 theme store 反向读取 overrideCSS
 */
export const useThemeDesignerStore = defineStore(`themeDesigner`, () => {
  const customThemes = store.reactive<CustomTheme[]>(addPrefix(`custom_themes`), [])
  const draft = store.reactive<ThemeDraft>(addPrefix(`theme_designer_draft`), createEmptyDraft(`default`))

  customThemes.value = (Array.isArray(customThemes.value) ? customThemes.value : []).map(normalizeCustomTheme)
  draft.value = {
    sourceId: typeof draft.value?.sourceId === `string` ? draft.value.sourceId : null,
    name: typeof draft.value?.name === `string` ? draft.value.name : ``,
    baseTheme: typeof draft.value?.baseTheme === `string` ? draft.value.baseTheme : `default`,
    tokens: sanitizeThemeTokens(draft.value?.tokens),
  }

  const isOpen = ref(false)
  const activeCategory = ref(`text`)
  const activeHeadingLevel = ref<HeadingLevelId>(`h2`)
  const expandedGroups = ref<string[]>([`heading`, `paragraph`, `blockquote`, `codeBlock`, `image`])
  /** 从预览点过来时短暂高亮的分组，用完由样式面板清掉 */
  const focusedGroupId = ref(``)

  const history = ref(createHistoryState<ThemeHistoryEntry>())
  let historyContextAdapter: ThemeHistoryContextAdapter | null = null

  const tokens = computed(() => draft.value.tokens)
  const overrideCSS = computed(() => generateThemeOverrideCSS(draft.value.tokens))
  const modifiedCount = computed(() => countThemeTokens(draft.value.tokens))
  const hasOverrides = computed(() => modifiedCount.value > 0)
  const diffItems = computed(() => collectThemeTokenDiff(draft.value.tokens))
  const wechatRisks = computed(() => collectWechatRisks(draft.value.tokens))
  const canUndo = computed(() => history.value.past.length > 0)
  const canRedo = computed(() => history.value.future.length > 0)

  const sourceTheme = computed(() => customThemes.value.find(item => item.id === draft.value.sourceId) || null)
  const isDirty = computed(() => {
    if (!sourceTheme.value)
      return hasOverrides.value

    return JSON.stringify(sourceTheme.value.tokens) !== JSON.stringify(draft.value.tokens)
      || sourceTheme.value.baseTheme !== draft.value.baseTheme
  })

  const hasCodeBackgroundOverride = computed(() => `background` in (draft.value.tokens.codeBlock || {}))
  const hasCodeTextOverride = computed(() => `textColor` in (draft.value.tokens.codeBlock || {}))

  function groupCount(groupId: string) {
    return countGroupTokens(draft.value.tokens, groupId)
  }

  function captureHistoryEntry(): ThemeHistoryEntry {
    return {
      draft: cloneThemeDraft(draft.value),
      context: historyContextAdapter?.capture() ?? null,
    }
  }

  function restoreHistoryEntry(entry: ThemeHistoryEntry) {
    draft.value = cloneThemeDraft(entry.draft)
    historyContextAdapter?.restore(entry.context)
  }

  function checkpoint() {
    history.value = pushHistoryState(history.value, captureHistoryEntry(), HISTORY_LIMIT)
  }

  function setHistoryContextAdapter(adapter: ThemeHistoryContextAdapter | null) {
    historyContextAdapter = adapter
  }

  function commitTokens(next: ThemeTokens) {
    draft.value = { ...draft.value, tokens: next }
  }

  function setToken(groupId: string, key: string, value: ThemeTokenValue) {
    checkpoint()
    const next = cloneThemeTokens(draft.value.tokens)
    next[groupId] = { ...next[groupId], [key]: value }
    commitTokens(next)
  }

  function resetToken(groupId: string, key: string, recordHistory = true) {
    if (!(key in (draft.value.tokens[groupId] || {})))
      return

    if (recordHistory)
      checkpoint()
    const next = cloneThemeTokens(draft.value.tokens)
    const group = { ...next[groupId] }
    delete group[key]

    if (Object.keys(group).length) {
      next[groupId] = group
    }
    else {
      delete next[groupId]
    }

    commitTokens(next)
  }

  function resetGroup(groupId: string, recordHistory = true) {
    if (!draft.value.tokens[groupId])
      return

    if (recordHistory)
      checkpoint()
    const next = cloneThemeTokens(draft.value.tokens)
    delete next[groupId]
    commitTokens(next)
  }

  function resetAll() {
    if (!hasOverrides.value)
      return

    checkpoint()
    commitTokens({})
  }

  function replaceTokens(next: ThemeTokens, recordHistory = true) {
    if (recordHistory)
      checkpoint()
    commitTokens(sanitizeThemeTokens(next))
  }

  function replaceDraft(next: ThemeDraft, recordHistory = true) {
    if (recordHistory)
      checkpoint()

    draft.value = {
      sourceId: typeof next.sourceId === `string` ? next.sourceId : null,
      name: typeof next.name === `string` ? next.name : ``,
      baseTheme: typeof next.baseTheme === `string` ? next.baseTheme : `default`,
      tokens: sanitizeThemeTokens(next.tokens),
    }
  }

  function applyPalette(color: string) {
    replaceTokens(derivePaletteTokens(draft.value.tokens, color))
  }

  function undo() {
    const transition = undoHistory(history.value, captureHistoryEntry(), HISTORY_LIMIT)
    if (!transition)
      return

    history.value = transition.state
    restoreHistoryEntry(transition.entry)
  }

  function redo() {
    const transition = redoHistory(history.value, captureHistoryEntry(), HISTORY_LIMIT)
    if (!transition)
      return

    history.value = transition.state
    restoreHistoryEntry(transition.entry)
  }

  function clearHistory() {
    history.value = createHistoryState()
  }

  function setDraftName(name: string) {
    draft.value = { ...draft.value, name }
  }

  /**
   * 同步基础主题：用户在样式面板里换了内置主题时调用，可视化调整会保留在新主题之上
   */
  function setBaseTheme(baseTheme: string) {
    if (draft.value.baseTheme === baseTheme)
      return

    draft.value = { ...draft.value, baseTheme }
  }

  function startFromTheme(baseTheme: string) {
    replaceDraft(createEmptyDraft(baseTheme))
  }

  function loadCustomTheme(id: string): CustomTheme | null {
    const target = customThemes.value.find(item => item.id === id)
    if (!target)
      return null

    replaceDraft({
      sourceId: target.id,
      name: target.name,
      baseTheme: target.baseTheme,
      tokens: cloneThemeTokens(target.tokens),
    })

    return target
  }

  function detachSource() {
    if (draft.value.sourceId === null)
      return

    draft.value = { ...draft.value, sourceId: null }
  }

  function isNameTaken(name: string, exceptId?: string) {
    return customThemes.value.some(item => item.name === name.trim() && item.id !== exceptId)
  }

  function saveDraftAsNew(name: string): CustomTheme {
    const now = Date.now()
    const created: CustomTheme = {
      id: createClientId(),
      name: name.trim(),
      baseTheme: draft.value.baseTheme,
      tokens: cloneThemeTokens(draft.value.tokens),
      createdAt: now,
      updatedAt: now,
    }

    customThemes.value = [created, ...customThemes.value]
    draft.value = { ...draft.value, sourceId: created.id, name: created.name }

    return created
  }

  function updateDraftSource(): CustomTheme | null {
    const target = sourceTheme.value
    if (!target)
      return null

    const updated: CustomTheme = {
      ...target,
      name: draft.value.name.trim() || target.name,
      baseTheme: draft.value.baseTheme,
      tokens: cloneThemeTokens(draft.value.tokens),
      updatedAt: Date.now(),
    }

    customThemes.value = customThemes.value.map(item => item.id === updated.id ? updated : item)

    return updated
  }

  function renameCustomTheme(id: string, name: string) {
    customThemes.value = customThemes.value.map(item => item.id === id
      ? { ...item, name: name.trim(), updatedAt: Date.now() }
      : item)

    if (draft.value.sourceId === id) {
      draft.value = { ...draft.value, name: name.trim() }
    }
  }

  function deleteCustomTheme(id: string): DeletedCustomTheme | null {
    const result = removeSavedItem(customThemes.value, item => item.id === id)
    if (!result)
      return null

    customThemes.value = result.items

    if (draft.value.sourceId === id) {
      draft.value = { ...draft.value, sourceId: null }
    }

    return result.removal
  }

  function restoreCustomTheme(removal: DeletedCustomTheme) {
    if (customThemes.value.some(item => item.id === removal.item.id))
      return

    customThemes.value = restoreSavedItem(customThemes.value, removal)
  }

  function importThemeFile(parsed: ParsedThemeFile, fallbackBaseTheme: string): CustomTheme {
    const now = Date.now()
    const created: CustomTheme = {
      id: createClientId(),
      name: isNameTaken(parsed.name) ? `${parsed.name} 副本` : parsed.name,
      baseTheme: parsed.baseTheme || fallbackBaseTheme,
      tokens: sanitizeThemeTokens(parsed.tokens),
      createdAt: now,
      updatedAt: now,
    }

    customThemes.value = [created, ...customThemes.value]

    return created
  }

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return {
    // State
    customThemes,
    draft,
    isOpen,
    activeCategory,
    activeHeadingLevel,
    expandedGroups,
    focusedGroupId,

    // Getters
    tokens,
    overrideCSS,
    modifiedCount,
    hasOverrides,
    diffItems,
    wechatRisks,
    canUndo,
    canRedo,
    sourceTheme,
    isDirty,
    hasCodeBackgroundOverride,
    hasCodeTextOverride,

    // Actions
    groupCount,
    setToken,
    resetToken,
    resetGroup,
    resetAll,
    replaceTokens,
    replaceDraft,
    applyPalette,
    checkpoint,
    undo,
    redo,
    clearHistory,
    setHistoryContextAdapter,
    setDraftName,
    setBaseTheme,
    startFromTheme,
    loadCustomTheme,
    detachSource,
    isNameTaken,
    saveDraftAsNew,
    updateDraftSource,
    renameCustomTheme,
    deleteCustomTheme,
    restoreCustomTheme,
    importThemeFile,
    open,
    close,
  }
})
