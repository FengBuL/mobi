import { WECHAT_EDITOR_ONLY_ATTR } from './image-layouts'

export const PREVIEW_BLOCK_PICK_HINT = `点这里换样子`

export function cloneWithoutEditorChrome(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll(`[${WECHAT_EDITOR_ONLY_ATTR}]`).forEach(node => node.remove())
  clone.querySelectorAll(`.preview-block-pick-hint-label`).forEach(node => node.remove())
  return clone
}

export function readPreviewElementText(element: HTMLElement) {
  return (cloneWithoutEditorChrome(element).textContent || ``)
    .replace(/\s+/g, ` `)
    .trim()
}

export function stripPickHintFromTitle(title: string) {
  return title.replace(new RegExp(`${PREVIEW_BLOCK_PICK_HINT}\\s*$`, `u`), ``).trim()
}
