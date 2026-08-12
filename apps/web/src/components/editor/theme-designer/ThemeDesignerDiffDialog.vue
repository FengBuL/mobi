<script setup lang="ts">
import { RotateCcw, TriangleAlert } from 'lucide-vue-next'
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
        <DialogDescription>
          下面列出的是你在基础主题之上改动的部分，没有列出的属性都继承自内置主题。
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <div v-if="!groupedDiff.length" class="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          还没有任何改动，当前完全等同于内置主题。
        </div>

        <div v-if="designerStore.wechatRisks.length" class="space-y-1.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div class="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <TriangleAlert class="size-3.5" />
            公众号兼容性提醒
          </div>
          <p v-for="risk in designerStore.wechatRisks" :key="risk" class="text-[11px] leading-4 text-amber-700/90 dark:text-amber-400/90">
            {{ risk }}
          </p>
        </div>

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
