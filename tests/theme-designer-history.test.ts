import { describe, expect, it } from 'vitest'
import {
  createHistoryState,
  pushHistory,
  redoHistory,
  undoHistory,
} from '../apps/web/src/utils/theme-designer/history'

describe(`版式历史`, () => {
  it(`撤销和重做同时恢复草稿与顶层样式上下文`, () => {
    const before = {
      draft: { sourceId: null, name: ``, baseTheme: `default`, tokens: {} },
      context: { primaryColor: `#111111`, headingStyles: {} },
    }
    const restored = {
      draft: { sourceId: null, name: ``, baseTheme: `default`, tokens: { base: { letterSpacing: 0.08 } } },
      context: { primaryColor: `#222222`, headingStyles: { h2: `border-left` } },
    }
    const state = pushHistory(createHistoryState<typeof before>(), before)
    const undone = undoHistory(state, restored)

    expect(undone?.entry).toEqual(before)
    expect(undone?.state.future).toEqual([restored])

    const redone = redoHistory(undone!.state, before)
    expect(redone?.entry).toEqual(restored)
  })
})
