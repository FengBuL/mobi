<script setup lang="ts">
import PickColors from 'vue-pick-colors'
import { PRIMARY_COLOR_TOKEN } from '@/utils/theme-designer'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'

const props = withDefaults(defineProps<{
  modelValue: string
  muted?: boolean
}>(), {
  muted: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const themeStore = useThemeStore()
const uiStore = useUIStore()
const { primaryColor } = storeToRefs(themeStore)
const { isDark } = storeToRefs(uiStore)

const isPrimary = computed(() => props.modelValue === PRIMARY_COLOR_TOKEN)
const resolvedColor = computed(() => (isPrimary.value ? String(primaryColor.value) : props.modelValue))

function handleChange(value: string | string[]) {
  const next = Array.isArray(value) ? value[0] : value
  if (next) {
    emit(`update:modelValue`, next)
  }
}

function useThemeColor() {
  emit(`update:modelValue`, PRIMARY_COLOR_TOKEN)
}
</script>

<template>
  <div class="flex items-center gap-2" :class="{ 'opacity-70': muted }">
    <div class="theme-designer-picker flex h-7 items-center rounded-md border bg-background px-1.5">
      <PickColors
        :value="resolvedColor"
        show-alpha
        format="hex"
        :size="18"
        :theme="isDark ? 'dark' : 'light'"
        @change="handleChange"
      />
    </div>
    <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
      {{ isPrimary ? '跟随主题色' : resolvedColor }}
    </span>
    <Button
      variant="outline"
      size="sm"
      class="h-7 shrink-0 px-2 text-[11px]"
      :class="{ 'border-primary text-primary': isPrimary }"
      @click="useThemeColor"
    >
      主题色
    </Button>
  </div>
</template>

<style scoped>
.theme-designer-picker :deep(.pick-colors-box) {
  vertical-align: middle;
}
</style>
