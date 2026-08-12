import type { BlockCategoryId, BlockState } from '@/utils/blocks/types'

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
    selection.value = next
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
