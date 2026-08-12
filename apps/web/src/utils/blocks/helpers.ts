import type { BlockFieldSchema, BlockPreset, BlockState } from './types'

export function escapeBlockHtml(value: unknown) {
  return String(value ?? ``)
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
}

export function formatBlockText(value: unknown) {
  return escapeBlockHtml(String(value ?? ``).trim()).replace(/\n+/g, `<br/>`)
}

export function compactBlockMarkup(value: string) {
  return value
    .replace(/\r/g, ``)
    .split(`\n`)
    .map(line => line.trim())
    .filter(Boolean)
    .join(``)
}

export function createStateFromFields(fields: BlockFieldSchema[]) {
  return Object.fromEntries(fields.map(field => [field.key, field.defaultValue])) as BlockState
}

export function parseBlockFieldState(raw: string, preset: BlockPreset) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, `text/html`)
  const root = doc.body.querySelector<HTMLElement>(`section.md-block`)
  if (!root) {
    return null
  }

  const state = createStateFromFields(preset.fields)
  preset.fields.forEach((field) => {
    const element = root.querySelector<HTMLElement>(`[data-block-field="${field.key}"]`)
    if (!element) {
      return
    }
    const value = element.dataset.blockValue ?? element.textContent?.trim() ?? ``
    if (field.type === `number`) {
      state[field.key] = Number(value)
    }
    else if (field.type === `switch`) {
      state[field.key] = value === `true`
    }
    else {
      state[field.key] = value
    }
  })
  return state
}

export function getBlockRootAttrs(preset: BlockPreset) {
  return [
    `class="md-block md-block--${preset.category}"`,
    `data-block-category="${preset.category}"`,
    `data-block-preset="${preset.id}"`,
    `data-block-version="1"`,
  ].join(` `)
}

export function getBlockFieldAttrs(key: string, value: unknown) {
  return `data-block-field="${escapeBlockHtml(key)}" data-block-value="${escapeBlockHtml(value)}"`
}
