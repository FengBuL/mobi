<script setup lang="ts">
import type { ThemeGroup } from '@/utils/theme-designer'
import { ChevronDown, RotateCcw } from 'lucide-vue-next'
import { useThemeDesignerStore } from '@/stores/themeDesigner'

const props = defineProps<{
  group: ThemeGroup
  /** 折叠状态的 key，标题这种共用一张卡片的分组需要固定住 */
  panelKey?: string
  /** 从预览点过来时的定位标记，标题卡片要用 `heading` 而不是具体的 h1~h6 */
  focusKey?: string
}>()

const designerStore = useThemeDesignerStore()

const key = computed(() => props.panelKey || props.group.id)
const focusId = computed(() => props.focusKey || props.group.id)
const isFocused = computed(() => designerStore.focusedGroupId === focusId.value)
const isExpanded = computed(() => designerStore.expandedGroups.includes(key.value))
const modifiedCount = computed(() => designerStore.groupCount(props.group.id))
const visibleFields = computed(() => {
  const values = designerStore.tokens[props.group.id] || {}
  return props.group.fields.filter(field => !field.showIf || field.showIf(values))
})

function toggle() {
  designerStore.expandedGroups = isExpanded.value
    ? designerStore.expandedGroups.filter(item => item !== key.value)
    : [...designerStore.expandedGroups, key.value]
}
</script>

<template>
  <div
    class="style-group-card overflow-hidden rounded-2xl border"
    :class="{ 'is-focused': isFocused }"
    :data-style-group="focusId"
  >
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
      @click="toggle"
    >
      <ChevronDown
        class="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
        :class="{ '-rotate-90': !isExpanded }"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="truncate text-sm font-medium">{{ group.label }}</span>
          <span
            v-if="modifiedCount"
            class="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
          >
            {{ modifiedCount }}
          </span>
        </div>
        <div class="truncate text-[11px] text-muted-foreground">
          {{ group.desc }}
        </div>
      </div>
      <span
        v-if="modifiedCount"
        class="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click.stop="designerStore.resetGroup(group.id)"
      >
        <RotateCcw class="size-3" />
        还原
      </span>
    </button>

    <div v-if="isExpanded" class="space-y-3.5 border-t px-3 py-3">
      <slot name="before-fields" />
      <ThemeDesignerField
        v-for="field in visibleFields"
        :key="field.key"
        :group-id="group.id"
        :field="field"
      />
    </div>
  </div>
</template>
