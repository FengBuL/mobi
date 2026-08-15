<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { copyPlain } from '@/utils/clipboard'

const open = defineModel<boolean>(`open`, { default: false })

const designerStore = useThemeDesignerStore()

const groupedDiff = computed(() => {
  const groups = new Map<string, { label: string, items: typeof designerStore.diffItems }>()

  for (const item of designerStore.diffItems) {
    const entry = groups.get(item.groupId) || { label: item.groupLabel, items: [] }
    entry.items.push(item)
    groups.set(item.groupId, entry)
  }

  return [...groups.entries()].map(([groupId, entry]) => ({ groupId, ...entry }))
})

async function copyCSS() {
  await copyPlain(designerStore.overrideCSS)
  toast.success(`覆盖层 CSS 已复制`)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85vh] flex-col sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>与内置主题的差异</DialogTitle>
      </DialogHeader>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <div v-for="group in groupedDiff" :key="group.groupId" class="space-y-1.5">
          <div class="text-xs font-semibold text-muted-foreground">
            {{ group.label }}
          </div>
          <div class="overflow-hidden rounded-xl border">
            <div
              v-for="item in group.items"
              :key="item.fieldKey"
              class="flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <span class="min-w-0 flex-1 truncate text-xs">{{ item.fieldLabel }}</span>
              <span class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{{ item.display }}</span>
              <button
                type="button"
                class="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                @click="designerStore.resetToken(item.groupId, item.fieldKey)"
              >
                <RotateCcw class="size-3" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="designerStore.overrideCSS" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-muted-foreground">
              生成的覆盖层 CSS
            </div>
            <Button variant="ghost" size="sm" class="h-7 px-2 text-[11px]" @click="copyCSS">
              复制
            </Button>
          </div>
          <pre class="max-h-64 overflow-auto rounded-xl border bg-muted p-3 text-[11px] leading-5"><code>{{ designerStore.overrideCSS }}</code></pre>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
