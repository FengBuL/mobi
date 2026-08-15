<script setup lang="ts">
import type { HeadingLevel, HeadingStyleType } from '@mobi/shared/configs'
import type { HeadingLevelId } from '@/utils/theme-designer'
import { headingStyleOptions } from '@mobi/shared/configs'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { cloneThemeTokens, HEADING_LEVELS, themeDesignerGroupMap } from '@/utils/theme-designer'

const designerStore = useThemeDesignerStore()
const themeStore = useThemeStore()
const editorStore = useEditorStore()
const renderStore = useRenderStore()
const { activeHeadingLevel } = storeToRefs(designerStore)
const { headingStyles } = storeToRefs(themeStore)

const headingGroup = computed(() => ({
  ...themeDesignerGroupMap[activeHeadingLevel.value],
  label: `标题`,
  fields: themeDesignerGroupMap[activeHeadingLevel.value].fields.filter(field => ![`decoration`, `decorationColor`].includes(field.key)),
}))
const selectedHeadingStyle = computed({
  get: () => themeStore.getHeadingStyle(activeHeadingLevel.value as HeadingLevel),
  set: (value: HeadingStyleType) => {
    designerStore.checkpoint()
    designerStore.resetToken(activeHeadingLevel.value, `decoration`, false)
    designerStore.resetToken(activeHeadingLevel.value, `decorationColor`, false)
    themeStore.setHeadingStyle(activeHeadingLevel.value as HeadingLevel, value)
    refreshPreview()
  },
})
const modifiedCount = computed(() => {
  return designerStore.groupCount(activeHeadingLevel.value) + (selectedHeadingStyle.value === `default` ? 0 : 1)
})

function refreshPreview() {
  themeStore.applyCurrentTheme()
  renderStore.render(renderStore.resolvePreviewContent(editorStore.getContent()))
}

function selectHeadingLevel(level: HeadingLevelId) {
  activeHeadingLevel.value = level
  if (!designerStore.expandedGroups.includes(`heading`)) {
    designerStore.expandedGroups = [...designerStore.expandedGroups, `heading`]
  }
}

function syncHeadingToAll() {
  const source = designerStore.tokens[activeHeadingLevel.value]
  if ((!source || !Object.keys(source).length) && selectedHeadingStyle.value === `default`) {
    toast.warning(`当前标题级别还没有任何调整`)
    return
  }

  designerStore.checkpoint()
  const next = cloneThemeTokens(designerStore.tokens)
  for (const level of HEADING_LEVELS) {
    if (source)
      next[level] = { ...source }
    themeStore.setHeadingStyle(level as HeadingLevel, selectedHeadingStyle.value)
  }
  designerStore.replaceTokens(next, false)
  refreshPreview()
  toast.success(`已同步到 H1 - H6`)
}

function resetCurrentHeading() {
  designerStore.checkpoint()
  themeStore.setHeadingStyle(activeHeadingLevel.value as HeadingLevel, `default`)
  designerStore.resetGroup(activeHeadingLevel.value, false)
  refreshPreview()
}

function resetAllHeadings() {
  designerStore.checkpoint()
  headingStyles.value = {}
  const next = cloneThemeTokens(designerStore.tokens)
  for (const level of HEADING_LEVELS)
    delete next[level]
  designerStore.replaceTokens(next, false)
  refreshPreview()
}
</script>

<template>
  <ThemeDesignerGroupCard
    :group="headingGroup"
    panel-key="heading"
    focus-key="heading"
    :modified-count="modifiedCount"
    :on-reset="resetCurrentHeading"
    reset-label="恢复本级标题"
  >
    <template #before-fields>
      <div class="space-y-3">
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
        <div class="space-y-1.5">
          <div class="text-xs font-medium">
            装饰样式
          </div>
          <Select v-model="selectedHeadingStyle">
            <SelectTrigger class="h-8 w-full text-xs">
              <SelectValue placeholder="跟随主题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in headingStyleOptions" :key="option.value" :value="option.value" class="text-xs">
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" class="h-8 px-2.5 text-xs" @click="syncHeadingToAll">
            同步到 H1 - H6
          </Button>
          <Button variant="ghost" size="sm" class="h-8 px-2.5 text-xs" @click="resetAllHeadings">
            全部标题恢复默认
          </Button>
        </div>
      </div>
    </template>
  </ThemeDesignerGroupCard>
</template>
