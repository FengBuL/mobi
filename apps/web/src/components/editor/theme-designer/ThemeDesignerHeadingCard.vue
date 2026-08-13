<script setup lang="ts">
import type { HeadingLevelId } from '@/utils/theme-designer'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { cloneThemeTokens, HEADING_LEVELS, themeDesignerGroupMap } from '@/utils/theme-designer'

const designerStore = useThemeDesignerStore()
const { activeHeadingLevel } = storeToRefs(designerStore)

const headingGroup = computed(() => themeDesignerGroupMap[activeHeadingLevel.value])

function selectHeadingLevel(level: HeadingLevelId) {
  activeHeadingLevel.value = level
  if (!designerStore.expandedGroups.includes(`heading`)) {
    designerStore.expandedGroups = [...designerStore.expandedGroups, `heading`]
  }
}

function syncHeadingToAll() {
  const source = designerStore.tokens[activeHeadingLevel.value]
  if (!source || !Object.keys(source).length) {
    toast.warning(`当前标题级别还没有任何调整`)
    return
  }

  const next = cloneThemeTokens(designerStore.tokens)
  for (const level of HEADING_LEVELS) {
    next[level] = { ...source }
  }
  designerStore.replaceTokens(next)
  toast.success(`已同步到 H1 - H6`)
}
</script>

<template>
  <ThemeDesignerGroupCard :group="headingGroup" panel-key="heading" focus-key="heading">
    <template #before-fields>
      <div class="space-y-2">
        <div class="flex flex-wrap gap-1">
          <Button
            v-for="level in HEADING_LEVELS"
            :key="level"
            size="sm"
            :variant="activeHeadingLevel === level ? 'default' : 'outline'"
            class="h-7 flex-1 px-0 text-[11px]"
            @click="selectHeadingLevel(level)"
          >
            {{ level.toUpperCase() }}
            <span
              v-if="designerStore.groupCount(level)"
              class="ml-1 size-1.5 rounded-full"
              :class="activeHeadingLevel === level ? 'bg-primary-foreground' : 'bg-primary'"
            />
          </Button>
        </div>
        <Button variant="ghost" size="sm" class="h-7 w-full text-[11px]" @click="syncHeadingToAll">
          把当前级别同步到 H1 - H6
        </Button>
      </div>
    </template>
  </ThemeDesignerGroupCard>
</template>
