<script setup lang="ts">
import GUIDE_CONTENT from '@/assets/example/markdown-guide.md?raw'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([`close`])

function onUpdate(val: boolean) {
  if (!val) {
    emit(`close`)
  }
}
</script>

<template>
  <Dialog :open="props.visible" @update:open="onUpdate">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Markdown 语法课</DialogTitle>
      </DialogHeader>
      <div class="max-h-[60vh] overflow-y-auto">
        <pre class="whitespace-pre-wrap text-sm leading-relaxed break-all font-[inherit]">{{ GUIDE_CONTENT }}</pre>
      </div>
    </DialogContent>
  </Dialog>
</template>
