import { describe, expect, it } from 'vitest'
import { shouldSyncPreviewFromEditorUpdate } from '@/utils/editor-preview-sync'

describe(`编辑区驱动预览定位`, () => {
  it(`鼠标或键盘只移动光标时同步预览`, () => {
    expect(shouldSyncPreviewFromEditorUpdate({ selectionSet: true, docChanged: false })).toBe(true)
  })

  it(`组件替换造成整篇文档变化时保留预览滚动位置`, () => {
    expect(shouldSyncPreviewFromEditorUpdate({ selectionSet: true, docChanged: true })).toBe(false)
    expect(shouldSyncPreviewFromEditorUpdate({ selectionSet: false, docChanged: true })).toBe(false)
  })
})
