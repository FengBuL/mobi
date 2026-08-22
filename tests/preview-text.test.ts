import { describe, expect, it } from 'vitest'
import { WECHAT_EDITOR_ONLY_ATTR } from '../apps/web/src/utils/image-layouts'
import {
  PREVIEW_BLOCK_PICK_HINT,
  readPreviewElementText,
  stripPickHintFromTitle,
} from '../apps/web/src/utils/preview-text'

describe(`预览选中读标题`, () => {
  it(`整段 textContent 里的引导字不会当成标题`, () => {
    const heading = document.createElement(`h2`)
    heading.textContent = `典礼双线`
    const label = document.createElement(`span`)
    label.className = `preview-block-pick-hint-label`
    label.setAttribute(WECHAT_EDITOR_ONLY_ATTR, `block-pick-hint`)
    label.textContent = PREVIEW_BLOCK_PICK_HINT
    heading.appendChild(label)

    expect(heading.textContent).toContain(PREVIEW_BLOCK_PICK_HINT)
    expect(readPreviewElementText(heading)).toBe(`典礼双线`)
    expect(stripPickHintFromTitle(`典礼双线${PREVIEW_BLOCK_PICK_HINT}`)).toBe(`典礼双线`)
  })
})
