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
