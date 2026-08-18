<script setup lang="ts">
import type { WorkspaceMode } from '@/stores/ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const { workspaceMode } = storeToRefs(uiStore)

// 打开不再弹工作区问卷；顶栏仍可切换简洁 / 专业
const isOpen = false

const options: Array<{
  value: WorkspaceMode
  title: string
  summary: string
  points: string[]
  columns: Array<{ label: string, weight: number, muted?: boolean }>
}> = [
  {
    value: `simple`,
    title: `简洁`,
    summary: `写字，换主题，复制走人`,
    points: [
      `屏幕上只有稿子和成品，左右各一半`,
      `23 套主题横排在预览上方，点一下就换`,
      `字体、字号、主题色收在旁边的小按钮里`,
    ],
    columns: [
      { label: `编辑`, weight: 1 },
      { label: `预览`, weight: 1 },
    ],
  },
  {
    value: `professional`,
    title: `专业`,
    summary: `面板齐全，宽度自己拉`,
    points: [
      `文章列表、板块库、样式面板都能调出来`,
      `分栏可拖拽，宽度随你安排`,
      `打开时同样只有两栏，用到哪个再展开哪个`,
    ],
    columns: [
      { label: `列表`, weight: 0.6, muted: true },
      { label: `编辑`, weight: 1 },
      { label: `预览`, weight: 1 },
      { label: `样式`, weight: 0.8, muted: true },
    ],
  },
]

function choose(mode: WorkspaceMode) {
  uiStore.setWorkspaceMode(mode)
}

function handleOpenChange(open: boolean) {
  if (!open) {
    uiStore.setWorkspaceMode(workspaceMode.value)
  }
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>想要一个什么样的工作区？</DialogTitle>
        <DialogDescription>
          随时可以在顶栏切换，这次只是给你一个起点。
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="group flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all hover:border-primary hover:bg-accent/50"
          :class="workspaceMode === option.value ? 'border-primary bg-accent/40' : 'border-border'"
          @click="choose(option.value)"
        >
          <div class="flex h-16 gap-1 overflow-hidden rounded-lg border bg-muted/40 p-1.5">
            <div
              v-for="column in option.columns"
              :key="column.label"
              class="flex items-center justify-center rounded bg-background text-[10px] text-muted-foreground"
              :class="column.muted ? 'opacity-45 border border-dashed' : ''"
              :style="{ flexGrow: column.weight }"
            >
              {{ column.label }}
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex items-baseline gap-2">
              <span class="text-base font-semibold">{{ option.title }}</span>
              <span class="text-xs text-muted-foreground">{{ option.summary }}</span>
            </div>
            <ul class="space-y-1 text-xs leading-5 text-muted-foreground">
              <li v-for="point in option.points" :key="point" class="flex gap-1.5">
                <span class="mt-[7px] size-1 shrink-0 rounded-full bg-current opacity-50" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>
        </button>
      </div>

      <p class="text-xs text-muted-foreground">
        拿不准就先用简洁，缺什么再切过去。
      </p>
    </DialogContent>
  </Dialog>
</template>
