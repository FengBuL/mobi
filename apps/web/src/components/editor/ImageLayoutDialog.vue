<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

function onUpdate(open: boolean) {
  if (!open) {
    uiStore.toggleShowImageLayoutDialog(false)
  }
}
</script>

<template>
  <Dialog :open="uiStore.isShowImageLayoutDialog" @update:open="onUpdate">
    <DialogContent class="h-[92vh] max-w-6xl overflow-hidden p-3" @pointer-down-outside="event => event.preventDefault()">
      <DialogTitle class="sr-only">
        板块库
      </DialogTitle>
      <DialogDescription class="sr-only">
        选择并编辑标题、引用、列表、卡片、数据、互动、分隔和图片板块。
      </DialogDescription>
      <ImageLayoutWorkspace />
    </DialogContent>
  </Dialog>
</template>
