import type { BlockCategoryId, BlockState } from '@/utils/blocks/types'
import { trackEvent } from '@/utils/telemetry'

type SelectableBlockCategory = Exclude<BlockCategoryId, `image`>

export interface PreviewBlockSelection {
  category: SelectableBlockCategory
  from: number
  to: number
  state: BlockState
  title: string
  presetId?: string
  sourceKind?: string
  sourceOrdinal?: number
}

export const useBlockSelectionStore = defineStore(`block-selection`, () => {
  const selection = ref<PreviewBlockSelection | null>(null)

  function select(next: PreviewBlockSelection) {
    const previous = selection.value
    selection.value = next
    // 同一块反复点不重复记；换到另一块才算一次「点选」
    if (!previous || previous.from !== next.from || previous.category !== next.category) {
      trackEvent(`block_select`, { category: next.category, styled: Boolean(next.presetId) })
    }
  }

  function clear() {
    selection.value = null
  }

  return {
    selection,
    select,
    clear,
  }
})
