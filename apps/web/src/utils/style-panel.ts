import type { IStylePreset, IThemeCategory } from '@mobi/shared/configs'

export interface StyleSelectOption {
  label: string
  value: string
}

export interface SavedVisualThemeOption {
  id: string
  name: string
}

export interface StylePresetSession<TSnapshot> {
  activeValue: string
  snapshot: TSnapshot
}

export interface SavedItemRemoval<T> {
  item: T
  index: number
}

export interface StyleRendererFields {
  legend: string
  isShowCodeLanguage: boolean
  isShowLineNumber: boolean
  isCiteStatus: boolean
}

/**
 * 深拷成纯对象。
 * structuredClone 克隆不了 Proxy，而 toRaw 只解顶层一层，
 * 嵌套的响应式对象会让快照直接抛 DataCloneError。
 */
export function toPlainSnapshot<T>(value: T): T {
  if (Array.isArray(value))
    return value.map(item => toPlainSnapshot(item)) as unknown as T

  if (!value || typeof value !== `object`)
    return value

  const plain: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === `function`)
      continue
    plain[key] = toPlainSnapshot(item)
  }
  return plain as T
}

/**
 * 连点时先等一小段，进行中的任务未结束也只保留最后一次。
 * 中间态不必各自注入主题、更不必整篇重渲。
 */
export function createLatestAsyncScheduler(
  scheduleStart: (run: () => void) => void = (run) => {
    if (typeof requestAnimationFrame === `function`)
      requestAnimationFrame(run)
    else
      queueMicrotask(run)
  },
) {
  let pending: (() => void | Promise<void>) | null = null
  let running = false
  let startScheduled = false

  const pump = async () => {
    running = true
    startScheduled = false
    try {
      while (pending) {
        const next = pending
        pending = null
        await next()
      }
    }
    finally {
      running = false
      if (pending && !startScheduled) {
        startScheduled = true
        scheduleStart(() => {
          void pump()
        })
      }
    }
  }

  return (task: () => void | Promise<void>) => {
    pending = task
    if (running || startScheduled)
      return

    startScheduled = true
    scheduleStart(() => {
      void pump()
    })
  }
}

/** @deprecated 使用 createLatestAsyncScheduler */
export function createLatestTaskScheduler(
  scheduleFlush: (run: () => void) => void = (run) => {
    if (typeof requestAnimationFrame === `function`)
      requestAnimationFrame(run)
    else
      queueMicrotask(run)
  },
) {
  return createLatestAsyncScheduler(scheduleFlush)
}

export function shouldRefreshAfterStyleApply(
  previous: StyleRendererFields,
  next: StyleRendererFields,
): boolean {
  return previous.legend !== next.legend
    || previous.isShowCodeLanguage !== next.isShowCodeLanguage
    || previous.isShowLineNumber !== next.isShowLineNumber
    || previous.isCiteStatus !== next.isCiteStatus
}

export function shouldIgnorePresetSelectValue(
  value: string,
  customValue: string,
  options: {
    isApplying: boolean
    pendingType?: string | null
    hasPresetSession: boolean
    currentValue?: string
  },
): boolean {
  // 应用过程中下拉会把当前值回写一遍来同步状态，这种自反馈必须挡掉，
  // 否则会和乐观更新互相触发；值跟当前显示不一样，才是用户又点了一个。
  if (options.isApplying && (options.currentValue === undefined || value === options.currentValue))
    return true
  if (value !== customValue)
    return false
  if (options.pendingType === `layout`)
    return true
  return !options.hasPresetSession
}

export function buildThemeSelectOptions(
  categories: IThemeCategory[],
  customThemes: SavedVisualThemeOption[] = [],
): StyleSelectOption[] {
  const builtIn = categories.flatMap(category => category.themes.map(theme => ({
    label: `${category.category} · ${theme.label}`,
    value: `theme:${theme.value}`,
  })))
  const custom = customThemes.map(theme => ({
    label: `我的版式 · ${theme.name}`,
    value: `custom:${theme.id}`,
  }))

  return [...builtIn, ...custom]
}

export function stepSelectValue(
  options: StyleSelectOption[],
  currentValue: string,
  deltaY: number,
): string {
  if (!deltaY || !options.length)
    return currentValue

  const currentIndex = options.findIndex(option => option.value === currentValue)
  if (currentIndex < 0)
    return currentValue

  const direction = deltaY > 0 ? 1 : -1
  const nextIndex = Math.min(options.length - 1, Math.max(0, currentIndex + direction))
  return options[nextIndex].value
}

export function shouldClearStylePreset(
  activeValue: string,
  customValue: string,
  appliedSignature: string | null,
  currentSignature: string,
): boolean {
  return activeValue !== customValue
    && appliedSignature !== null
    && appliedSignature !== currentSignature
}

export function loadStylePresets(storage: Pick<Storage, `getItem`>, key: string): IStylePreset[] {
  try {
    const parsed = JSON.parse(storage.getItem(key) || `[]`)
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

export function persistStylePresets(
  storage: Pick<Storage, `setItem`>,
  key: string,
  presets: IStylePreset[],
): boolean {
  try {
    storage.setItem(key, JSON.stringify(presets))
    return true
  }
  catch {
    return false
  }
}

export function createStylePresetSession<TSnapshot>(
  current: StylePresetSession<TSnapshot> | null,
  activeValue: string,
  snapshot: TSnapshot,
): StylePresetSession<TSnapshot> {
  return {
    activeValue,
    snapshot: current?.snapshot ?? snapshot,
  }
}

export function loadStylePresetSession<TSnapshot>(
  storage: Pick<Storage, `getItem`>,
  key: string,
): StylePresetSession<TSnapshot> | null {
  try {
    const parsed = JSON.parse(storage.getItem(key) || `null`)
    if (!parsed || typeof parsed !== `object` || typeof parsed.activeValue !== `string` || !(`snapshot` in parsed))
      return null
    return parsed as StylePresetSession<TSnapshot>
  }
  catch {
    return null
  }
}

export function persistStylePresetSession<TSnapshot>(
  storage: Pick<Storage, `setItem`>,
  key: string,
  session: StylePresetSession<TSnapshot>,
): boolean {
  try {
    storage.setItem(key, JSON.stringify(session))
    return true
  }
  catch {
    return false
  }
}

export function clearStylePresetSession(
  storage: Pick<Storage, `removeItem`>,
  key: string,
): boolean {
  try {
    storage.removeItem(key)
    return true
  }
  catch {
    return false
  }
}

export function removeSavedItem<T>(
  items: T[],
  predicate: (item: T) => boolean,
): { items: T[], removal: SavedItemRemoval<T> } | null {
  const index = items.findIndex(predicate)
  if (index < 0)
    return null

  return {
    items: items.filter((_, itemIndex) => itemIndex !== index),
    removal: { item: items[index], index },
  }
}

export function restoreSavedItem<T>(items: T[], removal: SavedItemRemoval<T>): T[] {
  const next = [...items]
  next.splice(Math.min(Math.max(removal.index, 0), next.length), 0, removal.item)
  return next
}

export function validateStylePresetName(
  rawName: string,
  builtInPresets: Pick<IStylePreset, `label`>[],
  customPresets: Pick<IStylePreset, `label`>[],
): string | null {
  const name = rawName.trim()
  if (!name)
    return `方案名称不能为空`
  if (builtInPresets.some(preset => preset.label === name))
    return `已有同名内置方案`
  if (customPresets.some(preset => preset.label === name))
    return `已有同名我的方案`
  return null
}
