<script setup lang="ts">
import { useAccountProfileImport } from '@/composables/useAccountProfileImport'

const {
  importInput,
  pendingProfiles,
  conflictNames,
  openImport,
  onImportFile,
  confirmOverwrite,
  confirmAsNew,
  cancelPending,
} = useAccountProfileImport()

defineExpose({ openImport, importInput })
</script>

<template>
  <input
    ref="importInput"
    type="file"
    accept="application/json,.json"
    class="hidden"
    @change="onImportFile"
  >
  <Dialog :open="pendingProfiles !== null" @update:open="value => !value && cancelPending()">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>
          号名已存在
        </DialogTitle>
        <DialogDescription>
          「{{ conflictNames.join('、') }}」已经有了。覆盖会改现有配置；作为新号会多出一个能切的号。稿子都不会跟着过来。
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="flex-col sm:flex-col gap-2 sm:space-x-0">
        <Button @click="confirmAsNew">
          作为新号导入
        </Button>
        <Button variant="outline" @click="confirmOverwrite">
          覆盖现有配置
        </Button>
        <Button variant="ghost" @click="cancelPending">
          取消
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
