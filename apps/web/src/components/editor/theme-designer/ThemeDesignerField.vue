<script setup lang="ts">
import type { ThemeField, ThemeTokenValue } from '@/utils/theme-designer'
import { RotateCcw } from 'lucide-vue-next'
import { useThemeDesignerStore } from '@/stores/themeDesigner'

const props = defineProps<{
  groupId: string
  field: ThemeField
}>()

const designerStore = useThemeDesignerStore()

const groupValues = computed(() => designerStore.tokens[props.groupId] || {})
const isSet = computed(() => props.field.key in groupValues.value)
const currentValue = computed<ThemeTokenValue>(() => (isSet.value ? groupValues.value[props.field.key] : props.field.defaultValue))
function update(value: ThemeTokenValue) {
  designerStore.setToken(props.groupId, props.field.key, value)
}

function reset() {
  designerStore.resetToken(props.groupId, props.field.key)
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="truncate text-xs font-medium">{{ field.label }}</span>
        <span v-if="isSet" class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      </div>
      <button
        v-if="isSet"
        type="button"
        class="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="reset"
      >
        <RotateCcw class="size-3" />
        跟随主题
      </button>
      <span v-else class="shrink-0 text-[10px] text-muted-foreground">
        跟随主题
      </span>
    </div>

    <ThemeDesignerColorControl
      v-if="field.type === 'color'"
      :model-value="String(currentValue)"
      :muted="!isSet"
      @update:model-value="update"
    />

    <ThemeDesignerNumberControl
      v-else-if="field.type === 'number'"
      :model-value="Number(currentValue)"
      :min="field.min ?? 0"
      :max="field.max ?? 100"
      :step="field.step ?? 1"
      :suffix="field.suffix"
      :muted="!isSet"
      @update:model-value="update"
    />

    <Select
      v-else-if="field.type === 'select'"
      :model-value="isSet ? String(currentValue) : ''"
      @update:model-value="value => update(String(value))"
    >
      <SelectTrigger class="h-8 w-full text-xs">
        <SelectValue placeholder="跟随主题" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="option in field.options" :key="option.value" :value="option.value" class="text-xs">
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <div v-else-if="field.type === 'switch'" class="flex items-center gap-2">
      <Switch :checked="Boolean(currentValue)" @update:checked="update" />
      <span class="text-[11px]" :class="isSet ? 'text-foreground' : 'text-muted-foreground'">
        {{ currentValue ? '已开启' : '已关闭' }}
      </span>
    </div>
  </div>
</template>
