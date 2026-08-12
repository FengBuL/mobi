import { ref } from 'vue'

export type ImageQuickInsertTab = `upload` | `link` | `recent`

const isOpen = ref(false)
const activeTab = ref<ImageQuickInsertTab>(`upload`)

export function useImageQuickInsert() {
  function open(tab: ImageQuickInsertTab = `upload`) {
    activeTab.value = tab
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function setOpen(open: boolean) {
    isOpen.value = open
  }

  return { isOpen, activeTab, open, close, setOpen }
}
